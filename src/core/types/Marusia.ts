import {TemplateTypeModel} from "./TemplateTypeModel";
import {
    IMarusiaBigImage,
    IMarusiaItemsList,
    IMarusiaResponse,
    IMarusiaSession,
    IMarusiaSessionResponse,
    IMarusiaWebhookRequest,
    IMarusiaWebhookResponse
} from "../interfaces/IMarusia";
import {BotController} from "../../controller/BotController";
import {mmApp} from "../mmApp";
import {Text} from "../../components/standard/Text";

/**
 * Класс, отвечающий за корректную инициализацию и отправку ответа для Маруси.
 * @class Marusia
 * @see TemplateTypeModel Смотри тут
 */
export class Marusia extends TemplateTypeModel {
    /**
     * @const string Версия Маруси.
     */
    private readonly VERSION: string = '1.0';
    /**
     * @const float Максимально время, за которое должен ответить навык.
     */
    private readonly MAX_TIME_REQUEST: number = 2.8;
    /**
     * Информация о сессии пользователя.
     */
    protected _session: IMarusiaSession;
    /**
     * Название хранилища. Зависит от того, от куда берутся данные (локально, глобально).
     */
    protected _stateName: string;

    /**
     * Получение данных, необходимых для построения ответа пользователю.
     *
     * @return {Promise<IMarusiaResponse>}
     */
    protected async _getResponse(): Promise<IMarusiaResponse> {
        const response: IMarusiaResponse = {
            text: Text.resize(this.controller.text, 1024),
            tts: Text.resize(this.controller.tts, 1024),
            end_session: this.controller.isEnd
        };
        if (this.controller.isScreen) {
            if (this.controller.card.images.length) {
                response.card = <IMarusiaItemsList | IMarusiaBigImage>(await this.controller.card.getCards());
                if (!response.card) {
                    response.card = undefined;
                }
            }
            response.buttons = this.controller.buttons.getButtons();
        }
        return response;
    }

    /**
     * Получение информации о сессии.
     *
     * @return IMarusiaSessionResponse
     */
    protected _getSession(): IMarusiaSessionResponse {
        return {
            session_id: this._session.session_id,
            message_id: this._session.message_id,
            user_id: this._session.user_id
        };
    }

    /**
     * Инициализация основных параметров. В случае успешной инициализации, вернет true, иначе false.
     *
     * @param {IMarusiaWebhookRequest|string} query Запрос пользователя.
     * @param {BotController} controller Ссылка на класс с логикой навык/бота.
     * @return Promise<boolean>
     * @see TemplateTypeModel::init() Смотри тут
     * @api
     */
    public async init(query: string | IMarusiaWebhookRequest, controller: BotController): Promise<boolean> {
        if (query) {
            let content: IMarusiaWebhookRequest;
            if (typeof query === 'string') {
                content = <IMarusiaWebhookRequest>JSON.parse(query);
            } else {
                content = {...query};
            }
            if (typeof content.session === 'undefined' && typeof content.request === 'undefined') {
                if (typeof content.account_linking_complete_event !== 'undefined') {
                    this.controller.isAuthSuccess = true;
                    return true;
                }
                this.error = 'Marusia::init(): Не корректные данные!';
                return false;
            }
            if (!this.controller) {
                this.controller = controller;
            }
            this.controller.requestObject = content;

            if (content.request.type === 'SimpleUtterance') {
                this.controller.userCommand = content.request.command.trim();
                this.controller.originalUserCommand = content.request.original_utterance.trim();
            } else {
                if (typeof content.request.payload === 'string') {
                    this.controller.userCommand = content.request.payload;
                    this.controller.originalUserCommand = content.request.payload;
                } else {
                    this.controller.userCommand = content.request.command?.trim();
                    this.controller.originalUserCommand = content.request.original_utterance?.trim();
                }
                this.controller.payload = content.request.payload;
            }
            if (!this.controller.userCommand) {
                this.controller.userCommand = this.controller.originalUserCommand;
            }

            if (typeof content.state !== 'undefined') {
                if (typeof content.state.user !== 'undefined') {
                    this.controller.state = content.state.user;
                    this._stateName = 'user_state_update';
                } else if (typeof content.state.session !== 'undefined') {
                    this.controller.state = content.state.session;
                    this._stateName = 'session_state';
                }
            }

            this._session = content.session;

            this.controller.userId = this._session.user_id;
            mmApp.params.user_id = this.controller.userId;
            this.controller.nlu.setNlu(content.request.nlu || null);

            this.controller.userMeta = content.meta || [];
            this.controller.messageId = this._session.message_id;

            mmApp.params.app_id = this._session.skill_id;
            this.controller.isScreen = typeof this.controller.userMeta.interfaces.screen !== 'undefined';
            return true;
        } else {
            this.error = 'Marusia:init(): Отправлен пустой запрос!';
        }
        return false;
    }

    /**
     * Получение ответа, который отправится пользователю. В случае с Алисой, Марусей и Сбер, возвращается json. С остальными типами, ответ отправляется непосредственно на сервер.
     *
     * @return {Promise<IMarusiaWebhookResponse>}
     * @see TemplateTypeModel::getContext() Смотри тут
     * @api
     */
    public async getContext(): Promise<IMarusiaWebhookResponse> {
        const result: IMarusiaWebhookResponse = {
            version: this.VERSION,
        };
        if (this.controller.sound.sounds.length || this.controller.sound.isUsedStandardSound) {
            if (this.controller.tts === null) {
                this.controller.tts = this.controller.text;
            }
            this.controller.tts = await this.controller.sound.getSounds(this.controller.tts);
        }
        result.response = await this._getResponse();
        result.session = this._getSession();
        if (this.isUsedLocalStorage && this.controller.userData) {
            result[this._stateName] = this.controller.userData;
        }
        const timeEnd = this.getProcessingTime();
        if (timeEnd >= this.MAX_TIME_REQUEST) {
            this.error = `Marusia:getContext(): Превышено ограничение на отправку ответа. Время ответа составило: ${timeEnd} сек.`;
        }
        return result;
    }

    /**
     * Получение данные из локального хранилища Алисы
     * @return {Promise<Object | string>}
     */
    public async getLocalStorage(): Promise<any | string> {
        return Promise.resolve(this.controller.state);
    }

    /**
     * Проверка на использование локального хранилища
     * @return {boolean}
     */
    public isLocalStorage(): boolean {
        return this.controller.state !== null;
    }
}
