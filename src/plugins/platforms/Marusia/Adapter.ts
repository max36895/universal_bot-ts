import { Text, BotController, AppContext, IButtonType } from '../../../index';
import { BasePlatform, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { soundProcessing } from './Sound';
import { T_MARUSIA, VERSION, MARUSIA_STATE_MAX_BYTES } from './constants';
import {
    IMarusiaRequest,
    IMarusiaRequestState,
    IMarusiaSession,
    IMarusiaItemsList,
    IMarusiaBigImage,
    IMarusiaImageGallery,
    IMarusiaButton,
    IMarusiaResponse,
    IMarusiaWebhookRequest,
    IMarusiaWebhookResponse,
    IMarusiaRequestMeta,
} from './interfaces/IMarusiaPlatform';
import { initUserCommand } from '../Base/utils';

type TState = 'user_state_update' | 'session_state';

const MARUSIA_TTS_MAX_LENGTH = 1024;
const MARUSIA_TTS_TAG_REGEXP = /<speaker\b[^>]*>|sil\s*<\[\d+\]>/gi;

/**
 * Обрезает произносимый текст Маруси, не считая служебные звуковые теги.
 * Формат разметки совпадает с Алисой (`<speaker .../>`, `sil <[мс]>`), поэтому
 * лимит считается по видимому тексту, а теги сохраняются целиком и не рвутся
 * на границе обрезки.
 */
function resizeMarusiaTts(tts: string | null): string {
    if (!tts) {
        return '';
    }
    let result = '';
    let visibleLength = 0;
    let cursor = 0;
    MARUSIA_TTS_TAG_REGEXP.lastIndex = 0;
    for (
        let match = MARUSIA_TTS_TAG_REGEXP.exec(tts);
        match;
        match = MARUSIA_TTS_TAG_REGEXP.exec(tts)
    ) {
        const plain = tts.slice(cursor, match.index);
        const remaining = MARUSIA_TTS_MAX_LENGTH - visibleLength;
        if (plain.length > remaining) {
            return result + plain.slice(0, remaining);
        }
        result += plain + match[0];
        visibleLength += plain.length;
        cursor = match.index + match[0].length;
    }
    return result + tts.slice(cursor, cursor + MARUSIA_TTS_MAX_LENGTH - visibleLength);
}

/**
 * Адаптер, обеспечивающий полную поддержку платформы Маруси от ВК. Позволяет разрабатывать навыки для Маруси на TypeScript с использованием всего функционала платформы: от обработки голосовых запросов до работы с карточками и кнопками.
 *
 * Этот адаптер автоматически обрабатывает входящие webhook`и от Маруси,
 * преобразует их в унифицированный формат фреймворка и формирует ответ,
 * совместимый с требованиями платформы. Подключается одной строкой и
 * не мешает работе других адаптеров (например, для Telegram или VK).
 *
 * Поддерживает:
 * - голосовые и текстовые запросы;
 * - сохранение состояния (user/session);
 * - карточки, кнопки, TTS-эффекты;
 * - health-check (`ping` → `pong`);
 *
 * Подключается как любой другой адаптер: `bot.use(new MarusiaAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 * @example
 * ```ts
 * // Простейший навык, который отвечает на приветствие
 * import { Bot } from 'umbot';
 * import { MarusiaAdapter } from 'umbot/plugins';
 *
 * const bot = new Bot()
 *     .use(new MarusiaAdapter('YOUR_MARUSIA_TOKEN'))
 *     .addCommand('start', ['привет'], (_text, ctx) => {
 *         ctx.text = 'Привет! Я твой первый навык для Маруси';
 *     });
 *
 * bot.start('localhost', 3000);
 * ```
 *
 * @see Bot
 * @see BotController
 * @see BasePlatform
 */
export class MarusiaAdapter extends BasePlatform<string | IMarusiaWebhookRequest> {
    platformName = T_MARUSIA;

    init(appContext: AppContext): void {
        super.init(appContext);
        if (this._token) {
            appContext.appConfig.tokens[this.platformName].token = this._token;
        }
    }

    isPlatformOnQuery(query: IMarusiaWebhookRequest, headers?: Record<string, unknown>): boolean {
        if (headers?.['x-marusia-signature']) {
            return true;
        }
        if (!query) {
            this.appContext?.logWarn(`MarusiaAdapter:isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);
            return false;
        }
        if (query.request && query.version && query.session) {
            const clientId = query.meta?.client_id ?? '';
            if (clientId.includes('MailRu')) {
                return true;
            } else if (clientId.includes('yandex.searchplugin')) {
                return false;
            } else if (query.session.application?.application_id) {
                return (
                    query.session.application?.application_id ===
                    query.session.application?.application_id.toLowerCase()
                );
            }
        }
        return false;
    }

    /**
     * Инициализирует команду пользователя от Маруси.
     * Обрабатывает различные типы запросов и сохраняет команду в контроллере
     * @param request Объект запроса от пользователя
     * @param controller Контроллер приложения
     */
    #initUserCommand(request: IMarusiaRequest, controller: BotController): void {
        initUserCommand(request, controller);
    }

    /**
     * Устанавливает состояние приложения.
     * Определяет тип хранилища и сохраняет состояние в контроллере
     * @param controller Контроллер приложения
     * @param state Объект состояния из запроса Маруси (`user` или `session`)
     */
    #setState(controller: BotController, state: IMarusiaRequestState): void {
        if (state.user && state.session) {
            this.appContext?.logWarn(
                'MarusiaAdapter.setQueryData(): запрос содержит user и session state; выбран более приоритетный user state.',
            );
        }
        if (state.user) {
            controller.state = state.user;
            controller.platformOptions.stateName = 'user_state_update';
        } else if (state.session) {
            controller.state = state.session;
            controller.platformOptions.stateName = 'session_state';
        }
    }

    setQueryData(query: IMarusiaWebhookRequest, controller: BotController): boolean {
        if (this.appContext) {
            if (query) {
                if (query.account_linking_complete_event && !query.session && !query.request) {
                    controller.userEvents = {
                        auth: {
                            status: true,
                        },
                    };
                    return true;
                }
                if (!query.session || !query.request) {
                    controller.platformOptions.error =
                        'MarusiaAdapter:setQueryData(): Переданы некорректные данные!';
                    return false;
                }

                // Обработка health-check (ping → pong)
                if (!query.request.command && query.request.original_utterance === 'ping') {
                    controller.text = 'pong';
                    controller.platformOptions.sendInInit = {
                        version: VERSION,
                        response: {
                            text: 'pong',
                            end_session: false,
                        },
                    };
                    return true;
                }

                controller.requestObject = query;
                this.#initUserCommand(query.request, controller);
                if (query.state !== undefined) {
                    this.#setState(controller, query.state);
                }

                controller.platformOptions.session = query.session;
                controller.userId = query.session.user_id + '';
                controller.nlu.setNlu(query.request.nlu || {});

                controller.userMeta = query.meta || {};
                controller.messageId = query.session.message_id;

                controller.platformOptions.appId = query.session.skill_id;
                controller.isScreen =
                    (controller.userMeta as IMarusiaRequestMeta).interfaces?.screen !== undefined;
                return true;
            } else {
                controller.platformOptions.error = `MarusiaAdapter:setQueryData(): ${EMPTY_QUERY_ERROR}`;
            }
        }
        return false;
    }

    /**
     * Формирует ответ для пользователя.
     * Собирает текст, TTS, карточки и кнопки в единый объект ответа
     * @returns {Promise<IMarusiaResponse>} Объект ответа для Маруси
     */
    protected async _getResponse(controller: BotController): Promise<IMarusiaResponse> {
        const response: IMarusiaResponse = {
            text: Text.resize(controller.text, 1024),
            tts: resizeMarusiaTts(controller.tts),
            end_session: controller.isEnd,
        };
        if (controller.isScreen) {
            if (controller.isCardInit() && controller.card.images.length) {
                response.card = <IMarusiaItemsList | IMarusiaBigImage | IMarusiaImageGallery>(
                    await controller.card.getCards(cardProcessing, controller)
                );
                if (!response.card) {
                    response.card = undefined;
                }
            }
            response.buttons = controller.isButtonsInit()
                ? (controller.buttons.getButtons(
                      (buttons: IButtonType[]) =>
                          buttonProcessing(
                              buttons,
                              false,
                              this.appContext as AppContext,
                          ) as IMarusiaButton[],
                  ) as IMarusiaButton[])
                : [];
        }
        // Пустой text допустим, если заполнен tts (как и в Алисе) — предупреждаем
        // только когда пусто и то, и другое, иначе warn сыпался на валидных ответах.
        if (!response.text && !response.tts) {
            this.appContext?.logWarn(
                'MarusiaAdapter._getResponse(): text и tts пусты. Ответ сохранён без подстановки; такой вариант находится вне документированного контракта Маруси.',
            );
        }
        return response;
    }

    async getContent(
        controller: BotController,
        stateData?: Record<string, unknown> | null,
    ): Promise<IMarusiaWebhookResponse> {
        const result: IMarusiaWebhookResponse = {
            version: VERSION,
        };

        await this._initTTS(controller);
        result.response = await this._getResponse(controller);
        const sessionObj = controller.platformOptions.session as IMarusiaSession | undefined;
        result.session = {
            session_id: sessionObj?.session_id ?? '',
            message_id: sessionObj?.message_id ?? 0,
            user_id: String(sessionObj?.user_id ?? controller.userId ?? ''),
        };
        if (stateData && !controller.platformOptions.stateName) {
            this.appContext?.logWarn(
                'MarusiaAdapter.getContent(): stateData передан без выбранного state-хранилища и не будет отправлен.',
            );
        } else if (controller.platformOptions.stateName && stateData) {
            try {
                const stateJson = JSON.stringify(stateData);
                const stateBytes = Buffer.byteLength(stateJson, 'utf8');
                if (stateBytes <= MARUSIA_STATE_MAX_BYTES) {
                    result[controller.platformOptions.stateName as TState] = stateData;
                } else {
                    this.appContext?.logError(
                        `MarusiaAdapter.getContent(): Размер state "${controller.platformOptions.stateName}" ` +
                            `(${stateBytes} байт) превышает лимит API ` +
                            `(${MARUSIA_STATE_MAX_BYTES} байт). Поле не будет отправлено.`,
                    );
                }
            } catch (error) {
                this.appContext?.logError(
                    `MarusiaAdapter.getContent(): state "${controller.platformOptions.stateName}" не сериализуется и не будет отправлен.`,
                    { error },
                );
            }
        }
        this._timeLimitLog(controller);
        return result;
    }

    async soundProcessing(controller: BotController): Promise<void> {
        // eslint-disable-next-line require-atomic-updates
        controller.tts = await controller.sound.getSounds(
            controller.tts,
            soundProcessing,
            controller,
        );
    }

    getLocalStorage<TStorageResult = unknown>(controller: BotController): TStorageResult {
        return controller.state as TStorageResult;
    }

    isLocalStorage(controller: BotController): boolean {
        return controller.state !== null;
    }

    send(): boolean {
        return false;
    }

    getQueryExample(
        query: string,
        userId: string,
        count: number,
        state: IMarusiaRequestState | string,
    ): Record<string, unknown> {
        return {
            meta: {
                locale: 'ru-Ru',
                timezone: 'UTC',
                client_id: 'MailRu_local',
                interfaces: {
                    payments: null,
                    account_linking: null,
                },
            },
            session: {
                message_id: count,
                session_id: 'local',
                skill_id: 'local_test',
                user_id: userId,
                new: count === 0,
            },
            request: {
                command: query.toLowerCase(),
                original_utterance: query,
                type: 'SimpleUtterance',
            },
            state: {
                session: state,
            },
            version: '1.0',
        };
    }
}
