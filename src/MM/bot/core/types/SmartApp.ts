import {TemplateTypeModel} from "./TemplateTypeModel";
import {BotController} from "../../controller/BotController";
import {mmApp} from "../mmApp";
import {
    ISberSmartAppItem,
    ISberSmartAppResponsePayload,
    ISberSmartAppSession, ISberSmartAppWebhookRequest,
    ISberSmartAppWebhookResponse, TSberSmartAppEmotionId
} from "../interfaces/ISberSmartApp";
import {Text} from "../../components/standard/Text";
import {Buttons} from "../../components/button/Buttons";

/**
 * Класс, отвечающий за корректную инициализацию и отправку ответа для Сбер SmartApp
 * Class SmartApp
 * @class bot\core\types
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
    protected _session: ISberSmartAppSession;

    /**
     * Получение данных, необходимых для постоения ответа пользователю.
     *
     * @return ISberSmartAppResponsePayload
     */
    protected _getPayload(): ISberSmartAppResponsePayload {
        const payload: ISberSmartAppResponsePayload = {
            pronounceText: this.controller.text,
            pronounceTextType: 'application/text',
            device: this._session.device,
            intent: this.controller.thisIntentName,
            projectName: this._session.projectName,
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
                payload.items.push(<ISberSmartAppItem>this.controller.card.getCards());
            }
            payload.suggestions = {
                buttons: this.controller.buttons.getButtons(Buttons.T_SMARTAPP_BUTTONS)
            };
        }
        return payload;
    }

    /**
     * Инициализация основных параметров. В случае успешной инициализации, вернет true, иначе false.
     *
     * @param {ISberSmartAppWebhookRequest|string} query Запрос пользователя.
     * @param {BotController} controller Ссылка на класс с логикой навык/бота.
     * @return boolean
     * @see TemplateTypeModel::init() Смотри тут
     * @api
     */
    public init(query: string | ISberSmartAppWebhookRequest, controller: BotController): boolean {
        if (query) {
            let content: ISberSmartAppWebhookRequest = null;
            if (typeof query === 'string') {
                content = <ISberSmartAppWebhookRequest>JSON.parse(query);
            } else {
                content = {...query};
            }

            this.controller = controller;
            this.controller.requestObject = content;

            switch (content.messageName) {
                case 'MESSAGE_TO_SKILL':
                case 'CLOSE_APP':
                    this.controller.userCommand = content.payload.message.normalized_text;
                    this.controller.originalUserCommand = content.payload.message.original_text;
                    break;

                case 'SERVER_ACTION':
                case 'RUN_APP':
                    this.controller.payload = content.payload.server_action.parameters;
                    if (typeof this.controller.payload === 'string') {
                        this.controller.userCommand = this.controller.originalUserCommand = this.controller.payload;
                    }
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
            this.controller.messageId = content.messageId;

            mmApp.params.app_id = content.payload.app_info.applicationId;
            this.controller.isScreen = content.payload.device.capabilities.screen.available;
            return true;
        } else {
            this.error = 'SmartApp:init(): Отправлен пустой запрос!';
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
    public getContext(): ISberSmartAppWebhookResponse {
        const result: ISberSmartAppWebhookResponse = {
            messageName: 'ANSWER_TO_USER',
            sessionId: this._session.sessionId,
            messageId: this._session.messageId,
            uuid: this._session.uuid
        };

        if (this.controller.sound.sounds.length || this.controller.sound.isUsedStandardSound) {
            if (this.controller.tts === null) {
                this.controller.tts = this.controller.text;
            }
            this.controller.tts = this.controller.sound.getSounds(this.controller.tts);
        }
        result.payload = this._getPayload();
        const timeEnd: number = this.getProcessingTime();
        if (timeEnd >= this.MAX_TIME_REQUEST) {
            this.error = `SmartApp:getContext(): Превышено ограничение на отправку ответа. Время ответа составило: ${timeEnd} сек.`;
        }
        return result;
    }
}
