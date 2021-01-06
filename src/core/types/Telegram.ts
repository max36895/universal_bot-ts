import {TemplateTypeModel} from "./TemplateTypeModel";
import {BotController} from "../../controller/BotController";
import {ITelegramContent} from "../interfaces/ITelegram";
import {mmApp} from "../mmApp";
import {INluThisUser} from "../../components/nlu";
import {TelegramRequest, ITelegramParams} from "../../api";
import {Buttons} from "../../components/button";
import {ITelegramCard} from "../../components/card";

/**
 * Класс, отвечающий за корректную инициализацию и отправку ответа для Телеграма.
 * @class Telegram
 * @see TemplateTypeModel Смотри тут
 */
export class Telegram extends TemplateTypeModel {
    /**
     * Инициализация основных параметров. В случае успешной инициализации, вернет true, иначе false.
     *
     * @param {ITelegramContent|string} query Запрос пользователя.
     * @param {BotController} controller Ссылка на класс с логикой навык/бота.
     * @return boolean
     * @see TemplateTypeModel::init() Смотри тут
     * @api
     */
    public init(query: string | ITelegramContent, controller: BotController): boolean {
        if (query) {
            /**
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
             *  - array chosen_inline_result: Результат встроенного запроса, который был выбран пользователем и отправлен его партнеру по чату. Пожалуйста, ознакомьтесь с нашей документацией по сбору обратной связи для получения подробной информации о том, как включить эти обновления для вашего бота. @see (https://core.telegram.org/bots/api#choseninlineresult) Смотри тут
             *  - array callback_query: Новый входящий запрос обратного вызова. @see (https://core.telegram.org/bots/api#callbackquery) Смотри тут
             *  - array shipping_query: Новый входящий запрос на доставку. Только для счетов-фактур с гибкой ценой. @see (https://core.telegram.org/bots/api#shippingquery) Смотри тут
             *  - array pre_checkout_query: Новый входящий запрос предварительной проверки. Содержит полную информацию о кассе. @see (https://core.telegram.org/bots/api#precheckoutquery) Смотри тут
             *  - array poll: Новое состояние опроса. Боты получают только обновления о остановленных опросах и опросах, которые отправляются ботом. @see (https://core.telegram.org/bots/api#poll) Смотри тут
             *  - array poll_answer: Пользователь изменил свой ответ в неанонимном опросе. Боты получают новые голоса только в опросах, которые были отправлены самим ботом. @see (https://core.telegram.org/bots/api#poll_answer) Смотри тут
             */
            let content: ITelegramContent;
            if (typeof query === 'string') {
                content = <ITelegramContent>JSON.parse(query);
            } else {
                content = {...query};
            }
            this.controller = controller;
            this.controller.requestObject = content;

            if (typeof content.message !== 'undefined') {
                this.controller.userId = content.message.chat.id;
                mmApp.params.user_id = this.controller.userId;
                this.controller.userCommand = content.message.text.toLowerCase().trim();
                this.controller.originalUserCommand = content.message.text;
                this.controller.messageId = content.message.message_id;

                const thisUser: INluThisUser = {
                    username: content.message.chat.username || null,
                    first_name: content.message.chat.first_name || null,
                    last_name: content.message.chat.last_name || null,
                };
                this.controller.nlu.setNlu({thisUser});
                return true;
            }
        } else {
            this.error = 'Telegram:init(): Отправлен пустой запрос!';
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
    public getContext(): string {
        if (this.controller.isSend) {
            const telegramApi = new TelegramRequest();
            const params: ITelegramParams = {};
            const keyboard = this.controller.buttons.getButtonJson(Buttons.T_TELEGRAM_BUTTONS);
            if (keyboard) {
                params.reply_markup = keyboard;
            }
            params.parse_mode = 'markdown';

            telegramApi.sendMessage(this.controller.userId, this.controller.text, params);

            if (this.controller.card.images.length) {
                const res: ITelegramCard = this.controller.card.getCards();
                if (res) {
                    telegramApi.sendPoll(this.controller.userId, res.question, res.options);
                }
            }

            if (this.controller.sound.sounds.length) {
                this.controller.sound.getSounds(this.controller.tts);
            }
        }
        return 'ok';
    }
}
