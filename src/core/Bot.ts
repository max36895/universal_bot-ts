import { TBotAuth, TBotContent } from './interfaces/IBot';
import { BaseBotController, BotController, IUserData } from '../controller';
import { TemplateTypeModel } from '../platforms/TemplateTypeModel';
import {
    Telegram,
    Viber,
    Marusia,
    Vk,
    SmartApp,
    MaxApp,
    Alisa,
    IAlisaWebhookResponse,
    IMarusiaWebhookResponse,
} from '../platforms';
import { UsersData } from '../models/UsersData';
import { IncomingMessage, ServerResponse, createServer, Server } from 'node:http';
import {
    AppContext,
    IAppConfig,
    IAppParam,
    T_ALISA,
    T_MARUSIA,
    T_MAXAPP,
    T_SMARTAPP,
    T_TELEGRAM,
    T_USER_APP,
    T_VIBER,
    T_VK,
    TAppType,
    ICommandParam,
    ILogger,
    TSlots,
    T_AUTO,
    EMetric,
    TCommandResolver,
} from './AppContext';
import { IDbControllerModel } from '../models';
import { Text } from '../utils';
import * as console from 'node:console';

/**
 * Тип для режима работы приложения
 * dev - разработка, prod - продакшн, strict_prod - строгий продакшн
 */
export type TAppMode = 'dev' | 'prod' | 'strict_prod';

/**
 * Тип для класса контроллера бота
 */
export type TBotControllerClass<T extends IUserData = IUserData> = new () => BotController<T>;
/**
 *  Тип для класса модели кастомного типа бота
 */
export type TTemplateTypeModelClass = new (appContext: AppContext) => TemplateTypeModel;
/**
 * Результат выполнения бота - ответ, который будет отправлен пользователю
 * Может быть ответом для Алисы, Маруси или текстовым сообщением
 *
 * @typedef {IAlisaWebhookResponse | IMarusiaWebhookResponse | string} TRunResult
 *
 * @example
 * ```typescript
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
export type TRunResult = IAlisaWebhookResponse | IMarusiaWebhookResponse | string;

export * from './interfaces/IBot';

/**
 * Внутренний интерфейс для хранения информации о классе бота и его типе
 * Используется для определения подходящего обработчика запросов
 *
 * @interface IBotBotClassAndType
 *
 * @example
 * ```typescript
 * const botInfo: IBotBotClassAndType = {
 *   botClass: new Telegram(),
 *   type: T_TELEGRAM
 * };
 * ```
 */
export interface IBotBotClassAndType {
    /**
     * Класс для обработки запросов конкретной платформы
     * @type {TemplateTypeModel | null}
     */
    botClass: TemplateTypeModel | null;
    /**
     * Тип платформы (T_ALISA, T_VK и т.д.)
     * @type {number | null}
     */
    platformType: number | null;
}

/**
 * Функция для обработки следующего шага в цепочке промежуточных функций
 */
export type MiddlewareNext = () => Promise<void>;
/**
 * Функция промежуточной обработки
 */
export type MiddlewareFn = (ctx: BotController, next: MiddlewareNext) => void | Promise<void>;

