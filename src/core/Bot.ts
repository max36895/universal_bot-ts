import { IAppConfig, IAppParam, TAppType, EMetric, TAppMode } from './interfaces/IAppContext';
import {
    IBotResponse,
    IBotResponseState,
    IDatabaseAdapter,
    IPlatformAdapter,
    IPlugin,
    IPluginFn,
    TBotAuth,
    TBotContent,
    TBotResponseCb,
    TCommandGroupMode,
    TPlugin,
} from './interfaces/IBot';

import { ICommandParam, TSlots, TCommandResolver, IStepParam } from './utils/CommandReg';
import { IncomingMessage, ServerResponse, createServer, Server } from 'node:http';
import type { BotController, IPlatformData, IUserData } from '../controller';
import { AppContext, T_AUTO } from './AppContext';
import {
    HELP_INTENT_NAME,
    HELP_INTENT_SLOTS,
    WELCOME_INTENT_NAME,
    WELCOME_INTENT_SLOTS,
} from './constants';
import { UsersData } from '../models';
import { ILogger } from './interfaces/ILogger';
import { Text, isPromise, keysCount } from '../utils';

const DEFAULT_HELP_INTENT_NAME = HELP_INTENT_NAME;
const DEFAULT_HELP_INTENT_SLOTS = HELP_INTENT_SLOTS;
const DEFAULT_WELCOME_INTENT_NAME = WELCOME_INTENT_NAME;
const DEFAULT_WELCOME_INTENT_SLOTS = WELCOME_INTENT_SLOTS;

/**
 * Тип для класса контроллера приложения
 */
export type TBotControllerClass<
    TUserData extends IUserData = IUserData,
    TPlatformState extends IPlatformData = IPlatformData,
> = new (appContext: AppContext) => BotController<TUserData, TPlatformState>;

/**
 * Результат выполнения запроса от платформы - ответ, который будет отправлен пользователю
 * Может быть ответом для Алисы, Маруси или текстовым сообщением
 *
 * @example
 * ```ts
 * // Ответ для Алисы
 * const alisaResponse: TRunResult = {
 *   response: {
 *     text: 'Привет!',
 *     end_session: false
 *   },
 *   version: '1.0'
 * };
 *
 * // Ответ для Маруси
 * const marusiaResponse: TRunResult = {
 *   response: {
 *     text: 'Привет!',
 *     end_session: false
 *   },
 *   version: '1.0'
 * };
 *
 * // Простой текстовый ответ
 * const textResponse: TRunResult = 'Привет!';
 * ```
 */
export type TRunResult = object | string;

/**
 * Результат обработки входящего события серверлесс-платформы (например, Yandex Cloud Functions).
 * Содержит HTTP-статус и тело ответа, которые нужно вернуть из cloud-функции.
 */
export interface IWebhookEventResult {
    /**
     * HTTP-статус ответа (200, 400, 401, 404, 500).
     */
    statusCode: number;
    /**
     * Тело ответа платформы или `null`, если ответ отсутствует.
     */
    body: TRunResult | null;
}

export * from './interfaces/IBot';

const MAX_REQUEST_SIZE = 1024 * 1024 * 2;

/**
 * Функция для обработки следующего шага в цепочке промежуточных функций
 */
export type MiddlewareNext = () => Promise<void>;
/**
 * Функция промежуточной обработки
 */
export type MiddlewareFn = (ctx: BotController, next: MiddlewareNext) => void | Promise<void>;

/**
 * Ошибка «запрос платформы не может быть обработан».
 *
 * Отделена от прочих ошибок, чтобы webhook отдавал 400, а не 500: на 5xx
 * Telegram и VK включают повторную доставку и в итоге отключают вебхук,
 * хотя проблема не в сервере, а в самом запросе.
 */
class BotBadRequestError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BotBadRequestError';
    }
}

function defaultSend(res: ServerResponse, state: IBotResponse): void {
    res.statusCode = state.statusCode;
    const isBodyString = typeof state.body === 'string';
    res.setHeader('Content-Type', isBodyString ? 'text/plain' : 'application/json');
    res.end(isBodyString ? state.body : JSON.stringify(state.body));
}

function send(
    req: IncomingMessage,
    res: ServerResponse,
    state: IBotResponseState,
    responseCb?: TBotResponseCb,
): void {
    if (responseCb) {
        return responseCb(req, res, state);
    }
    return defaultSend(res, state);
}

interface IAppConnectStatus {
    isConnecting: boolean;
    status?: Promise<boolean> | boolean;
}

/**
 * Тип для кастомного обработчика определения платформы.
 *
 * Позволяет разработчику взять на себя определение типа платформы для входящего запроса.
 * Обработчик выполняется **до** встроенного автоопределения через адаптеры.
 *
 * @param query - Тело запроса (обычно объект, может быть строкой, если запрос не распарсен).
 * @param headers - HTTP-заголовки запроса (если доступны).
 * @param detect - Функция, вызывающая стандартный механизм определения платформы
 *                 (перебор зарегистрированных адаптеров). Принимает те же параметры,
 *                 что и резолвер, и возвращает имя платформы или `null`.
 * @returns Имя платформы (строка) или `null`, если платформа не определена.
 *
 * @example
 * ```ts
 * bot.setPlatformResolver((query, headers, detect) => {
 *   // Сначала пробуем стандартное определение
 *   const platform = detect(query, headers);
 *   if (platform === 'telegram' && headers?.['x-force-vk']) {
 *     return 'vk';
 *   }
 *   return platform;
 * });
 * ```
 */
export type TPlatformResolver = (
    query: unknown,
    headers?: Record<string, unknown>,
    detect?: (uBody: unknown, headers?: Record<string, unknown>) => TAppType | null,
) => TAppType | null;

/**
 * Мультиплатформенный фреймворк для разработки голосовых навыков и чат-ботов. Он даёт единую бизнес-логику для всех платформ — но одинаково эффективен, даже если вы работаете только с одной.
 *
 * **`Bot` — главный класс**, управляющий всем жизненным циклом приложения:
 *  - регистрацией платформ (Алиса, Telegram, VK, Маруся, Max и др.);
 *  - обработкой входящих запросов;
 *  - маршрутизацией команд;
 *  - middleware;
 *  - работой с базой данных;
 *  - логированием
 *  - метриками.
 *
 * Фреймворк построен на **адаптерах** — каждый адаптер отвечает за преобразование
 * специфичного для платформы запроса в унифицированный `BotController`, который
 * содержит всю информацию о пользователе, текст команды, NLU, состояние и методы ответа
 * (кнопки, карточки, TTS). Вы пишете **один код**, а фреймворк доставляет его
 * на все поддерживаемые платформы.
 *
 * ## 📖 КРАТКОЕ РУКОВОДСТВО
 *
 * 1. **Создайте приложение:** `const bot = new Bot();`
 * 2. **Настройте токены:** `bot.setAppConfig({ tokens: { telegram: {token: '...'}} });`
 * 3. **Добавьте логику при необходимости:** `bot.initBotController(MyController);`
 * 4. **Добавьте команды:** `bot.addCommand('start', ['старт'], handler);`
 * 5. **Запустите:** `bot.start();`
 *
 * ## 🎯 Ключевые возможности
 * - ✅ **Поддержка множества платформ** через подключаемые адаптеры (Алиса, Telegram, VK, Маруся и др.)
 * - ✅ **Единая логика** для голосовых навыков и ботов
 * - ✅ **Мощная система команд и интентов** с поддержкой регулярных выражений
 * - ✅ **Управление состоянием диалога** (шаги) и пользовательскими данными
 * - ✅ **Встроенная работа с БД** (MongoDB через плагины)
 * - ✅ **Middleware и плагины** для расширения функциональности
 * - ✅ **Гибкая настройка** (режимы разработки/продакшена, защита от ReDoS, кастомные резолверы команд)
 * - ✅ **Логирование и метрики** для отладки и мониторинга
 *
 * ## 🚀 БЫСТРЫЙ СТАРТ
 * Создание простого Telegram бота
 * ```ts
 * import { Bot } from 'umbot';
 * import { botPlatforms } from 'umbot/plugins';
 *
 * // 1. Создаем бота для Telegram
 * const bot = new Bot();
 *
 * // 2. Настраиваем токен (рекомендуется через .env файл)
 * bot.setAppConfig({
 *   env: 'local'
 * });
 *
 * // 3. Говорим приложению, что нужно поддерживать только платформы для чат-ботов
 * bot.use(botPlatforms);
 *
 * // 4. Добавляем команды
 * bot.addCommand('help', ['помощь', 'справка'], (cmd, controller) => {
 *   controller.text = 'Я могу:\n• Приветствовать\n• Помогать\n• И многое другое!';
 * });
 *
 * // 5. Запускаем сервер
 * bot.start('localhost', 3000);
 *
 * // 6. Настройте webhook в Telegram: https://api.telegram.org/bot{YOUR_TOKEN}/setWebhook?url=https://ваш-домен/webhook
 * ```
 *
 * Создание простого приложения со своим контроллером:
 * ```ts
 * const bot = new Bot();
 * bot.setPlatformParams({
 *   intents: [{
 *     name: 'greeting',
 *     slots: ['привет', 'здравствуй']
 *   }]
 * });
 *
 * class MyController extends BotController {
 *   public action(intentName: string | null): void {
 *     if (intentName === 'greeting') {
 *       this.text = 'Привет! Я ваш помощник 🤖';
 *       this.buttons
 *         .addBtn('Помощь')
 *         .addBtn('Настройки');
 *     }
 *   }
 * }
 *
 * bot.initBotController(MyController);
 * ```
 * Использование с базой данных:
 * ```ts
 * import { Bot } from 'umbot'
 * import { MongoAdapter } from 'umbot/plugins'
 * const bot = new Bot();
 * bot.use(new MongoAdapter({
 *     host: 'localhost',
 *     database: 'bot_db',
 *     user: 'user',
 *     pass: 'password'
 *   }));
 * ```
 * Параметры типов позволяют написать типобезопасный бот без `as any`:
 * ```ts
 * import { Bot, IUserData, IPlatformData } from 'umbot';
 *
 * interface MyUserData extends IUserData { name?: string; age?: number }
 * interface MyPlatformState extends IPlatformData { cartCount?: number }
 *
 * const bot = new Bot<MyUserData, MyPlatformState>();
 * bot.addCommand('view', [], (_, ctx) => {
 *     ctx.userData.name = 'Bob';        // ✅ типизировано
 *     ctx.state!.cartCount = 5;          // ✅ типизировано
 *     ctx.userData.foo = 1;              // ❌ TS error
 * });
 * ```
 *
 * @template TUserData - Тип пользовательских данных, по умолчанию {@link IUserData}.
 * @template TPlatformState - Тип данных в локальном хранилище платформы, по умолчанию {@link IPlatformData}.
 * @see BotController
 */
/**
 * Описание одного поля формы в {@link Bot.addForm}.
 *
 * @template TBotController Контроллер (по умолчанию `BotController`)
 */
export interface IAddFormField<TBotController extends BotController = BotController> {
    /**
     * Имя поля. Станет ключом в объекте ответов, который получит `onComplete`.
     * Должно быть валидным ключом объекта.
     * @example 'name', 'email', 'age'
     */
    name: string;

