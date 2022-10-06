import {TBotAuth, TBotContent} from './interfaces/IBot';
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
    TAppType
} from '../mmApp';
import {BotController} from '../controller';
import {TemplateTypeModel} from '../platforms/TemplateTypeModel';
import {GET} from '../utils/standard/util';
import {
    Telegram,
    Viber,
    Marusia,
    Vk,
    SmartApp,
    Alisa,
    IAlisaWebhookResponse,
    IMarusiaWebhookResponse
} from '../platforms';
import {UsersData} from '../models/UsersData';
import {IncomingMessage, ServerResponse} from 'http';

export type TRunResult = IAlisaWebhookResponse | IMarusiaWebhookResponse | string;

export * from './interfaces/IBot';

interface IBotBotClassAndType {
    botClass: TemplateTypeModel | null;
    type: number | null;
}

/**
 * Класс отвечающий за запуск приложения.
 * В нем происходит инициализации параметров, выбор типа приложения, запуск логики и возврат корректного результата.
 * @class Bot
 */
export class Bot {
    /**
     * Полученный запрос. В основном JSON или строка.
     */
    protected _content: TBotContent = null;
    /**
     * Контроллер с логикой приложения.
     * @see BotController Смотри тут
     */
    protected _botController: BotController;
    /**
     * Авторизационный токен если есть (Актуально для Алисы). Передастся в том случае, если пользователь произвел авторизацию в навыке.
     */
    protected _auth: TBotAuth;

    /**
     * Bot constructor.
     * @param {TAppType} type
     */
    constructor(type?: TAppType) {
        this._auth = null;
        // @ts-ignore
        this._botController = null;
        mmApp.appType = !type ? T_ALISA : type;
    }

    /**
     * Инициализация типа бота через GET параметры.
     * Если присутствует get['type'], и он корректен (Равен одному из типов бота), тогда инициализация пройдет успешно.
     *
     * @return boolean
     * @api
     */
    public initTypeInGet(): boolean {
        if (GET && GET.type) {
            if ([T_TELEGRAM,
                T_ALISA,
                T_VIBER,
                T_VK,
                T_USER_APP,
                T_MARUSIA,
                T_SMARTAPP].indexOf(GET.type)) {
                mmApp.appType = GET.type;
                return true;
            }
        }
        return false;
    }

    /**
     * Инициализация конфигурации приложения.
     *
     * @param {IAppConfig} config Конфигурация приложения.
     * @api
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
     * @api
     */
    public initParams(params: IAppParam): void {
        if (params) {
            mmApp.setParams(params);
        }
    }

    /**
     * Подключение логики приложения.
     *
     * @param {BotController} fn Контроллер с логикой приложения.
     * @api
     */
    public initBotController(fn: BotController): void {
        this._botController = fn;
    }

    /**
     * Возвращаем корректно заполненный тип приложения, а также класс, отвечающий за возврат результата.
     *
     * @param {TemplateTypeModel} userBotClass Пользовательский класс для обработки команд.
     * @return {IBotBotClassAndType}
     * @private
     */
    protected static _getBotClassAndType(userBotClass: TemplateTypeModel | null = null): IBotBotClassAndType {
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
        return {botClass, type};
    }

    /**
     * Устанавливает данные, полученные с сервера. Не рекомендуется записывать данные самостоятельно.
     * Стоит использовать тогда, когда запуск осуществляется через свой webhook.
     * При этом данные не валидируется, и разработчик сам отвечает за переданный контент.
     *
     * @param {TBotContent} content Данные, полученные сервером.
     */
    public setContent(content: TBotContent): void {
        this._content = content;
    }

    /**
     * Запуск приложения. В случае ошибки вернет исключение.
     * Рекомендуется вызывать метод в том случае, когда используется свой сервер отличный от micro.
     * При этому нужно самому заполнить данные в _content, а также обработать данные, переданные в заголовке.
     *
     * @param {TemplateTypeModel} userBotClass Пользовательский класс для обработки команд.
     * @return {Promise<TRunResult>}
     * @api
     * @see start
     * @see setContent
     */
    public async run(userBotClass: TemplateTypeModel | null = null): Promise<TRunResult> {
        if (!this._botController) {
            const errMsg = 'Не определен класс с логикой приложения. Укажите класс с логикой, передав его в метод initBotController';
            mmApp.saveLog('bot.log', errMsg);
            throw new Error(errMsg);
        }
        const {botClass, type} = Bot._getBotClassAndType(userBotClass);

        if (botClass) {
            if (this._botController.userToken === null) {
                this._botController.userToken = this._auth;
            }
            if (await botClass.init(this._content, this._botController)) {
                if (botClass.sendInInit) {
                    return await botClass.sendInInit;
                }
                const userData = new UsersData();
                this._botController.userId = userData.escapeString(this._botController.userId as string | number);
                if (type) {
                    userData.type = type;
                }

                const isLocalStorage: boolean = !!(mmApp.config.isLocalStorage && botClass.isLocalStorage());

                let isNew = true;
                if (isLocalStorage) {
                    botClass.isUsedLocalStorage = isLocalStorage;
                    this._botController.userData = await botClass.getLocalStorage();
                } else {
                    const query = {
                        userId: userData.escapeString(this._botController.userId)
                    };
                    if (this._auth) {
                        query.userId = userData.escapeString(this._botController.userToken as string);
                    }

                    if (await userData.whereOne(query)) {
                        this._botController.userData = userData.data;
                        isNew = false;
                    } else {
                        this._botController.userData = null;
                        userData.userId = this._botController.userId;
                        userData.meta = this._botController.userMeta;
                    }
                }
                if (!this._botController.oldIntentName
                    && this._botController.userData && this._botController.userData.oldIntentName) {
                    this._botController.oldIntentName = this._botController.userData.oldIntentName;
                }

                this._botController.run();
                if (this._botController.thisIntentName !== null) {
                    this._botController.userData.oldIntentName = this._botController.thisIntentName;
                } else {
                    delete this._botController.userData.oldIntentName;
                }
                let content: any;
                if (this._botController.isSendRating) {
                    content = await botClass.getRatingContext();
                } else {
                    content = await botClass.getContext();
                }
                if (!isLocalStorage) {
                    userData.data = this._botController.userData;

                    if (isNew) {
                        userData.save(true).then((res) => {
                            if (!res) {
                                mmApp.saveLog('bot.log', `Bot:run(): Не удалось сохранить данные для пользователя: ${this._botController.userId}.`)
                            }
                        });
                    } else {
                        userData.update().then((res) => {
                            if (!res) {
                                mmApp.saveLog('bot.log', `Bot:run(): Не удалось обновить данные для пользователя: ${this._botController.userId}.`)
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
            mmApp.saveLog('bot.log', 'Не удалось определить тип приложения!');
            throw new Error('Не удалось определить тип приложения!');
        }
    }

    /**
     * Запуск приложения через micro
     *
     * @param {"http".IncomingMessage} req Полученный запрос
     * @param {"http".ServerResponse} res Возврат запроса
     * @param {TemplateTypeModel} userBotClass Пользовательский класс для обработки команд.
     * @return {Promise<void>}
     * @api
     */
    public async start(req: IncomingMessage, res: ServerResponse, userBotClass: TemplateTypeModel | null = null) {
        const {json, send} = await require('micro');
        // Принимаем только POST-запросы:
        if (req.method !== "POST") {
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

