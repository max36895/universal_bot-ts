/**
 * Модуль для работы с ботом
 * Содержит основной класс для инициализации и управления ботом
 *
 * @module core/Bot
 */
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
import { IncomingMessage, ServerResponse } from 'http';

/**
 * Результат выполнения бота - ответ, который будет отправлен пользователю
 * Может быть ответом для Алисы, Маруси или текстовым сообщением
 */
export type TRunResult = IAlisaWebhookResponse | IMarusiaWebhookResponse | string;

export * from './interfaces/IBot';

/**
 * Внутренний интерфейс для хранения информации о классе бота и его типе
 * Используется для определения подходящего обработчика запросов
 */
export interface IBotBotClassAndType {
    /** Класс для обработки запросов конкретной платформы */
    botClass: TemplateTypeModel | null;
    /** Тип платформы (T_ALISA, T_VK и т.д.) */
    type: number | null;
}

/**
 * Основной класс для работы с ботом
 * Отвечает за инициализацию, конфигурацию и запуск бота
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
 */
export class Bot<TUserData extends IUserData = IUserData> {
    /**
     * Полученный запрос от пользователя
     * Может быть JSON-строкой, текстом или null
     * @protected
     */
    protected _content: TBotContent = null;

    /**
     * Контроллер с бизнес-логикой приложения
     * Обрабатывает команды и формирует ответы
     * @see BotController
     * @protected
     */
    protected _botController: BotController<TUserData>;

    /**
     * Авторизационный токен пользователя
     * Используется для авторизованных запросов (например, в Алисе)
     * @protected
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
     *   console.log('Тип бота успешно инициализирован');
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
     * bot.initConfig({
     *   intents: [{
     *     name: 'help',
     *     slots: ['помощь', 'справка']
     *   }],
     *   isLocalStorage: true,
     *   db: {
     *     host: 'localhost',
     *     database: 'bot_db'
     *   }
     * });
     * ```
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
     * Подключает контроллер с бизнес-логикой приложения
     * Контроллер должен содержать методы для обработки команд
     *
     * @param {BotController} fn - Контроллер с логикой приложения
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
     * bot.initBotController(new MyController());
     * ```
     */
    public initBotController(fn: BotController<TUserData>): void {
        this._botController = fn;
    }

    /**
     * Определяет тип платформы и возвращает соответствующий класс для обработки
     *
     * @param {TemplateTypeModel} [userBotClass] - Пользовательский класс для обработки
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
     * Устанавливает содержимое запроса
     *
     * @param {TBotContent} content - Содержимое запроса (JSON, текст или null)
     *
     * @example
     * ```typescript
     * // Установка JSON-запроса
     * bot.setContent('{"command": "start"}');
     *
     * // Установка текстового запроса
     * bot.setContent('Привет, бот!');
     * ```
     */
    public setContent(content: TBotContent): void {
        this._content = content;
    }

    /**
     * Запускает обработку запроса
     * Определяет тип платформы, создает соответствующий обработчик
     * и возвращает результат обработки
     *
     * @param {TemplateTypeModel} [userBotClass] - Пользовательский класс для обработки
     * @returns {Promise<TRunResult>} Результат обработки запроса
     *
     * @example
     * ```typescript
     * const result = await bot.run();
     * console.log('Ответ бота:', result);
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
                const userData = new UsersData();
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
     * Запускает обработку HTTP-запроса
     * Получает данные из запроса, обрабатывает их и отправляет ответ
     *
     * @param {IncomingMessage} req - Входящий HTTP-запрос
     * @param {ServerResponse} res - HTTP-ответ
     * @param {TemplateTypeModel} [userBotClass] - Пользовательский класс для обработки
     *
     * @example
     * ```typescript
     * // В Express.js
     * app.post('/webhook', async (req, res) => {
     *   await bot.start(req, res);
     * });
     * ```
     */
    public async start(
        req: IncomingMessage,
        res: ServerResponse,
        userBotClass: TemplateTypeModel | null = null,
    ): Promise<void> {
        const { json, send } = await require('micro');
        // Принимаем только POST-запросы:
        if (req.method !== 'POST') {
            send(res, 400, 'Bad Request');
            return;
        }

        const query = await json(req);
        if (query) {
            if (req.headers && req.headers.authorization) {
                this._auth = req.headers.authorization.replace('Bearer', '');
            }
            this.setContent(query);
            try {
                const result = await this.run(userBotClass);
                send(res, result === 'notFound' ? 404 : 200, result);
            } catch (e) {
                send(res, 404, 'notFound');
            }
        } else {
            send(res, 400, 'Bad Request');
            return;
        }
    }
}
