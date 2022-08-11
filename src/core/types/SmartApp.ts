import {TemplateTypeModel} from "./TemplateTypeModel";
import {BotController} from "../../controller/BotController";
import {mmApp} from "../mmApp";
import {
    ISberSmartAppItem,
    ISberSmartAppResponsePayload,
    ISberSmartAppSession,
    ISberSmartAppSuggestionButton,
    ISberSmartAppWebhookRequest,
    ISberSmartAppWebhookResponse,
    TSberSmartAppEmotionId
} from "../interfaces/ISberSmartApp";
import {Text} from "../../components/standard/Text";
import {Buttons} from "../../components/button";
import {Request} from "../../api";

/**
 * Класс, отвечающий за корректную инициализацию и отправку ответа для Сбер SmartApp
 * @class SmartApp
 * @see TemplateTypeModel Смотри тут
 */
export class SmartApp extends TemplateTypeModel {
    /**
     * @const float Максимально время, за которое должен ответить навык.
     */
    private readonly MAX_TIME_REQUEST: number = 2800;
    /**
     * Информация о сессии пользователя.
     */
    protected _session: ISberSmartAppSession | null = null;

    /**
     * Получение данных, необходимых для построения ответа пользователю.
     *
     * @return {Promise<ISberSmartAppResponsePayload>}
     * @private
     */
    protected async _getPayload(): Promise<ISberSmartAppResponsePayload> {
        const payload: ISberSmartAppResponsePayload = {
            pronounceText: this.controller.text,
            pronounceTextType: 'application/text',
            device: (this._session as ISberSmartAppSession).device,
            intent: this.controller.thisIntentName as string,
            projectName: (this._session as ISberSmartAppSession).projectName,
            auto_listening: !this.controller.isEnd,
            finished: this.controller.isEnd
        };

        if (this.controller.emotion) {
            payload.emotion = {
                emotionId: <TSberSmartAppEmotionId>this.controller.emotion
            };
        }
        if (this.controller.text) {
            payload.items = [
                {
                    bubble: {
                        text: Text.resize(this.controller.text, 250),
                        markdown: true,
                        expand_policy: 'auto_expand'
                    }
                }
            ]
        }
        if (this.controller.tts) {
            payload.pronounceText = this.controller.tts;
            payload.pronounceTextType = 'application/ssml';
        }

        if (this.controller.isScreen) {
            if (this.controller.card.images.length) {
                if (typeof payload.items === 'undefined') {
                    payload.items = [];
                }
                const cards: ISberSmartAppItem = await this.controller.card.getCards();
                payload.items.push(cards);
            }
            payload.suggestions = {
                buttons: this.controller.buttons.getButtons<ISberSmartAppSuggestionButton[]>(Buttons.T_SMARTAPP_BUTTONS)
            };
        }
        return payload;
    }

