import { BotController, AppContext, Text } from '../../../index';
import { VkRequest, IVkParams } from '../API';
import { BasePlatform, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { soundProcessing } from './Sound';
import { T_VK } from './constants';
import { IVkRequestContent, IVkRequestObject, IVkCard } from './interfaces/IVkPlatform';
import { getPlatformRequestData, tryParse } from '../Base/utils';
import { timingSafeEqual } from 'crypto';

type IVkRequestData = Record<string, unknown> & {
    eventId?: string;
    peerId?: number;
};

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

    isPlatformOnQuery(query: IVkRequestContent, headers?: Record<string, unknown>): boolean {
        if (headers?.['x-vk-signature']) {
            return true;
        }
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
     * Для `confirmation` проверка допускает отсутствие secret, остальные события без secret отклоняются.
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
        // Confirmation нужен для первоначального подключения callback-сервера.
        if (!content.secret) {
            return content.type === 'confirmation';
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
        if (!query.object) {
            return false;
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
        const users = await new VkRequest(this.appContext as AppContext).usersGet(
            controller.userId,
        );
        // Fix: users.get возвращает массив — берём первого пользователя.
        // Раньше читались user.first_name/user.last_name у массива, поэтому имя всегда было null.
        const user = users?.[0];
        if (user) {
            const thisUser = {
                username: null,
                first_name: user.first_name || null,
                last_name: user.last_name || null,
            };
            controller.nlu.setNlu({ thisUser });
        }
        return true;
    }

    /** Заполняет контроллер данными callback-кнопки VK. */
    #setMessageEvent(query: IVkRequestContent, controller: BotController): boolean {
        if (!query.object?.payload) {
            return false;
        }
        controller.userCommand = (
            typeof query.object.payload === 'string'
                ? query.object.payload
                : JSON.stringify(query.object.payload)
        )?.toLowerCase();
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
            case 'confirmation':
                controller.platformOptions.sendInInit = this._platformOptions
                    ?.vk_confirmation_token as string;
                return true;

            case 'message_new':
                return this.#setMessageNew(query, controller);

            case 'message_event':
                return this.#setMessageEvent(query, controller);

            default:
                controller.platformOptions.error =
                    'VkAdapter:setQueryData(): Некорректный тип данных!';
                break;
        }
        return false;
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
                    params.attachments = attach as string[];
                } else {
                    params.template = attach;
                }
            }
            const keyboard = controller.isButtonsInit()
                ? controller.buttons.getButtonJson((buttons) =>
                      buttonProcessing(buttons, this.appContext),
                  )
                : null;
            if (keyboard && params.template === undefined) {
                params.keyboard = keyboard;
            }
            if (controller.isSoundInit() && controller.sound.sounds.length) {
                const attach = await controller.sound.getSounds(
                    controller.tts,
                    soundProcessing,
                    controller,
                );
                params.attachments = [...(attach as string[]), ...(params.attachments || [])];
            }
            await vkApi.messagesSend(
                (requestData.peerId ?? controller.userId) as string,
                Text.resize(controller.text, 4096),
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
