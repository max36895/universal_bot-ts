import { TBotAuth, TBotContent } from './interfaces/IBot';
import {
    IAppConfig,
    IAppParam,
    mmApp,
    T_ALISA,
    T_MARUSIA,
    T_SMARTAPP,
    T_TELEGRAM,
    T_USER_APP,
    T_VIBER,
    T_VK,
    TAppType,
} from '../mmApp';
import { BotController, IUserData } from '../controller';
import { TemplateTypeModel } from '../platforms/TemplateTypeModel';
import { GET } from '../utils/standard/util';
import {
    Telegram,
    Viber,
    Marusia,
    Vk,
    SmartApp,
    Alisa,
    IAlisaWebhookResponse,
    IMarusiaWebhookResponse,
} from '../platforms';
import { UsersData } from '../models/UsersData';
import { IncomingMessage, ServerResponse, createServer, Server } from 'http';

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
    type: number | null;
}

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
 * bot.initConfig({
 *   intents: [{
 *     name: 'greeting',
 *     slots: ['привет', 'здравствуйте']
 *   }]
 * });
 * bot.initBotController(new MyController());
 * ```
 *
 * @example
 * Использование с базой данных:
 * ```typescript
 * const bot = new Bot();
 * bot.initConfig({
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
 * bot.initConfig({
 *   telegram: {
 *     token: 'YOUR_BOT_TOKEN'
 *   }
 * });
 * ```
 */
export class Bot<TUserData extends IUserData = IUserData> {
    /** Экземпляр HTTP-сервера */
    protected _serverInst: Server | undefined;

    /**
     * Модель с данными пользователя
     * @private
     */
    private _userData: UsersData | undefined;

    /**
     * Полученный запрос от пользователя
     * Может быть JSON-строкой, текстом или null
     * @protected
     * @type {TBotContent}
     */
    protected _content: TBotContent = null;

    /**
     * Контроллер с бизнес-логикой приложения
     * Обрабатывает команды и формирует ответы
     * @see BotController
     * @protected
     * @type {BotController<TUserData>}
     */
    protected _botController: BotController<TUserData>;

    /**
     * Авторизационный токен пользователя
     * Используется для авторизованных запросов (например, в Алисе)
     * @protected
     * @type {TBotAuth}
     */
    protected _auth: TBotAuth;

    /**
     * Создает новый экземпляр бота
     *
     * @param {TAppType} [type] - Тип платформы (по умолчанию Алиса)
     * @param {BotController} [botController] - Контроллер с логикой
     *
     * @throws {Error} Если не удалось инициализировать бота
     *
     * @example
     * ```typescript
     * // Создание бота для Telegram
     * const bot = new Bot(T_TELEGRAM, new MyController());
     *
     * // Создание бота для VK
     * const bot = new Bot(T_VK, new MyController());
     *
     * // Создание бота для Алисы
     * const bot = new Bot(T_ALISA, new MyController());
     * ```
     */
    constructor(type?: TAppType, botController?: BotController<TUserData>) {
        this._auth = null;
        this._botController = botController as BotController<TUserData>;
        mmApp.appType = !type ? T_ALISA : type;
    }

    /**
     * Инициализирует тип бота через GET-параметры
     * Если в URL присутствует параметр type с корректным значением,
     * устанавливает соответствующий тип платформы
     *
     * @returns {boolean} true если инициализация прошла успешно
     *
     * @example
     * ```typescript
     * // URL: https://bot.example.com?type=telegram
     * if (bot.initTypeInGet()) {
     *   console.log('Тип бота успешно инициализирован для Telegram');
     * }
     *
     * // URL: https://bot.example.com?type=vk
     * if (bot.initTypeInGet()) {
     *   console.log('Тип бота успешно инициализирован для VK');
     * }
     * ```
     */
    public initTypeInGet(): boolean {
        if (GET && GET.type) {
            if (
                [T_TELEGRAM, T_ALISA, T_VIBER, T_VK, T_USER_APP, T_MARUSIA, T_SMARTAPP].indexOf(
                    GET.type,
                )
            ) {
                mmApp.appType = GET.type;
                return true;
            }
        }
        return false;
    }

    /**
     * Инициализирует конфигурацию приложения
     * Устанавливает настройки бота, включая интенты, базу данных и другие параметры
     *
     * @param {IAppConfig} config - Конфигурация приложения
     *
     * @example
     * ```typescript
     * // Базовая конфигурация
     * bot.initConfig({
     *   intents: [{
     *     name: 'help',
     *     slots: ['помощь', 'справка']
     *   }],
     *   isLocalStorage: true
     * });
     *
     * // Конфигурация с базой данных
     * bot.initConfig({
     *   db: {
     *     host: 'localhost',
     *     database: 'bot_db',
     *     user: 'user',
     *     pass: 'password'
     *   }
     * });
     *
     * // Конфигурация с Telegram
     * bot.initConfig({
     *   telegram: {
     *     token: 'YOUR_BOT_TOKEN'
     *   }
     * });
     * ```
     *
     * @remarks
     * Важно! Чувствительные данные рекомендуется сохранять в .env файл, передав путь к нему:
     * ```typescript
     * bot.initConfig({
     *     env: './.env', // путь до файла
     * });
     * ```
     */
    public initConfig(config: IAppConfig): void {
        if (config) {
            mmApp.setConfig(config);
        }
    }

    /**
     * Инициализирует параметры приложения
     * Устанавливает дополнительные параметры для работы бота
     *
     * @param {IAppParam} params - Параметры приложения
     *
     * @example
     * ```typescript
     * // Включение режима отладки
     * bot.initParams({
     *   isDebug: true,
     *   isSaveLog: true,
     *   logPath: './logs'
     * });
     * ```
     *
     * @remarks
     * Важно! Чувствительные данные рекомендуется сохранять в .env файл, передав путь к нему:
     * ```typescript
     * bot.initConfig({
     *     env: './.env', // путь до файла
     * });
     * ```
     */
    public initParams(params: IAppParam): void {
        if (params) {
            mmApp.setParams(params);
        }
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
    public initBotController(fn: BotController<TUserData>): void {
        if (fn) {
            this._botController = fn;
        }
    }

    /**
     * Определяет тип платформы и возвращает соответствующий класс для обработки
     *
     * @param {TemplateTypeModel | null} [userBotClass] - Пользовательский класс бота
     * @returns {IBotBotClassAndType} Объект с типом платформы и классом обработчика
     * @throws {Error} Если не удалось определить тип приложения
     *
     * @remarks
     * Метод определяет тип платформы на основе mmApp.appType и возвращает соответствующий класс:
     * - T_ALISA → Alisa
     * - T_VK → Vk
     * - T_TELEGRAM → Telegram
     * - T_VIBER → Viber
     * - T_MARUSIA → Marusia
     * - T_SMARTAPP → SmartApp
     * - T_USER_APP → Пользовательский класс
     *
     * @protected
     */
    protected static _getBotClassAndType(
        userBotClass: TemplateTypeModel | null = null,
    ): IBotBotClassAndType {
        let botClass: TemplateTypeModel | null = null;
        let type: number | null = null;

        switch (mmApp.appType) {
            case T_ALISA:
                botClass = new Alisa();
                type = UsersData.T_ALISA;
                break;

            case T_VK:
                botClass = new Vk();
                type = UsersData.T_VK;
                break;

            case T_TELEGRAM:
                botClass = new Telegram();
                type = UsersData.T_TELEGRAM;
                break;

            case T_VIBER:
                botClass = new Viber();
                type = UsersData.T_VIBER;
                break;

            case T_MARUSIA:
                botClass = new Marusia();
                type = UsersData.T_MARUSIA;
                break;

            case T_SMARTAPP:
                botClass = new SmartApp();
                type = UsersData.T_SMART_APP;
                break;

            case T_USER_APP:
                if (userBotClass) {
                    botClass = userBotClass;
                    type = UsersData.T_USER_APP;
                }
                break;
        }
        return { botClass, type };
    }

    /**
     * Устанавливает контент запроса
     * Используется для передачи данных от пользователя в бота
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
     * Возвращает модель с данными пользователя
     * @private
     */
    private _getUserData(): UsersData {
        if (this._userData) {
            return this._userData;
        }
        this._userData = new UsersData();
        return this._userData;
    }

    /**
     * Очищает состояние пользователя
     * @private
     */
    private _clearState(): void {
        if (this._botController) {
            this._botController.buttons.clear();
            this._botController.card.clear();
            this._botController.sound.sounds = [];
            this._botController.nlu.setNlu({});
        }
    }

    /**
     * Запускает обработку запроса
     * Выполняет основную логику бота и возвращает результат
     *
     * @param {TemplateTypeModel | null} [userBotClass] - Пользовательский класс бота
     * @returns {Promise<TRunResult>} Результат выполнения бота
     *
     * @example
     * ```typescript
     * // Обработка запроса
     * const result = await bot.run();
     * console.log(result);
     *
     * // Обработка с пользовательским классом
     * const result = await bot.run(new MyBotClass());
     * ```
     */
    public async run(userBotClass: TemplateTypeModel | null = null): Promise<TRunResult> {
        if (!this._botController) {
            const errMsg =
                'Не определен класс с логикой приложения. Укажите класс с логикой, передав его в метод initBotController';
            mmApp.saveLog('bot.log', errMsg);
            throw new Error(errMsg);
        }
        const { botClass, type } = Bot._getBotClassAndType(userBotClass);

        if (botClass) {
            if (this._botController.userToken === null) {
                this._botController.userToken = this._auth;
            }
            if (await botClass.init(this._content, this._botController)) {
                if (botClass.sendInInit) {
                    return await botClass.sendInInit;
                }
                const userData = this._getUserData();
                userData.escapeString('');
                this._botController.userId = userData.escapeString(
                    this._botController.userId as string | number,
                );
                if (type) {
                    userData.type = type;
                }

                const isLocalStorage: boolean = !!(
                    mmApp.config.isLocalStorage && botClass.isLocalStorage()
                );

                let isNewUser = true;
                if (isLocalStorage) {
                    botClass.isUsedLocalStorage = isLocalStorage;
                    this._botController.userData = (await botClass.getLocalStorage()) as TUserData;
                } else {
                    const query = {
                        userId: userData.escapeString(this._botController.userId),
                    };
                    if (this._auth) {
                        query.userId = userData.escapeString(
                            this._botController.userToken as string,
                        );
                    }

                    if (await userData.whereOne(query)) {
                        this._botController.userData = userData.data;
                        isNewUser = false;
                    } else {
                        this._botController.userData = {} as TUserData;
                        userData.userId = this._botController.userId;
                        userData.meta = this._botController.userMeta;
                    }
                }
                if (
                    !this._botController.oldIntentName &&
                    this._botController.userData &&
                    this._botController.userData.oldIntentName
                ) {
                    this._botController.oldIntentName = this._botController.userData.oldIntentName;
                }

                this._botController.run();
                if (this._botController.thisIntentName !== null && this._botController.userData) {
                    this._botController.userData.oldIntentName = this._botController.thisIntentName;
                } else {
                    delete this._botController.userData?.oldIntentName;
                }
                let content: any;
                if (this._botController.isSendRating) {
                    content = await botClass.getRatingContext();
                } else {
                    content = await botClass.getContext();
                }
                if (!isLocalStorage) {
                    userData.data = this._botController.userData;

                    if (isNewUser) {
                        userData.save(true).then((res) => {
                            if (!res) {
                                mmApp.saveLog(
                                    'bot.log',
                                    `Bot:run(): Не удалось сохранить данные для пользователя: ${this._botController.userId}.`,
                                );
                            }
                        });
                    } else {
                        userData.update().then((res) => {
                            if (!res) {
                                mmApp.saveLog(
                                    'bot.log',
                                    `Bot:run(): Не удалось обновить данные для пользователя: ${this._botController.userId}.`,
                                );
                            }
                        });
                    }
                } else {
                    await botClass.setLocalStorage(this._botController.userData);
                }

                if (botClass.getError()) {
                    mmApp.saveLog('bot.log', botClass.getError());
                }
                userData.destroy();
                this._clearState();
                return content;
            } else {
                mmApp.saveLog('bot.log', botClass.getError());
                throw new Error(botClass.getError() || '');
            }
        } else {
            const msg = 'Не удалось определить тип приложения!';
            mmApp.saveLog('bot.log', msg);
            throw new Error(msg);
        }
    }

    /**
     * Запускает HTTP-сервер для обработки запросов.
     * Создает сервер на указанном хосте и порту
     *
     * @param {string} hostname - Имя хоста
     * @param {number} port - Порт
     * @param {TemplateTypeModel | null} [userBotClass] - Пользовательский класс бота
     *
     * @example
     * ```typescript
     * // Запуск сервера на localhost:3000
     * bot.start('localhost', 3000);
     *
     * // Запуск с пользовательским классом
     * bot.start('localhost', 3000, new MyBotClass());
     * ```
     */
    public start(
        hostname: string = 'localhost',
        port: number = 3000,
        userBotClass: TemplateTypeModel | null = null,
    ): Server {
        const send = (res: ServerResponse, statusCode: number, result: object | string): void => {
            res.statusCode = statusCode;
            res.setHeader(
                'Content-Type',
                typeof result === 'object' ? 'application/json' : 'text/plain',
            );
            res.end(typeof result === 'string' ? result : JSON.stringify(result));
        };

        this.close();

        this._serverInst = createServer(
            async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
                // Принимаем только POST-запросы:
                if (req.method !== 'POST') {
                    send(res, 400, 'Bad Request');
                    return;
                }

                try {
                    const data = await this.readRequestData(req);
                    const query: TBotContent = JSON.parse(data);
                    if (query) {
                        if (req.headers && req.headers.authorization) {
                            this._auth = req.headers.authorization.replace('Bearer', '');
                        }
                        this.setContent(query);
                        const result = await this.run(userBotClass);
                        send(res, result === 'notFound' ? 404 : 200, result);
                    }
                } catch (error) {
                    if (error instanceof SyntaxError) {
                        mmApp.saveLog('bot.log', `Bot:start(): Syntax Error: ${error}`);
                        send(res, 400, 'Invalid JSON');
                    } else {
                        mmApp.saveLog('bot.log', `Bot:start(): Server error: ${error}`);
                        send(res, 500, 'Internal Server Error');
                    }
                }
            },
        );

        this._serverInst.listen(port, hostname, () => {
            console.log(`Server running at //${hostname}:${port}/`);
        });
        return this._serverInst;
    }

    /**
     * Обработка запросов webhook сервера
     * @param req
     * @private
     */
    private readRequestData(req: IncomingMessage): Promise<string> {
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
    public close(): void {
        if (this._serverInst) {
            this._serverInst.close();
            this._serverInst = undefined;
        }
    }
}
