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
 */
export type TRunResult = IAlisaWebhookResponse | IMarusiaWebhookResponse | string;

export * from './interfaces/IBot';

/**
 * Внутренний интерфейс для хранения информации о классе бота и его типе
 */
interface IBotBotClassAndType {
    botClass: TemplateTypeModel | null;
    type: number | null;
}

/**
 * Класс отвечающий за запуск приложения.
 * В нем происходит инициализации параметров, выбор типа приложения, запуск логики и возврат корректного результата.
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
     * Полученный запрос. В основном JSON или строка.
     * @protected
     */
    protected _content: TBotContent = null;
    /**
     * Контроллер с логикой приложения.
     * @see BotController Смотри тут
     * @protected
     */
    protected _botController: BotController<TUserData>;
    /**
     * Авторизационный токен если есть (Актуально для Алисы). Передастся в том случае, если пользователь произвел авторизацию в навыке.
     * @protected
     */
    protected _auth: TBotAuth;

    /**
     * Bot constructor.
     * @param {TAppType} type - Тип платформы (по умолчанию Алиса)
     * @param {BotController} botController - Контроллер с логикой
     *
     * @throws {Error} Если не удалось инициализировать бота
     */
    constructor(type?: TAppType, botController?: BotController<TUserData>) {
        this._auth = null;
        this._botController = botController as BotController<TUserData>;
        mmApp.appType = !type ? T_ALISA : type;
    }

    /**
     * Инициализация типа бота через GET параметры.
     * Если присутствует get['type'], и он корректен (Равен одному из типов бота), тогда инициализация пройдет успешно.
     *
     * @returns {boolean} true если инициализация прошла успешно, false в противном случае
     *
     * @example
     * ```typescript
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
     * Инициализация конфигурации приложения.
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
     *   isLocalStorage: true
     * });
     * ```
     */
    public initConfig(config: IAppConfig): void {
        if (config) {
            mmApp.setConfig(config);
        }
    }

    /**
     * Инициализация параметров приложения.
     *
     * @param {IAppParam} params Параметры приложения.
     */
    public initParams(params: IAppParam): void {
        if (params) {
            mmApp.setParams(params);
        }
    }

    /**
     * Подключение логики приложения.
     *
     * @param {BotController} fn - Контроллер с логикой приложения
     *
     * @example
     * ```typescript
     * class MyController extends BotController {
     *   public action(intentName: string): void {
     *     this.text = 'Привет!';
     *   }
     * }
     * bot.initBotController(new MyController());
     * ```
     */
    public initBotController(fn: BotController<TUserData>): void {
        this._botController = fn;
    }

    /**
     * Возвращает корректно заполненный тип приложения и класс для обработки команд
     *
     * @param {TemplateTypeModel} userBotClass - Пользовательский класс для обработки команд
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
     * - T_USER_APP → userBotClass (пользовательская реализация)
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
     * Устанавливает содержимое запроса для обработки ботом
     *
     * @param {TBotContent} content - Содержимое запроса (JSON или строка)
     *
     * @remarks
     * Этот метод используется для установки входящего запроса,
     * который будет обработан ботом. Содержимое может быть
     * в формате JSON или строки, в зависимости от платформы.
     *
     * @example
     * ```typescript
     * bot.setContent(JSON.stringify({
     *   request: {
     *     command: 'привет',
     *     type: 'SimpleUtterance'
     *   },
     *   session: {
     *     user_id: 'user123'
     *   }
     * }));
     * ```
     */
    public setContent(content: TBotContent): void {
        this._content = content;
    }

    /**
     * Запускает обработку запроса и возвращает ответ бота
     *
     * @param {TemplateTypeModel | null} userBotClass - Пользовательский класс для обработки команд
     * @returns {Promise<TRunResult>} Ответ бота в формате, соответствующем платформе
     * @throws {Error} Если не удалось обработать запрос или инициализировать бота
     *
     * @remarks
     * Метод выполняет следующие действия:
     * 1. Определяет тип платформы и инициализирует соответствующий обработчик
     * 2. Обрабатывает входящий запрос
     * 3. Запускает пользовательскую логику через контроллер
     * 4. Формирует ответ в формате, требуемом платформой
     *
     * @example
     * ```typescript
     * const bot = new Bot();
     * bot.initBotController(new MyController());
     * bot.setContent(requestData);
     * const result = await bot.run();
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
     * Запускает обработку запроса и отправляет ответ.
     * Это основной метод для интеграции бота с веб-сервером.
     *
     * @param {IncomingMessage} req - HTTP запрос от платформы
     * @param {ServerResponse} res - HTTP ответ для платформы
     * @param {TemplateTypeModel | null} userBotClass - Пользовательская реализация платформы (необязательно)
     *
     * @throws {Error} Если не удалось обработать запрос или отправить ответ
     *
     * @example
     * Базовое использование с micro:
     * ```typescript
     * module.exports = async (req: IncomingMessage, res: ServerResponse) => {
     *   const bot = new Bot();
     *   bot.initBotController(new MyController());
     *   await bot.start(req, res);
     * };
     * ```
     *
     * @example
     * Использование с пользовательской платформой:
     * ```typescript
     * class CustomPlatform extends TemplateTypeModel {
     *   // Реализация методов платформы
     * }
     *
     * bot.start(req, res, new CustomPlatform());
     * ```
     *
     * @remarks
     * - Обрабатывает авторизацию для Яндекс.Алисы
     * - Поддерживает все встроенные платформы без дополнительной настройки
     * - Для пользовательских платформ требуется передать userBotClass
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