    /**
     * Инициализация основных параметров. В случае успешной инициализации, вернет true, иначе false.
     *
     * @param {ISberSmartAppWebhookRequest|string} query Запрос пользователя.
     * @param {BotController} controller Ссылка на класс с логикой навык/бота.
     * @return Promise<boolean>
     * @see TemplateTypeModel.init() Смотри тут
     * @api
     */
    public async init(query: string | ISberSmartAppWebhookRequest, controller: BotController): Promise<boolean> {
        if (query) {
            let content: ISberSmartAppWebhookRequest;
            if (typeof query === 'string') {
                content = <ISberSmartAppWebhookRequest>JSON.parse(query);
            } else {
                content = {...query};
            }

            if (!this.controller) {
                this.controller = controller;
            }
            this.controller.requestObject = content;
            this.controller.messageId = content.messageId;
            switch (content.messageName) {
                case 'MESSAGE_TO_SKILL':
                case 'CLOSE_APP':
                    this.controller.userCommand = content.payload.message.normalized_text;
                    this.controller.originalUserCommand = content.payload.message.original_text;
                    break;

                case 'SERVER_ACTION':
                case 'RUN_APP':
                    this.controller.payload = content.payload?.server_action?.parameters;
                    if (typeof this.controller.payload === 'string') {
                        this.controller.userCommand = this.controller.originalUserCommand = this.controller.payload;
                    }
                    if (content.messageName === 'RUN_APP') {
                        this.controller.messageId = 0;
                        this.controller.originalUserCommand = this.controller.userCommand;
                        this.controller.userCommand = '';
                    }
                    break;

                case 'RATING_RESULT':
                    this.controller.payload = content.payload;
                    this.controller.messageId = 1;
                    // todo временный костыль. Придумать как сдеалать лучше
                    this.controller.originalUserCommand = '$rating_info$';
                    this.controller.userCommand = '$rating_info$';
                    break;
            }

            if (!this.controller.userCommand) {
                this.controller.userCommand = this.controller.originalUserCommand;
            }

            this._session = {
                device: content.payload.device,
                meta: content.payload.meta,
                sessionId: content.sessionId,
                messageId: content.messageId,
                uuid: content.uuid,
                projectName: content.payload.projectName
            };

            this.controller.oldIntentName = content.payload.intent;
            this.controller.appeal = content.payload.character.appeal;
            this.controller.userId = content.uuid.userId;
            mmApp.params.user_id = this.controller.userId;
            const nlu = {
                entities: content.payload.message.entities,
                tokens: content.payload.message.tokenized_elements_list
            };
            this.controller.nlu.setNlu(nlu);

            this.controller.userMeta = content.payload.meta || {};

            mmApp.params.app_id = content.payload.app_info.applicationId;
            if (content.payload.device.capabilities && content.payload.device.capabilities.screen) {
                this.controller.isScreen = content.payload.device.capabilities.screen.available;
            } else {
                this.controller.isScreen = true;
            }

            return true;
        } else {
            this.error = 'SmartApp:init(): Отправлен пустой запрос!';
        }
        return false;
    }

    public async getRatingContext(): Promise<ISberSmartAppWebhookResponse> {
        return {
            messageName: 'CALL_RATING',
            sessionId: this._session.sessionId,
            messageId: this._session.messageId,
            uuid: this._session.uuid,
            payload: {}
        }
    }

    /**
     * Получение ответа, который отправится пользователю. В случае с Алисой, Марусей и Сбер, возвращается json. С остальными типами, ответ отправляется непосредственно на сервер.
     *
     * @return {Promise<ISberSmartAppWebhookResponse>}
     * @see TemplateTypeModel.getContext() Смотри тут
     * @api
     */
    public async getContext(): Promise<ISberSmartAppWebhookResponse> {
        const result: ISberSmartAppWebhookResponse = {
            messageName: 'ANSWER_TO_USER',
            sessionId: (this._session as ISberSmartAppSession).sessionId,
            messageId: (this._session as ISberSmartAppSession).messageId,
            uuid: (this._session as ISberSmartAppSession).uuid
        };

        if (this.controller.sound.sounds.length/* || this.controller.sound.isUsedStandardSound*/) {
            if (this.controller.tts === null) {
                this.controller.tts = this.controller.text;
            }
            this.controller.tts = await this.controller.sound.getSounds(this.controller.tts);
        }
        result.payload = await this._getPayload();
        const timeEnd: number = this.getProcessingTime();
        if (timeEnd >= this.MAX_TIME_REQUEST) {
            this.error = `SmartApp:getContext(): Превышено ограничение на отправку ответа. Время ответа составило: ${timeEnd} сек.`;
        }
        return result;
    }

    protected async _getUserData(): Promise<any | string> {
        const request = new Request();
        request.url = `https://smartapp-code.sberdevices.ru/tools/api/data/${this.controller.userId}`;
        const result = await request.send();
        if (result.status && result.data) {
            return result.data;
        }
        return {};
    }

    protected async _setUserData(data: any) {
        const request = new Request();
        request.header = Request.HEADER_AP_JSON;
        request.url = `https://smartapp-code.sberdevices.ru/tools/api/data/${this.controller.userId}`;
        request.post = data;
        return await request.send();
    }

    /**
     * Сохранение данных в хранилище.
     *
     * @return Promise<void>
     * @api
     */
    public async setLocalStorage(data: any): Promise<void> {
        await this._setUserData(data);
    }

    /**
     * Получение данные из локального хранилища
     * @return {Object | string}
     */
    public async getLocalStorage(): Promise<any | string> {
        return this._getUserData();
    }

    /**
     * Проверка на использование локального хранилища
     * @return {boolean}
     */
    public isLocalStorage(): boolean {
        return true;
    }
}