/**
 * Основной класс для работы с ботом
 * Отвечает за инициализацию, конфигурацию и запуск бота
 * Поддерживает различные платформы: Алиса, Маруся, Telegram, VK, Viber и др.
 *
 * @class Bot
 * @template TUserData Тип пользовательских данных, по умолчанию {@link IUserData}
 *
 * @example
 * Создание простого бота:
 * ```typescript
 * const bot = new Bot();
 * bot.setPlatformParams({
 *   intents: [{
 *     name: 'greeting',
 *     slots: ['привет', 'здравствуйте']
 *   }]
 * });
 * bot.initBotController(MyController);
 * ```
 *
 * @example
 * Использование с базой данных:
 * ```typescript
 * const bot = new Bot();
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
 * @example
 * Создание бота для Telegram:
 * ```typescript
 * const bot = new Bot(T_TELEGRAM);
 * bot.setPlatformParams({
 *   telegram_token: 'YOUR_BOT_TOKEN'
 * });
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

    readonly #globalMiddlewares: MiddlewareFn[] = [];
    readonly #platformMiddlewares: Partial<Record<TAppType, MiddlewareFn[]>> = {};

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
     * @param {BotController} [botController] - Контроллер с логикой
     *
     * @throws {Error} Если не удалось инициализировать бота
     *
     * @example
     * ```typescript
     * // Создание бота для Telegram
     * const bot = new Bot(T_TELEGRAM, MyController);
     *
     * // Создание бота для VK
     * const bot = new Bot(T_VK, MyController);
     *
     * // Создание бота для Алисы
     * const bot = new Bot(T_ALISA, MyController);
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
        if (appType === 'auto') {
            this.#appContext.appType = null;
        } else {
            this.#appContext.appType = appType;
        }
    }

    /**
     * Возвращает тип платформы
     */
    public get appType(): TAppType | 'auto' {
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
     * Добавляет команду для обработки пользовательских запросов
     *
     * @param {string} commandName - Уникальный идентификатор команды
     * @param {TSlots} slots - Триггеры для активации команды
     *   - Если элемент — строка → ищется как подстрока (`text.includes(...)`).
     *   - Если элемент — RegExp → проверяется как регулярное выражение (`.test(text)`).
     *   - Параметр `isPattern` учитывается **только если в `slots` нет RegExp**.
     *   - При наличии хотя бы одного `RegExp`, `isPattern = false` игнорируется, и каждый элемент
     *     обрабатывается согласно своему типу.
     * @param {ICommandParam['cb']} cb - Функция-обработчик команды
     * @param {boolean} isPattern - Использовать регулярные выражения (по умолчанию false)
     *
     * @example
     * Простая команда со словами:
     * ```typescript
     * appContext.addCommand(
     *   'greeting',
     *   ['привет', 'здравствуй'],
     *   (cmd, ctrl) => {
     *     if (ctrl) ctrl.text = 'Здравствуйте!';
     *   }
     * );
     * ```
     *
     * @example
     * Команда с регулярными выражениями:
     * ```typescript
     * // Обработка чисел от 1 до 999
     * bot.addCommand(
     *   'number',
     *   ['\\b([1-9]|[1-9][0-9]|[1-9][0-9][0-9])\\b'],
     *   (cmd, ctrl) => {
     *     if (ctrl) ctrl.text = `Вы ввели число: ${cmd}`;
     *   },
     *   true  // включаем поддержку регулярных выражений
     * );
     * ```
     * Библиотека проверяет регулярные выражения на ReDoS и логирует предупреждения по необходимости
     *
     * @example
     * Команда с доступом к состоянию:
     * ```typescript
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
     * @remarks
     * - Команды обрабатываются в порядке добавления
     * - При isPattern=true используются регулярные выражения JavaScript
     * - В callback доступен весь функционал BotController
     * - Можно использовать async функции в callback
     */
    public addCommand<TBotController extends BotController = BotController>(
        commandName: string,
        slots: TSlots,
        cb?: ICommandParam<TBotController>['cb'],
        isPattern: boolean = false,
    ): this {
        this.#appContext.addCommand(commandName, slots, cb, isPattern);
        return this;
    }

    /**
     * Удаляет команду
     * @param commandName - Имя команды
     */
    public removeCommand(commandName: string): this {
        this.#appContext.removeCommand(commandName);
        return this;
    }

    /**
     * Удаляет все команды
     */
    public clearCommands(): this {
        this.#appContext.clearCommands();
        return this;
    }

    /**
     * Устанавливает режим разработки
     * @param {boolean} isDevMode - Флаг включения режима разработки
     * @remarks В режиме разработки в консоль выводятся все ошибки и предупреждения
     */
    public setDevMode(isDevMode: boolean): this {
        this.#appContext.setDevMode(isDevMode);
        return this;
    }

    /**
     * Устанавливает режим работы приложения
     * @param appMode
     */
    public setAppMode(appMode: TAppMode): this {
        switch (appMode) {
            case 'dev':
                this.setDevMode(true);
                break;
            case 'strict_prod':
                this.setDevMode(false);
                this.#appContext.strictMode = true;
                break;
            default:
                this.setDevMode(false);
                this.#appContext.strictMode = false;
        }
        return this;
    }

    /**
     * Установка пользовательского обработчика команд.
     * @param resolver
     * @remarks
     * По умолчанию `umbot` использует линейный поиск с поддержкой подстрок и регулярных выражений.
     * Это обеспечивает простоту, предсказуемость и соответствие поведению других платформ (порядок регистрации важен).
     *
     * Однако при числе команд >1000 или в условиях высокой нагрузки вы можете **подключить собственный алгоритм поиска**:
     *
     * ```ts
     * const bot = new Bot();
     * bot.setCustomCommandResolver((userCommand, commands) => {
     *   // Пример: возврат команды по хэшу (ваши правила)
     *   for (const [name, cmd] of commands) {
     *     if (cmd.slots.some(slot => userCommand.includes(slot as string))) {
     *       return name;
     *     }
     *   }
     *   return null;
     * });
     * ```
     * 💡 Рекомендации:
     *
     * Сохраняйте порядок перебора, если он критичен для вашей логики
     * Используйте кэширование (Map<string, string>) для часто встречающихся фраз
     * Для fuzzy-поиска рассмотрите fuse.js или natural
     * При использовании регулярных выражений — не забывайте про защиту от ReDoS
     */
    public setCustomCommandResolver(resolver: TCommandResolver): this {
        this.#appContext.customCommandResolver = resolver;
        return this;
    }

    /**
     * Задает конфигурацию приложения
     * Устанавливает настройки бота, включая интенты, базу данных и другие параметры
     *
     * @param {IAppConfig} config - Конфигурация приложения
     *
     * @example
     * ```typescript
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
     * ```typescript
     * bot.setAppConfig({
     *     env: './.env', // путь до файла
     * });
     * ```
     */
    public setAppConfig(config: IAppConfig): this {
        if (config) {
            this.#appContext.setAppConfig(config);
        }
        return this;
    }

    /**
     * Возвращает контекст приложения
     */
    public getAppContext(): AppContext {
        return this.#appContext;
    }

    /**
     * Задает параметры для платформ
     * Устанавливает дополнительные параметры для работы бота
     *
     * @param {IAppParam} params - Параметры платформы
     *
     * @example
     * ```typescript
     * // Базовая настройка
     * bot.setPlatformParams({
     *   intents: [{
     *     name: 'help',
     *     slots: ['помощь', 'справка']
     *   }],
     * });
     *
     * @remarks
     * Важно! Чувствительные данные рекомендуется сохранять в .env файл, передав путь к нему:
     * ```typescript
     * bot.setAppConfig({
     *     env: './.env', // путь до файла
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
     * Определяет тип платформы и возвращает соответствующий класс для обработки
     *
     * @param {TAppType | null} [appType] - Тип платформы
     * @param {TTemplateTypeModelClass | null} [userBotClass] - Пользовательский класс бота
     * @returns {IBotBotClassAndType} Объект с типом платформы и классом обработчика
     * @throws {Error} Если не удалось определить тип приложения
     *
     * @remarks
     * Метод определяет тип платформы на основе appType и возвращает соответствующий класс:
     * - T_ALISA → Alisa
     * - T_VK → Vk
     * - T_Max → Max
     * - T_TELEGRAM → Telegram
     * - T_VIBER → Viber
     * - T_MARUSIA → Marusia
     * - T_SMARTAPP → SmartApp
     * - T_USER_APP → Пользовательский класс
     */
    protected _getBotClassAndType(
        appType: TAppType | null,
        userBotClass: TTemplateTypeModelClass | null = null,
    ): IBotBotClassAndType {
        let botClass: TemplateTypeModel | null = null;
        let platformType: number | null = null;

        switch (appType) {
            case T_ALISA:
                botClass = new Alisa(this.#appContext);
                platformType = UsersData.T_ALISA;
                break;

            case T_VK:
                botClass = new Vk(this.#appContext);
                platformType = UsersData.T_VK;
                break;

            case T_TELEGRAM:
                botClass = new Telegram(this.#appContext);
                platformType = UsersData.T_TELEGRAM;
                break;

            case T_VIBER:
                botClass = new Viber(this.#appContext);
                platformType = UsersData.T_VIBER;
                break;

            case T_MARUSIA:
                botClass = new Marusia(this.#appContext);
                platformType = UsersData.T_MARUSIA;
                break;

            case T_SMARTAPP:
                botClass = new SmartApp(this.#appContext);
                platformType = UsersData.T_SMART_APP;
                break;

            case T_MAXAPP:
                botClass = new MaxApp(this.#appContext);
                platformType = UsersData.T_MAX_APP;
                break;

            case T_USER_APP:
                if (userBotClass) {
                    botClass = new userBotClass(this.#appContext);
                    platformType = UsersData.T_USER_APP;
                }
                break;
        }
        return { botClass, platformType };
    }

    /**
     * Устанавливает контроллер с базой данных
     * @param dbController
     */
    public setUserDbController(dbController: IDbControllerModel | undefined): this {
        this.#appContext.userDbController = dbController;
        if (this.#appContext.userDbController) {
            this.#appContext.userDbController.setAppContext(this.#appContext);
        }
        return this;
    }

    /**
     * Инициализирует контроллер с бизнес-логикой бота
     * Устанавливает контроллер, который будет обрабатывать команды и формировать ответы
     *
     * @param {BotController<TUserData>} fn - Контроллер бота
     *
     * @example
     * ```typescript
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
     * bot.initBotController(new MyController());
     * ```
     */
    public initBotController(fn: TBotControllerClass<TUserData> | BotController<TUserData>): this {
        if (fn) {
            if (fn instanceof BotController) {
                this.#appContext.logWarn(
                    'Bot:initBotController() Передача экземпляра BotController устарела и будет удалена в будущих версиях. Вместо этого передавайте класс контроллера (например, MyController без new)',
                );
                this.#botControllerClass = fn.constructor as TBotControllerClass<TUserData>;
            } else {
                this.#botControllerClass = fn;
            }
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
     * ```typescript
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
     * @param userBotClass - Пользовательский класс бота
     */
    #getAppType(
        uBody: any,
        headers?: Record<string, unknown>,
        userBotClass: TTemplateTypeModelClass | null = null,
    ): TAppType {
        if (!this.#defaultAppType || this.#defaultAppType === T_AUTO) {
            // 1. Заголовки — самый надёжный способ
            if (headers?.['x-ya-dialogs-request-id']) {
                return T_ALISA;
            } else if (headers?.['x-marusia-request-id']) {
                return T_MARUSIA;
            } else if (headers?.['x-viber-content-signature']) {
                return T_VIBER;
            } else if (headers?.['x-sber-smartapp-signature']) {
                return T_SMARTAPP;
            }
            const body = typeof uBody === 'string' ? JSON.parse(uBody) : uBody;
            if (!body) {
                this.#appContext.logWarn(
                    'Bot:_getAppType: Пустое тело запроса. Используется fallback на Алису.',
                );
                return T_ALISA;
            } else if (body.request && body.version && body.session) {
                if (body.meta?.client_id?.includes('MailRu')) {
                    return T_MARUSIA;
                } else if (body.meta?.client_id?.includes('yandex.searchplugin')) {
                    return T_ALISA;
                } else if (body.session.application?.application_id) {
                    if (
                        body.session.application?.application_id ===
                        body.session.application?.application_id.toLowerCase()
                    ) {
                        return T_MARUSIA;
                    } else {
                        return T_ALISA;
                    }
                } else {
                    this.#appContext.logWarn(
                        'Bot:_getAppType: Не удалось однозначно определить платформу (Алиса/Маруся). Используется fallback на Алису.',
                    );
                    return T_ALISA;
                }
            } else if (body.message_token && body.message) {
                return T_VIBER;
            } else if (body.uuid && body.payload?.app_info) {
                return T_SMARTAPP;
            } else if (body?.message?.chat?.id || body?.callback_query) {
                // 2. Telegram: токен в URL или теле
                return T_TELEGRAM;
            } else if (body?.type === 'message_new' && body?.object?.message) {
                // 3. VK: объект с типом "message_new" и т.д.
                return T_VK;
            } else if (body?.meta?.projectName && body?.request?.payload) {
                // 4. MAX: проверка по структуре (у MAX есть уникальное поле)
                return T_MAXAPP;
            } else {
                if (userBotClass) {
                    return T_USER_APP;
                }
                this.#appContext.logWarn(
                    'Bot:_getAppType: Неизвестный формат запроса. Используется fallback на Алису.',
                );
                return T_ALISA;
            }
        } else {
            return this.#defaultAppType;
        }
    }

    /**
     * Запуск логики приложения
     * @param botController - Контроллер бота
     * @param botClass - Класс бота, который будет подготавливать корректный ответ в зависимости от платформы
     * @param appType - Тип приложения
     * @param platformType - Тип приложения
     */
    async #runApp(
        botController: BotController<TUserData>,
        botClass: TemplateTypeModel,
        appType: TAppType,
        platformType: number | null,
    ): Promise<TRunResult> {
        if (botClass.sendInInit) {
            return await botClass.sendInInit;
        }
        const userData = new UsersData(this.#appContext);
        botController.userId = userData.escapeString(botController.userId as string | number);
        if (platformType) {
            userData.type = platformType;
        }

        const isLocalStorage: boolean = !!(
            this.#appContext.appConfig.isLocalStorage && botClass.isLocalStorage()
        );

        let isNewUser = true;
        if (isLocalStorage) {
            botClass.isUsedLocalStorage = isLocalStorage;
            // eslint-disable-next-line require-atomic-updates
            botController.userData = (await botClass.getLocalStorage()) as TUserData;
        } else {
            const query = {
                userId: userData.escapeString(botController.userId),
            };
            if (this.#auth) {
                query.userId = userData.escapeString(botController.userToken as string);
            }

            if (await userData.whereOne(query)) {
                // eslint-disable-next-line require-atomic-updates
                botController.userData = userData.data;
                isNewUser = false;
            } else {
                // eslint-disable-next-line require-atomic-updates
                botController.userData = {} as TUserData;
                userData.userId = botController.userId;
                userData.meta = botController.userMeta;
            }
        }
        const content = await this.#getAppContent(botController, botClass, appType);
        if (isLocalStorage) {
            await botClass.setLocalStorage(botController.userData);
        } else {
            userData.data = botController.userData;

            if (isNewUser) {
                userData.save(true).then((res) => {
                    if (!res) {
                        this.#appContext.logError(
                            `Bot:run(): Не удалось сохранить данные для пользователя: ${botController.userId}.`,
                        );
                    }
                });
            } else {
                userData.update().then((res) => {
                    if (!res) {
                        this.#appContext.logError(
                            `Bot:run(): Не удалось обновить данные для пользователя: ${botController.userId}.`,
                        );
                    }
                });
            }
        }

        const error = botClass.getError();
        if (error) {
            this.#appContext.logError(error);
        }
        //userData.destroy();
        this._clearState(botController);
        return content;
    }

    async #getAppContent(
        botController: BotController<TUserData>,
        botClass: TemplateTypeModel,
        appType: TAppType,
    ): Promise<string> {
        if (
            !botController.oldIntentName &&
            botController.userData &&
            botController.userData.oldIntentName
        ) {
            botController.oldIntentName = botController.userData.oldIntentName;
        }

        const shouldProceed =
            this.#globalMiddlewares.length || this.#platformMiddlewares[appType]?.length
                ? await this.#runMiddlewares(botController, appType)
                : true;
        if (shouldProceed) {
            botController.run();
        }
        if (botController.thisIntentName !== null && botController.userData) {
            botController.userData.oldIntentName = botController.thisIntentName;
        } else {
            delete botController.userData?.oldIntentName;
        }
        let content: any;
        if (botController.isSendRating) {
            content = await botClass.getRatingContext();
        } else {
            if (botController.store && JSON.stringify(botController.userData) === '{}') {
                botController.userData = botController.store as TUserData;
            }
            content = await botClass.getContext();
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
     * @example
     * // Только для Алисы
     * bot.use('alisa', async (ctx, next) => {
     *   if (!ctx.appContext.requestObject?.session?.user_id) {
     *     ctx.text = 'Некорректный запрос';
     *     ctx.isEnd = true;
     *     // next() не вызывается → action() не запускается
     *     return;
     *   }
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
     * @param platform - Идентификатор платформы (`alisa`, `telegram`, `vk`, и т.д.)
     * @param fn - Middleware-функция
     * @returns Текущий экземпляр `Bot`
     */
    use(platform: TAppType, fn: MiddlewareFn): this;

    use(arg1: TAppType | MiddlewareFn, arg2?: MiddlewareFn): this {
        if (typeof arg1 === 'function') {
            this.#globalMiddlewares.push(arg1);
        } else if (arg2) {
            this.#platformMiddlewares[arg1] ??= [];
            this.#platformMiddlewares[arg1].push(arg2);
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
            const start = performance.now();
            const middlewares = [
                ...this.#globalMiddlewares,
                ...(this.#platformMiddlewares[appType] || []),
            ];

            if (middlewares.length === 0) return true;

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
                    `Bot:_runMiddlewares: Ошибка в middleware: ${(err as Error).message}`,
                    {
                        error: err,
                    },
                );
                isEnd = false;
            }
            this.#appContext.logMetric(EMetric.MIDDLEWARE, performance.now() - start, {
                platform: appType,
            });
            // eslint-disable-next-line require-atomic-updates
            middlewares.length = 0;
            return isEnd;
        }
        return true;
    }

    #$botController: BotController<TUserData> | null = null;

    protected _setBotController(botController: BotController<TUserData>): void {
        this.#$botController = botController;
    }

    /**
     * Запускает обработку запроса.
     * Выполняет основную логику бота и возвращает результат
     *
     * @param {TTemplateTypeModelClass | null} [userBotClass] - Пользовательский класс бота
     * @param {TAppType | null} [appType] - Тип приложения. Если не указан, будет определен автоматически
     * @param {string} [content] - Контент запроса. Если не указан, будет взят из this._content
     * @returns {Promise<TRunResult>} Результат выполнения бота
     * @throws
     *
     * @example
     * ```typescript
     * // Обработка запроса
     * const result = await bot.run();
     * console.log(result);
     *
     * // Обработка с пользовательским классом
     * const result = await bot.run(MyBotClass);
     * ```
     */
    public async run(
        userBotClass: TTemplateTypeModelClass | null = null,
        appType: TAppType | null = null,
        content: string | null = null,
    ): Promise<TRunResult> {
        if (!this.#botControllerClass) {
            const errMsg =
                'Не определен класс с логикой приложения. Укажите класс с логикой, передав его в метод initBotController';
            this.#appContext.logError(errMsg);
            throw new Error(errMsg);
        }
        const botController = this.#$botController || new this.#botControllerClass();
        botController.setAppContext(this.#appContext);
        let cAppType: TAppType = appType || T_ALISA;
        if (!appType) {
            cAppType = this.#getAppType(this._content || content, undefined, userBotClass);
        }
        if (this.#appContext.appType) {
            cAppType = this.#appContext.appType;
        }
        botController.appType = cAppType;

        const { botClass, platformType } = this._getBotClassAndType(cAppType, userBotClass);
        if (botClass) {
            if (botController.userToken === null) {
                botController.userToken = this.#auth;
            }
            botClass.updateTimeStart();
            if (await botClass.init(this._content || content, botController)) {
                return await this.#runApp(botController, botClass, cAppType, platformType);
            } else {
                this.#appContext.logError(botClass.getError() as string);
                throw new Error(botClass.getError() || '');
            }
        } else {
            const msg = 'Не удалось определить тип приложения!';
            this.#appContext.logError(msg);
            throw new Error(msg);
        }
    }

    /**
     * Обрабатывает входящий webhook-запрос от любой поддерживаемой платформы.
     * @param req - Объект входящего запроса (IncomingMessage или совместимый)
     * @param res - Объект ответа (ServerResponse или совместимый)
     * @param userBotClass - Пользовательский класс бота
     *
     * @example
     * ```typescript
     * // Express
     * import express from 'express';
     * const app = express();
     * app.use(express.json({ type: '*\/*' })); // важно для Алисы/Сбера
     *
     * const bot = new Bot('alisa');
     * bot.initBotController(MyController);
     * bot.setAppConfig({...});
     *
     * app.post('/webhook', (req, res) => bot.webhookHandle(req, res));
     * ```
     */
    public async webhookHandle(
        req: IncomingMessage,
        res: ServerResponse,
        userBotClass: TTemplateTypeModelClass | null = null,
    ): Promise<void> {
        const send = (statusCode: number, body: string | object): void => {
            res.statusCode = statusCode;
            res.setHeader(
                'Content-Type',
                typeof body === 'string' ? 'text/plain' : 'application/json',
            );
            res.end(typeof body === 'string' ? body : JSON.stringify(body));
        };

        if (req.method !== 'POST') {
            return send(400, 'Bad Request');
        }

        try {
            this.#appContext.logMetric(EMetric.START_WEBHOOK, Date.now(), {});
            const start = performance.now();
            const data = await this.#readRequestData(req);
            const query = JSON.parse(data) as string | null;

            if (!query) {
                return send(400, 'Empty request');
            }

            if (req.headers?.authorization) {
                this.#auth = req.headers.authorization.replace('Bearer ', '');
            }

            const appType = this.#getAppType(query, req.headers, userBotClass);
            const result = await this.run(userBotClass, appType, query);
            const statusCode = result === 'notFound' ? 404 : 200;
            this.#appContext.logMetric(EMetric.END_WEBHOOK, performance.now() - start, {
                appType,
                success: statusCode === 200,
            });
            return send(statusCode, result);
        } catch (error) {
            if (error instanceof SyntaxError) {
                this.#appContext.logError(`Bot:webhookHandle(): Syntax Error: ${error.message}`, {
                    file: 'Bot:webhookHandle()',
                    error,
                });
                return send(400, 'Invalid JSON');
            }
            this.#appContext.logError(`Bot:webhookHandle(): Server error: ${error}`, {
                error,
            });
            return send(500, 'Internal Server Error');
        }
    }

    /**
     * Запускает HTTP-сервер для обработки запросов.
     * Создает сервер на указанном хосте и порту
     *
     * @param {string} hostname - Имя хоста
     * @param {number} port - Порт
     * @param {TTemplateTypeModelClass | null} [userBotClass] - Пользовательский класс бота
     *
     * @example
     * ```typescript
     * // Запуск сервера на localhost:3000
     * bot.start('localhost', 3000);
     *
     * // Запуск с пользовательским классом
     * bot.start('localhost', 3000, MyBotClass);
     * ```
     */
    public start(
        hostname: string = 'localhost',
        port: number = 3000,
        userBotClass: TTemplateTypeModelClass | null = null,
    ): Server {
        this.close();

        this.#serverInst = createServer(
            async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
                return this.webhookHandle(req, res, userBotClass);
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

    async #gracefulShutdown(): Promise<void> {
        this.#appContext.log('Получен сигнал завершения. Выполняется graceful shutdown...');

        await this.close(); // закрывает HTTP-сервер

        await this.#appContext.closeDB();
        this.#appContext.clearCommands();
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
     * Закрывает HTTP-сервер.
     * Освобождает ресурсы и завершает работу сервера.
     *
     * @example
     * ```typescript
     * // Закрытие сервера
     * bot.close();
     * ```
     */
    public async close(): Promise<void> {
        if (this.#serverInst) {
            this.#serverInst.close();
            this.#serverInst = undefined;
        }
        await this.#appContext.closeDB();
    }
}
