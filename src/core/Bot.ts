import { IAppConfig, IAppParam, TAppType, EMetric, TAppMode } from './interfaces/IAppContext';
import {
    IBotResponse,
    IBotResponseState,
    IPlatformAdapter,
    IPluginFn,
    TBotAuth,
    TBotContent,
    TBotResponseCb,
    TPlugin,
} from './interfaces/IBot';

import { ICommandParam, TSlots, TCommandResolver, IStepParam } from './utils/CommandReg';
import { IncomingMessage, ServerResponse, createServer, Server } from 'node:http';
import { BaseBotController, BotController, IUserData } from '../controller';
import { AppContext, T_AUTO } from './AppContext';
import { UsersData } from '../models';
import { ILogger } from './interfaces/ILogger';
import { Text } from '../utils';

/**
 * Тип для класса контроллера бота
 */
export type TBotControllerClass<T extends IUserData = IUserData> = new () => BotController<T>;

/**
 * Результат выполнения бота - ответ, который будет отправлен пользователю
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

export * from './interfaces/IBot';

/**
 * Функция для обработки следующего шага в цепочке промежуточных функций
 */
export type MiddlewareNext = () => Promise<void>;
/**
 * Функция промежуточной обработки
 */
export type MiddlewareFn = (ctx: BotController, next: MiddlewareNext) => void | Promise<void>;

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
 * Основной класс для работы с приложением.
 * Отвечает за инициализацию, конфигурацию и запуск приложения.
 * Поддерживает работу с различными платформами, которые регистрируются через адаптеры.
 *
 ## 📖 КРАТКОЕ РУКОВОДСТВО
 *
 * 1. **Создайте бота:** `const bot = new Bot();`
 * 2. **Настройте токены:** `bot.setAppConfig({ tokens: { telegram: {token: '...'}} });`
 * 3. **Добавьте логику при необходимости:** `bot.initBotController(MyController);`
 * 4. **Добавьте команды:** `bot.addCommand('start', ['старт'], handler);`
 * 5. **Запустите:** `bot.start();`
 *
 * @class Bot
 * @template TUserData Тип пользовательских данных, по умолчанию {@link IUserData}
 *
 * ## 🎯 ОСНОВНЫЕ ВОЗМОЖНОСТИ
 *
 * ### Поддерживаемые платформы:
 * Любая платформа, которая была зарегистрирована через `bot.use(...)`
 *
 * ### Ключевые функции:
 * - 📝 Управление командами и интентами
 * - 💾 Сохранение данных пользователей (БД или локальное хранилище)
 * - 🔌 Middleware и плагины
 * - 📊 Логирование и метрики
 * - 🛡️ Безопасность (маскирование токенов, защита от ReDoS)
 *
 * ## 🚀 БЫСТРЫЙ СТАРТ (5 минут)
 * Создание простого Telegram бота
 * ```ts
 * import { Bot } from 'umbot';
 *
 * // 1. Создаем бота для Telegram
 * const bot = new Bot();
 *
 * // 2. Настраиваем токен (рекомендуется через .env файл)
 * bot.setAppConfig({
 *   env: 'local'
 * });
 *
 * // 3. Добавляем команды
 * bot.addCommand('help', ['помощь', 'справка'], (cmd, controller) => {
 *   controller.text = 'Я могу:\n• Приветствовать\n• Помогать\n• И многое другое!';
 * });
 *
 * // 4. Запускаем сервер
 * bot.start('localhost', 3000);
 *
 * // 5. Настройте вебхук в Telegram: https://api.telegram.org/bot{YOUR_TOKEN}/setWebhook?url=https://ваш-домен/webhook
 * ```
 *
 * Создание простого бота со своим контроллером:
 * ```ts
 * const bot = new Bot();
 * bot.setPlatformParams({
 *   intents: [{
 *     name: 'greeting',
 *     slots: ['привет', 'здравствуйте']
 *   }]
 * });
 *
 * class MyController extends BotController {
 *   public action(intentName: string | null): void {
 *     if (intentName === 'greeting') {
 *       this.text = 'Привет! Я ваш бот 🤖';
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
 */
export class Bot<TUserData extends IUserData = IUserData> {
    /** Экземпляр HTTP-сервера */
    #serverInst: Server | undefined;

    /**
     * Полученный запрос от пользователя.
     * Может быть JSON-строкой, текстом или null
     * @type {TBotContent}
     */
    protected _content: TBotContent = null;

    /**
     * Контекст приложения
     */
    readonly #appContext: AppContext;

    /**
     * Контроллер с бизнес-логикой приложения.
     * Обрабатывает команды и формирует ответы
     * @see BotControllerClass
     * @type {BotController<TUserData>}
     */
    #botControllerClass: TBotControllerClass<TUserData>;

    /**
     * Авторизационный токен пользователя.
     * Используется для авторизованных запросов (например, в Алисе)
     * @type {TBotAuth}
     */
    #auth: TBotAuth = null;

    /**
     * Тип платформы по умолчанию
     */
    #defaultAppType: TAppType | 'auto' = 'auto';
    // Чтобы не дублировать повторное подключение к базе.
    #appConnectStatus: IAppConnectStatus = {
        isConnecting: false,
    };

    #globalMiddlewares: MiddlewareFn[] = [];
    #platformMiddlewares: Partial<Record<TAppType, MiddlewareFn[]>> = {};

    /**
     * Получение корректного контроллера
     * @param botController
     */
    #getBotController(
        botController?: TBotControllerClass<TUserData>,
    ): TBotControllerClass<TUserData> {
        if (botController) {
            return botController;
        } else {
            return BaseBotController<TUserData>;
        }
    }

    /**
     * Создает новый экземпляр бота
     *
     * @param {TAppType} [type] - Тип платформы (по умолчанию автоопределение)
     * @param {TBotControllerClass} [botController] - Контроллер с логикой
     *
     * @throws {Error} Если не удалось инициализировать бота
     *
     * @example
     * ```ts
     * // Создание бота для Telegram
     * const bot = new Bot(T_TELEGRAM, MyController);
     *
     * // Создание бота для VK
     * const bot = new Bot(T_VK, MyController);
     *
     * // Создание бота для Алисы
     * const bot = new Bot(T_ALISA, MyController);
     *
     * // Создание бота по умолчанию
     * const bot = new Bot();
     * ```
     */
    constructor(type?: TAppType, botController?: TBotControllerClass<TUserData>) {
        this.#botControllerClass = this.#getBotController(botController);
        this.#appContext = new AppContext();
        this.#defaultAppType = type || T_AUTO;
    }

    /**
     * Явно устанавливает тип платформы для всего приложения. Стоит использовать в крайнем случае
     * @param appType
     */
    public set appType(appType: TAppType | 'auto') {
        this.#defaultAppType = appType;
    }

    /**
     * Возвращает установленный тип приложения.
     */
    public get appType(): string {
        return this.#defaultAppType;
    }

    /**
     * Позволяет установить свою реализацию для логирования
     * @param logger
     */
    public setLogger(logger: ILogger | null): void {
        this.#appContext.setLogger(logger);
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
     * @param {string} commandName - Уникальный имя команды (например, `'greeting'`). Используется для логирования и отладки.
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
     *     if (ctrl) {
     *       // Доступ к пользовательским данным
     *       const visits = ctrl.userData?.visits || 0;
     *       ctrl.text = `Вы использовали бота ${visits} раз`;
     *
     *       // Доступ к кнопкам и другим UI элементам
     *       ctrl.buttons
     *         .addBtn('Сбросить статистику')
     *         .addBtn('Закрыть');
     *     }
     *   }
     * );
     * ```
     *
     * @example
     * // Асинхронная команда (работа с API):
     * ```ts
     * bot.addCommand('weather', ['погода'], async (text, controller) => {
     *   const weather = await fetch('https://api.weather.com');
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
        this.#appContext.command.addCommand(commandName, slots, cb, isPattern);
        return this;
    }

    /**
     * Удаляет зарегистрированную команду по имени
     * @param commandName - Имя команды
     */
    public removeCommand(commandName: string): this {
        this.#appContext.command.removeCommand(commandName);
        return this;
    }

    /**
     * Удаляет **все** зарегистрированные команды
     *
     * > ⚠️ Это **глобальная операция**: все сценарии станут недоступны.
     * > Используйте с осторожностью (например, при перезагрузке логики бота).
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
     */
    public addStep<TBotController extends BotController = BotController>(
        stepName: string,
        handler: IStepParam<TBotController>['cb'],
    ): this {
        this.#appContext.command.addStep(stepName, handler);
        return this;
    }

    /**
     * Удаляет зарегистрированный шаг по имени.
     *
     * После удаления шаг больше не будет обрабатываться, даже если активен у пользователя.
     * (Рекомендуется завершать активные сценарии через `ctx.clearStep()` перед удалением.)
     *
     * @param stepName — Имя шага для удаления.
     * @returns Текущий экземпляр `Bot`.
     */
    public removeStep(stepName: string): this {
        this.#appContext.command.removeStep(stepName);
        return this;
    }

    /**
     * Удаляет **все** зарегистрированные шаги.
     *
     * > ⚠️ Это **глобальная операция**: все сценарии станут недоступны.
     * > Используйте с осторожностью (например, при перезагрузке логики бота).
     *
     * @returns Текущий экземпляр `Bot`.
     */
    public clearSteps(): this {
        this.#appContext.command.clearSteps();
        return this;
    }

    /**
     * Удаляет **все** зарегистрированные платформы, плагины и middleware службы.
     *
     * > ⚠️ Это **глобальная операция**: все сценарии станут недоступны.
     * > Используйте с осторожностью (например, при перезагрузке логики бота).
     *
     * @returns Текущий экземпляр `Bot`.
     */
    public clearUse(): this {
        this.#appContext.platforms = {};
        this.#globalMiddlewares = [];
        this.#platformMiddlewares = {};
        this.#appContext.plugins = {};
        return this;
    }

    /**
     * Устанавливает режим работы приложения
     *
     * @param {'dev' | 'prod' | 'strict_prod'} appMode - Режим работы:
     * - 'dev': подробные логи, отладочная информация, отключена проверка ReDoS
     * - 'prod': минимальные логи, производительность, НО небезопасные регулярки всё равно регистрируются
     * - 'strict_prod': строгая проверка безопасности — любая регулярка с потенциальным ReDoS отклоняется с ошибкой
     *
     * ⚠️ ВАЖНО: В продакшене всегда используйте 'strict_prod' для защиты от атак через регулярные выражения.
     * Режим 'prod' оставлен для обратной совместимости, но небезопасен.
     *
     * @example
     * // Для продакшена (обязательно!)
     * bot.setAppMode('strict_prod');
     *
     * // Для разработки
     * bot.setAppMode('dev');
     * @param appMode
     */
    public setAppMode(appMode: TAppMode): this {
        this.#appContext.appMode = appMode;
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
     * @param resolver - Функция вида `(userText: string, commands: Map<string, ICommand>) => string | null`.
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
     */
    public setCustomCommandResolver(resolver: TCommandResolver): this {
        this.#appContext.command.customCommandResolver = resolver;
        return this;
    }

    /**
     * Задаёт **инфраструктурную конфигурацию** приложения: подключение к БД, загрузку `.env`, и другие
     * настройки, связанные с окружением выполнения (а не с бизнес-логикой бота).
     *
     * > 🔒 **Безопасность**: никогда не храните секреты (пароли, токены, API-ключи) прямо в коде.
     * > Всегда используйте `.env`-файлы или переменные окружения.
     *
     * @param {IAppConfig} config - Конфигурация приложения
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
     *
     *
     * @remarks
     * Важно! Чувствительные данные рекомендуется сохранять в .env файл, передав путь к нему:
     * ```ts
     * bot.setAppConfig({
     *     env: './.env', // путь до файла
     * });
     * ```
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
     */
    public getAppContext(): AppContext {
        return this.#appContext;
    }

    /**
     * Задаёт параметры, управляющие **логикой бота** на всех платформах.
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
     *   welcome_text: 'Привет! Я ваш бот.',
     *   help_text: 'Скажите "помощь", чтобы увидеть команды.',
     *   empty_text: 'Извините, я не понял.'
     * });
     * ```
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
     * @param {BotController<TUserData>} fn - Экземпляр контроллера, наследующий `BotController<TUserData>`
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
     *       this.buttons.addBtn('Подписаться на рассылку', 'https://example.com');
     *     }
     *
     *     // Логирование
     *     console.log(`Обработано: ${isCommand ? 'команда' : isStep ? 'шаг' : 'интент'} – ${intentName}`);
     *   }
     * }
     *
     * bot.initBotController(MyController);
     * ```
     */
    public initBotController(fn: TBotControllerClass<TUserData>): this {
        if (fn) {
            this.#botControllerClass = fn;
        }
        return this;
    }

    /**
     * Устанавливает контент запроса.
     * Используется для передачи данных от пользователя в бот.
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
     *     original_utterance: 'Привет, бот!'
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

    /**
     * Определяет тип приложения по заголовкам или телу запроса
     * @param uBody - Тело запроса
     * @param headers - Заголовки запроса
     */
    #getAppType(uBody: unknown, headers?: Record<string, unknown>): TAppType | null {
        if (!this.#defaultAppType || this.#defaultAppType === T_AUTO) {
            if (this.#appContext.platforms) {
                for (const platformName in this.#appContext.platforms) {
                    if (
                        this.#appContext.platforms[platformName].isPlatformOnQuery(uBody, headers)
                    ) {
                        return this.#appContext.platforms[platformName].platformName as TAppType;
                    }
                }
            }
            return null;
        } else {
            return this.#defaultAppType;
        }
    }

    #initNLU(botController: BotController<TUserData>): void {
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
            botController.nlu.setNlu(nlu);
        }
    }

    /* eslint-disable require-atomic-updates*/
    /**
     * Запуск логики приложения
     * @param botController - Контроллер бота
     * @param botClass - Класс бота, который будет подготавливать корректный ответ в зависимости от платформы
     * @param appType - Тип приложения
     */
    async #runApp(
        botController: BotController<TUserData>,
        botClass: IPlatformAdapter,
        appType: TAppType,
    ): Promise<TRunResult> {
        if (botController.platformOptions.sendInInit) {
            return botController.platformOptions.sendInInit as TRunResult;
        }
        if (this.#appContext.database.adapter && !this.#appContext.database.isSendConnect) {
            if (this.#appConnectStatus.isConnecting) {
                if (this.#appConnectStatus.status instanceof Promise) {
                    await this.#appConnectStatus.status;
                }
            } else {
                this.#appConnectStatus.isConnecting = true;
                const res = (this.#appConnectStatus.status =
                    this.#appContext.database.adapter?.connect());
                if (res instanceof Promise) {
                    await res;
                }
                this.#appContext.database.isSendConnect = res as boolean;
            }
        }
        const userData = new UsersData(this.#appContext);
        botController.userId = userData.escapeString(botController.userId as string | number);

        if (botClass.platformName) {
            userData.platform = botClass.platformName;
        }
        const isLocalStorage: boolean =
            this.#appContext.appConfig.isLocalStorage && botClass.isLocalStorage(botController);
        let isNewUser = true;

        botController.platformOptions.usedLocalStorage = botClass.isLocalStorage(botController);
        botController.state = (await botClass.getLocalStorage(botController)) as TUserData;
        if (isLocalStorage) {
            botController.userData = (await botClass.getLocalStorage(botController)) as TUserData;
        } else {
            if (botController.platformOptions.usedLocalStorage) {
                botController.state = (await botClass.getLocalStorage(botController)) as TUserData;
            }
            if (this.#appContext.database.adapter && !this.#appContext.appConfig.isLocalStorage) {
                const query = {
                    userId: userData.escapeString(botController.userId),
                };
                if (this.#auth) {
                    query.userId = userData.escapeString(botController.userToken as string);
                }
                if (await userData.whereOne(query)) {
                    botController.userData = userData.data as TUserData;
                    isNewUser = false;
                } else {
                    if (!botController.userData) {
                        botController.userData = {} as TUserData;
                    }
                    userData.userId = botController.userId;
                    userData.meta = botController.userMeta;
                }
            }
        }
        this.#initNLU(botController);
        const content = await this.#getAppContent(botController, botClass, appType);
        if (
            this.#appContext.database.adapter &&
            !(
                isLocalStorage &&
                (!botController.state || botController.state === botController.userData)
            )
        ) {
            userData.userId = botController.userId;
            userData.data = botController.userData;
            if (isNewUser) {
                await userData.save(true).then((res) => {
                    if (!res) {
                        this.#appContext.logError(
                            `Bot:run(): Не удалось сохранить данные для пользователя: "${botController.userId}".`,
                        );
                    }
                    return res;
                });
            } else {
                await userData.update().then((res) => {
                    if (!res) {
                        this.#appContext.logError(
                            `Bot:run(): Не удалось обновить данные для пользователя: "${botController.userId}".`,
                        );
                    }
                });
            }
        }
        if (botController.platformOptions.error) {
            this.#appContext.logError(botController.platformOptions.error);
        }
        this._clearState(botController);
        return content;
    }

    /* eslint-enable require-atomic-updates*/

    async #getAppContent(
        botController: BotController<TUserData>,
        botClass: IPlatformAdapter,
        appType: TAppType,
    ): Promise<string | object> {
        if (
            !botController.oldIntentName &&
            botController.userData &&
            botController.userData.oldIntentName
        ) {
            botController.oldIntentName = botController.userData.oldIntentName;
        } else if (
            !botController.oldIntentName &&
            typeof botController.state === 'object' &&
            botController.state?.oldIntentName
        ) {
            botController.oldIntentName = botController.state.oldIntentName as string;
        }

        const shouldProceed =
            this.#globalMiddlewares.length || this.#platformMiddlewares[appType]?.length
                ? await this.#runMiddlewares(botController, appType)
                : true;
        if (shouldProceed) {
            const res = botController.run();
            if (res) {
                await res;
            }
        }
        if (
            botController.tts === null &&
            this.#appContext.platforms[botController.appType as string].isVoice
        ) {
            botController.tts = botController.text;
        }
        if (botController.thisIntentName !== null) {
            if (botController.state && Object.keys(botController.userData).length === 0) {
                botController.state.oldIntentName = botController.thisIntentName;
            } else {
                botController.userData.oldIntentName = botController.thisIntentName;
            }
        } else {
            delete botController.userData?.oldIntentName;
            delete botController.state?.oldIntentName;
        }
        let content: string | object;
        if (botController.isSendRating) {
            content = botClass.getRatingContext(botController);
        } else {
            if (botController.state && Object.keys(botController.userData).length === 0) {
                botController.userData = botController.state as TUserData;
            }
            content = botClass.getContent(botController);
        }
        if (botController.platformOptions.usedLocalStorage) {
            const res = botClass.setLocalStorage(
                botController.state && Object.keys(botController.state).length !== 0
                    ? botController.state
                    : botController.userData,
                botController,
            );
            if (res) {
                await res;
            }
        }
        return content;
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
     *   if (!ctx.appContext.requestObject?.session?.user_id) {
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
                (arg1 as IPluginFn)(this.#appContext);
            } else {
                this.#globalMiddlewares.push(arg1 as MiddlewareFn);
            }
            return this;
        }
        if (typeof arg1 !== 'string') {
            arg1.init(this.#appContext);
        } else {
            if (arg2) {
                this.#platformMiddlewares[arg1] ??= [];
                this.#platformMiddlewares[arg1].push(arg2);
            }
        }
        return this;
    }

    /**
     * Выполняет middleware для текущего запроса
     * @param controller
     * @param appType
     */
    async #runMiddlewares(controller: BotController, appType: TAppType): Promise<boolean> {
        if (appType) {
            if (!(this.#globalMiddlewares.length || this.#platformMiddlewares[appType]?.length)) {
                return true;
            }
            const middlewares = [
                ...this.#globalMiddlewares,
                ...(this.#platformMiddlewares[appType] || []),
            ];

            if (middlewares.length === 0) {
                return true;
            }
            const start = this.#appContext.usedMetric ? performance.now() : 0;

            let index = 0;
            let isEnd = false;
            try {
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
            } catch (err) {
                this.#appContext.logError(
                    `Bot:runMiddlewares: Ошибка при обработке middleware: ${(err as Error).message}`,
                    {
                        error: err,
                    },
                );
                isEnd = false;
            }
            if (this.#appContext.usedMetric) {
                this.#appContext.logMetric(EMetric.MIDDLEWARE, performance.now() - start, {
                    platform: appType,
                });
            }
            // eslint-disable-next-line require-atomic-updates
            middlewares.length = 0;
            return isEnd;
        }
        return true;
    }

    #$botController: BotController<TUserData> | null = null;

    /**
     * Установка контроллера. Используется только для тестирования
     * @param botController
     * @protected
     */
    protected _setBotController(botController: BotController<TUserData>): void {
        this.#$botController = botController;
    }

    /**
     * Выполняет непосредственную обработку входящего запроса бота.
     * Этот метод **не запускает HTTP-сервер** и **не обрабатывает HTTP-запросы напрямую** —
     * он принимает уже распарсенные данные и возвращает результат обработки.
     *
     * Обычно вызывается **внутри {@link webhookHandle}**, но может использоваться напрямую,
     * если вы реализуете собственный обработчик запросов, тестируете логику бота
     * или запускаете бота вне HTTP-контекста (например, из консоли или очереди сообщений).
     *
     * @param {TAppType | null} [appType] - Тип приложения. Если не указан, будет определен автоматически в зависимости от запроса.
     * @param {string | object} [content] - Входные данные для обработки (например, текст сообщения или объект запроса).
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
    ): Promise<TRunResult> {
        if (!this.#botControllerClass) {
            const errMsg =
                'Не определен класс с логикой приложения. Укажите класс с логикой, передав его в метод initBotController';
            this.#appContext.logError(errMsg);
            throw new Error(errMsg);
        }
        const botController = this.#$botController || new this.#botControllerClass();
        botController.setAppContext(this.#appContext);
        let cAppType: TAppType | null = appType;
        if (!appType) {
            cAppType = this.#getAppType(this._content || content, undefined);
        }
        botController.appType = cAppType;

        if (cAppType && this.#appContext.platforms[cAppType]) {
            if (!(this._content || content)) {
                const msg = `Для платформы "${cAppType}", передано пустое содержимое, корректно обработать запрос невозможно.`;
                this.#appContext.logError(msg);
                throw new Error(msg);
            }
            if (botController.userToken === null) {
                botController.userToken = this.#auth;
            }
            const botClass = this.#appContext.platforms[cAppType];
            botClass.updateTimeStart(botController);
            let res = botClass.setQueryData(this._content || content, botController);
            if (res instanceof Promise) {
                res = await res;
            }
            if (res) {
                return await this.#runApp(botController, botClass, cAppType);
            } else {
                this.#appContext.logError(botController.platformOptions.error as string);
                throw new Error(botController.platformOptions.error || '');
            }
        } else {
            const msg = 'Не удалось определить платформу, от которой пришел запрос.';
            this.#appContext.logError(msg);
            throw new Error(msg);
        }
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
     *          res.statusCode = 200;
     *          res.end(...);// Какое-то содержимое страницы
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
        if (req.method !== 'POST') {
            return send(
                req,
                res,
                {
                    statusCode: 400,
                    body: 'Bad Request',
                    defaultSend,
                },
                responseCb,
            );
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
                return send(
                    req,
                    res,
                    {
                        statusCode: 400,
                        body: 'Empty request',
                        defaultSend,
                    },
                    responseCb,
                );
            }
            if (req.headers?.authorization) {
                this.#auth = req.headers.authorization.replace('Bearer ', '');
            }

            appType = this.#getAppType(query, req.headers);
            const result = await this.run(appType, query);
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
                return send(
                    req,
                    res,
                    {
                        statusCode: 400,
                        body: 'Invalid JSON',
                        defaultSend,
                    },
                    responseCb,
                );
            }
            this.#appContext.logError(
                `Bot:webhookHandle(): Произошла ошибка при работе приложения для платформы "${appType}": ${error instanceof Error ? error.message : JSON.stringify(error)}`,
                {
                    error,
                },
            );
            return send(
                req,
                res,
                {
                    statusCode: 500,
                    body: 'Internal Server Error',
                    defaultSend,
                },
                responseCb,
            );
        }
    }

    /**
     * Запускает встроенный HTTP-сервер на указанном хосте и порту для приёма webhook-запросов
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
     *      res.statusCode = 200;
     *      res.end(...);// Какое-то содержимое страницы
     * });
     * ```
     */
    public start(
        hostname: string = 'localhost',
        port: number = 3000,
        responseCb?: TBotResponseCb,
    ): Server {
        this.close();

        this.#serverInst = createServer(
            async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
                return this.webhookHandle(req, res, responseCb);
            },
        );

        this.#serverInst.listen(port, hostname, () => {
            this.#appContext.log(`Server running at //${hostname}:${port}/`);
        });
        // Если завершили процесс, то закрываем все подключения и чистим ресурсы.
        process.on('SIGTERM', () => {
            void this.#gracefulShutdown();
        });

        process.on('SIGINT', () => {
            void this.#gracefulShutdown();
        });

        return this.#serverInst;
    }

    /**
     * Вызывается при завершении приложения через комбинацию клавиш
     * @private
     */
    async #gracefulShutdown(): Promise<void> {
        this.#appContext.log('Получен сигнал завершения. Выполняется graceful shutdown...');

        await this.close();

        await this.#appContext.closeDB();
        this.#appContext.command.clearCommands();
        this.#appContext.command.clearSteps();
        Text.clearCache();

        this.#appContext.log('Graceful shutdown завершён.');
        process.exit(0);
    }

    /**
     * Обработка запросов webhook сервера
     * @param req
     */
    #readRequestData(req: IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            let data = '';
            req.on('data', (chunk: Buffer) => {
                data += chunk.toString();
            });
            req.on('end', () => resolve(data));
            req.on('error', reject);
        });
    }

    /**
     * Корректно завершает работу встроенного HTTP-сервера (если он был запущен через {@link start}).
     * Ожидает завершения всех текущих запросов, освобождает сетевые ресурсы и отменяет
     * все активные асинхронные операции, связанные с жизненным циклом бота.
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
            this.#serverInst.close();
            this.#serverInst = undefined;
        }
        await this.#appContext.closeDB();
    }

    /**
     * Отправка текста пользователю
     * Этот метод используется для активных рассылок — когда бот инициирует диалог первым (например, уведомление).
     * В методе реализована механика преобразования текстового значения `controllerOrText` в контроллер, а также базовый механизм для отправки ответа.
     *
     * Если платформа не поддерживает возможность начать диалог самостоятельно, то вернется false
     * @param userId Ид пользователя, которому нужно отправить сообщение
     * @param controllerOrText Контроллер приложения или текст. Если необходимо отправить просто текст, можно передать строку, в случае, если необходимо передать картинку звук и тд, то необходимо корректно заполнить контроллер.
     * @param platform Платформа, на которую необходимо отправить запрос
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
