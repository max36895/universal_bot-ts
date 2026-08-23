import { AppContext, BotController, INluThisUser, Text } from '../../../index';
import { BasePlatform, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { soundProcessing } from './Sound';
import { T_TELEGRAM } from './constants';
import { ITelegramContent, ITelegramParams, ITelegramMedia } from './interfaces/ITelegramPlatform';
import { TelegramRequest } from '../API';
import { getPlatformRequestData, tryParse } from '../Base/utils';
import { timingSafeEqual } from 'crypto';

type ITelegramRequestData = Record<string, unknown> & {
    callbackQueryId?: string;
    chatId?: number | string;
    inlineQueryId?: string;
};

/**
 * Адаптер, обеспечивающий поддержку платформы Telegram. Позволяет разрабатывать чат-ботов для Телеграм на TypeScript с использованием кросс-платформенного функционала: обработка текстовых запросов, работа с карточками и кнопками.
 *
 * Подключение адаптера не требует изменения существующей бизнес-логики: после интеграции
 * все команды и обработчики, написанные для umbot, автоматически становятся доступны для Telegram.
 * Единый интерфейс позволяет одновременно использовать одну бизнес-логику для нескольких
 * платформ (Telegram, VK, Алиса и др.) без дублирования кода.
 *
 * Этот адаптер автоматически обрабатывает входящие webhook`и от мессенджера Telegram,
 * преобразует их в унифицированный формат фреймворка и формирует ответ,
 * совместимый с требованиями платформы. Подключается одной строкой и
 * не мешает работе других адаптеров (например, для Алисы или Маруси).
 *
 * Поддерживает:
 * - текстовые запросы, callback-кнопки, inline-запросы;
 * - карточки, кнопки;
 *
 * Подключается как любой другой адаптер: `bot.use(new TelegramAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 * @example
 * ```ts
 * // Простейший бот для Telegram, который отвечает на приветствие
 * import { Bot } from 'umbot';
 * import { TelegramAdapter } from 'umbot/plugins';
 *
 * const bot = new Bot()
 *     .use(new TelegramAdapter('YOUR_BOT_TOKEN'))
 *     .addCommand('start', ['привет'], (_text, ctx) => {
 *         ctx.text = 'Привет! Я твой первый бот для Telegram';
 *     });
 *
 * bot.start('localhost', 3000);
 * ```
 *
 * @see Bot
 * @see BotController
 * @see BasePlatform
 */
export class TelegramAdapter extends BasePlatform<string | ITelegramContent> {
    platformName = T_TELEGRAM;
    isVoice = false;
    limit = 30;
    signatureName = 'x-telegram-bot-api-secret-token';

    init(appContext: AppContext): void {
        super.init(appContext);
        if (this._token) {
            appContext.appConfig.tokens[this.platformName].token = this._token;
        }
    }

    isPlatformOnQuery(query: ITelegramContent, headers?: Record<string, unknown>): boolean {
        if (headers?.['x-telegram-bot-api-secret-token']) {
            return true;
        }
        if (!query) {
            this.appContext?.logWarn(`TelegramAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);
            return false;
        }
        return !!(
            query.update_id !== undefined &&
            (query.message ||
                query.callback_query ||
                query.inline_query ||
                query.chosen_inline_result ||
                query.channel_post ||
                query.edited_message ||
                query.edited_channel_post)
        );
    }

    /**
     * Проверка webhook-запроса от Telegram.
     *
     * Telegram шлёт webhook secret как обычную строку в заголовке
     * `x-telegram-bot-api-secret-token`. Этот secret НЕ совпадает с bot token —
     * он задаётся отдельно при вызове setWebhook(..., {secret_token: 'your-secret'}).
     *
     * Поэтому для проверки используется отдельное поле
     * `appConfig.tokens.telegram.webhookSecret`. Если оно не задано — проверка
     * пропускается (обратная совместимость и webhook без secret).
     *
     * @param query Тело запроса
     * @param headers HTTP-заголовки запроса
     */
    isCorrectQuery(query: string | ITelegramContent, headers?: Record<string, unknown>): boolean {
        const webhookSecret = this.appContext?.appConfig.tokens[this.platformName]?.webhookSecret;
        // Проверка активна ТОЛЬКО если webhookSecret задан явно — иначе пропускаем
        // (не ломаем polling и webhook без secret_token).
        if (webhookSecret && this.signatureName) {
            const headerValue = headers?.[this.signatureName];
            if (!headerValue) {
                return false;
            }
            try {
                // timingSafeEqual требует Buffer одинаковой длины
                const expected = Buffer.from(String(webhookSecret));
                const received = Buffer.from(String(headerValue));
                if (expected.length !== received.length) {
                    return false;
                }
                return timingSafeEqual(expected, received);
            } catch {
                return false;
            }
        }
        return true;
    }

    #setCallbackQuery(query: ITelegramContent, controller: BotController): boolean {
        const cb = query.callback_query;
        if (cb) {
            controller.userId = cb.from?.id as number;
            // callback_data может быть строкой или JSON-строкой
            controller.userCommand = (cb.data || '').toLowerCase().trim();
            controller.originalUserCommand = cb.data || '';
            controller.messageId = cb.message?.message_id as number;
            controller.payload = tryParse(cb.data);
            // Сохраняем ID callback-запроса, чтобы потом ответить.
            getPlatformRequestData<ITelegramRequestData>(
                controller,
                this.platformName,
            ).callbackQueryId = cb.id;
            // В группах отправитель callback и чат, где находится исходное сообщение,
            // различаются. Ответ должен вернуться именно в этот чат.
            const chatId = cb.message?.chat?.id;
            if (chatId !== undefined) {
                getPlatformRequestData<ITelegramRequestData>(controller, this.platformName).chatId =
                    chatId;
            }
            return true;
        }
        return false;
    }

    #setInlineQuery(query: ITelegramContent, controller: BotController): boolean {
        const iq = query.inline_query;
        if (iq) {
            controller.userId = iq.from?.id as number;
            controller.userCommand = iq.query?.toLowerCase().trim() || '';
            controller.originalUserCommand = iq.query || '';
            getPlatformRequestData<ITelegramRequestData>(
                controller,
                this.platformName,
            ).inlineQueryId = iq.id;
            return true;
        }
        return false;
    }

    /** Сохраняет выбранный inline-результат как служебное событие без автоответа. */
    #setChosenInlineResult(query: ITelegramContent, controller: BotController): boolean {
        const result = query.chosen_inline_result;
        if (!result) {
            return false;
        }
        controller.userId = result.from.id;
        controller.userCommand = result.query.toLowerCase().trim();
        controller.originalUserCommand = result.query;
        controller.payload = result.result_id;
        controller.skipAutoReply = true;
        return true;
    }

    /**
     * Заполняет контроллер данными из обычного сообщения (query.message).
     */
    #setMessage(
        message: NonNullable<ITelegramContent['message']>,
        controller: BotController,
    ): boolean {
        controller.userId = message.chat.id;
        controller.userCommand = message.text?.toLowerCase()?.trim() || '';
        controller.originalUserCommand = message.text;
        controller.messageId = message.message_id;

        const thisUser: INluThisUser = {
            username: message.chat.username || null,
            first_name: message.chat.first_name || null,
            last_name: message.chat.last_name || null,
        };
        controller.nlu.setNlu({ thisUser });
        return true;
    }

    /**
     * Заполняет контроллер данными из поста в канале (channel_post / edited_channel_post)
     * или отредактированного сообщения (edited_message).
     */
    #setPost(
        post: NonNullable<ITelegramContent['channel_post']>,
        controller: BotController,
    ): boolean {
        controller.userId = post.chat?.id;
        controller.userCommand = post.text?.toLowerCase().trim() || '';
        controller.originalUserCommand = post.text || '';
        controller.messageId = post.message_id;
        return true;
    }

    async setQueryData(query: ITelegramContent, controller: BotController): Promise<boolean> {
        if (!this.appContext) {
            return false;
        }
        if (!query) {
            controller.platformOptions.error = `TelegramAdapter.setQueryData(): ${EMPTY_QUERY_ERROR}`;
            return false;
        }
        controller.requestObject = query;

        // Кейс 1: обычное сообщение
        if (query.message !== undefined) {
            return this.#setMessage(query.message, controller);
        }
        // Кейс 2: callback_query (нажатие на inline-кнопку)
        if (query.callback_query) {
            return this.#setCallbackQuery(query, controller);
        }
        // Кейс 3: сообщение в канале
        if (query.channel_post) {
            return this.#setPost(query.channel_post, controller);
        }

        // Кейс 4: отредактированное сообщение
        if (query.edited_message) {
            return this.#setPost(query.edited_message, controller);
        }

        // Кейс 5: отредактированный пост в канале
        if (query.edited_channel_post) {
            return this.#setPost(query.edited_channel_post, controller);
        }

        // Кейс 6: inline query
        if (query.inline_query) {
            return this.#setInlineQuery(query, controller);
        }
        if (query.chosen_inline_result) {
            return this.#setChosenInlineResult(query, controller);
        }
        return false;
    }

    /** Отвечает на inline-запрос одной безопасной текстовой статьёй. */
    async #answerInlineQuery(
        telegramApi: TelegramRequest,
        inlineQueryId: string,
        text: string,
    ): Promise<void> {
        if (!text) {
            this.appContext?.logWarn(
                'TelegramAdapter.getContent(): inline-ответ не содержит текста. Результаты не будут добавлены.',
            );
            await telegramApi.answerInlineQuery(inlineQueryId, []);
            return;
        }
        const responseText = Text.resize(text, 4096);
        await telegramApi.answerInlineQuery(inlineQueryId, [
            {
                type: 'article',
                id: 'umbot-response',
                title: Text.resize(text, 64),
                input_message_content: { message_text: responseText },
            },
        ]);
    }

    /** Отправляет обычный ответ Telegram с текстом, карточками, звуками и кнопками. */
    async #sendChatContent(
        controller: BotController,
        telegramApi: TelegramRequest,
        requestData: ITelegramRequestData,
    ): Promise<void> {
        const params: ITelegramParams = {};
        const chatId = requestData.chatId ?? controller.userId;
        const hasButtons = controller.isButtonsInit() && controller.buttons.buttons.length > 0;
        const keyboard = hasButtons
            ? buttonProcessing(controller.buttons.buttons, this.appContext as AppContext)
            : null;
        if (keyboard) {
            params.reply_markup = JSON.stringify(keyboard);
        }
        // Разметка выключена по умолчанию: пользовательский текст с символами
        // HTML иначе приводит к ошибке Telegram "can't parse entities".
        const parseMode = this._platformOptions?.telegram_parse_mode as string | undefined;
        if (parseMode) {
            params.parse_mode = parseMode;
        }

        const callbackQueryId =
            requestData.callbackQueryId ?? controller.platformOptions.callbackQueryId;
        if (callbackQueryId) {
            const notificationText = controller.platformOptions.callbackNotificationText
                ? Text.resize(controller.platformOptions.callbackNotificationText, 200)
                : undefined;
            await telegramApi.answerCallbackQuery(
                callbackQueryId,
                notificationText,
                false,
                undefined,
                0,
            );
        }

        // Проверяем isCardInit(), чтобы не инстанцировать Card (и вложенный Buttons)
        // на каждый запрос, когда карточки не используются — как и в остальных адаптерах.
        const hasCards = controller.isCardInit() && controller.card.images.length > 0;
        const hasSounds = controller.isSoundInit() && controller.sound.sounds.length > 0;
        if (controller.text) {
            await telegramApi.sendMessage(
                chatId as string,
                Text.resize(controller.text, 4096),
                params,
            );
        } else if (hasButtons || (!hasCards && !hasSounds)) {
            this.appContext?.logWarn(
                'TelegramAdapter.getContent(): ответ не содержит текста. Пустое сообщение и клавиатура не будут отправлены.',
            );
        }

        if (hasCards) {
            const media: ITelegramMedia[] | null = await controller.card.getCards(
                cardProcessing,
                controller,
            );
            if (media) {
                await telegramApi.sendMediaGroup(chatId as string, media);
            }
        }

        // Не создаём экземпляр Sound через геттер, если звуки не использовались.
        if (hasSounds) {
            await controller.sound.getSounds(controller.tts, soundProcessing, controller);
        }
    }

    async getContent(controller: BotController): Promise<string> {
        if (controller.skipAutoReply) {
            return 'ok';
        }
        const telegramApi = new TelegramRequest(controller.appContext);
        const requestData = getPlatformRequestData<ITelegramRequestData>(
            controller,
            this.platformName,
        );
        if (requestData.inlineQueryId) {
            await this.#answerInlineQuery(telegramApi, requestData.inlineQueryId, controller.text);
            return 'ok';
        }
        await this.#sendChatContent(controller, telegramApi, requestData);
        return 'ok';
    }

    static isVoice(): boolean {
        return false;
    }

    getQueryExample(query: string, userId: string, count: number): Record<string, unknown> {
        return {
            message: {
                chat: {
                    id: +userId,
                },
                text: query,
                message_id: count,
            },
        };
    }
}