    /**
     * Текст, который бот отправит пользователю с просьбой ввести это поле.
     * Может быть строкой или функцией от контроллера (для dynamic-content).
     * @example 'Как вас зовут?' | (ctx) => `Привет, ${ctx.userData.name}! Ваш email?`
     */
    prompt: string | ((ctx: TBotController) => string);

    /**
     * Валидатор пользовательского ввода.
     *
     * Может быть синхронным или асинхронным.
     * Возвращаемое значение:
     * - `true` — значение принято, переходим к следующему полю.
     * - `false` — валидация не прошла, повторяем prompt без сообщения об ошибке.
     * - `string` — эта строка отправляется пользователю как текст ошибки.
     *
     * @example
     * ```ts
     * // Синхронная валидация
     * validate: (v) => v.length > 0
     *
     * // Сообщение, если неверно
     * validate: (v) => /\S+@\S+/.test(v) || 'Некорректный email'
     *
     * // Асинхронная (например, проверка через API)
     * validate: async (v) => {
     *     const exists = await db.users.findOne({ email: v });
     *     return exists ? 'Email уже занят' : true;
     * }
     * ```
     */
    validate?: (value: string) => boolean | string | Promise<boolean | string>;
}

/**
 * Ключевые параметры метода {@link Bot.addForm} — регистрации многошаговой формы.
 *
 * @template TBotController Контроллер
 */
export interface IAddFormOptions<TBotController extends BotController = BotController> {
    /**
     * Список полей формы. Обрабатываются последовательно — каждое поле становится своим шагом.
     */
    fields: IAddFormField<TBotController>[];

    /**
     * Колбек, вызываемый после того как заполнены ВСЕ поля.
     * Может быть синхронным или асинхронным — фреймворк дождётся его завершения
     * перед формированием ответа.
     *
     * @param ctx BotController — имеет доступ к userData, тексту, кнопкам и т.д.
     * @param answers Объект с ответами: ключ — name поля, значение — введённый пользователем текст.
     *
     * @example
     * ```ts
     * onComplete: (ctx, answers) => {
     *     ctx.text = `Спасибо, ${answers.name}! Мы вас записали (${answers.email}).`;
     * }
     * ```
     */
    onComplete: (ctx: TBotController, answers: Record<string, string>) => void | Promise<void>;

    /**
     * Текст, который получит пользователь при отмене формы.
     * @defaultValue 'Форма отменена.'
     */
    cancelText?: string;

    /**
     * Список команд, которые отменяют форму. Работают в любом регистре.
     * @defaultValue ['отмена', 'cancel']
     */
    cancelCommands?: string[];
}

export class Bot<
    TUserData extends IUserData = IUserData,
    TPlatformState extends IPlatformData = IPlatformData,
