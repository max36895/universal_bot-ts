import { TemplateTypeModel } from './TemplateTypeModel';
import { BotController } from '../controller';
import { IVkRequestContent, IVkRequestObject } from './interfaces';
import { VkRequest } from '../api/VkRequest';
import { IVkParams } from '../api/interfaces';
import { Buttons } from '../components/button';
import { T_VK } from '../core';

/**
 * Класс для работы с платформой ВКонтакте.
 * Отвечает за инициализацию и обработку запросов от пользователя,
 * а также формирование ответов в формате ВКонтакте
 * @class Vk
 * @extends TemplateTypeModel
 * @see TemplateTypeModel Смотри тут
 */
export class Vk extends TemplateTypeModel {
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
        query: string | IVkRequestContent,
        controller: BotController,
    ): Promise<boolean> {
        if (query) {
            let content: IVkRequestContent;
            if (typeof query === 'string') {
                content = <IVkRequestContent>JSON.parse(query);
            } else {
                content = { ...query };
            }
            this.controller = controller;

            this.controller.requestObject = content;
            switch (content.type || null) {
                case 'confirmation':
                    this.sendInInit = this.appContext.platformParams.vk_confirmation_token;
                    return true;

                case 'message_new':
                    if (typeof content.object !== 'undefined') {
                        const object: IVkRequestObject = content.object;
                        this.controller.userId = object.message.from_id;
                        this.appContext.platformParams.user_id = this.controller.userId;
                        this.controller.userCommand = object.message.text.toLowerCase().trim();
                        this.controller.originalUserCommand = object.message.text.trim();
                        this.controller.messageId = object.message.id;
                        this.controller.payload = object.message.payload || null;
                        const user = await new VkRequest(this.appContext).usersGet(
                            this.controller.userId,
                        );
                        if (user) {
                            const thisUser = {
                                username: null,
                                first_name: user.first_name || null,
                                last_name: user.last_name || null,
                            };
                            this.controller.nlu.setNlu({ thisUser });
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
     * Формирует и отправляет ответ пользователю.
     * Отправляет текст, карточки и звуки через VK API
     * @returns {Promise<string>} 'ok' при успешной отправке
     * @see TemplateTypeModel.getContext() Смотри тут
     */
    public async getContext(): Promise<string> {
        if (this.controller.isSend) {
            const keyboard = this.controller.buttons.getButtonJson(Buttons.T_VK_BUTTONS);
            const params: IVkParams = {};
            if (keyboard) {
                params.keyboard = keyboard;
            }
            if (this.controller.card.images.length) {
                const attach = await this.controller.card.getCards(T_VK);
                if (attach.type) {
                    params.template = attach;
                } else {
                    params.attachments = attach;
                }
            }
            if (this.controller.sound.sounds.length) {
                const attach = await this.controller.sound.getSounds(this.controller.tts, T_VK);
                params.attachments = { ...attach, ...params.attachments };
            }
            const vkApi = new VkRequest(this.appContext);
            await vkApi.messagesSend(
                this.controller.userId as string,
                this.controller.text,
                params,
            );
        }
        return 'ok';
    }
}
