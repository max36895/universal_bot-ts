import {TemplateTypeModel} from "./TemplateTypeModel";
import {
    IMarusiaBigImage,
    IMarusiaItemsList,
    IMarusiaResponse,
    IMarusiaSession,
    IMarusiaSessionResponse, IMarusiaWebhookRequest,
    IMarusiaWebhookResponse
} from "../interfaces/IMarusia";
import {BotController} from "../../controller/BotController";
import {mmApp} from "../mmApp";
import {Text} from "../../components/standard/Text";

/**
 * Класс, отвечающий за корректную инициализацию и отправку ответа для Макруси.
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
     * Получение данных, необходимых для построения ответа пользователю.
     *
     * @return IMarusiaResponse
     */
    protected getResponse(): IMarusiaResponse {
        const response: IMarusiaResponse = {
            text: Text.resize(this.controller.text, 1024),
            tts: Text.resize(this.controller.tts, 1024),
            end_session: this.controller.isEnd
        };
        if (this.controller.isScreen) {
            if (this.controller.card.images.length) {
                response.card = <IMarusiaItemsList | IMarusiaBigImage>this.controller.card.getCards();
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
    protected getSession(): IMarusiaSessionResponse {
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
     * @return boolean
     * @see TemplateTypeModel::init() Смотри тут
     * @api
     */
    public init(query: string | IMarusiaWebhookRequest, controller: BotController): boolean {
        if (query) {
            let content: IMarusiaWebhookRequest = null;
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

            this.controller = controller;
            this.controller.requestObject = content;

            if (content.request.type === 'SimpleUtterance') {
                this.controller.userCommand = content.request.command.trim();
                this.controller.originalUserCommand = content.request.original_utterance.trim();
            } else {
                if (typeof content.request.payload === 'string') {
                    this.controller.userCommand = content.request.payload;
                    this.controller.originalUserCommand = content.request.payload;
                }
                this.controller.payload = content.request.payload;
            }
            if (!this.controller.userCommand) {
                this.controller.userCommand = this.controller.originalUserCommand;
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
     * @return string
     * @see TemplateTypeModel::getContext() Смотри тут
     * @api
     */
    public getContext(): IMarusiaWebhookResponse {
        const result: IMarusiaWebhookResponse = {
            version: this.VERSION,
        };
        result.response = this.getResponse();
        result.session = this.getSession();
        const timeEnd = this.getProcessingTime();
        if (timeEnd >= this.MAX_TIME_REQUEST) {
            this.error = `Marusia:getContext(): Превышено ограничение на отправку ответа. Время ответа составило: ${timeEnd} сек.`;
        }
        return result;
    }
}
