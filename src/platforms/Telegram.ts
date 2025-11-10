import { TemplateTypeModel } from './TemplateTypeModel';
import { BotController } from '../controller';
import { ITelegramContent } from './interfaces';
import { INluThisUser } from '../components/nlu';
import { ITelegramMedia, ITelegramParams, TelegramRequest } from '../api';
import { Buttons } from '../components/button';

/**
 * Класс для работы с платформой Telegram.
 * Отвечает за инициализацию и обработку запросов от пользователя,
 * а также формирование ответов в формате Telegram
 * @class Telegram
 * @extends TemplateTypeModel
 * @see TemplateTypeModel Смотри тут
 */
export class Telegram extends TemplateTypeModel {
    /**
     * Инициализирует основные параметры для работы с запросом.
     * Обрабатывает входящие сообщения и обновления от Telegram
     * @param query Запрос пользователя в формате строки или объекта
     * @param controller Контроллер с логикой бота
     * @returns {Promise<boolean>} true при успешной инициализации, false при ошибке
     * @see TemplateTypeModel.init() Смотри тут
     *
     * Поддерживаемые типы обновлений:
     * - message: новое входящее сообщение
     * - edited_message: отредактированное сообщение
     * - channel_post: новый пост в канале
     * - edited_channel_post: отредактированный пост в канале
     * - inline_query: встроенный запрос
     * - callback_query: запрос обратного вызова
     * - shipping_query: запрос на доставку
     * - pre_checkout_query: запрос предварительной проверки
     * - poll: состояние опроса
     * - poll_answer: ответ в опросе
     *
     * @see https://core.telegram.org/bots/api#getting-updates Документация по обновлениям
     */
    public async init(
        query: string | ITelegramContent,
        controller: BotController,
    ): Promise<boolean> {
        if (query) {
            let content: ITelegramContent;
            if (typeof query === 'string') {
                content = <ITelegramContent>JSON.parse(query);
            } else {
                content = { ...query };
            }
            if (!this.controller) {
                this.controller = controller;
            }
            this.controller.requestObject = content;

            if (typeof content.message !== 'undefined') {
                this.controller.userId = content.message.chat.id;
                this.appContext.platformParams.user_id = this.controller.userId;
                this.controller.userCommand = content.message.text.toLowerCase().trim();
                this.controller.originalUserCommand = content.message.text;
                this.controller.messageId = content.message.message_id;

                const thisUser: INluThisUser = {
                    username: content.message.chat.username || null,
                    first_name: content.message.chat.first_name || null,
                    last_name: content.message.chat.last_name || null,
                };
                this.controller.nlu.setNlu({ thisUser });
                return true;
            }
        } else {
            this.error = 'Telegram:init(): Отправлен пустой запрос!';
        }
        return false;
    }

    /**
     * Формирует и отправляет ответ пользователю.
     * Отправляет текст, карточки, опросы и звуки через Telegram API
     * @returns {Promise<string>} 'ok' при успешной отправке
     * @see TemplateTypeModel.getContext() Смотри тут
     */
    public async getContext(): Promise<string> {
        if (this.controller.isSend) {
            const telegramApi = new TelegramRequest(this.appContext);
            const params: ITelegramParams = {};
            const keyboard = this.controller.buttons.getButtonJson(Buttons.T_TELEGRAM_BUTTONS);
            if (keyboard) {
                params.reply_markup = keyboard;
            }
            params.parse_mode = 'markdown';

            await telegramApi.sendMessage(
                this.controller.userId as string,
                this.controller.text,
                params,
            );

            if (this.controller.card.images.length) {
                const res: ITelegramMedia[] = await this.controller.card.getCards();
                if (res) {
                    await telegramApi.sendMediaGroup(this.controller.userId as string, res);
                }
            }

            if (this.controller.sound.sounds.length) {
                await this.controller.sound.getSounds(this.controller.tts);
            }
        }
        return 'ok';
    }
}
