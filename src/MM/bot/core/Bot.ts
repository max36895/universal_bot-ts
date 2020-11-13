import {TBotAuth, TBotContent} from "./interfaces/IBot";
import {
    IAppConfig,
    IAppParam,
    mmApp,
    T_ALISA,
    T_MARUSIA,
    T_TELEGRAM,
    T_USER_APP,
    T_VIBER,
    T_VK,
    TAppType
} from "./mmApp";
import {BotController} from "../controller/BotController";
import {TemplateTypeModel} from "./types/TemplateTypeModel";
import {Alisa} from "./types/Alisa";
import {GET, stdin} from "../utils/functins";
import alisaConfig from "./skillsTemplateConfig/alisaConfig";
import {Telegram} from "./types/Telegram";
import {UsersData} from "../models/UsersData";
import {Viber} from "./types/Viber";
import {Marusia} from "./types/Marusia";
import {Vk} from "./types/Vk";
import marusiaConfig from "./skillsTemplateConfig/marusiaConfig";
import vkConfig from "./skillsTemplateConfig/vkConfig";
import telegramConfig from "./skillsTemplateConfig/telegramConfig";
import viberConfig from "./skillsTemplateConfig/viberConfig";
import {IAlisaWebhookResponse} from "./interfaces/IAlisa";
import {IMarusiaWebhookResponse} from "./interfaces/IMarusia";
import {IncomingMessage, ServerResponse} from "http";

const {json, send} = require('micro');

export type TRunResult = IAlisaWebhookResponse | IMarusiaWebhookResponse | string;

export interface IBotTestParams {
    /**
     * @typedef {boolean} isShowResult Отображать полный навыка.
     */
    isShowResult?: boolean;
    /**
     * @typedef {boolean} isShowStorage Отображать данные из хранилища.
     */
    isShowStorage?: boolean;
    /**
     * @typedef {boolean} isShowTime Отображать время выполнения запроса.
     */
    isShowTime?: boolean;
    /**
     * @typedef {TemplateTypeModel} userBotClass Пользовательский класс для обработки команд.
     */
    userBotClass?: TemplateTypeModel;
    /**
     * @typedef {Function} userBotConfig Функция, возвращающая параметры пользовательского приложения.
     * @param query Пользовательский запрос.
     * @param count Номер сообщения.
     * @param state Данные из хранилища.
     */
    userBotConfig?: Function;
}

export * from './interfaces/IBot';

export class Bot {
    /**
     * Полученный запрос. В основном JSON.
     * @var content Полученный запрос. В основном JSON.
     */
    private _content: TBotContent;
    /**
     * Логика приложения.
     * @var botController Логика приложения.
     * @see BotController Смотри тут
     */
    protected _botController: BotController;
    /**
     * Авторизационный токен если есть (Актуально для Алисы). Передастся в том случае, если пользователь произвел авторизацию в навыке.
     * @var auth Авторизационный токен если есть (Актуально для Алисы). Передастся в том случае, если пользователь произвел авторизацию в навыке.
     */
    protected _auth: TBotAuth;

    constructor(type?: TAppType) {
        this._auth = null;
        this._botController = null;
        if (!type) {
            mmApp.appType = T_ALISA;
        } else {
            mmApp.appType = type;
        }
    }

    /**
     * Инициализация типа бота через GET параметры.
     * Если присутствует get['type'], и он корректен(Равен одному из типов бота), тогда инициализация пройдет успешно.
     *
     * @return boolean
     * @api
     */
    public initTypeInGet(): boolean {
        if (GET['type']) {
            if ([T_TELEGRAM, T_ALISA, T_VIBER, T_VK, T_USER_APP, T_MARUSIA].indexOf(GET['type'])) {
                mmApp.appType = GET['type'];
                return true;
            }
        }
        return false;
    }

    /**
     * Инициализация конфигурации приложения.
     *
     * @param config Конфигурация приложения.
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
     * @param params Параметры приложения.
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
     * @param fn Контроллер с логикой приложения.
     * @api
     */
    public initBotController(fn: BotController): void {
        this._botController = fn;
    }

    /**
     * Запуск приложения.
     *
     * @param userBotClass Пользовательский класс для обработки команд.
     * @return string
     * @api
     */
    public run(userBotClass: TemplateTypeModel = null): TRunResult {
        let botClass: TemplateTypeModel = null;
        let type = null;
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
            case T_USER_APP:
                if (userBotClass) {
                    botClass = userBotClass;
                    type = UsersData.T_USER_APP;
                }
        }

