import { BotController, AppContext, Text } from '../../../index';
import { VkRequest, IVkParams } from '../API';
import { BasePlatform, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { soundProcessing } from './Sound';
import { T_VK } from './constants';
import { IVkRequestContent, IVkRequestObject, IVkCard } from './interfaces/IVkPlatform';
import { getChatText, getPlatformRequestData, tryParse } from '../Base/utils';
import { timingSafeEqual } from 'crypto';

type IVkRequestData = Record<string, unknown> & {
    eventId?: string;
    peerId?: number;
};

/** Данные пользователя VK, которые кладутся в NLU. */
interface IVkUserInfo {
    first_name: string | null;
    last_name: string | null;
}

/** Время жизни записи в кэше имён пользователей VK (1 час). */
const VK_USER_CACHE_TTL = 3_600_000;
/** Максимальное число записей в кэше имён, чтобы он не рос бесконечно. */
const VK_USER_CACHE_MAX_SIZE = 5000;

/**
 * Кэш ответов `users.get`.
 *
 * Раньше `users.get` уходил на каждое входящее сообщение: это второй сетевой вызов
 * к VK на каждый ответ бота, лишняя задержка и расход лимита 30 запросов в секунду.
 * Имя пользователя меняется редко, поэтому держим его в памяти процесса.
 */
const vkUserCache = new Map<string, { value: IVkUserInfo | null; expiresAt: number }>();

/**
 * Возвращает данные пользователя VK из кэша либо запрашивает их у API.
 *
 * @param appContext Контекст приложения
 * @param userId Идентификатор пользователя VK
 * @returns Имя и фамилия пользователя либо `null`, если получить их не удалось
 */
async function getVkUserInfo(
    appContext: AppContext,
    userId: string | number,
): Promise<IVkUserInfo | null> {
    const key = String(userId);
    const now = Date.now();
    const cached = vkUserCache.get(key);
    if (cached && cached.expiresAt > now) {
        return cached.value;
    }
    const users = await new VkRequest(appContext).usersGet(userId as number);
    if (users === null) {
        // Сбой сети или ошибка API не кэшируем: иначе транзитивная ошибка VK
        // на час оставляла бы пользователя без имени (null кэшировался вместе
        // с успешным ответом). Повторный запрос попробует получить данные снова.
        return null;
    }
    // users.get возвращает массив — берём первого пользователя.
    const user = users[0];
    const value: IVkUserInfo | null = user
        ? {
              first_name: user.first_name || null,
              last_name: user.last_name || null,
          }
        : null;
    if (vkUserCache.size >= VK_USER_CACHE_MAX_SIZE) {
        // Map хранит порядок вставки — вытесняем самую старую запись.
        const oldestKey = vkUserCache.keys().next().value;
        if (oldestKey !== undefined) {
            vkUserCache.delete(oldestKey);
        }
    }
    vkUserCache.set(key, { value, expiresAt: now + VK_USER_CACHE_TTL });
    return value;
}

/**
 * Очищает кэш имён пользователей VK.
 * Нужен для тестов и для сценариев, где данные пользователя должны перечитаться сразу.
 */
export function clearVkUserCache(): void {
    vkUserCache.clear();
}

/**
 * Адаптер, обеспечивающий поддержку платформы VK. Позволяет разрабатывать чат-ботов для мессенджера ВК на TypeScript с использованием кросс-платформенного функционала: обработка текстовых запросов, работа с карточками и кнопками.
 *
 * Подключение адаптера не требует изменения существующей бизнес-логики: после интеграции
 * все команды и обработчики, написанные для umbot, автоматически становятся доступны для VK.
 * Единый интерфейс позволяет одновременно использовать одну бизнес-логику для нескольких
 * платформ (Viber, VK, Алиса и др.) без дублирования кода.
 *
 * Этот адаптер автоматически обрабатывает входящие webhook`и от мессенджера VK,
 * преобразует их в унифицированный формат фреймворка и формирует ответ,
 * совместимый с требованиями платформы. Подключается одной строкой и
 * не мешает работе других адаптеров (например, для Алисы или Маруси).
 *
 * Поддерживает:
 * - текстовые запросы, callback-кнопки (message_event);
 * - карточки, кнопки;
 *
 * Подключается как любой другой адаптер: `bot.use(new VkAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 * @example
 * ```ts
 * // Простейший бот для VK, который отвечает на приветствие
 * import { Bot } from 'umbot';
 * import { VkAdapter } from 'umbot/plugins';
 *
 * const bot = new Bot()
 *     .use(new VkAdapter('YOUR_VK_TOKEN', { vk_confirmation_token: 'YOUR_CONFIRMATION_TOKEN' }))
 *     .addCommand('start', ['привет'], (_text, ctx) => {
 *         ctx.text = 'Привет! Я твой первый бот для ВК';
 *     });
 *
 * bot.start('localhost', 3000);
 * ```
 *
 * @see Bot
 * @see BotController
 * @see BasePlatform
 */
export class VkAdapter extends BasePlatform<string | IVkRequestContent> {
    platformName = T_VK;
    isVoice = false;
    limit = 30;

    init(appContext: AppContext): void {
        super.init(appContext);
        if (this._token) {
            appContext.appConfig.tokens[this.platformName].token = this._token;
        }
        if (this._platformOptions?.vk_confirmation_token) {
            appContext.appConfig.tokens[this.platformName].confirmation_token = this
                ._platformOptions.vk_confirmation_token as string;
        }
        if (this._platformOptions?.vk_secret_key) {
            appContext.appConfig.tokens[this.platformName].secret_key = this._platformOptions
                .vk_secret_key as string;
        }
        if (this._platformOptions?.vk_api_version) {
            appContext.appConfig.tokens[this.platformName].api_version = this._platformOptions
                .vk_api_version as string;
        }
    }

    isPlatformOnQuery(query: IVkRequestContent, _headers?: Record<string, unknown>): boolean {
        if (!query) {
            this.appContext?.logWarn(`VkAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);

            return false;
        }
        return (
            query.type !== undefined &&
            query.group_id !== undefined &&
            (query.object !== undefined ||
                query.secret !== undefined ||
                query.type === 'confirmation')
        );
    }

    /**
     * Проверяет секретный ключ из тела запроса VK Callback API.
     * Если в настройках группы VK включён «Secret key», он приходит в поле `secret` каждого callback-запроса.
     * Метод сверяет его со значением `secret_key`, сохранённым в конфигурации.
     * Включается автоматически при наличии `secret_key` в `tokens.vk`.
     * Если проверка включена, поле обязательно для всех событий, включая `confirmation`.
     *
     * @param query — тело запроса от VK
     * @returns `true`, если секрет совпадает или проверка не включена; `false` при отсутствии или несовпадении
     */
    isCorrectQuery(query: IVkRequestContent | string): boolean {
        const expectedSecret = this.appContext?.appConfig.tokens[this.platformName]?.secret_key as
            string | undefined;
        // Если secret_key не настроен — проверка не требуется
        if (!expectedSecret) {
            return true;
        }
        let content: IVkRequestContent;
        if (typeof query === 'string') {
            try {
                const parsed: unknown = JSON.parse(query);
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    return false;
                }
                content = parsed as IVkRequestContent;
            } catch {
                return false;
            }
        } else {
            content = query;
        }
        if (!content.secret) {
            return false;
        }
        // Сравнение через timingSafeEqual: plain !== уязвимо к тайминг-оракулу,
        // позволяющему побайтово восстановить секрет по времени ответа.
        const a = Buffer.from(String(content.secret));
        const b = Buffer.from(String(expectedSecret));
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
            this.appContext?.logWarn(
                'VkAdapter.isCorrectQuery(): secret в теле запроса не совпадает с secret_key из конфигурации.',
            );
            return false;
        }
        return true;
    }

    /** Заполняет контроллер данными нового сообщения VK. */
    async #setMessageNew(query: IVkRequestContent, controller: BotController): Promise<boolean> {
        if (!query.object?.message) {
            controller.skipAutoReply = true;
            this.appContext?.logWarn(
                'VkAdapter.setQueryData(): message_new без object.message пропущен как некорректное событие.',
            );
            return true;
        }
        const object: IVkRequestObject = query.object;
        controller.userId = object.message.from_id;
        getPlatformRequestData<IVkRequestData>(controller, this.platformName).peerId =
            object.message.peer_id ?? object.peer_id ?? object.message.from_id;
        const rawText = object.message.text ?? '';
        controller.userCommand = rawText.toLowerCase().trim();
        controller.originalUserCommand = rawText.trim();
        controller.messageId = object.message.id;
        controller.payload = tryParse(object.message.payload || null);
        // Загрузку имени можно отключить: `new VkAdapter(token, { vk_load_user_info: false })`.
        // Тогда nlu.getUserName() вернёт null, зато на ответ уходит один запрос к VK вместо двух.
        if (this._platformOptions?.vk_load_user_info === false) {
            return true;
        }
        const user = await getVkUserInfo(this.appContext as AppContext, controller.userId);
        if (user) {
            controller.nlu.setNlu({
                thisUser: {
                    username: null,
                    ...user,
                },
            });
        }
        return true;
    }

    /** Заполняет контроллер данными callback-кнопки VK. */
    #setMessageEvent(query: IVkRequestContent, controller: BotController): boolean {
        if (!query.object?.payload) {
            // Битый callback без payload обработать невозможно, но ответ обязан быть
            // успешным: на 4xx VK Callback API повторяет событие. Помечаем событие
            // как не требующее ответа и подтверждаем его статусом 200.
            controller.skipAutoReply = true;
            controller.userId = query.object?.user_id ?? null;
            this.appContext?.log(
                'VkAdapter.setQueryData(): message_event без payload пропущен без ответа.',
            );
            return true;
        }
        controller.userCommand = (
            typeof query.object.payload === 'string'
                ? query.object.payload
                : JSON.stringify(query.object.payload)
        )?.toLowerCase();
        // Оригинальную команду тоже заполняем: во всех остальных ветках она есть,
        // и бизнес-логика, читающая originalUserCommand, на callback-кнопках получала null.
        controller.originalUserCommand =
            typeof query.object.payload === 'string'
                ? query.object.payload
                : JSON.stringify(query.object.payload);
        controller.userId = query.object.user_id as number;
        const requestData = getPlatformRequestData<IVkRequestData>(controller, this.platformName);
        requestData.peerId = query.object.peer_id ?? query.object.user_id ?? 0;
        controller.payload = tryParse(query.object.payload);
        controller.messageId = query.object.conversation_message_id || 0;
        requestData.eventId = query.object.event_id;
        return true;
    }

    async setQueryData(query: IVkRequestContent, controller: BotController): Promise<boolean> {
        if (!this.appContext) {
            return false;
        }
        if (!query) {
            controller.platformOptions.error = `VkAdapter.setQueryData(): ${EMPTY_QUERY_ERROR}`;
            return false;
        }
        controller.requestObject = query;
        switch (query.type) {
            case 'confirmation': {
                // Токен подтверждения вебхука: приоритет у опции конструктора,
                // запасной вариант — конфигурация (tokens.vk.confirmation_token),
                // куда попадает в том числе env-переменная VK_CONFIRMATION_TOKEN.
                // Раньше читалась только опция конструктора, поэтому настройка
                // через .env/process.env (особенно с fullPlatforms) не работала.
                const confirmToken =
                    this._platformOptions?.vk_confirmation_token ??
                    this.appContext.appConfig.tokens?.[this.platformName]?.confirmation_token;
                controller.platformOptions.sendInInit =
                    confirmToken === undefined ? null : String(confirmToken);
                return true;
            }

            case 'message_new':
                return this.#setMessageNew(query, controller);

            case 'message_event':
                return this.#setMessageEvent(query, controller);

            default:
                // Прочие события группы (message_reply, message_allow, group_join, like_add и т.п.)
                // ответа не требуют. Раньше здесь возвращался false, запрос падал с 500,
                // а VK Callback API после нескольких неудач отключает сервер как нерабочий.
                controller.skipAutoReply = true;
                if (query.object && typeof query.object === 'object') {
                    const object = query.object as unknown as Record<string, unknown>;
                    controller.userId =
                        (object.user_id as number) ?? (object.from_id as number) ?? null;
                }
                this.appContext?.log(
                    `VkAdapter.setQueryData(): событие "${query.type}" не требует ответа и было пропущено.`,
                );
                return true;
        }
    }

    /**
     * Возвращает JSON клавиатуры ВКонтакте для текущего ответа.
     *
     * @param controller Контроллер текущего запроса
     * @returns JSON клавиатуры либо `null`, если клавиатуру трогать не нужно
     */
    #buildKeyboard(controller: BotController): string | null {
        if (!controller.isButtonsInit()) {
            return null;
        }
        const keyboard = controller.buttons.getButtonJson((buttons) =>
            buttonProcessing(buttons, this.appContext),
        );
        if (keyboard) {
            return keyboard;
        }
        // Клавиатура ВК сохраняется в диалоге до явной замены. Убрать её можно
        // только отправив клавиатуру с пустым списком кнопок.
        return controller.buttons.isRemove
            ? JSON.stringify({ one_time: false, buttons: [] })
            : null;
    }

    async getContent(controller: BotController): Promise<string> {
        if (!controller.skipAutoReply) {
            const vkApi = new VkRequest(this.appContext as AppContext);
            const requestData = getPlatformRequestData<IVkRequestData>(
                controller,
                this.platformName,
            );
            const eventId = requestData.eventId ?? controller.platformOptions.eventId;
            const callbackPeerId = requestData.peerId ?? controller.userId ?? undefined;

            // Для callback-кнопок (message_event) отправляем sendMessageEvent вместо messagesSend.
            // Если в процессе обработки возникла ошибка — показываем её пользователю через show_snackbar
            // и не отправляем обычное сообщение.
            if (eventId) {
                if (controller.platformOptions.error) {
                    await vkApi.sendMessageEvent(
                        controller.userId as string,
                        eventId,
                        {
                            type: 'show_snackbar',
                            text: Text.resize(controller.platformOptions.error as string, 90),
                        },
                        callbackPeerId,
                    );
                    return 'ok';
                }
                await vkApi.sendMessageEvent(
                    controller.userId as string,
                    eventId,
                    undefined,
                    callbackPeerId,
                );
            }

            const params: IVkParams = {};
            if (controller.isCardInit() && controller.card.images.length) {
                const attach = await controller.card.getCards(cardProcessing, controller);
                if ((attach as IVkCard).type === undefined) {
                    const attachments = attach as string[];
                    if (attachments.length) {
                        params.attachments = attachments;
                    }
                } else {
                    params.template = attach;
                }
            }
            const keyboard = this.#buildKeyboard(controller);
            if (keyboard && params.template === undefined) {
                params.keyboard = keyboard;
            }
            if (controller.isSoundInit() && controller.sound.sounds.length) {
                const attach = await controller.sound.getSounds(
                    controller.tts,
                    soundProcessing,
                    controller,
                );
                const attachments = [...(attach as string[]), ...(params.attachments || [])];
                if (attachments.length) {
                    params.attachments = attachments;
                }
            }
            await vkApi.messagesSend(
                (requestData.peerId ?? controller.userId) as string,
                // Если заполнен только tts, используем его как текст сообщения:
                // иначе общая с голосовой платформой логика оставляла бы ВК без ответа.
                Text.resize(getChatText(controller.text, controller.tts), 4096),
                params,
            );
        }
        return 'ok';
    }

    static isVoice(): boolean {
        return false;
    }

    getQueryExample(query: string, userId: string, count: number): Record<string, unknown> {
        return {
            type: 'message_new',
            // group_id обязателен: isPlatformOnQuery распознаёт VK по этому полю
            group_id: 1,
            object: {
                message: {
                    from_id: +userId,
                    text: query,
                    id: count,
                },
            },
        };
    }
}
