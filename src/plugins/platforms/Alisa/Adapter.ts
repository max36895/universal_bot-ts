import { Text, BotController, AppContext } from '../../../index';
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

interface IState {
    user_state_update: object;
    application_state: object;
    session_state: object;
}

/**
 * Адаптер для Алисы.
 *
 * Автоматически обрабатывает только те запросы, которые прошли проверку
 * через {@link isPlatformOnQuery} — т.е. действительно пришли от Алисы.
 * Не влияет на обработку запросов от других платформ.
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
 */
export class Adapter extends BasePlatform<string | IAlisaWebhookRequest> {
    platformName = T_ALISA;

    init(appContext: AppContext): void {
        super.init(appContext);
        if (this._token) {
            appContext.appConfig.tokens[this.platformName].token = this._token;
        }
    }

    isPlatformOnQuery(
        query: string | IAlisaWebhookRequest,
        _headers?: Record<string, unknown>,
    ): boolean {
        const body: IAlisaWebhookRequest = typeof query === 'string' ? JSON.parse(query) : query;
        if (!body) {
            this.appContext?.logWarn(`AlisaAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);
            return false;
        }
        if (body.request && body.version && body.session) {
            if (body.meta?.client_id?.includes('yandex.searchplugin')) {
                return true;
            } else if (body.session.application?.application_id) {
                return (
                    body.session.application?.application_id !==
                    body.session.application?.application_id.toLowerCase()
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
     * Инициализирует команду пользователя.
     * Обрабатывает различные типы запросов и сохраняет команду в контроллере
     * @param request Объект запроса от пользователя
     * @param controller Контроллер приложения
     */
    #initUserCommand(request: IAlisaRequest, controller: BotController): void {
        if (request.type === 'SimpleUtterance') {
            controller.userCommand = request.command.trim() || '';
            controller.originalUserCommand = request.original_utterance.trim() || '';
        } else {
            if (typeof request.payload === 'string') {
                controller.userCommand = request.payload;
                controller.originalUserCommand = request.payload;
            } else {
                controller.userCommand = request.command?.trim() || '';
                controller.originalUserCommand = request.original_utterance?.trim() || '';
            }
            controller.payload = request.payload;
        }
        if (!controller.userCommand) {
            controller.userCommand = controller.originalUserCommand;
        }
    }

    /**
     * Устанавливает идентификатор пользователя.
     * Определяет ID пользователя из сессии или приложения
     */
    #setUserId(controller: BotController, session?: IAlisaSession): void {
        if (this.appContext) {
            if (session) {
                let userId: string | null = null;
                controller.platformOptions.isState = false;
                if (this.appContext.platformParams.isAuthUser) {
                    if (
                        typeof session.user !== 'undefined' &&
                        typeof session.user.user_id !== 'undefined'
                    ) {
                        userId = session.user.user_id;
                        controller.platformOptions.isState = true;
                        controller.userToken = session.user.access_token || null;
                    }
                }

                if (userId === null) {
                    if (
                        typeof session.application !== 'undefined' &&
                        session.application.application_id !== 'undefined'
                    ) {
                        userId = session.application.application_id;
                    } else {
                        userId = session.user_id as string;
                    }
                }

                controller.userId = userId;
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
        if (typeof state.user !== 'undefined') {
            controller.state = state.user;
            controller.platformOptions.stateName = 'user_state_update';
        } else if (typeof state.application !== 'undefined') {
            controller.state = state.application;
            controller.platformOptions.stateName = 'application_state';
        } else if (typeof state.session !== 'undefined') {
            controller.state = state.session;
            controller.platformOptions.stateName = 'session_state';
        }
    }

    setQueryData(query: string | IAlisaWebhookRequest, controller: BotController): boolean {
        if (this.appContext) {
            if (query) {
                let content: IAlisaWebhookRequest;
                if (typeof query === 'string') {
                    content = <IAlisaWebhookRequest>JSON.parse(query);
                } else {
                    content = query;
                }
                if (
                    typeof content.session === 'undefined' &&
                    typeof content.request === 'undefined'
                ) {
                    if (content.account_linking_complete_event) {
                        controller.userEvents = {
                            auth: {
                                status: true,
                            },
                        };
                        return true;
                    }
                    controller.platformOptions.error =
                        'AlisaAdapter.setQueryData(): Переданы не корректные данные!';
                    return false;
                }

                controller.requestObject = content;
                this.#initUserCommand(content.request, controller);
                this.#setUserId(controller, content.session);
                controller.nlu.setNlu(content.request.nlu || {});

                controller.userMeta = content.meta || {};
                controller.messageId = content.session.message_id;

                if (typeof content.state !== 'undefined') {
                    this.#setState(controller, content.state);
                }

                controller.platformOptions.appId = content.session.skill_id;
                controller.isScreen =
                    typeof (controller.userMeta as IAlisaRequestMeta).interfaces.screen !==
                    'undefined';
                /*
                 * Раз в какое-то время Яндекс отправляет запрос ping, для проверки корректности работы навыка.
                 * @see (https://yandex.ru/dev/dialogs/alice/doc/health-check-docpage/) Смотри тут
                 */
                if (content.request.original_utterance === 'ping' && !content.request.command) {
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
            if (controller.card.images.length) {
                response.card = <IAlisaItemsList | IAlisaBigImage>(
                    await controller.card.getCards(cardProcessing, controller)
                );
                if (!response.card) {
                    response.card = undefined;
                }
            }
            response.buttons = controller.buttons.getButtons(buttonProcessing) as IAlisaButton[];
        }
        return response;
    }

    async getContent(controller: BotController): Promise<IAlisaWebhookResponse> {
        const result: IAlisaWebhookResponse = {
            version: VERSION,
        };
        if (controller.isAuth && controller.userToken === null) {
            result.start_account_linking = {};
        } else {
            await this._initTTS(controller);
            result.response = await this._getResponse(controller);
        }
        if (controller.platformOptions.stateName) {
            if (
                this.appContext?.appConfig.isLocalStorage &&
                controller.platformOptions.usedLocalStorage &&
                controller.userData
            ) {
                if (controller.state && controller.appContext.database.adapter) {
                    result[controller.platformOptions.stateName as keyof IState] =
                        controller.state && Object.keys(controller.state).length !== 0
                            ? controller.state
                            : controller.userData;
                } else {
                    result[controller.platformOptions.stateName as keyof IState] =
                        controller.userData;
                }
            } else if (controller.state && Object.keys(controller.state).length) {
                result[controller.platformOptions.stateName as keyof IState] = controller.state;
            }
        }
        this._timeLimitLog(controller);
        return result;
    }

    /**
     * Использует кастомную обработку TTS через {@link soundProcessing} для вставки
     * звуковых эффектов в соответствии с требованиями Алисы.
     */
    async soundProcessing(controller: BotController): Promise<void> {
        // eslint-disable-next-line require-atomic-updates
        controller.tts = await controller.sound.getSounds(
            controller.tts,
            soundProcessing,
            controller,
        );
    }

    /**
     * Возвращает состояние из `request.state` (user/application/session).
     * Тип состояния определяется настройками навыка в Яндекс.Диалогах.
     */
    getLocalStorage<TStorageResult = unknown>(controller: BotController): TStorageResult {
        return controller.state as TStorageResult;
    }

    /**
     * Состояние доступно, если в запросе присутствует `state`.
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
