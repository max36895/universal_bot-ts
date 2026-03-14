import { Text, BotController, AppContext, IButtonType } from '../../../index';
import { BasePlatform, EMPTY_CONTEXT_ERROR, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { soundProcessing } from './Sound';
import {
    IAlisaBigImage,
    IAlisaButton,
    IAlisaItemsList,
    IAlisaRequest,
    IAlisaRequestMeta,
    IAlisaRequestState,
    IAlisaResponse,
    IAlisaSession,
    IAlisaWebhookRequest,
    IAlisaWebhookResponse,
} from './interfaces/IAlisaPlatform';
import { T_ALISA, VERSION } from './constants';
import { initUserCommand } from '../Base/utils';

interface IState {
    user_state_update: object;
    application_state: object;
    session_state: object;
}

/**
 * Адаптер для создания навыков Алисы (Яндекс.Диалоги) на TypeScript.
 *
 * Этот адаптер автоматически обрабатывает входящие webhook`и от Алисы,
 * преобразует их в унифицированный формат фреймворка и формирует ответ,
 * совместимый с требованиями платформы. Подключается одной строкой и
 * не мешает работе других адаптеров (например, для Telegram или VK).
 *
 * Поддерживает:
 * - голосовые и текстовые запросы;
 * - сохранение состояния (user/application/session);
 * - карточки, кнопки, TTS-эффекты;
 * - health-check (`ping` → `pong`);
 *
 * Подключается как любой другой адаптер: `bot.use(new AlisaAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 * @example
 * // Простейший навык, который отвечает на приветствие
 * import { Bot } from 'umbot';
 * import { AlisaAdapter } from 'umbot/plugins';
 *
 * const bot = new Bot()
 *     .use(new AlisaAdapter())
 *     .addCommand('start', ['привет'], (ctx) => {
 *         ctx.text = 'Привет! Я твой первый навык для Алисы';
 *     });
 *
 * bot.start();
 *
 * @see Bot
 * @see BotController
 * @see BasePlatform
 */
export class AlisaAdapter extends BasePlatform<string | IAlisaWebhookRequest> {
    platformName = T_ALISA;

    init(appContext: AppContext): void {
        super.init(appContext);
        if (this._token) {
            appContext.appConfig.tokens[this.platformName].token = this._token;
        }
    }

    isPlatformOnQuery(query: IAlisaWebhookRequest, _headers?: Record<string, unknown>): boolean {
        if (!query) {
            this.appContext?.logWarn(`AlisaAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);
            return false;
        }
        if (query.request && query.version && query.session) {
            if (query.meta?.client_id?.includes('yandex.searchplugin')) {
                return true;
            } else if (query.session.application?.application_id) {
                return (
                    query.session.application?.application_id !==
                    query.session.application?.application_id.toLowerCase()
                );
            } else {
                this.appContext?.logWarn(
                    'AlisaAdapter.isPlatformOnQuery(): Не удалось однозначно определить платформу (Алиса/Маруся). Используется fallback на Алису.',
                );
                return true;
            }
        }
        return false;
    }

    /**
     * Инициализирует команду пользователя от Алисы.
     * Обрабатывает различные типы запросов и сохраняет команду в контроллере
     * @param request Объект запроса от пользователя
     * @param controller Контроллер приложения
     */
    #initUserCommand(request: IAlisaRequest, controller: BotController): void {
        initUserCommand(request, controller);
    }

    /**
     * Устанавливает идентификатор пользователя.
     * Определяет ID пользователя из сессии или приложения
     */
    #setUserId(controller: BotController, session?: IAlisaSession): void {
        if (this.appContext && session) {
            controller.platformOptions.isState = false;
            if (this.appContext.platformParams.isAuthUser && session.user?.user_id !== undefined) {
                controller.userId = session.user.user_id;
                controller.platformOptions.isState = true;
                controller.userToken = session.user.access_token || null;
            } else {
                if (session.application?.application_id === undefined) {
                    controller.userId = session.user_id as string;
                } else {
                    controller.userId = session.application.application_id;
                }
            }
        }
    }

    /**
     * Устанавливает состояние приложения.
     * Определяет тип хранилища и сохраняет состояние в контроллере
     * @param controller Объект состояния из запроса
     * @param state Объект состояния из запроса
     */
    #setState(controller: BotController, state: IAlisaRequestState): void {
        if (state.user) {
            controller.state = state.user;
            controller.platformOptions.stateName = 'user_state_update';
        } else if (state.application) {
            controller.state = state.application;
            controller.platformOptions.stateName = 'application_state';
        } else if (state.session) {
            controller.state = state.session;
            controller.platformOptions.stateName = 'session_state';
        }
    }

    setQueryData(query: IAlisaWebhookRequest, controller: BotController): boolean {
        if (this.appContext) {
            if (query) {
                if (query.session === undefined && query.request === undefined) {
                    if (query.account_linking_complete_event) {
                        controller.userEvents = {
                            auth: {
                                status: true,
                            },
                        };
                        return true;
                    }
                    controller.platformOptions.error =
                        'AlisaAdapter.setQueryData(): Переданы некорректные данные для авторизации!';
                    return false;
                }

                controller.requestObject = query;
                this.#initUserCommand(query.request, controller);
                this.#setUserId(controller, query.session);
                controller.nlu.setNlu(query.request.nlu || {});

                controller.userMeta = query.meta || {};
                controller.messageId = query.session.message_id;

                if (query.state !== undefined) {
                    this.#setState(controller, query.state);
                }

                controller.platformOptions.appId = query.session.skill_id;
                controller.isScreen =
                    (controller.userMeta as IAlisaRequestMeta).interfaces.screen !== undefined;
                /*
                 * Раз в какое-то время Яндекс отправляет запрос ping, для проверки корректности работы навыка.
                 * @see (https://yandex.ru/dev/dialogs/alice/doc/health-check-docpage/) Смотри тут
                 */
                if (!query.request.command && query.request.original_utterance === 'ping') {
                    controller.text = 'pong';
                    controller.platformOptions.sendInInit = {
                        version: VERSION,
                        response: {
                            text: 'pong',
                        },
                    };
                }
                return true;
            } else {
                controller.platformOptions.error = `AlisaAdapter.setQueryData(): ${EMPTY_QUERY_ERROR}`;
            }
        } else {
            console.error(`AlisaAdapter.setQueryData(): ${EMPTY_CONTEXT_ERROR}`);
        }
        return false;
    }

    /**
     * Формирует ответ для пользователя.
     * Собирает текст, TTS, карточки и кнопки в единый объект ответа
     * @returns {Promise<IAlisaResponse>} Объект ответа для Алисы
     */
    protected async _getResponse(controller: BotController): Promise<IAlisaResponse> {
        const response: IAlisaResponse = {
            text: Text.resize(controller.text, 1024),
            tts: Text.resize(controller.tts, 1024),
            end_session: controller.isEnd,
        };
        if (controller.isScreen) {
            if (controller.isCardInit() && controller.card.images.length) {
                response.card = <IAlisaItemsList | IAlisaBigImage>(
                    await controller.card.getCards(cardProcessing, controller)
                );
                if (!response.card) {
                    response.card = undefined;
                }
            }
            if (controller.isButtonsInit()) {
                const fn = (buttons: IButtonType[]): IAlisaButton[] | null => {
                    return buttonProcessing(buttons, false, this.appContext) as IAlisaButton[];
                };
                response.buttons = controller.buttons.getButtons(fn);
            } else {
                response.buttons = [];
            }
        }
        return response;
    }

    async getContent(
        controller: BotController,
        stateData?: Record<string, unknown> | null,
    ): Promise<IAlisaWebhookResponse> {
        const result: IAlisaWebhookResponse = {
            version: VERSION,
        };
        if (controller.isAuth && controller.userToken === null) {
            result.start_account_linking = {};
        } else {
            await this._initTTS(controller);
            result.response = await this._getResponse(controller);
        }
        if (controller.platformOptions.stateName && stateData) {
            result[controller.platformOptions.stateName as keyof IState] = stateData;
        }
        this._timeLimitLog(controller);
        return result;
    }

    /**
     * Использует кастомную обработку TTS через {@link soundProcessing} для вставки
     * звуковых эффектов в соответствии с требованиями Алисы.
     */
    async soundProcessing(controller: BotController): Promise<void> {
        if (controller.isSoundInit()) {
            // eslint-disable-next-line require-atomic-updates
            controller.tts = await controller.sound.getSounds(
                controller.tts,
                soundProcessing,
                controller,
            );
        }
    }

    /**
     * Возвращает состояние из `request.state` (user/application/session).
     * Тип состояния определяется настройками навыка в Яндекс.Диалогах.
     */
    getLocalStorage<TStorageResult = unknown>(controller: BotController): TStorageResult {
        return controller.state as TStorageResult;
    }

    /**
     * Проверяет, присутствует ли сохранённое состояние в запросе.
     *
     * @param controller - контроллер бота
     * @returns `true`, если состояние есть (не null)
     */
    isLocalStorage(controller: BotController): boolean {
        return controller.state !== null;
    }

    /**
     * Алиса не поддерживает push-сообщения, поэтому всегда возвращает `false`.
     */
    send(): boolean {
        return false;
    }

    getQueryExample(
        query: string,
        userId: string,
        count: number,
        state: IAlisaRequestState | string,
    ): Record<string, unknown> {
        return {
            meta: {
                locale: 'ru-Ru',
                timezone: 'UTC',
                client_id: 'yandex.searchplugin_local',
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
                nlu: {},
                type: 'SimpleUtterance',
            },
            state: {
                session: state,
            },
            version: '1.0',
        };
    }
}
