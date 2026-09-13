import {
    Bot,
    FALLBACK_COMMAND,
    HELP_INTENT_NAME,
    IAppConfig,
    Nlu,
    Text,
    WELCOME_INTENT_NAME,
} from 'umbot';
import { FileAdapter, fullPlatforms } from 'umbot/plugins';
import { rateLimiter, requestId } from 'umbot/middleware';
import appConfig from './config/appConfig';
import appParams from './config/appParams';
import { CoffeeCtx, completeOrder, DRINKS, extractCount, MENU, SIZE_NAMES } from './menu';

/** Первый вопрос формы заказа. Используется и как prompt поля, и в командах. */
const DRINK_PROMPT = 'Что будете пить? У нас есть кофе, чай и какао.';

/**
 * Зарезервированное имя первого шага формы `order`.
 * `addForm` создаёт шаги по шаблону `__form_<имя>_<номер>`.
 */
const ORDER_FORM_STEP = '__form_order_0';

/** Параметры сборки демо-бота. */
export interface ICoffeeBotOptions {
    /**
     * Переопределение конфигурации приложения.
     * Например, в тестах сюда передают временную папку для `FileAdapter`,
     * чтобы не засорять `data/` проекта.
     */
    config?: Partial<IAppConfig>;
}

/** Приветствие с кнопками основных команд. Используется welcome-командой и fallback. */
function showWelcome(ctx: CoffeeCtx): void {
    ctx.text = 'Добро пожаловать в кофейню «У Бота»! Я бариста и с радостью приму ваш заказ.';
    ctx.buttons.addBtn('Меню').addBtn('Заказать').addBtn('Помощь');
}

/**
 * Собирает кофейню-бота: подключает платформы, базу данных и middleware,
 * регистрирует команды, шаг подтверждения и форму заказа.
 *
 * Вся логика бота описана одной цепочкой `addCommand` → `addStep` → `addForm`
 * прямо здесь, без собственного класса-контроллера: фреймворк по умолчанию
 * использует `BaseBotController`, который лишь помогает, когда ничего не
 * распознано. Типизированный `userData` даёт дженерик
 * `BotController<ICoffeeUserData>` (псевдоним `CoffeeCtx` из `src/menu.ts`).
 *
 * Функция принимает готовый экземпляр `Bot` (или `BotTest`), чтобы одну и ту
 * же сборку можно было использовать и в консольном режиме, и в webhook-режиме,
 * и в тестах.
 *
 * @param bot Экземпляр приложения, к которому подключается вся логика
 * @param options Необязательные переопределения (используются в тестах)
 * @returns Тот же экземпляр `bot` — для цепочки вызовов
 */
