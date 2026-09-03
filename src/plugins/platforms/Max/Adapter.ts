import { AppContext, BotController, Text } from '../../../index';
import { IMaxParams, MaxRequest } from '../API';
import { BasePlatform, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { soundProcessing } from './Sound';
import { T_MAX_APP } from './constants';
import { IMaxButtonObject, IMaxRequestContent } from './interfaces/IMaxPlatform';
import { timingSafeEqual } from 'crypto';
import { getChatText, getPlatformRequestData, setThisUserToNlu } from '../Base/utils';

type IMaxRequestData = Record<string, unknown> & {
    callbackId?: string;
    chatId?: number;
};

const MAX_UPDATE_TYPES = new Set<IMaxRequestContent['update_type']>([
    'bot_added',
    'bot_started',
    'bot_stopped',
    'bot_removed',
    'chat_title_changed',
    'dialog_cleared',
    'dialog_muted',
    'dialog_unmuted',
    'dialog_removed',
    'message_callback',
    'message_created',
    'message_edited',
    'message_removed',
    'user_added',
    'user_removed',
]);

/**
 * Адаптер, обеспечивающий поддержку платформы MAX. Позволяет разрабатывать чат-ботов для мессенджера MAX на TypeScript с использованием кросс-платформенного функционала: обработка текстовых запросов, работа с карточками и кнопками.
 *
 * Подключение адаптера не требует изменения существующей бизнес-логики: после интеграции
 * все команды и обработчики, написанные для umbot, автоматически становятся доступны для MAX.
 * Единый интерфейс позволяет одновременно использовать одну бизнес-логику для нескольких
 * платформ (MAX, VK, Алиса и др.) без дублирования кода.
 *
 * Этот адаптер автоматически обрабатывает входящие webhook`и от мессенджера MAX,
 * преобразует их в унифицированный формат фреймворка и формирует ответ,
 * совместимый с требованиями платформы. Подключается одной строкой и
 * не мешает работе других адаптеров (например, для Алисы или Маруси).
 *
 * Поддерживает:
 * - текстовые запросы, кнопки;
 * - карточки, кнопки;
 *
 * Подключается как любой другой адаптер: `bot.use(new MaxAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 * @example
 * ```ts
 * // Простейший бот для MAX, который отвечает на приветствие
 * import { Bot } from 'umbot';
 * import { MaxAdapter } from 'umbot/plugins';
 *
 * const bot = new Bot()
 *     .use(new MaxAdapter('YOUR_MAX_TOKEN'))
 *     .addCommand('start', ['привет'], (_text, ctx) => {
 *         ctx.text = 'Привет! Я твой первый бот для MAX';
 *     });
 *
 * bot.start('localhost', 3000);
 * ```
 *
 * @see Bot
 * @see BotController
 * @see BasePlatform
 */
export class MaxAdapter extends BasePlatform<string | IMaxRequestContent> {
    /** Идентификатор платформы MAX. */
    platformName = T_MAX_APP;
    /** MAX — чат-платформа (не голосовая). */
    isVoice = false;
    /** Лимит запросов/сек для входящего rateLimiter (лимит MAX Bot API). */
    limit = 30;

    init(appContext: AppContext): void {
        super.init(appContext);
        const platformToken = appContext.appConfig.tokens[this.platformName];
        if (this._token && platformToken) {
            platformToken.token = this._token;
        }
        // MAX передаёт webhook-secret обычным заголовком. Разрешаем передать его
        // как через настройки адаптера, так и через конфигурацию приложения.
        const webhookSecret = this._platformOptions?.secret ?? platformToken?.webhookSecret;
        if (webhookSecret && platformToken) {
            this.signatureName = 'x-max-bot-api-secret';
            platformToken.webhookSecret = String(webhookSecret);
        }
    }

    isPlatformOnQuery(query: IMaxRequestContent, headers?: Record<string, unknown>): boolean {
        void headers;
        if (!query) {
            this.appContext?.logWarn(`MaxAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);
            return false;
        }
        if (MAX_UPDATE_TYPES.has(query.update_type)) {
            return true;
        }
        // Новые типы событий MAX тоже принимаем, но только если запрос однозначно
        // от MAX: связка update_type + timestamp есть у каждого апдейта платформы
        // и не встречается у других. Иначе новый тип события не определялся бы
        // как MAX и запрос завершался ошибкой вместо тихого пропуска в setQueryData().
        return (
            typeof query.update_type === 'string' &&
            query.update_type.length > 0 &&
            typeof query.timestamp === 'number'
        );
    }

    /**
     * Проверяет webhook-secret MAX.
     * MAX передаёт исходное значение секрета в заголовке, а не HMAC от тела.
     */
    isCorrectQuery(
        _query: string | IMaxRequestContent,
        headers?: Record<string, unknown>,
    ): boolean {
        const expectedSecret = this.appContext?.appConfig.tokens[this.platformName]?.webhookSecret;
        if (!expectedSecret || !this.signatureName) {
            return true;
        }
        const headerSecret = headers?.[this.signatureName];
        if (typeof headerSecret !== 'string') {
            return false;
        }
        const expected = Buffer.from(String(expectedSecret));
        const received = Buffer.from(headerSecret);
        return expected.length === received.length && timingSafeEqual(expected, received);
    }

    /**
     * MAX проверяет именно `webhookSecret` (options.secret / tokens.max_app.webhookSecret),
     * а не токен API из конструктора.
     */
    isSignatureCheckEnabled(): boolean {
        return Boolean(
            this.appContext?.appConfig.tokens[this.platformName]?.webhookSecret &&
            this.signatureName,
        );
    }

    /** Заполняет контроллер данными callback-кнопки MAX. */
    #setCallbackData(query: IMaxRequestContent, controller: BotController): boolean {
        if (query.update_type !== 'message_callback' || !query.callback) {
            return false;
        }
        controller.userId = query.callback.user?.user_id ?? query.message?.sender?.user_id ?? 0;
        controller.userCommand = query.callback.payload?.toLowerCase().trim() ?? '';
        controller.originalUserCommand = query.callback.payload ?? '';
        controller.payload = query.callback.payload ?? null;
        const requestData = getPlatformRequestData<IMaxRequestData>(controller, this.platformName);
        requestData.callbackId = query.callback.callback_id;
        if (query.message?.recipient?.chat_id) {
            requestData.chatId = query.message.recipient.chat_id;
        }
        return true;
    }

    /** Заполняет контроллер данными служебного события MAX без автоматического ответа. */
    #setServiceData(query: IMaxRequestContent, controller: BotController): void {
        controller.userId = query.user?.user_id ?? 0;
        controller.skipAutoReply = true;
        if (query.chat_id !== undefined) {
            getPlatformRequestData<IMaxRequestData>(controller, this.platformName).chatId =
                query.chat_id;
        }
    }

    /** Заполняет контроллер данными входящего сообщения MAX. */
    #setMessageData(query: IMaxRequestContent, controller: BotController): boolean {
        const object = query.message;
        if (!object) {
            return false;
        }
        controller.userId = object.sender?.user_id ?? query.user?.user_id ?? 0;
        const chatId = object.recipient?.chat_id;
        if (chatId) {
            getPlatformRequestData<IMaxRequestData>(controller, this.platformName).chatId = chatId;
        }
        const body = object.body;
        const raw = body?.text ?? '';
        controller.userCommand = raw.toLowerCase().trim();
        controller.originalUserCommand = raw.trim();
        controller.messageId = body?.seq ?? 0;
        controller.payload =
            (body?.attachments as unknown as Record<string, unknown> | undefined) ?? null;
        // Пустого thisUser не записываем: без полей он не несёт данных, а запись
        // аллоцировала бы объект Nlu на каждый запрос (setThisUserToNlu).
        setThisUserToNlu(controller, {
            username: object.sender?.username || null,
            first_name: object.sender?.first_name || null,
            last_name: object.sender?.last_name || null,
        });
        return true;
    }

    async setQueryData(query: IMaxRequestContent, controller: BotController): Promise<boolean> {
        if (!this.appContext) {
            return false;
        }
        if (!query) {
            controller.platformOptions.error = `MaxAdapter:setQueryData(): ${EMPTY_QUERY_ERROR}`;
            return false;
        }
        controller.requestObject = query;
        if (this.#setCallbackData(query, controller)) {
            return true;
        }
        if (query.update_type !== 'message_created') {
            this.#setServiceData(query, controller);
            return true;
        }
        return this.#setMessageData(query, controller);
    }

    async getContent(controller: BotController): Promise<string> {
        if (controller.skipAutoReply) {
            return 'ok';
        }
        const keyboard = controller.isButtonsInit()
            ? controller.buttons.getButtons<IMaxButtonObject>((buttons) =>
                  buttonProcessing(buttons, this.appContext as AppContext),
              )
            : null;
        const params: IMaxParams = {};
        // Проверяем не только наличие объекта, но и непустой список кнопок: buttonProcessing
        // всегда возвращает объект, поэтому при пустой клавиатуре в MAX уходило вложение
        // inline_keyboard с buttons: [], которое API отклоняет.
        if (keyboard?.buttons?.length) {
            params.keyboard = keyboard;
        }
        if (controller.isCardInit() && controller.card.images.length) {
            params.attachments = await controller.card.getCards(cardProcessing, controller);
        }
        if (controller.isSoundInit() && controller.sound.sounds.length) {
            const attach = await controller.sound.getSounds(
                controller.tts,
                soundProcessing,
                controller,
            );
            params.attachments = [...(attach || []), ...(params.attachments || [])];
        }
        const maxApi = new MaxRequest(controller.appContext);
        const requestData = getPlatformRequestData<IMaxRequestData>(controller, this.platformName);
        // MAX Bot API ограничивает текст сообщения 4000 символами
        // Если в запросе был chat_id (групповой чат/канал) — используем его,
        // иначе отправляем в личный диалог по user_id
        const chatId =
            requestData.chatId ?? (controller.platformOptions.chatId as number | undefined);
        const peerId: string | number = chatId ?? controller.userId ?? '';
        if (peerId === '') {
            controller.appContext.logWarn(
                'MaxAdapter.getContent(): не указан user_id или chat_id; ответ не будет отправлен.',
            );
            return 'ok';
        }
        const callbackId = requestData.callbackId;
        if (callbackId) {
            await maxApi.answerCallback(
                callbackId,
                Text.resize(getChatText(controller.text, controller.tts), 4000),
                params,
                peerId,
            );
        } else {
            await maxApi.messagesSend(
                peerId,
                Text.resize(getChatText(controller.text, controller.tts), 4000),
                params,
                chatId ? 'chat' : 'user',
            );
        }
        return 'ok';
    }

    static isVoice(): boolean {
        return false;
    }

    getQueryExample(query: string, userId: string, count: number): Record<string, unknown> {
        return {
            update_type: 'message_created',
            message: {
                sender: {
                    user_id: +userId,
                },
                body: {
                    text: query,
                    seq: count,
                    mid: '',
                },
            },
        };
    }
}
