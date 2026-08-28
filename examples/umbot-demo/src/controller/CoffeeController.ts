import { BotController, HELP_INTENT_NAME, WELCOME_INTENT_NAME } from 'umbot';
import { ICoffeeUserData } from '../types/ICoffeeUserData';

/** Напитки, которые умеет готовить бот. Используются в форме заказа и её валидации. */
export const DRINKS = ['кофе', 'чай', 'какао'] as const;

/** Доступные объёмы порции. */
export const SIZES = ['маленький', 'средний', 'большой'] as const;

/**
 * Словесные числительные для разбора количества порций.
 * В консольном режиме NLU пуст, поэтому «два кофе» распознаём по словам.
 */
const WORD_NUMBERS: Record<string, number> = {
    один: 1,
    одна: 1,
    два: 2,
    две: 2,
    три: 3,
    четыре: 4,
    пять: 5,
};

/** Максимальное разумное количество порций в одном заказе. */
const MAX_COUNT = 10;

/**
 * Контроллер кофейни-бота.
 *
 * Демонстрирует классический стиль umbot: бизнес-логика собрана в методе
 * `action()`, который фреймворк вызывает с именем распознанного интента.
 * Интенты `welcome`, `help`, `menu` и `favorite` описаны в `config/appParams.ts`,
 * а команда `order` и шаги диалога регистрируются в `src/index.ts`.
 *
 * Дженерик `BotController<ICoffeeUserData>` делает `this.userData`
 * типобезопасным: `favorite` и `history` проверяются компилятором.
 */
export class CoffeeController extends BotController<ICoffeeUserData> {
    /**
     * Главная точка входа: вызывается фреймворком с именем интента.
     * Команды с колбэками (`order`, fallback) и шаги диалогов обрабатывают
     * текст сами, поэтому здесь их дублировать не нужно.
     *
     * @param intentName Имя распознанного интента или `null`
     */
    public action(intentName: string | null): void {
        switch (intentName) {
            case WELCOME_INTENT_NAME:
                this.showWelcome();
                break;
            case HELP_INTENT_NAME:
                this.showHelp();
                break;
            case 'menu':
                this.showMenu();
                break;
            case 'favorite':
                this.showFavorite();
                break;
            default:
                // Остальные сценарии (команды, шаги, fallback) уже обработаны.
                break;
        }
    }

    /** Приветствие с кнопками основных команд. */
    public showWelcome(): void {
        this.text = 'Добро пожаловать в кофейню «У Бота»! Я бариста и с радостью приму ваш заказ.';
        this.buttons.addBtn('Меню').addBtn('Заказать').addBtn('Помощь');
    }

    /** Справка по командам бота. */
    public showHelp(): void {
        this.text = [
            'Вот что я умею:',
            '• «меню» — показать карту напитков;',
            '• «заказать» — принять заказ (можно сразу сказать «закажу два кофе»);',
            '• «любимый» — напомнить ваш любимый напиток;',
            '• «помощь» — эта справка.',
        ].join('\n');
        this.buttons.addBtn('Меню').addBtn('Заказать');
    }

    /**
     * Меню напитков в виде карточки-галереи.
     * Изображения не указываем (`null`) — текстовые элементы карточки
     * работают без загрузки картинок, что удобно для офлайн-демо.
     */
    public showMenu(): void {
        this.text = 'Наше меню — выбирайте напиток!';
        this.card.title = 'Меню кофейни';
        this.card
            .addImage(null, 'Кофе', 'Эспрессо, американо или капучино')
            .addImage(null, 'Чай', 'Чёрный, зелёный или травяной')
            .addImage(null, 'Какао', 'Горячий шоколад с молоком');
        this.card.button.addBtn('Заказать');
    }

    /** Любимый напиток пользователя из `userData`. */
    public showFavorite(): void {
        const favorite = this.userData.favorite;
        if (favorite) {
            this.text = `Ваш любимый напиток — ${favorite}. Закажем?`;
            this.buttons.addBtn('Заказать').addBtn('Меню');
        } else {
            this.text = 'Вы ещё ничего не заказывали. Скажите «заказать», и я это исправлю!';
            this.buttons.addBtn('Заказать');
        }
    }

    /**
     * Извлекает количество порций из фразы пользователя («закажу два кофе»).
     *
     * Демонстрирует работу с NLU:
     * 1. Сначала спрашиваем платформу — Алиса сама присылает числа
     *    в `YANDEX.NUMBER`.
     * 2. Если NLU пуст (консольный режим, чат-платформы) — разбираем
     *    слова-числительные и цифры из текста вручную.
     *
     * @returns Количество порций от 1 до 10 или `null`, если число не найдено
     */
    public extractCount(): number | null {
        const numbers = this.nlu.getNumber();
        if (numbers.status && numbers.result) {
            const found = numbers.result.find(
                (num) => Number.isFinite(num) && num > 0 && num <= MAX_COUNT,
            );
            if (found !== undefined) {
                return Math.floor(found);
            }
        }
        for (const word of (this.userCommand || '').toLowerCase().split(/\s+/)) {
            const wordCount = WORD_NUMBERS[word];
            if (wordCount !== undefined) {
                return wordCount;
            }
            const digit = Number(word);
            if (Number.isInteger(digit) && digit > 0 && digit <= MAX_COUNT) {
                return digit;
            }
        }
        return null;
    }
}
