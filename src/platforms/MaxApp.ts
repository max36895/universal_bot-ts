import { TemplateTypeModel } from './TemplateTypeModel';
import { BotController } from '../controller';
import { MaxRequest } from '../api/MaxRequest';
import { IMaxParams } from '../api/interfaces';
import { Buttons } from '../components/button';
import { IMaxRequestContent } from './interfaces/IMaxApp';

/**
 * Класс для работы с платформой Max.
 * Отвечает за инициализацию и обработку запросов от пользователя,
 * а также формирование ответов в формате Max
 * @class MaxApp
 * @extends TemplateTypeModel
 * @see TemplateTypeModel Смотри тут
 */
export class MaxApp extends TemplateTypeModel {
    /**
     * Инициализирует основные параметры для работы с запросом
     * Обрабатывает входящие сообщения и события от ВКонтакте
     * @param query Запрос пользователя в формате строки или объекта
     * @param controller Контроллер с логикой бота
     * @returns {Promise<boolean>} true при успешной инициализации, false при ошибке
     * @see TemplateTypeModel.init() Смотри тут
     *
     * Поддерживаемые типы событий:
     * - confirmation: подтверждение сервера
     * - message_new: новое сообщение
     *
     * Структура сообщения:
     * - date: время отправки
     * - from_id: ID отправителя
     * - id: ID сообщения
     * - out: исходящее сообщение
     * - peer_id: ID получателя
     * - text: текст сообщения
     * - conversation_message_id: ID сообщения в беседе
     * - fwd_messages: пересланные сообщения
     * - important: важное сообщение
     * - random_id: случайный ID
     * - attachments: вложения
     * - is_hidden: скрытое сообщение
     * - payload: дополнительные данные
     */
    public async init(
        query: string | IMaxRequestContent,
        controller: BotController,
    ): Promise<boolean> {
        if (query) {
            /*
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
            let content: IMaxRequestContent;
            if (typeof query === 'string') {
                content = <IMaxRequestContent>JSON.parse(query);
            } else {
                content = { ...query };
            }
            if (!this.controller) {
                this.controller = controller;
            }
            this.controller.requestObject = content;
            switch (content.update_type || null) {
                case 'message_created':
                    if (typeof content.message !== 'undefined') {
                        const object: IMaxRequestContent['message'] = content.message;
                        this.controller.userId = object.sender.user_id;
                        this.appContext.platformParams.user_id = this.controller.userId;
                        this.controller.userCommand = object.body.text.toLowerCase().trim();
                        this.controller.originalUserCommand = object.body.text.trim();
                        this.controller.messageId = object.body.seq;
                        this.controller.payload = object.body.attachments || null;
                        const thisUser = {
                            username: object.sender.username,
                            first_name: object.sender.first_name || null,
                            last_name: object.sender.last_name || null,
                        };
                        this.controller.nlu.setNlu({ thisUser });
                        return true;
                    }
                    return false;

                default:
                    this.error = 'Max:init(): Некорректный тип данных!';
                    break;
            }
        } else {
            this.error = 'Max:init(): Отправлен пустой запрос!';
        }

        return false;
    }

    /**
     * Формирует и отправляет ответ пользователю.
     * Отправляет текст, карточки и звуки через MAX API
     * @returns {Promise<string>} 'ok' при успешной отправке
     * @see TemplateTypeModel.getContext() Смотри тут
     */
    public async getContext(): Promise<string> {
        if (this.controller.isSend) {
            const keyboard = this.controller.buttons.getButtons(Buttons.T_MAX_BUTTONS);
            const params: IMaxParams = {};
            if (keyboard) {
                params.keyboard = keyboard;
            }
            if (this.controller.card.images.length) {
                params.attachments = await this.controller.card.getCards();
            }
            if (this.controller.sound.sounds.length) {
                const attach = await this.controller.sound.getSounds(this.controller.tts);
                params.attachments = { ...attach, ...params.attachments };
            }
            const maxApi = new MaxRequest(this.appContext);
            await maxApi.messagesSend(
                this.controller.userId as string,
                this.controller.text,
                params,
            );
        }
        return 'ok';
    }
}