export function createCoffeeBot<TBot extends Bot>(
    bot: TBot,
    options: ICoffeeBotOptions = {},
): TBot {
    // ===== Платформы и база данных =====
    // fullPlatforms регистрирует все встроенные адаптеры (Алиса, Telegram, VK и др.),
    // FileAdapter хранит userData всех платформ в папке data/ без установки Mongo.
    bot.use(fullPlatforms);
    bot.use(new FileAdapter());
    // Для MongoAdapter достаточно добавить в appConfig настройки подключения:
    // bot.setAppConfig({ db: { host: '...', name: '...', user: '...', password: '...' } });

    // ===== Middleware =====
    // rateLimiter ограничивает частоту запросов одного пользователя,
    // requestId добавляет каждому запросу сквозной идентификатор для логов.
    bot.use(rateLimiter());
    bot.use(requestId());

    // ===== Конфигурация =====
    bot.setAppConfig({ ...appConfig(), ...options.config });
    bot.setPlatformParams(appParams());

    // ===== Команда «привет» =====
    // Пустой массив слотов: для команд welcome/help фреймворк сам подставляет
    // стандартные слоты («привет», «здравствуй» и т.д.).
    bot.addCommand<CoffeeCtx>(WELCOME_INTENT_NAME, [], (_, ctx) => {
        showWelcome(ctx);
    });

    // ===== Команда «помощь» =====
    bot.addCommand<CoffeeCtx>(HELP_INTENT_NAME, [], (_, ctx) => {
        ctx.text = [
            'Вот что я умею:',
            '• «меню» — показать карту напитков с ценами;',
            '• «заказать» — принять заказ (можно сразу сказать «закажу два кофе»);',
            '• «любимый» — напомнить ваш любимый напиток;',
            '• «помощь» — эта справка.',
            'А ещё каждый 5-й кофе — в подарок!',
        ].join('\n');
        ctx.buttons.addBtn('Меню').addBtn('Заказать');
    });

    // ===== Команда «меню» =====
    // Карточка-галерея напитков с ценами. Изображения не указываем (`null`) —
    // текстовые элементы карточки работают без загрузки картинок, что удобно
    // для офлайн-демо. В реальном боте сюда встанут фото напитков.
    bot.addCommand<CoffeeCtx>('menu', ['меню', 'карта', 'карту'], (_, ctx) => {
        ctx.text = 'Наше меню — выбирайте напиток!';
        ctx.card.title = 'Меню кофейни';
        for (const drink of DRINKS) {
            const item = MENU[drink];
            ctx.card.addImage(null, item.title, `${item.desc} — от ${item.price} ₽`);
        }
        ctx.card.button.addBtn('Заказать');
    });

    // ===== Команда «любимый» =====
    bot.addCommand<CoffeeCtx>('favorite', ['любимый', 'мой напиток'], (_, ctx) => {
        const favorite = ctx.userData.favorite;
        if (favorite) {
            ctx.text = `Ваш любимый напиток — ${favorite}. Закажем?`;
            ctx.buttons.addBtn('Заказать').addBtn('Меню');
        } else {
            ctx.text = 'Вы ещё ничего не заказывали. Скажите «заказать», и я это исправлю!';
            ctx.buttons.addBtn('Заказать');
        }
    });

    // ===== Команда «заказ» =====
    // Если у пользователя уже есть любимый напиток — сначала спрашиваем
    // подтверждение (шаг confirm_favorite), иначе запускаем форму.
    bot.addCommand<CoffeeCtx>('order', ['заказ', 'закаж', 'хочу кофе'], (_, ctx) => {
        if (ctx.userData.favorite) {
            ctx.text = `Вам как обычно — ${ctx.userData.favorite}? Ответьте «да» или «нет».`;
            ctx.thisIntentName = 'confirm_favorite';
            return;
        }
        // Демонстрация NLU: «закажу два кофе» → распознаём количество порций.
        const count = extractCount(ctx);
        const ending = Text.getEnding(count ?? 1, ['порция', 'порции', 'порций']);
        ctx.text = count
            ? `Принято, ${count} ${ending}! Уточним детали. ${DRINK_PROMPT}`
            : DRINK_PROMPT;
        ctx.thisIntentName = ORDER_FORM_STEP;
    });

    // ===== Шаг подтверждения любимого напитка =====
    // Голосовые платформы присылают согласие готовым NLU-интентом
    // YANDEX.CONFIRM; в консоли и чатах дополнительно проверяем текст.
    bot.addStep<CoffeeCtx>('confirm_favorite', (ctx) => {
        const favorite = ctx.userData.favorite;
        const confirmed =
            ctx.nlu.getIntent(Nlu.T_INTENT_CONFIRM) !== null ||
            Text.isSayTrue(ctx.userCommand || '');
        if (confirmed && favorite) {
            const history = ctx.userData.history || [];
            const last = [...history].reverse().find((order) => order.drink === favorite);
            completeOrder(ctx, favorite, last?.size || 'средний', last?.name || 'гость');
            return;
        }
        // Отказались — собираем новый заказ через форму.
        ctx.text = DRINK_PROMPT;
        ctx.thisIntentName = ORDER_FORM_STEP;
    });

    // ===== Форма заказа =====
    // addForm сам создаёт цепочку шагов: по одному на каждое поле.
    // Ответы проходят валидацию, а после последнего поля вызывается onComplete.
    bot.addForm<CoffeeCtx>('order', {
        fields: [
            {
                name: 'drink',
                prompt: DRINK_PROMPT,
                validate: (value): string | boolean =>
                    DRINKS.some((drink) => value.toLowerCase().includes(drink)) ||
                    'У нас есть кофе, чай и какао. Что будете пить?',
            },
            {
                name: 'size',
                prompt: 'Какой объём: маленький, средний или большой?',
                validate: (value): string | boolean =>
                    SIZE_NAMES.some((size) => value.toLowerCase().includes(size)) ||
                    'Доступные объёмы: маленький, средний и большой.',
            },
            {
                name: 'name',
                prompt: 'На чьё имя готовить?',
                validate: (value): string | boolean =>
                    value.trim().length > 0 || 'Подскажите, на чьё имя готовить заказ.',
            },
        ],
        onComplete: (ctx, answers) => {
            // Нормализуем ответы: пользователь мог сказать «хочу кофе» —
            // в историю сохраняем только название напитка.
            const drink =
                DRINKS.find((item) => answers.drink.toLowerCase().includes(item)) ??
                answers.drink.toLowerCase();
            const size =
                SIZE_NAMES.find((item) => answers.size.toLowerCase().includes(item)) ??
                answers.size.toLowerCase();
            completeOrder(ctx, drink, size, answers.name.trim());
        },
        cancelText: 'Хорошо, заказ отменён. Возвращайтесь, когда будете готовы!',
    });

    // ===== Fallback =====
    // Срабатывает, когда ни команда, ни интент не распознаны.
    bot.addCommand<CoffeeCtx>(FALLBACK_COMMAND, [], (userCommand, ctx) => {
        if (ctx.messageId === 0) {
            // Первое сообщение диалога: даже если не распознали запрос — здороваемся.
            showWelcome(ctx);
            return;
        }
        ctx.text = `Хм, «${userCommand}» я не понимаю. Скажите «помощь», чтобы узнать, что я умею.`;
        ctx.buttons.addBtn('Помощь').addBtn('Меню');
    });

    return bot;
}
