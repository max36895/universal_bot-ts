import {TemplateTypeModel} from './TemplateTypeModel';
import {BotController} from '../controller';
import {IVkRequestContent, IVkRequestObject} from './interfaces';
import {mmApp} from '../mmApp';
import {VkRequest} from '../api/VkRequest';
import {IVkParams} from '../api/interfaces';
import {Buttons} from '../components/button';

/**
 * Класс, отвечающий за корректную инициализацию и отправку ответа для ВКонтакте.
 * @class Vk
 * @see TemplateTypeModel Смотри тут
 */
export class Vk extends TemplateTypeModel {
    /**
     * Инициализация основных параметров. В случае успешной инициализации, вернет true, иначе false.
     *
     * @param {IVkRequestContent|string} query Запрос пользователя.
     * @param {BotController} controller Ссылка на класс с логикой навык/бота.
     * @return Promise<boolean>
     * @see TemplateTypeModel.init() Смотри тут
     * @api
     */
    public async init(query: string | IVkRequestContent, controller: BotController): Promise<boolean> {
        if (query) {
            /**
             * array content
             *  - string type:
             *  - array object:
             *      - array message
             *          - int date
             *          - int from_id
             *          - int id
             *          - int out
             *          - int peer_id
             *          - string text
             *          - int conversation_message_id
             *          - array fwd_messages
             *          - bool important
             *          - int random_id
             *          - array attachments
             *          - bool is_hidden
             *          -
             *      - array clientInfo
             *          - array button_actions
             *          - bool keyboard
             *          - bool inline_keyboard
             *          - int lang_id
             *  - string group_id:
             *  - string event_id:
             *  - string secret:
             */
            let content: IVkRequestContent;
            if (typeof query === 'string') {
                content = <IVkRequestContent>JSON.parse(query);
            } else {
                content = {...query};
            }
            if (!this.controller) {
                this.controller = controller;
            }
            this.controller.requestObject = content;
            switch (content.type || null) {
                case 'confirmation':
                    this.sendInInit = mmApp.params.vk_confirmation_token;
                    return true;

                case 'message_new':
                    if (typeof content.object !== 'undefined') {
                        const object: IVkRequestObject = content.object;
                        this.controller.userId = object.message.from_id;
                        mmApp.params.user_id = this.controller.userId;
                        this.controller.userCommand = object.message.text.toLowerCase().trim();
                        this.controller.originalUserCommand = object.message.text.trim();
                        this.controller.messageId = object.message.id;
                        this.controller.payload = object.message.payload || null;
                        const user = await (new VkRequest()).usersGet(this.controller.userId);
                        if (user) {
                            const thisUser = {
                                username: null,
                                first_name: user.first_name || null,
                                last_name: user.last_name || null
                            };
                            this.controller.nlu.setNlu({thisUser});
                        }
                        return true;
                    }
                    return false;

                default:
                    this.error = 'Vk:init(): Некорректный тип данных!';
                    break;
            }
        } else {
            this.error = 'Vk:init(): Отправлен пустой запрос!';
        }

        return false;
    }

    /**
     * Получение ответа, который отправится пользователю. В случае с Алисой, Марусей и Сбер, возвращается json. С остальными типами, ответ отправляется непосредственно на сервер.
     *
     * @return {Promise<string>}
     * @see TemplateTypeModel.getContext() Смотри тут
     * @api
     */
    public async getContext(): Promise<string> {
        if (this.controller.isSend) {
            const keyboard = this.controller.buttons.getButtonJson(Buttons.T_VK_BUTTONS);
            const params: IVkParams = {};
            if (keyboard) {
                params.keyboard = keyboard;
            }
            if (this.controller.card.images.length) {
                const attach = await this.controller.card.getCards();
                if (attach.type) {
                    params.template = attach;
                } else {
                    params.attachments = attach;
                }
            }
            if (this.controller.sound.sounds.length) {
                const attach = await this.controller.sound.getSounds(this.controller.tts);
                params.attachments = {...attach, ...params.attachments};
            }
            const vkApi = new VkRequest();
            await vkApi.messagesSend(this.controller.userId as string, this.controller.text, params);
        }
        return 'ok';
    }
}