        if (botClass) {
            if (this._botController.userToken === null) {
                this._botController.userToken = this._auth;
            }
            if (botClass.init(this._content, this._botController)) {
                if (botClass.sendInInit) {
                    return botClass.sendInInit;
                }
                const userData = new UsersData();
                this._botController.userId = userData.escapeString(this._botController.userId);
                if (type) {
                    userData.type = type;
                }

                const isLocalStorage: boolean = (mmApp.config.isLocalStorage && botClass.isLocalStorage());

                let isNew = true;
                if (isLocalStorage) {
                    botClass.isUsedLocalStorage = isLocalStorage;
                    this._botController.userData = botClass.getLocalStorage();
                } else {
                    let sql = `\`userId\`=\"${userData.escapeString(this._botController.userId)}\"`;
                    if (this._auth) {
                        sql = `\`userId\`=\"${userData.escapeString(this._botController.userToken)}\"`;
                    }

                    if (userData.whereOne(sql)) {
                        this._botController.userData = userData.data;
                        isNew = false;
                    } else {
                        this._botController.userData = null;
                        userData.userId = this._botController.userId;
                        userData.meta = this._botController.userMeta;
                    }
                }

                this._botController.run();
                let content: any = botClass.getContext();
                if (!isLocalStorage) {
                    userData.data = this._botController.userData;

                    if (isNew) {
                        userData.save(true);
                    } else {
                        userData.update();
                    }
                }

                if (botClass.getError()) {
                    mmApp.saveLog('bot.log', botClass.getError());
                }
                return content;
            } else {
                console.error(botClass.getError());
                mmApp.saveLog('bot.log', botClass.getError());
            }
        } else {
            console.error('Не удалось определить тип бота!');
            mmApp.saveLog('bot.log', 'Не удалось определить тип бота!');
        }
        return 'notFound';
    }


    /**
     * Webhook
     *
     * @param req
     * @param res
     * @param userBotClass Пользовательский класс для обработки команд.
     * @return string
     * @api
     */
    public async start(req: IncomingMessage, res: ServerResponse, userBotClass: TemplateTypeModel = null) {
        let statusCode = 200;

        // Принимаем только POST-запросы:
        if (req.method !== "POST") {
            statusCode = 400;
            send(res, statusCode, 'Bad Request');
            return;
        }

        const query = await json(req);
        if (query) {
            this._content = query;
            const result = this.run(userBotClass);
            statusCode = result === 'notFound' ? 404 : 200;
            send(res, statusCode, result);
        } else {
            statusCode = 400;
            send(res, statusCode, 'Bad Request');
            return;
        }
    }

    /**
     * Тестирование навыка.
     * Отображает только ответы навыка.
     * Никакой прочей информации (картинки, звуки, кнопки и тд) не отображаются!
     *
     * Для корректной работы, внутри логики навыка не должно быть пользовательских вызовов к серверу бота.
     *
     * @param params Параметры для теста
     * @api
     */
    public async test({
                          isShowResult = false,
                          isShowStorage = false,
                          isShowTime = true,
                          userBotClass = null,
                          userBotConfig = null
                      }: IBotTestParams = {}) {

        let count: number = 0;
        let state: string | object = {};
        do {
            let query = '';
            if (count == 0) {
                console.log("Для выхода напишите exit\n");
                query = 'Привет';
            } else {
                query = await stdin();
                if (query === 'exit') {
                    break;
                }
            }
            if (!this._content) {
                this._content = JSON.stringify(this.getSkillContent(query, count, state, userBotConfig));
            }
            const timeStart: number = Date.now();
            if (typeof this._content === 'string') {
                this._content = JSON.parse(this._content);
            }

            let result: any = this.run(userBotClass);
            if (isShowResult) {
                console.log(`Результат работы: > \n${JSON.stringify(result)}\n\n`);
            }
            if (isShowStorage) {
                console.log(`Данные в хранилище > \n${JSON.stringify(this._botController.userData)}\n\n`);
            }

            switch (mmApp.appType) {
                case T_ALISA:
                    if (result.response.text) {
                        result = result.response.text;
                    } else {
                        result = result.response.tts;
                    }
                    break;
                default:
                    result = this._botController.text;
                    break;
            }
            console.log(`Бот: > ${result}\n`);
            if (isShowTime) {
                const endTime: number = Date.now() - timeStart;
                console.log(`Время выполнения: ${endTime}\n`)
            }
            if (this._botController.isEnd) {
                break;
            }
            console.log('Вы: > ');
            this._content = null;
            this._botController.text = this._botController.tts = '';
            state = this._botController.userData;
            count++;
        } while (1);
    }

    /**
     * Возвращает корректную конфигурацию для конкретного типа приложения.
     *
     * @param query Пользовательский запрос.
     * @param count Номер сообщения.
     * @param state Данные из хранилища.
     * @param userBotConfig Функция, возвращающая параметры пользовательского приложения.
     * @return any
     */
    protected getSkillContent(query: string, count: number, state: object | string, userBotConfig: Function): any {
        /**
         * Все переменные используются внутри шаблонов
         */
        let content: object = {};
        const userId: string = 'user_local_test';
        switch (mmApp.appType) {
            case T_ALISA:
                content = alisaConfig(query, userId, count, state);
                break;

            case T_MARUSIA:
                content = marusiaConfig(query, userId, count);
                break;

            case T_VK:
                this._botController.isSend = false;
                content = vkConfig(query, userId, count);
                break;

            case T_TELEGRAM:
                this._botController.isSend = false;
                content = telegramConfig(query, userId, count);
                break;

            case T_VIBER:
                this._botController.isSend = false;
                content = viberConfig(query, userId, count);
                break;

            case T_USER_APP:
                this._botController.isSend = true;
                if (userBotConfig) {
                    content = userBotConfig(query, userId, count);
                }
                break;
        }
        return content;
    }
}