> {
    /** Экземпляр HTTP-сервера */
    #serverInst: Server | undefined;

    /** Обработчики сигналов для удаления при повторном start() */
    #sigtermHandler: (() => void) | null = null;
    #sigintHandler: (() => void) | null = null;

    /**
     * Полученный запрос от пользователя.
     * Может быть JSON-строкой, текстом или null
     */
    protected _content: TBotContent = null;

    /**
     * Контекст приложения
     */
    readonly #appContext: AppContext;

    /**
     * кастомный обработчик для определения типа платформы.
     */
    #platformResolver: TPlatformResolver | null = null;

    /**
     * Контроллер с бизнес-логикой приложения.
     * Обрабатывает команды и формирует ответы
     * @see TBotControllerClass
     */
    #botControllerClass: TBotControllerClass<TUserData, TPlatformState>;

    /**
     * Тип платформы по умолчанию
     */
    #defaultAppType: TAppType | 'auto' = 'auto';
    // Чтобы не дублировать повторное подключение к базе.
    readonly #appConnectStatus: IAppConnectStatus = {
        isConnecting: false,
    };

    #globalMiddlewares: MiddlewareFn[] = [];
    #platformMiddlewares: Partial<Record<TAppType, MiddlewareFn[]>> = {};

    #plugins: (IPlugin | ((bot: Bot) => void))[] = [];

    /**
     * Получение корректного контроллера
     * @param botController — Класс контроллера (если не передан, используется BaseBotController)
     */
    #getBotController(
        botController?: TBotControllerClass<TUserData, TPlatformState>,
    ): TBotControllerClass<TUserData, TPlatformState> {
        if (botController) {
            return botController;
        }
        // Ленивая загрузка дефолтного контроллера разрывает runtime-цикл
        // core/Bot → controller → core: статический импорт BaseBotController
        // заставил бы Bot.js требовать модуль controller в момент загрузки,
        // когда баррель core ещё не доинициализирован. К моменту вызова
        // конструктора все модули уже загружены, поэтому require безопасен
        // (тот же приём, что и с опциональным re2 в utils/standard/RegExp.ts).
        const { BaseBotController } = require('../controller') as typeof import('../controller');
        return BaseBotController<TUserData, TPlatformState>;
    }

    /**
     * Создает новый экземпляр приложения
     *
     * @param {TAppType} [type] - Тип платформы (по умолчанию автоопределение)
     * @param {TBotControllerClass} [botController] - Контроллер с логикой
     *
     * @throws {Error} Если не удалось инициализировать тип платформы
     *
     * @example
     * ```ts
     * // Создание навыка для Алисы
     * const bot = new Bot(T_ALISA, MyController);
     *
     * // Создание бота для Telegram
     * const bot = new Bot(T_TELEGRAM, MyController);
     *
     * // Создание бота для VK
     * const bot = new Bot(T_VK, MyController);
     *
     * // Создание приложения по умолчанию
     * const bot = new Bot();
     * ```
     */
    constructor(type?: TAppType, botController?: TBotControllerClass<TUserData, TPlatformState>) {
        this.#botControllerClass = this.#getBotController(botController);
        this.#appContext = new AppContext();
        this.#defaultAppType = type || T_AUTO;
    }

    /**
     * Явно устанавливает тип платформы для всего приложения. Стоит использовать в крайнем случае
     * @param {TAppType | 'auto'} appType - Тип платформы или 'auto' для автоматического определения
     */
    public set appType(appType: TAppType | 'auto') {
        this.#defaultAppType = appType;
    }

    /**
     * Возвращает установленный тип приложения.
     * @returns {string} Текущий тип платформы
     */
    public get appType(): string {
        return this.#defaultAppType;
    }

    /**
     * Задает режим работы с регулярным выражениями.
     * При значении auto, регулярные выражения будут группироваться в группу, благодаря чему уменьшается время обработки. Логика начинает отрабатывать после того, как добавили более 300 команд.
     * При значении no-group, группировка регулярных выражений производиться не будет, из-за чего каждое регулярное выражение будет обрабатываться отдельно. Указывать данное значение стоит в том случае, если вы получаете сильную деградацию при обработке групп.
     * При значении group, все регулярные выражения будут добавляться в группу. Перед использованием данного значения, перепроверьте производительность, так как при группировке определенных регулярных выражений, производительность может быть ниже.
     * @param {TCommandGroupMode} mode - Определяет режим работы с регулярными выражениями.
     * @returns {this} Текущий экземпляр Bot для цепочки вызовов
     */
    public setCommandGroupMode(mode: TCommandGroupMode): this {
        this.#appContext.command.setCommandGroupMode(mode);
        return this;
    }

    /**
     * Устанавливает кастомный обработчик для определения типа платформы.
     *
     * По умолчанию фреймворк определяет платформу автоматически, перебирая зарегистрированные адаптеры
     * и вызывая их метод `isPlatformOnQuery`. Этот метод позволяет переопределить логику определения,
     * что полезно в следующих случаях:
     * - Нужно добавить поддержку кастомной платформы, не создавая адаптер.
     * - Требуется изменить стандартное поведение для конкретного набора запросов
     *   (например, по заголовкам или по содержимому запроса).
     * - Необходимо выполнить какую-то логику до того, как запрос попадёт в адаптер.
     *
     * **Важно:** резолвер выполняется **до** вызова `isPlatformOnQuery` любого адаптера.
     * Если резолвер возвращает строку (имя платформы), фреймворк использует это значение
     * и не выполняет стандартное автоопределение. Если возвращает `null`, то запускается
     * стандартный перебор адаптеров.
     *
     * В резолвер передаётся опциональная функция `detect`, которая вызывает встроенное
     * автоопределение. Это позволяет, например, получить результат стандартного определения
     * и затем скорректировать его.
     *
     * @param resolver - Функция, принимающая запрос, заголовки и опционально `detect`.
     *                   Должна вернуть имя платформы (строка) или `null`.
     * @returns Тот же экземпляр приложения для цепочечных вызовов.
     *
     * @example
     * // Простейший резолвер, который для всех запросов использует платформу 'alisa'
     * bot.setPlatformResolver(() => 'alisa');
     *
     * @example
     * // Резолвер, который вызывает стандартное определение и при необходимости
     * // заменяет результат для конкретного заголовка.
     * bot.setPlatformResolver((query, headers, detect) => {
     *   const platform = detect?.(query, headers);
     *   if (platform === 'telegram' && headers?.['x-force-vk']) {
     *     return 'vk';
     *   }
     *   return platform;
     * });
     *
     * @example
     * // Полное переопределение: обработка запросов от собственного сервиса.
     * bot.setPlatformResolver((query) => {
     *   if (typeof query === 'object' && query?.source === 'my_service') {
     *     return 'my_platform';
     *   }
     *   return null;
     * });
     *
     * @remarks
     * - Резолвер выполняется синхронно. Если нужна асинхронная логика — выполните её до вызова резолвера.
     * - Внутри резолвера можно модифицировать `query` или `headers`, если нужно повлиять
     *   на дальнейшую обработку (например, добавить недостающие поля).
     * - Если резолвер возвращает имя платформы, для которой нет зарегистрированного
     *   адаптера, фреймворк выбросит ошибку. Убедитесь, что нужный адаптер подключен.
     */
    public setPlatformResolver(resolver: TPlatformResolver): this {
        this.#platformResolver = resolver;
        return this;
    }

    /**
     * Позволяет установить свою реализацию для логирования
     * @param {ILogger | null} logger - Экземпляр логгера или null для отключения
     * @returns {this} Текущий экземпляр Bot для цепочки вызовов
     */
    public setLogger(logger: ILogger | null): this {
        this.#appContext.setLogger(logger);
        return this;
    }

    /**
     * Регистрирует команду — обработчик, срабатывающий при совпадении входящего текста с одним из шаблонов.
     *
     * Поиск команд оптимизирован:
     * 1. Сначала проверяется точное совпадение
     * 2. Если точного совпадения нет — выполняется последовательный перебор в порядке регистрации
     *
     * Первая совпавшая команда выполняется.
     *
     * @param {string} commandName - Уникальное имя команды (например, `'greeting'`). Используется для логирования и отладки.
     * @param {TSlots} slots - Массив шаблонов для сопоставления:
     *   - Если элемент — строка → ищется как подстрока (`text.includes(...)`).
     *   - Если элемент — RegExp → проверяется как регулярное выражение (`.test(text)`).
     *   - Параметр `isPattern` учитывается **только если в `slots` нет RegExp**.
     *   - При наличии хотя бы одного `RegExp`, `isPattern = false` игнорируется, и каждый элемент
     *     обрабатывается согласно своему типу.
     * @param {ICommandParam['cb']} cb - Обработчик команды. Принимает:
     *   - `text` — исходный текст от пользователя;
     *   - `controller` — экземпляр `BotController` для формирования ответа (кнопки, текст, шаги, данные и т.д.);
     *
     *   Поддерживает `async`.
     * @param {boolean} isPattern - Если `true` и в `slots` **нет RegExp**, все строки преобразуются в регулярные выражения.
     *                   ⚠️ Используйте с осторожностью: возможен ReDoS. Все RegExp проверяются на уязвимости.
     *
     * @example
     * Простая текстовая команда:
     * ```ts
     * bot.addCommand(
     *   'greeting',
     *   ['привет', 'здравствуй'],
     *   (cmd, ctrl) => {
     *     ctrl.text = 'Здравствуйте!';
     *   }
     * );
     * ```
     *
     * @example
     * Команда с регулярными выражениями:
     * ```ts
     * // Обработка чисел от 0 до 999
     * bot.addCommand(
     *   'number',
     *   ['\\b(\\d{0,3})\\b'],
     *   (cmd, ctrl) => {
     *     ctrl.text = `Вы ввели число: ${cmd}`;
     *   },
     *   true  // включаем поддержку регулярных выражений
     * );
     * ```
     *
     * @example
     * Команда с доступом к состоянию:
     * ```ts
     * bot.addCommand(
     *   'stats',
     *   ['статистика'],
     *   async (cmd, ctrl) => {
     *       // Доступ к пользовательским данным
     *       const visits = ctrl.userData?.visits || 0;
     *       ctrl.text = `Вы использовали приложение ${visits} раз`;
     *
     *       // Доступ к кнопкам и другим UI элементам
     *       ctrl.buttons
     *         .addBtn('Сбросить статистику')
     *         .addBtn('Закрыть');
     *   }
     * );
     * ```
     *
     * @example
     * // Асинхронная команда (работа с API):
     * ```ts
     * bot.addCommand('weather', ['погода'], async (text, controller) => {
     *   const weather = await fetch('Какой-то сервис для получения погоды');
     *   controller.text = `Погода: ${await weather.text()}`;
     * });
     * ```
     *
     * @example
     * // Fallback: срабатывает, если ни одна команда не подошла:
     * ```ts
     * bot.addCommand('*', [], (text, controller) => {
     *   controller.text = `Извините, я не понял "${text}". Скажите "помощь" для списка команд.`;
     * });
     * ```
     *
     * @remarks
     * Поиск команд оптимизирован:
     * 1. Сначала проверяется точное совпадение
     * 2. Если точного совпадения нет — выполняется последовательный перебор
     *
     * При регистрации более 300 команд с регулярными выражениями
     * фреймворк автоматически объединяет их в группы для повышения производительности.
     *
     * При isPattern=true используются регулярные выражения JavaScript
     * В callback доступен весь функционал BotController
     * Можно использовать async функции в callback
     */
    public addCommand<TBotController extends BotController = BotController>(
        commandName: string,
        slots: TSlots,
        cb: ICommandParam<TBotController>['cb'],
        isPattern: boolean = false,
    ): this {
        let correctSlots = slots;
        if (slots.length === 0) {
            switch (commandName) {
                case DEFAULT_WELCOME_INTENT_NAME:
                    correctSlots = DEFAULT_WELCOME_INTENT_SLOTS;
                    break;
                case DEFAULT_HELP_INTENT_NAME:
                    correctSlots = DEFAULT_HELP_INTENT_SLOTS;
                    break;
            }
        }
        this.#appContext.command.addCommand(commandName, correctSlots, cb, isPattern);
        return this;
    }

    /**
     * Удаляет зарегистрированную команду по имени
     * @param commandName - Имя команды
     * @returns {this} Текущий экземпляр Bot для цепочки вызовов
     */
    public removeCommand(commandName: string): this {
        this.#appContext.command.removeCommand(commandName);
        return this;
    }

    /**
     * Удаляет **все** зарегистрированные команды
     *
     * > ⚠️ Это **глобальная операция**: все сценарии станут недоступны.
     * > Используйте с осторожностью (например, при перезагрузке логики приложения).
     *
     * @returns {this} Текущий экземпляр Bot для цепочки вызовов
     */
    public clearCommands(): this {
        this.#appContext.command.clearCommands();
        return this;
    }

    /**
     * Регистрирует обработчик для именованного шага диалога.
     *
     * Шаг — это часть **многошагового сценария** (например: "регистрация", "оформление заказа").
     * После вызова `ctx.thisIntentName = 'myStep'` в команде или другом шаге,
     * следующее сообщение пользователя будет обработано этим обработчиком.
     *
     * > 💡 Обработчик получает полный `BotController`, как и в командах:
     * > доступны `this.text`, `this.userData`, `this.buttons` и т.д.
     *
     * @param stepName — Уникальное имя шага (например, `'enter_email'`).
     * @param handler — Функция, вызываемая при получении сообщения в этом шаге.
     *                  Может вернуть `false`, чтобы пропустить шаг и передать управление командам.
     * @returns Текущий экземпляр `Bot` (для цепочки вызовов).
     *
     * @example
     * ```ts
     * bot.addCommand('start', ['начать'], (_, ctx) => {
     *      ctx.text = 'Готовы начать приключение?';
     *      ctx.buttons.addBtn('Да').addBtn('Нет');
     *      ctx.thisIntentName = 'confirm';
     * });
     * bot.addStep('confirm', (ctx) => {
     *   if (ctx.userCommand === 'да') {
     *     ctx.text = 'Отлично! Добро пожаловать.';
     *   } else {
     *     ctx.text = 'Извините, вход запрещён.';
     *     ctx.thisIntentName = 'goodbye'; // переходим к другому шагу
     *   }
     * });
     * ```
     * @example
     * ```ts
     * // Пример многошаговой формы
     * bot.addCommand('order', ['заказать'], (_, ctx) => {
     *     ctx.text = 'Введите ваше имя:';
     *     ctx.thisIntentName = 'step_name';
     * });
     *
     * bot.addStep('step_name', (ctx) => {
     *     ctx.userData.name = ctx.userCommand;
     *     ctx.text = `Приятно познакомиться, ${ctx.userData.name}! Теперь введите email:`;
     *     ctx.thisIntentName = 'step_email';
     * });
     *
     * bot.addStep('step_email', (ctx) => {
     *     ctx.userData.email = ctx.userCommand;
     *     ctx.text = `Заказ оформлен! Имя: ${ctx.userData.name}, Email: ${ctx.userData.email}`;
     *     ctx.thisIntentName = null; // сбрасываем шаг
     * });
     * ```
     */
    public addStep<TBotController extends BotController = BotController>(
        stepName: string,
        handler: IStepParam<TBotController>['cb'],
    ): this {
        this.#appContext.command.addStep(stepName, handler);
        return this;
    }

    /**
     * Регистрирует многошаговую форму (опросник) с автоматической последовательностью шагов.
     *
     * Под капотом создаётся цепочка `addStep` — по одному на каждое поле. Состояние формы
     * (частичные ответы) сохраняется в `ctx.userData[<formName>]`.
     *
     * Чтобы запустить форму из команды, вызовите `ctx.thisIntentName = '__form_<formName>_0'` —
     * тогда следующий ответ пользователя пойдёт в обработчик первого поля.
     *
     * @remarks
     * Метод использует зарезервированные префиксы:
     * - имена шагов — `__form_<formName>_<idx>`
     * - ключ хранения промежуточных ответов — `userData.__formdata_<formName>`
     *
     * Не создавайте свои команды, шаги или поля `userData` с такими префиксами —
     * они будут перезаписаны или удалены при `removeForm`.
     *
     * @param formName — Уникальное имя формы. Используется как префикс для шагов
     *   и как ключ в `userData`. Должно совпадать с регуляркой `[a-zA-Z_$][\w$]*` или
     *   содержать только `.` (для dotted-имён).
     * @param options — Настройки формы: поля, `onComplete`, `cancelText` и т.п.
     * @returns Текущий экземпляр `Bot` (для цепочки).
     *
     * @example
     * ```ts
     * bot.addForm('registration', {
     *     fields: [
     *         { name: 'name',  prompt: 'Как вас зовут?',  validate: (v) => v.length > 0 },
     *         { name: 'email', prompt: 'Ваш email?',     validate: (v) => /\S+@\S+/.test(v) || 'Некорректный email' },
     *         { name: 'age',   prompt: 'Сколько вам лет?', validate: (v) => +v > 0 || 'Возраст должен быть числом' },
     *     ],
     *     onComplete: (ctx, answers) => {
     *         ctx.text = `Спасибо, ${answers.name}!`;
     *     },
     * });
     *
     * // Запуск из команды
     * bot.addCommand('start_signup', ['зарегистрироваться'], (_, ctx) => {
     *     ctx.thisIntentName = '__form_registration_0';
     *     ctx.text = 'Как вас зовут?'; // первый prompt
     * });
     * ```
     *
     * @see addStep
     */
    public addForm<TBotController extends BotController = BotController>(
        formName: string,
        options: IAddFormOptions<TBotController>,
    ): this {
        const cancelCommands = (options.cancelCommands ?? ['отмена', 'cancel']).map((s) =>
            s.toLowerCase(),
        );
        const cancelText = options.cancelText ?? 'Форма отменена.';
        const stepPrefix = `__form_${formName}_`;
        const dataKey = `__formdata_${formName}` as const;

        options.fields.forEach((field, index) => {
            const isLast = index === options.fields.length - 1;
            const currentStep = `${stepPrefix}${index}`;
            const nextStep = isLast ? null : `${stepPrefix}${index + 1}`;
            const nextField = options.fields[index + 1];

            this.addStep(currentStep, async (ctx: BotController) => {
                const userCtx = ctx as unknown as TBotController;
                const dataRec = userCtx.userData as unknown as Record<string, unknown>;
                const userText = (userCtx.userCommand ?? '').trim();
                // Ответ сохраняем в исходном регистре: userCommand адаптеры приводят
                // к нижнему регистру, что исказило бы имена, email и адреса.
                const answerText = (
                    userCtx.originalUserCommand ??
                    userCtx.userCommand ??
                    ''
                ).trim();

                // Команда отмены
                if (cancelCommands.includes(userText.toLowerCase())) {
                    delete dataRec[dataKey];
                    userCtx.thisIntentName = null;
                    userCtx.text = cancelText;
                    return;
                }

                // Валидация — поддерживаем и sync, и async валидаторы.
                let isValid: boolean | string = true;
                if (field.validate) {
                    const validateResult = field.validate(answerText);
                    isValid =
                        validateResult instanceof Promise ? await validateResult : validateResult;
                }
                if (isValid !== true) {
                    const customError = typeof isValid === 'string' ? isValid : null;
                    const promptText =
                        typeof field.prompt === 'function' ? field.prompt(userCtx) : field.prompt;
                    userCtx.text = (customError ? `${customError}\n` : '') + promptText;
                    // Остаёмся на этом же шаге: явно проставляем thisIntentName,
                    // чтобы на следующий запрос пользователь попал именно сюда.
                    userCtx.thisIntentName = currentStep;
                    return;
                }

                // Сохраняем ответ
                const formAnswers = (dataRec[dataKey] ?? {}) as Record<string, string>;
                formAnswers[field.name] = answerText;
                dataRec[dataKey] = formAnswers;

                if (isLast) {
                    delete dataRec[dataKey];
                    userCtx.thisIntentName = null;
                    // Дожидаемся onComplete: async-колбек иначе не успеет выставить
                    // ctx.text до формирования ответа, а его reject станет
                    // unhandled promise rejection.
                    await Promise.resolve(options.onComplete(userCtx, formAnswers));
                    return;
                }

                // Переходим к следующему полю
                userCtx.thisIntentName = nextStep as string;
                userCtx.text =
                    typeof nextField.prompt === 'function'
                        ? nextField.prompt(userCtx)
                        : nextField.prompt;
            });
        });

        return this;
    }

    /**
     * Удаляет зарегистрированный многошаговые формы по имени.
     *
     * После удаления форма больше не будет обрабатываться, даже если она активна у пользователя.
     * (Рекомендуется завершать активные сценарии через `ctx.thisIntentName = null` перед удалением.)
     *
     * @remarks
     * Сравнение идёт по префиксу `__form_<formName>_`. Осторожно: если у вас
     * есть формы `user` и `user_2`, вызов `removeForm('user')` также удалит
     * шаги формы `user_2` (её имя начинается с `__form_user_`).
     * Чтобы избежать этого, выбирайте `formName` с уникальным суффиксом,
     * не являющимся префиксом другой формы (например, `signup` vs `signupV2`).
     *
     * @param {string} formName — Имя формы для удаления.
     * @returns {this} Текущий экземпляр `Bot`.
     *
     * @example
     * ```ts
     * bot.removeForm('registration');
     * ```
     */
    public removeForm(formName: string): this {
        const stepPrefix = `__form_${formName}_`;
        this.#appContext.steps.forEach((step) => {
            if (step.stepName.startsWith(stepPrefix)) {
                this.removeStep(step.stepName);
            }
        });
        return this;
    }

    /**
     * Удаляет зарегистрированный шаг по имени.
     *
     * После удаления шаг больше не будет обрабатываться, даже если активен у пользователя.
     * (Рекомендуется завершать активные сценарии через `ctx.thisIntentName = null` перед удалением.)
     *
     * @param {string} stepName — Имя шага для удаления.
     * @returns {this} Текущий экземпляр `Bot`.
     *
     * @example
     * ```ts
     * bot.removeStep('confirm_order');
     * ```
     */
    public removeStep(stepName: string): this {
        this.#appContext.command.removeStep(stepName);
        return this;
    }

    /**
     * Удаляет **все** зарегистрированные шаги.
     *
     * > ⚠️ Это **глобальная операция**: все сценарии станут недоступны.
     * > Используйте с осторожностью (например, при перезагрузке логики приложения).
     *
     * @returns {this} Текущий экземпляр `Bot`.
     *
     * @example
     * ```ts
     * bot.clearSteps();
     * ```
     */
    public clearSteps(): this {
        this.#appContext.command.clearSteps();
        return this;
    }

    /**
     * Удаляет **все** зарегистрированные платформы, плагины и middleware службы.
     * Для каждого объектного плагина вызывается метод `destroy()`.
     *
     * > ⚠️ Это **глобальная операция**: все адаптеры и middleware станут недоступны.
     * > Команды и шаги при этом **не удаляются** — для их очистки используйте `clearCommands()` / `clearSteps()`.
     *
     * @returns {this} Текущий экземпляр `Bot`.
     *
     * @example
     * ```ts
     * bot.clearUse();
     * ```
     */
    public clearUse(): this {
        this.#appContext.platforms = {};
        this.#globalMiddlewares = [];
        this.#platformMiddlewares = {};
        this.#appContext.plugins = {};
        this.#plugins.forEach((plugin) => {
            if (typeof plugin === 'function') {
                plugin(this);
            } else {
                plugin.destroy?.(this)?.catch((e) => {
                    this.#appContext.logError(
                        `Произошла ошибка при уничтожении адаптера! Текст ошибки: ${e.message}`,
                        {
                            error: e,
                        },
                    );
                });
            }
        });
        this.#plugins = [];
        return this;
    }

    /**
     * Устанавливает режим работы приложения
     *
     * @param {'dev' | 'prod' | 'strict_prod'} appMode - Режим работы:
     * - 'dev': подробные логи, отладочная информация, отключена проверка ReDoS
     * - 'prod': минимальные логи, производительность, НО небезопасные RegExp всё равно регистрируются
     * - 'strict_prod': строгая проверка безопасности — любая RegExp с потенциальным ReDoS отклоняется с ошибкой
     *
     * ⚠️ ВАЖНО: В продакшене всегда используйте 'strict_prod' для защиты от атак через регулярные выражения.
     * Режим 'prod' оставлен для обратной совместимости, но небезопасен.
     *
     * @returns {this} Текущий экземпляр Bot для цепочки вызовов
     *
     * @example
     * ```ts
     * // Для продакшена (обязательно!)
     * bot.setAppMode('strict_prod');
     *
     * // Для разработки
     * bot.setAppMode('dev');
     * ```
     */
    public setAppMode(appMode: TAppMode): this {
        this.#appContext.appMode = appMode;
        this.#appContext.command.strictMode = appMode === 'strict_prod';
        return this;
    }

    /**
     * Позволяет заменить встроенный механизм сопоставления команд на **кастомный алгоритм поиска**.
     *
     *  По умолчанию `umbot` использует **оптимизированный поиск**:
     *  1. Сначала проверяется точное совпадение
     *  2. Если точного совпадения нет — выполняется последовательный перебор с поддержкой:
     *      - подстрок (`includes`),
     *      - простых регулярных выражений.
     *
     * Это обеспечивает **предсказуемость**, **простоту отладки** и **соответствие поведению большинства платформ**:
     * первая совпавшая команда (в порядке регистрации) — выигрывает.
     *
     * Однако при:
     * - количестве команд >1000,
     * - высокой нагрузке (>1000 RPS),
     * - необходимости в fuzzy-поиске или сложной маршрутизации,
     * вы можете подключить оптимизированный resolver.
     *
     * @param resolver - Функция вида `(userCommand: string, commands: Map<string, ICommandParam>) => string | null | Promise<string | null>`.
     *                    Должна вернуть имя команды или `null`, если совпадений нет.
     *
     * @example
     * ```ts
     * // Пример: кэширование частых запросов
     * const cache = new Map<string, string | null>();
     * bot.setCustomCommandResolver((text, commands) => {
     *   if (cache.has(text)) return cache.get(text)!;
     *
     *   for (const [name, cmd] of commands) {
     *     if (cmd.slots && cmd.slots.some(slot => typeof slot === 'string' && text.includes(slot))) {
     *       cache.set(text, name);
     *       return name;
     *     }
     *   }
     *   cache.set(text, null);
     *   return null;
     * });
     * ```
     *
     * @remarks
     * **Рекомендации при реализации resolver'а:**
     * - Сохраняйте **порядок регистрации команд**, если логика зависит от приоритета.
     * - Используйте **кэширование** для часто встречающихся фраз (но учитывайте потребление памяти).
     * - Для fuzzy-поиска — рассмотрите `fuse.js`, `natural` или trie-структуры.
     * - При работе с регулярными выражениями **обязательно проверяйте их на ReDoS**.
     * - Избегайте тяжёлых синхронных операций — они блокируют event loop.
     * @returns {this} Текущий экземпляр Bot для цепочки вызовов
     */
    public setCustomCommandResolver(resolver: TCommandResolver): this {
        this.#appContext.command.customCommandResolver = resolver;
        return this;
    }

    /**
     * Задаёт **инфраструктурную конфигурацию** приложения: подключение к БД, загрузку `.env`, и другие
     * настройки, связанные с окружением выполнения (а не с бизнес-логикой приложения).
     *
     * > 🔒 **Безопасность**: никогда не храните секреты (пароли, токены, API-ключи) прямо в коде.
     * > Всегда используйте `.env`-файлы или переменные окружения.
     *
     * @param {Partial<IAppConfig>} config - Конфигурация приложения
     *
     * @example
     * ```ts
     * // Конфигурация с базой данных
     * bot.setAppConfig({
     *   db: {
     *     host: 'localhost',
     *     database: 'bot_db',
     *     user: 'user',
     *     pass: 'password'
     *   }
     * });
     * ```
     *
     * @remarks
     * Важно! Чувствительные данные рекомендуется сохранять в .env файл, передав путь к нему:
     * ```ts
     * bot.setAppConfig({
     *     env: './.env', // путь до файла
     * });
     * ```
     * @returns {this} Текущий экземпляр Bot для цепочки вызовов
     */
    public setAppConfig(config: Partial<IAppConfig>): this {
        if (config) {
            this.#appContext.setAppConfig(config);
        }
        return this;
    }

    /**
     * Возвращает контекст приложения — центральный объект для расширенной настройки фреймворка.
     *
     * **Когда использовать:**
     * - Замена HTTP-клиента: `bot.getAppContext().httpClient = customFetch`
     * - Доступ к зарегистрированным адаптерам: `bot.getAppContext().platforms`
     * - Настройка метрик и логирования
     *
     * **Пример:**
     * ```ts
     * // Добавление таймаутов к запросам
     * const customFetch: THttpClient = async (url, init) => {
     *   const controller = new AbortController();
     *   const timeout = setTimeout(() => controller.abort(), 5000);
     *   return fetch(url, { ...init, signal: controller.signal });
     * };
     *
     * bot.getAppContext().httpClient = customFetch;
     *
     * ⚠️ Важно: Не модифицируйте внутренние поля контекста напрямую (например, commands, steps). Используйте публичные методы addCommand(), addStep().
     *
     * @returns {AppContext} Контекст приложения
     */
    public getAppContext(): AppContext {
        return this.#appContext;
    }

    /**
     * Задаёт параметры, управляющие **логикой приложения** на всех платформах.
     *
     * Сюда входят:
     * - список интентов по умолчанию (`help`, `welcome` и др.),
     * - тексты ответов по умолчанию (`welcome_text`, `help_text`, `empty_text`),
     * - другие настройки, не зависящие от конкретной платформы
     *
     * @param {IAppParam} params - Параметры платформы
     *
     * @example
     * ```ts
     * // Базовая настройка
     * bot.setPlatformParams({
     *   intents: [{
     *     name: 'help',
     *     slots: ['помощь', 'справка']
     *   }],
     *   welcome_text: 'Привет! Я ваш помощник.',
     *   help_text: 'Скажите "помощь", чтобы увидеть команды.',
     *   empty_text: 'Извините, я не понял.'
     * });
     * ```
     * @returns {this} Текущий экземпляр Bot для цепочки вызовов
     */
    public setPlatformParams(params: IAppParam): this {
        if (params) {
            this.#appContext.setPlatformParams(params);
        }
        return this;
    }

    /**
     * Устанавливает контроллер, метод `action()` которого вызывается **после обработки каждого запроса** —
     * независимо от того, была ли распознана команда, активен ли шаг сценария, или обработан базовый интент.
     *
     * Метод `action()` получает флаги `isCommand` и `isStep`, чтобы вы могли:
     * - добавить общую логику (аналитика, логирование, трассировка);
     * - модифицировать ответ глобально (например, добавить рекламу, кнопку "Оценить");
     * - применить кросс-функциональные правила (rate limiting, мутации текста и т.д.);
     *
     * > 💡 **Рекомендация**: основную бизнес-логику размещайте в командах (`addCommand`) и шагах (`addStep`),
     * > а в `action()` — только **сквозную** логику, которую не хочется дублировать.
     *
     * Контроллер по умолчанию уже обрабатывает интенты `welcome`, `help` и `fallback`,
     * но вы можете заменить его, если нужно кастомное поведение.
     *
     * @param {TBotControllerClass<TUserData, TPlatformState>} fn - Класс контроллера, наследующий `BotController<TUserData, TPlatformState>`
     *
     * @example
     * ```ts
     * class MyController extends BotController {
     *   public action(intentName: string): void {
     *     switch (intentName) {
     *       case 'greeting':
     *         this.text = 'Привет!';
     *         break;
     *       case 'help':
     *         this.text = 'Чем могу помочь?';
     *         break;
     *     }
     *   }
     * }
     *
     * bot.initBotController(MyController);
     * ```
     *
     * @example
     * ```ts
     * // Добавление рекламы ко всем ответам
     * class MyController extends BotController {
     *   public action(
     *     intentName: string | null,
     *     isCommand: boolean = false,
     *     isStep: boolean = false
     *   ): void {
     *     // Добавим кнопку "Подписаться" везде, кроме шагов
     *     if (!isStep) {
     *       this.buttons.addBtn('Подписаться на рассылку', 'http://localhost');
     *     }
     *
     *     // Логирование
     *     console.log(`Обработано: ${isCommand ? 'команда' : isStep ? 'шаг' : 'интент'} – ${intentName}`);
     *   }
     * }
     *
     * bot.initBotController(MyController);
     * ```
     * @returns {this} Текущий экземпляр Bot для цепочки вызовов
     */
    public initBotController(fn: TBotControllerClass<TUserData, TPlatformState>): this {
        if (fn) {
            this.#botControllerClass = fn;
        }
        return this;
    }

    /**
     * Устанавливает контент запроса.
     * Используется для передачи данных от пользователя в платформу.
     * Не рекомендуется использовать напрямую, использовать только в крайнем случае, либо для тестов
     *
     * @param {TBotContent} content - Контент запроса
     *
     * @example
     * ```ts
     * // Установка текстового сообщения
     * bot.setContent('Привет!');
     *
     * // Установка JSON-данных
     * bot.setContent({
     *   request: {
     *     command: 'привет',
     *     original_utterance: 'Привет, мир!'
     *   }
     * });
     * ```
     */
    public setContent(content: TBotContent): void {
        this._content = content;
    }

    /**
     * Очищает состояние пользователя
     */
    protected _clearState(botController: BotController): void {
        if (botController) {
            botController.clearStoreData();
        }
    }

    #defaultPlatformDetect(uBody: unknown, headers?: Record<string, unknown>): TAppType | null {
        if (this.#defaultAppType && this.#defaultAppType !== T_AUTO) {
            return this.#defaultAppType;
        }

        if (this.#appContext.platforms) {
            for (const platformName in this.#appContext.platforms) {
                if (this.#appContext.platforms[platformName].isPlatformOnQuery(uBody, headers)) {
                    return this.#appContext.platforms[platformName].platformName;
                }
            }
        }
        return null;
    }

    /**
     * Определяет тип приложения по заголовкам или телу запроса
     * @param uBody - Тело запроса
     * @param headers - Заголовки запроса
     */
    #getAppType(uBody: unknown, headers?: Record<string, unknown>): TAppType | null {
        if (this.#platformResolver) {
            const customType = this.#platformResolver(
                uBody,
                headers,
                this.#defaultPlatformDetect.bind(this, uBody, headers),
            );
            if (customType !== null) {
                return customType;
            }
        }
        return this.#defaultPlatformDetect(uBody, headers);
    }

    #initNLU(botController: BotController<TUserData, TPlatformState>): void {
        if (this.#appContext.plugins.nlu) {
            const nlu =
                typeof this.#appContext.plugins.nlu === 'function'
                    ? this.#appContext.plugins.nlu(
                          botController.userCommand || botController.originalUserCommand || '',
                          botController.nlu.getNluValue(),
                          botController.appType as string,
                          botController.requestObject,
                      )
                    : this.#appContext.plugins.nlu.getData(
                          botController.userCommand || botController.originalUserCommand || '',
                          botController.nlu.getNluValue(),
                          botController.appType as string,
                          botController.requestObject,
                      );
            botController.nlu.setNlu(nlu, true);
        }
    }

    async #getDbAdapter(dbAdapter: IDatabaseAdapter): Promise<IDatabaseAdapter | undefined> {
        if (!this.#appContext.database.isSendConnect) {
            if (this.#appConnectStatus.isConnecting) {
                if (isPromise(this.#appConnectStatus.status)) {
                    await this.#appConnectStatus.status;
                }
                if (!this.#appContext.database.isSendConnect) {
                    return undefined;
                }
            } else {
                this.#appConnectStatus.isConnecting = true;
                try {
                    const connectResult = dbAdapter.connect();
                    this.#appConnectStatus.status = connectResult;
                    let connected: boolean;
                    if (isPromise(connectResult)) {
                        connected = await connectResult;
                    } else {
                        connected = connectResult;
                    }
                    this.#appContext.database.isSendConnect = connected;
                } catch (e) {
                    this.#appContext.logError(
                        `Bot:#getDbAdapter(): Ошибка при подключении к базе данных: ${(e as Error).message}`,
                        { error: e },
                    );
                    return undefined;
                } finally {
                    this.#appConnectStatus.isConnecting = false;
                }
            }
        }
        return dbAdapter;
    }
    /* eslint-disable require-atomic-updates*/
    async #initUserData(
        botController: BotController<TUserData, TPlatformState>,
        userData?: UsersData,
        localStateData?: unknown,
    ): Promise<boolean> {
        if (botController.platformOptions.usedLocalStorage) {
            botController.state = localStateData as TPlatformState;
        }
        if (userData && !this.#appContext.appConfig.isLocalStorage) {
            const query = {
                userId: botController.userId,
            };
            if (await userData.whereOne(query)) {
                botController.userData = userData.data as TUserData;
                return false;
            } else {
                if (!botController.userData) {
                    botController.userData = {} as TUserData;
                }
                userData.userId = botController.userId;
                userData.meta = botController.userMeta as Record<string, unknown>;
            }
        }
        return true;
    }

    /**
     * Запуск логики приложения
     * @param botController - Контроллер с бизнес-логикой приложения
     * @param platformClass - Класс платформенного адаптера, который будет подготавливать корректный ответ в зависимости от платформы
     * @param appType - Тип приложения
     */
    async #runApp(
        botController: BotController<TUserData, TPlatformState>,
        platformClass: IPlatformAdapter,
        appType: TAppType,
    ): Promise<TRunResult> {
        const dbAdapter = this.#appContext.database.adapter
            ? await this.#getDbAdapter(this.#appContext.database.adapter)
            : undefined;
        let userData: UsersData | undefined;
        if (dbAdapter) {
            userData = new UsersData(this.#appContext);
            botController.userId = userData.escapeString(botController.userId as string | number);
            userData.platform = platformClass.platformName;
        }
        botController.platformOptions.usedLocalStorage =
            platformClass.isLocalStorage(botController);
        const isLocalStorage: boolean =
            this.#appContext.appConfig.isLocalStorage &&
            botController.platformOptions.usedLocalStorage;

        if (
            this.#appContext.appConfig.isLocalStorage &&
            !botController.platformOptions.usedLocalStorage &&
            !this.#appContext.database.adapter
        ) {
            this.#appContext.logWarn(
                `Bot:run(): Платформа "${appType}" не поддерживает локальное хранилище, ` +
                    `а DB-адаптер не подключён. userData не будет сохраняться между запросами. ` +
                    `Подключите DB-адаптер (FileAdapter/MongoAdapter) или отключите isLocalStorage.`,
                { platform: appType, userId: botController.userId },
            );
        }

        let isNewUser = true;
        let localStateData: unknown = botController.state;
        if (isLocalStorage) {
            localStateData = platformClass.getLocalStorage(botController);
            if (isPromise(localStateData)) {
                localStateData = await localStateData;
            }
        }
        if (isLocalStorage) {
            botController.userData = localStateData as TUserData;
        } else {
            isNewUser = await this.#initUserData(botController, userData, localStateData);
        }
        this.#initNLU(botController);
        const shouldProceed =
            this.#globalMiddlewares.length || this.#platformMiddlewares[appType]?.length
                ? await this.#runMiddlewares(botController, appType)
                : true;
        let content: string | object | null;
        try {
            if (shouldProceed) {
                content = await this.#getAppContent(botController, platformClass, appType);
            } else {
                // Middleware прервал обработку (next() не вызван). Возвращаем не сырую
                // строку, а полноценный ответ платформы: getContent() адаптера отправит
                // выставленный middleware текст (например, deniedText) и сформирует
                // валидный для платформы ответ.
                content = await this.#getPlatformContent(botController, platformClass);
            }
        } finally {
            await this.#saveUserData(botController, userData, isNewUser, isLocalStorage);
        }
        if (botController.platformOptions.error) {
            this.#appContext.logError(botController.platformOptions.error);
        }
        if (this.#$botController) {
            this._clearState(botController);
        }
        return content;
    }

    /**
     * Сохраняет данные пользователя в БД после обработки запроса.
     * Если пользователь новый — выполняется insert, иначе — update.
     * При использовании localStorage и отсутствии DB-адаптера сохранение пропускается.
     * @param botController Контроллер с данными текущего запроса
     * @param userData Экземпляр модели для работы с данными пользователя
     * @param isNewUser true, если пользователь новый (ещё не записан в БД)
     * @param isLocalStorage true, если данные хранятся в локальном хранилище платформы
     */
    async #saveUserData(
        botController: BotController<TUserData, TPlatformState>,
        userData: UsersData | undefined,
        isNewUser: boolean,
        isLocalStorage: boolean,
    ): Promise<void> {
        if (
            !userData ||
            (isLocalStorage &&
                (!botController.state ||
                    (botController.state as unknown as object) ===
                        (botController.userData as unknown as object)))
        ) {
            return;
        }
        userData.userId = botController.userId;
        userData.data = botController.userData;
        const userId = botController.userId;
        if (isNewUser) {
            await userData.save(true).catch((e) => {
                this.#appContext.logError(
                    `Bot:run(): Произошла ошибка при сохранении данных для нового пользователя "${userId}". Текст ошибки: ${e.message}`,
                    { error: e },
                );
            });
        } else {
            await userData.update().catch((e) => {
                this.#appContext.logError(
                    `Bot:run(): Произошла ошибка при сохранении данных для пользователя: "${userId}". Текст ошибки: ${e.message}`,
                    { error: e },
                );
            });
        }
    }

    #setOldIntentName(botController: BotController<TUserData, TPlatformState>): void {
        if (
            !botController.oldIntentName &&
            botController.userData &&
            botController.userData.oldIntentName
        ) {
            botController.oldIntentName = botController.userData.oldIntentName;
        } else if (
            !botController.oldIntentName &&
            botController.state &&
            typeof botController.state === 'object' &&
            botController.state.oldIntentName
        ) {
            botController.oldIntentName = botController.state.oldIntentName as string;
        }
    }

    /**
     * Валидация результата работы адаптера платформы
     * @param content
     * @param botController
     * @private
     */
    #validateAdapterResult(
        content: object | string,
        botController: BotController<TUserData, TPlatformState>,
    ): object | string {
        if (content === null || content === undefined) {
            this.#appContext.logWarn(
                `Bot:#getPlatformContent(): Адаптер платформы вернул null/undefined из getContent(). Ответ будет пустым.`,
                { platform: botController.platformOptions },
            );
            return '';
        }
        return content;
    }

    /**
     * Проставляет oldIntentName в userData или state и возвращает актуальный размер userData.
     *
     * @param botController Контроллер текущего запроса
     * @returns Количество значимых полей в userData
     */
    #applyOldIntentName(botController: BotController<TUserData, TPlatformState>): number {
        let userDataLength = keysCount(botController.userData);
        if (botController.thisIntentName !== null) {
            if (botController.state && userDataLength === 0) {
                botController.state.oldIntentName = botController.thisIntentName;
            } else {
                botController.userData.oldIntentName = botController.thisIntentName;
            }
            return userDataLength;
        }
        // В Алисе в любом случае будет какое-то поле, так как если ничего не будет, то данные просто не обновятся.
        // Поэтому в oldIntentName в любом случае необходимо писать null
        if (botController.userData.oldIntentName !== undefined) {
            userDataLength--;
            botController.userData.oldIntentName = null;
        }
        if (botController.state?.oldIntentName !== undefined) {
            botController.state.oldIntentName = null;
        }
        return userDataLength;
    }

    /**
     * Выбирает данные, которые нужно отдать платформе как состояние диалога.
     *
     * @param botController Контроллер текущего запроса
     * @param userDataLength Количество значимых полей в userData
     * @returns Данные состояния либо `undefined`, если сохранять нечего
     */
    #getStateData(
        botController: BotController<TUserData, TPlatformState>,
        userDataLength: number,
    ): Record<string, unknown> | undefined {
        if (
            this.#appContext.appConfig.isLocalStorage &&
            botController.platformOptions.usedLocalStorage
        ) {
            if (this.#appContext.database.adapter) {
                return (
                    botController.state && keysCount(botController.state)
                        ? botController.state
                        : botController.userData
                ) as Record<string, unknown>;
            }
            return (userDataLength ? botController.userData : botController.state) as Record<
                string,
                unknown
            >;
        }
        if (botController.state && keysCount(botController.state)) {
            return botController.state as Record<string, unknown>;
        }
        return undefined;
    }

    async #getPlatformContent(
        botController: BotController<TUserData, TPlatformState>,
        platformClass: IPlatformAdapter,
    ): Promise<string | object> {
        const userDataLength = this.#applyOldIntentName(botController);
        const stateData = this.#getStateData(botController, userDataLength);
        let content: string | object;
        if (botController.isSendRating) {
            content = await platformClass.getRatingContext(botController);
        } else {
            if (botController.state && userDataLength === 0) {
                // При isLocalStorage=true state и userData могут совпадать.
                // Безопасное приведение через unknown, т.к. в этом режиме типы эквивалентны.
                botController.userData = botController.state as unknown as TUserData;
            }
            // Ответ адаптера дожидаемся до валидации: почти все адаптеры асинхронные,
            // и без await проверка на null применялась бы к промису, то есть никогда
            // не срабатывала. Заодно состояние сохраняется уже после готового ответа.
            content = this.#validateAdapterResult(
                await platformClass.getContent(botController, stateData),
                botController,
            );
        }
        // Пустое состояние сохранять нечего: у платформ с внешним хранилищем
        // (SmartApp) такой вызов уходил лишним HTTP-запросом на каждый ответ.
        if (botController.platformOptions.usedLocalStorage && stateData) {
            const res = platformClass.setLocalStorage(stateData, botController);
            if (res) {
                await res;
            }
        }
        return content;
    }

    /* eslint-enable require-atomic-updates*/

    async #getAppContent(
        botController: BotController<TUserData, TPlatformState>,
        platformClass: IPlatformAdapter,
        appType: TAppType,
    ): Promise<string | object> {
        this.#setOldIntentName(botController);

        const res = botController.run();
        if (res) {
            await res;
        }

        if (botController.tts === null && this.#appContext.platforms[appType]?.isVoice) {
            botController.tts = botController.text;
        }

        return this.#getPlatformContent(botController, platformClass);
    }

    /**
     * Регистрирует middleware, вызываемый **до** выполнения `BotController.action()`.
     *
     * Middleware получает доступ к полному `BotController` (включая `text`, `isEnd`, `userData`, `buttons` и т.д.)
     * и может:
     * - Модифицировать контекст
     * - Прервать выполнение (если не вызвать `next()`)
     * - Выполнить логирование, tracing, rate limiting и др.
     *
     * @example
     * // Глобальный middleware (для всех платформ)
     * bot.use(async (ctx, next) => {
     *   console.log('Запрос от:', ctx.appType);
     *   await next();
     * });
     *
     * @param fn - Middleware-функция
     * @returns Текущий экземпляр `Bot` для цепочки вызовов
     */
    use(fn: MiddlewareFn): this;

    /**
     * Регистрирует middleware, вызываемый только для указанной платформы.
     *
     * @example
     * // Только для Алисы
     * bot.use(T_ALISA, async (ctx, next) => {
     *   if (!ctx.requestObject?.session?.user_id) {
     *     ctx.text = 'Некорректный запрос';
     *     ctx.isEnd = true;
     *     // next() не вызывается → action() не запускается
     *     return;
     *   }
     *   await next();
     * });
     *
     * @param platform - Идентификатор платформы (`alisa`, `telegram`, `vk`, и т.д.)
     * @param fn - Middleware-функция
     * @returns Текущий экземпляр `Bot`
     */
    use(platform: TAppType, fn: MiddlewareFn): this;

    /**
     * Регистрирует плагин — объект, расширяющий функциональность приложения.
     *
     * Плагин может быть как функцией, так и классом.
     * Если он реализован как метод, то должен быть указан флаг isPlugin.
     * В случае когда используется класс, то должен быть реализован метод `init(appContext: AppContext)`
     *
     * @param plugin — Объект плагина, совместимый с `TPlugin`.
     * @returns Текущий экземпляр `Bot`.
     *
     * @example
     * import {AlisaAdapter} from 'umbot/plugins'
     * bot.use(new AlisaAdapter());
     */
    use(plugin: TPlugin): this;

    /**
     * Регистрирует middleware или плагин (например, адаптер платформы).
     *
     * Поддерживаются три варианта:
     * - `use(middleware)` — глобальный middleware для всех платформ.
     * - `use(platform, middleware)` — middleware только для указанной платформы.
     * - `use(plugin)` — подключает плагин (объект с `init()` или функцию с `isPlugin: true`).
     *
     * Middleware имеет доступ к `BotController` и может:
     * - модифицировать контекст (`text`, `userData`, `buttons` и т.д.),
     * - прервать обработку (если не вызвать `next()`),
     * - выполнять логирование, проверки, tracing и др.
     *
     * Плагин получает `AppContext` при инициализации и может регистрировать
     * middleware, команды или другую логику.
     *
     * Метод поддерживает цепочку вызовов.
     */
    use(arg1: TAppType | MiddlewareFn | TPlugin, arg2?: MiddlewareFn): this {
        if (typeof arg1 === 'function') {
            if ((arg1 as IPluginFn).isPlugin) {
                const fn = (arg1 as IPluginFn)(this.#appContext, this);
                if (fn) {
                    this.#plugins.push(fn);
                }
            } else {
                this.#globalMiddlewares.push(arg1 as MiddlewareFn);
            }
            return this;
        }
        if (typeof arg1 !== 'string') {
            arg1.init(this.#appContext, this);
            this.#plugins.push(arg1);
        } else if (arg2) {
            this.#platformMiddlewares[arg1] ??= [];
            this.#platformMiddlewares[arg1].push(arg2);
        }
        return this;
    }

    /**
     * Выполняет middleware для текущего запроса
     * @param controller — Контроллер с данными запроса
     * @param appType — Тип платформы
     */
    async #runMiddlewares(controller: BotController, appType: TAppType): Promise<boolean> {
        if (appType) {
            const start = this.#appContext.usedMetric ? performance.now() : 0;

            let index = 0;
            let isEnd = false;
            try {
                let middlewares = this.#globalMiddlewares;
                const next = async (): Promise<void> => {
                    if (index < middlewares.length) {
                        const mw = middlewares[index++];
                        await mw(controller, next);
                    } else {
                        isEnd = true;
                    }
                };
                // Запускаем цепочку
                await next();
                if (isEnd && this.#platformMiddlewares[appType]?.length) {
                    isEnd = false;
                    index = 0;
                    middlewares = this.#platformMiddlewares[appType];
                    await next();
                }
            } catch (err) {
                this.#appContext.logError(
                    `Bot:runMiddlewares: Произошла ошибка при обработке middleware. Текст ошибки: ${(err as Error).message}`,
                    {
                        error: err,
                    },
                );
            }
            if (this.#appContext.usedMetric) {
                this.#appContext.logMetric(EMetric.MIDDLEWARE, performance.now() - start, {
                    platform: appType,
                });
            }
            return isEnd;
        }
        return true;
    }

    #$botController: BotController<TUserData, TPlatformState> | null = null;

    /**
     * Установка контроллера. Используется только для тестирования
     * @param botController
     * @protected
     */
    protected _setBotController(botController: BotController<TUserData, TPlatformState>): void {
        this.#$botController = botController;
    }

    /**
     * Получение контроллера приложения
     * Не использовать!
     * @internal
     */
    public getBotController(): BotController<TUserData, TPlatformState> | null {
        return this.#$botController;
    }

    /**
     * Выполняет непосредственную обработку входящего запроса от платформы.
     * Этот метод **не запускает HTTP-сервер** и **не обрабатывает HTTP-запросы напрямую** —
     * он принимает уже распарсенные данные и возвращает результат обработки.
     *
     * Обычно вызывается **внутри {@link webhookHandle}**, но может использоваться напрямую,
     * если вы реализуете собственный обработчик запросов, тестируете логику приложения
     * или запускаете его вне HTTP-контекста (например, из консоли или очереди сообщений).
     *
     * @param {TAppType | null} [appType] - Тип приложения. Если не указан, будет определен автоматически в зависимости от запроса.
     * @param {string | object | null} [content] - Входные данные для обработки (например, текст сообщения или объект запроса).
     * @param {TBotAuth} [auth] - Авторизационный токен
     * @param {string} [clientIp] - IP-адрес клиента. Заполняется автоматически при обработке
     * запроса через {@link webhookHandle} или {@link webhookEvent} и доступен middleware
     * (например, `ipFilter`) через `controller.platformOptions.clientIp`.
     * @returns {Promise<TRunResult>} Результат обработки запроса
     * @throws {Error} Если не удаётся определить платформу или отсутствуют данные для обработки.
     *
     * @example
     * ```ts
     * // Обработка запроса
     * const result = await bot.run();
     * console.log(result);
     * ```
     */
    public async run(
        appType: TAppType | null = null,
        content: string | object | null = null,
        auth: TBotAuth = null,
        clientIp?: string,
    ): Promise<TRunResult> {
        if (!this.#botControllerClass) {
            const errMsg =
                'Не определен класс с логикой приложения. Укажите класс контроллера, передав его в метод initBotController';
            this.#appContext.logError(errMsg);
            throw new Error(errMsg);
        }
        const correctContent = this.#parseContent(this._content || content);
        if (!correctContent) {
            const msg = `${appType ? `Для платформы "${appType}"` : 'Пришел не корректный запрос в котором'} передано пустое содержимое, дальнейшая обработка невозможна.`;
            this.#appContext.logError(msg);
            throw new BotBadRequestError(msg);
        }
        const botController: BotController<TUserData, TPlatformState> =
            this.#$botController || new this.#botControllerClass(this.#appContext);
        if (this.#$botController) {
            botController.setAppContext(this.#appContext);
        }
        botController.appType = appType || this.#getAppType(correctContent);
        const platformClass = botController.appType
            ? this.#appContext.platforms[botController.appType]
            : null;
        if (platformClass) {
            botController.userToken ??= auth;
            if (clientIp) {
                botController.platformOptions.clientIp = clientIp;
            }

            platformClass.updateTimeStart(botController);
            let res = platformClass.setQueryData(correctContent, botController);
            if (isPromise(res)) {
                res = await res;
            }
            if (res) {
                if (botController.platformOptions.sendInInit) {
                    return botController.platformOptions.sendInInit as TRunResult;
                }
                return this.#runApp(botController, platformClass, botController.appType as string);
            } else {
                const msg =
                    (botController.platformOptions.error as string) ||
                    `Адаптер платформы "${botController.appType}" не смог разобрать запрос.`;
                this.#appContext.logError(msg);
                throw new BotBadRequestError(msg);
            }
        } else {
            const msg =
                'Не удалось определить платформу, от которой пришел запрос. Дальнейшая обработка невозможна.';
            this.#appContext.logError(msg);
            throw new BotBadRequestError(msg);
        }
    }

    #parseContent(content: TBotContent): TBotContent {
        let parsed: TBotContent = content;
        if (content && typeof content === 'string') {
            try {
                parsed = JSON.parse(content);
            } catch {
                const msg = 'Передана невалидная JSON-строка. Убедитесь, что данные корректны.';
                this.#appContext.logError(msg);
                throw new BotBadRequestError(msg);
            }
        }
        // Платформы всегда присылают JSON-объект. Если в теле после разбора оказался
        // скаляр или массив — запрос некорректен: раньше он падал с 500 внутри
        // пайплайна, а на 5xx платформы включают ретраи и отключают вебхук.
        // Пустое содержимое оставляем для проверки в run(): там сообщение
        // дополняется именем платформы.
        if (parsed && (typeof parsed !== 'object' || Array.isArray(parsed))) {
            const msg = 'Тело запроса не является JSON-объектом. Убедитесь, что данные корректны.';
            this.#appContext.logError(msg);
            throw new BotBadRequestError(msg);
        }
        return parsed;
    }

    #isWebhookError(
        req: IncomingMessage,
        res: ServerResponse,
        responseCb?: TBotResponseCb,
    ): boolean {
        if (req.method !== 'POST') {
            this.#webhookHandleError(req, res, 400, responseCb);
            return true;
        }
        const contentLength = req.headers['content-length'];
        if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
            this.#webhookHandleError(req, res, 413, responseCb);
            return true;
        }
        return false;
    }

    #webhookHandleError(
        req: IncomingMessage,
        res: ServerResponse,
        code: number,
        responseCb?: TBotResponseCb,
        customBody?: string,
    ): void {
        let body = 'Bad Request';
        let statusCode = code;
        switch (code) {
            case 400:
                body = customBody ?? 'Empty request';
                break;
            case 422:
                statusCode = 400;
                body = 'Invalid JSON';
                break;
            case 413:
                body = 'Request entity too large';
                break;
            case 401:
                body = 'Invalid token';
                break;
            case 404:
                body = 'Not found';
                break;
            case 500:
                body = 'Internal Server Error';
                break;
        }
        return send(
            req,
            res,
            {
                statusCode,
                body,
                defaultSend,
            },
            responseCb,
        );
    }

    /**
     * Обрабатывает входящий webhook-запрос от поддерживаемой платформы (Telegram, VK, Алиса и др.).
     * Метод автоматически распознаёт платформу по заголовкам или телу запроса и делегирует обработку
     * соответствующему адаптеру. Ответ отправляется автоматически через переданный объект `res`.
     *
     * @param req - Объект входящего запроса (IncomingMessage или совместимый)
     * @param res - Объект ответа (ServerResponse или совместимый)
     * @param responseCb - Callback, для пользовательской обработки ответа пользователю. Стоит использовать в том случае, если есть необходимость переопределить стандартный ответ фреймворка.
     * Если передан, ВЫ ДОЛЖНЫ вызвать res.end() самостоятельно.
     * Без колбэка фреймворк автоматически завершит ответ через res.end().
     *
     * @example
     * ```ts
     * // Использование с Express
     * import express from 'express';
     * const app = express();
     * app.use(express.json());
     *
     * const bot = new Bot();
     *
     * app.post('/webhook', (req, res) => bot.webhookHandle(req, res));
     * ```
     * @example
     * // Использование с встроенным HTTP-сервером Node.js
     * import { createServer } from 'http';
     *
     * const bot = new Bot();
     * const server = createServer((req, res) => {
     *   if (req.method === 'POST' && req.url === '/webhook') {
     *     bot.webhookHandle(req, res);
     *   } else {
     *     res.statusCode = 404;
     *     res.end();
     *   }
     * });
     * server.listen(3000);
     * @example
     * ```ts
     * // Пример с переопределением ответа
     * import { createServer } from 'http';
     *
     * const bot = new Bot();
     * const server = createServer((req, res) => {
     *   if (req.method === 'POST' && req.url === '/webhook') {
     *     // В случае если вернулся статус отличный от 200, вернет содержимое какой-то страницы.
     *     bot.webhookHandle(req, res, (_reg: IncomingMessage, _res: ServerResponse, state: IBotResponseState) => {
     *          if (state.statusCode === 200) {
     *              return state.defaultSend(_res, state);
     *          }
     *          _res.statusCode = 200;
     *          _res.end(...);// Какое-то содержимое страницы
     *     });
     *   } else {
     *     res.statusCode = 404;
     *     res.end();
     *   }
     * });
     * server.listen(3000);
     *
     * ```
     */
    public async webhookHandle(
        req: IncomingMessage,
        res: ServerResponse,
        responseCb?: TBotResponseCb,
    ): Promise<void> {
        if (this.#isWebhookError(req, res, responseCb)) {
            return;
        }
        let appType: string | null = null;
        try {
            if (this.#appContext.usedMetric) {
                this.#appContext.logMetric(EMetric.START_WEBHOOK, Date.now(), {});
            }
            const startTimer = this.#appContext.usedMetric ? performance.now() : 0;
            const data = await this.#readRequestData(req);
            const query = JSON.parse(data) as string | null;
            if (!query) {
                return this.#webhookHandleError(req, res, 400, responseCb);
            }
            let auth: TBotAuth = null;
            if (req.headers?.authorization) {
                auth = req.headers.authorization.replace('Bearer ', '');
            }

            appType = this.#getAppType(query, req.headers);
            if (appType && this.#appContext.platforms[appType]) {
                if (!this.#appContext.platforms[appType].isCorrectQuery(data, req.headers)) {
                    // Логируем ТОЛЬКО мета-информацию, не весь req/res.
                    // IncomingMessage содержит сырые sockets, headers с cookies/etc —
                    // сериализация создаёт огромные логи и теневую утечку данных.
                    this.#appContext.logError(
                        `Bot:webhookHandle(): Для платформы "${appType}", пришел запрос с неверным токеном. Дальнейшая обработка запроса остановлена.`,
                        {
                            method: req.method,
                            url: req.url,
                            // Маскируем потенциально чувствительные заголовки явно
                            remoteAddress: req.socket?.remoteAddress,
                            userAgent: req.headers?.['user-agent'],
                        },
                    );
                    return this.#webhookHandleError(req, res, 401, responseCb);
                }
            }
            const result = await this.run(appType, query, auth, req.socket?.remoteAddress);
            const statusCode = result === 'notFound' ? 404 : 200;
            if (this.#appContext.usedMetric) {
                this.#appContext.logMetric(EMetric.END_WEBHOOK, performance.now() - startTimer, {
                    appType,
                    success: statusCode === 200,
                });
            }
            return send(
                req,
                res,
                {
                    statusCode,
                    body: result,
                    defaultSend,
                },
                responseCb,
            );
        } catch (error) {
            if (error instanceof SyntaxError) {
                this.#appContext.logError(
                    `Bot:webhookHandle(): Невозможно распарсить тело запроса как JSON. Убедитесь, что платформа "${appType}" отправляет корректные данные: ${error.message}`,
                    {
                        file: 'Bot:webhookHandle()',
                        error,
                    },
                );
                return this.#webhookHandleError(req, res, 422, responseCb);
            }
            if (error instanceof BotBadRequestError) {
                // Проблема в самом запросе, а не в сервере. На 5xx Telegram и VK
                // включают ретраи и отключают вебхук, поэтому отвечаем 400.
                return this.#webhookHandleError(req, res, 400, responseCb, 'Bad Request');
            }
            this.#appContext.logError(
                `Bot:webhookHandle(): Произошла ошибка при работе приложения для платформы "${appType}": ${error instanceof Error ? error.message : JSON.stringify(error)}`,
                {
                    error,
                },
            );
            return this.#webhookHandleError(req, res, 500, responseCb);
        }
    }

    /**
     * Обрабатывает входящее событие от серверлесс-платформы (например, Yandex Cloud Functions)
     * с предварительной проверкой подлинности запроса через `isCorrectQuery` соответствующей платформы.
     *
     * **Зачем это нужно:**
     * В отличие от {@link run}, метод принимает заголовки запроса и выполняет ту же проверку
     * webhook-токена/подписи, что и {@link webhookHandle}. Это защищает cloud-функцию от
     * поддельных запросов: если у платформы задан секрет вебхука, запрос без корректной
     * подписи будет отклонён со статусом 401 до выполнения какой-либо логики.
     *
     * **Когда использовать:**
     * - Приложение разворачивается как serverless-функция (Yandex Cloud Functions, AWS Lambda и т.п.),
     *   где нет нативных `IncomingMessage`/`ServerResponse` для {@link webhookHandle}.
     *
     * @param {string | object | null} data - Тело запроса. Рекомендуется передавать сырую строку
     *        (как она пришла от платформы), чтобы проверка подписи (HMAC) считалась от исходного тела.
     * @param {Record<string, unknown>} [headers] - Заголовки запроса (для проверки подписи и авторизации).
     * @param {string} [clientIp] - IP-адрес клиента (опционально, для middleware и логирования).
     * @returns {Promise<IWebhookEventResult>} Объект с HTTP-статусом и телом ответа для возврата из cloud-функции.
     *
     * @example
     * ```ts
     * // Обработчик Yandex Cloud Function
     * export const handler = async (event: Record<string, unknown>) => {
     *     const result = await bot.webhookEvent(event.body, event.headers);
     *     return {
     *         statusCode: result.statusCode,
     *         headers: { 'Content-Type': 'application/json' },
     *         body: typeof result.body === 'string' ? result.body : JSON.stringify(result.body),
     *     };
     * };
     * ```
     */
    public async webhookEvent(
        data: string | object | null,
        headers: Record<string, unknown> = {},
        clientIp?: string,
    ): Promise<IWebhookEventResult> {
        let query: string | object | null;
        if (typeof data === 'string') {
            try {
                query = JSON.parse(data) as object;
            } catch (error) {
                this.#appContext.logError(
                    `Bot:webhookEvent(): Невозможно распарсить тело запроса как JSON: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                    { file: 'Bot:webhookEvent()' },
                );
                // 400, как и webhookHandle: некорректный запрос — не ошибка сервера.
                return { statusCode: 400, body: 'Invalid JSON' };
            }
        } else {
            query = data;
        }
        if (!query) {
            return { statusCode: 400, body: 'Empty request' };
        }

        let auth: TBotAuth = null;
        const authHeader = headers.authorization ?? headers.Authorization;
        if (authHeader) {
            auth = String(authHeader).replace('Bearer ', '');
        }

        const appType = this.#getAppType(query, headers);
        if (appType && this.#appContext.platforms[appType]) {
            if (!this.#appContext.platforms[appType].isCorrectQuery(data, headers)) {
                // Логируем только мета-информацию, не всё тело запроса.
                this.#appContext.logError(
                    `Bot:webhookEvent(): Для платформы "${appType}" пришёл запрос с неверным токеном. Дальнейшая обработка остановлена.`,
                    { userAgent: headers['user-agent'] },
                );
                return { statusCode: 401, body: 'Unauthorized' };
            }
        }

        try {
            const result = await this.run(appType, query, auth, clientIp);
            return { statusCode: result === 'notFound' ? 404 : 200, body: result };
        } catch (error) {
            if (error instanceof BotBadRequestError) {
                // См. webhookHandle: некорректный запрос платформы — это 400, не 500.
                return { statusCode: 400, body: 'Bad Request' };
            }
            this.#appContext.logError(
                `Bot:webhookEvent(): Произошла ошибка при обработке запроса для платформы "${appType}": ${
                    error instanceof Error ? error.message : String(error)
                }`,
                { error },
            );
            return { statusCode: 500, body: 'Internal Server Error' };
        }
    }

    /**
     * Запускает встроенный HTTP-сервер на указанном хосте и порте для приёма webhook-запросов
     * от поддерживаемых платформ. Сервер использует нативный `http.createServer`.
     *
     * Метод возвращает экземпляр `http.Server`, что позволяет, например, корректно
     * остановить сервер или добавить обработчики событий (`'listening'`, `'error'` и т.д.).
     *
     * Если требуется интеграция с фреймворком (например, Express, Fastify и др.),
     * рекомендуется использовать {@link webhookHandle} как middleware-обработчик.
     *
     * @see webhookHandle
     *
     * @param {string} hostname - Имя хоста
     * @param {number} port - Порт
     * @param responseCb - Callback, для пользовательской обработки ответа пользователю. Стоит использовать в том случае, если есть необходимость переопределить стандартный ответ фреймворка.
     * @returns {Server} Экземпляр http.Server для управления сервером
     *
     * @example
     * ```ts
     * // Запуск встроенного сервера
     * const bot = new Bot();
     * bot.start('0.0.0.0', 8080);
     *
     * // Интеграция с Express (вместо встроенного сервера)
     * import express from 'express';
     * import { Bot } from 'umbot';
     *
     * const bot = new Bot();
     * const app = express();
     * app.use(express.json());
     * app.post('/webhook', (req, res) => bot.webhookHandle(req, res));
     *
     * app.listen(3000, () => {
     *   console.log('Bot listening on port 3000');
     * });
     * ```
     * ```ts
     * // Пример с переопределением ответа
     * const bot = new Bot();
     * // В случае если вернулся статус отличный от 200, вернет содержимое какой-то страницы.
     * bot.start('0.0.0.0', 8080, (reg: IncomingMessage, _res: ServerResponse, state: IBotResponseState) => {
     *      if (state.statusCode === 200) {
     *          return state.defaultSend(_res, state);
     *      }
     *      _res.statusCode = 200;
     *      _res.end(...);// Какое-то содержимое страницы
     * });
     * ```
     */
    public start(
        hostname: string = 'localhost',
        port: number = 3000,
        responseCb?: TBotResponseCb,
    ): Server {
        if (this.#serverInst) {
            this.#serverInst.close();
            this.#serverInst = undefined;
        }

        this.#serverInst = createServer(
            async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
                if (req.method === 'GET' && req.url === '/health') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
                    return;
                }
                return this.webhookHandle(req, res, responseCb);
            },
        );

        this.#serverInst.on('error', (err: NodeJS.ErrnoException) => {
            this.#appContext.logError(
                `Bot:start(): Ошибка HTTP-сервера на ${hostname}:${port}: ${err.message}`,
                { error: err, code: err.code },
            );
        });

        this.#serverInst.listen(port, hostname, () => {
            this.#appContext.log(`Server running at //${hostname}:${port}/`);
        });
        // Если завершили процесс, то закрываем все подключения и чистим ресурсы.
        // Удаляем старые обработчики, если start() вызывается повторно
        if (this.#sigtermHandler) {
            process.removeListener('SIGTERM', this.#sigtermHandler);
        }
        if (this.#sigintHandler) {
            process.removeListener('SIGINT', this.#sigintHandler);
        }
        this.#sigtermHandler = (): void => {
            void this.#gracefulShutdown();
        };
        this.#sigintHandler = (): void => {
            void this.#gracefulShutdown();
        };
        process.once('SIGTERM', this.#sigtermHandler);
        process.once('SIGINT', this.#sigintHandler);

        return this.#serverInst;
    }

    /**
     * Вызывается при завершении приложения через комбинацию клавиш
     * @private
     */
    async #gracefulShutdown(): Promise<void> {
        this.#appContext.log('Получен сигнал завершения. Выполняется graceful shutdown...');

        try {
            await this.close();
        } catch (err) {
            // Если БД-адаптер или плагин не смог закрыться, это не должно блокировать выход.
            // Иначе процесс зависнет и не ответит на SIGTERM (например, в Docker).
            this.#appContext.logError('Ошибка при graceful shutdown (close):', {
                error: err as Error,
            });
        }
        try {
            this.#appContext.command.clearCommands();
            this.#appContext.command.clearSteps();
            Text.clearCache();
        } catch (err) {
            this.#appContext.logError('Ошибка при graceful shutdown (cleanup):', {
                error: err as Error,
            });
        }

        this.#appContext.log('Graceful shutdown завершён.');
        // Даём event loop завершить отложенные I/O-операции (запись в файл, закрытие сокетов)
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
        process.exit(0);
    }

    /**
     * Обработка запросов webhook сервера
     * @param req — Входящий HTTP-запрос
     */
    #readRequestData(req: IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            let totalLength = 0;
            let finished = false;

            const cleanup = (): void => {
                if (!finished) {
                    finished = true;
                    clearTimeout(timeoutId);
                    req.removeListener('data', onData);
                    req.removeListener('end', onEnd);
                    req.removeListener('error', onError);
                }
            };

            const onData = (chunk: Buffer): void => {
                chunks.push(chunk);
                totalLength += chunk.length;
                if (totalLength > MAX_REQUEST_SIZE) {
                    cleanup();
                    req.destroy(new Error('Request too large'));
                    reject(new Error('Request too large'));
                }
            };

            const onEnd = (): void => {
                cleanup();
                resolve(Buffer.concat(chunks).toString());
            };

            const onError = (err: Error): void => {
                cleanup();
                reject(err);
            };

            // Timeout 30 сек — защита от зависших запросов (клиент отключился без end/error)
            const timeoutId = setTimeout(() => {
                if (!finished) {
                    cleanup();
                    req.destroy(new Error('Request timeout'));
                    reject(new Error('Request timeout'));
                }
            }, 30000).unref();

            req.on('data', onData);
            req.on('end', onEnd);
            req.on('error', onError);
        });
    }

    /**
     * Корректно завершает работу встроенного HTTP-сервера (если он был запущен через {@link start}).
     * Ожидает завершения всех текущих запросов, освобождает сетевые ресурсы и отменяет
     * все активные асинхронные операции, связанные с жизненным циклом приложения.
     *
     * Метод безопасен для повторного вызова.
     *
     * @returns {Promise<void>} Завершается, когда сервер остановлен и все ресурсы освобождены.
     *
     * @example
     * ```ts
     * const bot = new Bot();
     * bot.start('localhost', 3000);
     *
     * // ... позже, при завершении приложения
     * await bot.close();
     * ```
     */
    public async close(): Promise<void> {
        if (this.#serverInst) {
            const server = this.#serverInst;
            this.#serverInst = undefined;
            // Дожидаемся завершения активных запросов: без await процесс мог
            // завершиться раньше, чем сервер отпустит сокеты, и клиент получал обрыв.
            await new Promise<void>((resolve) => {
                server.close(() => resolve());
            });
        }
        // Удаляем обработчики сигналов
        if (this.#sigtermHandler) {
            process.removeListener('SIGTERM', this.#sigtermHandler);
            this.#sigtermHandler = null;
        }
        if (this.#sigintHandler) {
            process.removeListener('SIGINT', this.#sigintHandler);
            this.#sigintHandler = null;
        }
        // Также необходимо почистить все подключенные плагины.
        this.clearUse();
        await this.#appContext.close();
    }

    /**
     * Отправка текста пользователю
     * Этот метод используется для активных рассылок — когда голосовой навык или чат-бот инициирует диалог первым (например, уведомление).
     * Метод делегирует отправку соответствующему адаптеру платформы.
     *
     * Если платформа не поддерживает возможность начать диалог самостоятельно, то вернется false
     * @param userId Ид пользователя, которому нужно отправить сообщение
     * @param controllerOrText Контроллер приложения или текст. Если необходимо отправить просто текст, можно передать строку, в случае, если необходимо передать картинку звук и тд, то необходимо корректно заполнить контроллер.
     * @param platform Платформа, на которую необходимо отправить запрос
     * @returns {Promise<unknown | boolean>} Результат отправки или false, если платформа не зарегистрирована
     */
    public async send(
        userId: string | number,
        controllerOrText: BotController | string,
        platform: TAppType,
    ): Promise<unknown | boolean> {
        if (this.#appContext.platforms?.[platform]) {
            return this.#appContext.platforms[platform].send(userId, controllerOrText);
        }
        return false;
    }
}
