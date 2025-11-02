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
            /*
             * array content
             * @see (https://core.telegram.org/bots/api#getting-updates) Смотри тут
             *  - int update_id: Уникальный идентификатор обновления. Обновление идентификаторов начинается с определенного положительного числа и последовательно увеличивается. Этот идентификатор становится особенно удобным, если вы используете Webhooks, так как он позволяет игнорировать повторяющиеся обновления или восстанавливать правильную последовательность обновлений, если они выходят из строя. Если нет новых обновлений хотя бы в течение недели, то идентификатор следующего обновления будет выбран случайным образом, а не последовательно.
             *  - array message: Новое входящее сообщение любого вида-текст, фотография, наклейка и т.д.
             * @see (https://core.telegram.org/bots/api#message) Смотри тут
             *      - int message_id
             *      - array from
             *          - int id
             *          - bool is_bot
             *          - string first_name
             *          - string last_name
             *          - string username
             *          - string language_code
             *      - array chat
             *          - int id
             *          - string first_name
             *          - string last_name
             *          - string username
             *          - string type
             *      - int date
             *      - string text
             *  - array edited_message: Новое входящее сообщение любого вида-текст, фотография, наклейка и т.д. @see message Смотри тут
             *  - array channel_post: Новая версия сообщения, которая известна боту и была отредактирована @see message Смотри тут
             *  - array edited_channel_post: Новый входящий пост канала любого рода-текст, фото, наклейка и т.д. @see message Смотри тут
             *  - array inline_query: Новый входящий встроенный запрос. @see (https://core.telegram.org/bots/api#inlinequery) Смотри тут
             *  - array chosen_inline_result: Результат встроенного запроса, который был выбран пользователем и отправлен его партнеру по чату. Пожалуйста, ознакомьтесь с документацией telegram по сбору обратной связи для получения подробной информации о том, как включить эти обновления для бота. @see (https://core.telegram.org/bots/api#choseninlineresult) Смотри тут
             *  - array callback_query: Новый входящий запрос обратного вызова. @see (https://core.telegram.org/bots/api#callbackquery) Смотри тут
             *  - array shipping_query: Новый входящий запрос на доставку. Только для счетов-фактур с гибкой ценой. @see (https://core.telegram.org/bots/api#shippingquery) Смотри тут
             *  - array pre_checkout_query: Новый входящий запрос предварительной проверки. Содержит полную информацию о кассе. @see (https://core.telegram.org/bots/api#precheckoutquery) Смотри тут
             *  - array poll: Новое состояние опроса. Боты получают только обновления о остановленных опросах и опросах, которые отправляются ботом. @see (https://core.telegram.org/bots/api#poll) Смотри тут
             *  - array poll_answer: Пользователь изменил свой ответ в не анонимном опросе. Боты получают новые голоса только в опросах, которые были отправлены самим ботом. @see (https://core.telegram.org/bots/api#poll_answer) Смотри тут
             */
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
