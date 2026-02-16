import { Text, BotController, AppContext } from '../../../index';
import { BasePlatform, EMPTY_CONTEXT_ERROR, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { soundProcessing } from './Sound';
import { T_MARUSIA, VERSION } from './constants';
import {
    IMarusiaRequest,
    IMarusiaRequestState,
    IMarusiaItemsList,
    IMarusiaBigImage,
    IMarusiaButton,
    IMarusiaResponse,
    IMarusiaWebhookRequest,
    IMarusiaWebhookResponse,
    IMarusiaRequestMeta,
} from './interfaces/IMarusiaPlatform';

type TState = 'user_state_update' | 'session_state';

/**
 * Адаптер для Маруси.
 *
 * Автоматически обрабатывает только те запросы, которые прошли проверку
 * через {@link isPlatformOnQuery} — т.е. действительно пришли от Маруси.
 * Не влияет на обработку запросов от других платформ.
 *
 * Поддерживает:
 * - голосовые и текстовые запросы;
 * - сохранение состояния (user/application/session);
 * - карточки, кнопки, TTS-эффекты;
 * - health-check (`ping` → `pong`);
 *
 * Подключается как любой другой адаптер: `bot.use(new MarusiaAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 */
export class Adapter extends BasePlatform<string | IMarusiaWebhookRequest> {
    platformName = T_MARUSIA;

    init(appContext: AppContext): void {
        super.init(appContext);
        if (this._token) {
            appContext.appConfig.tokens[this.platformName].token = this._token;
        }
    }

    isPlatformOnQuery(
        query: string | IMarusiaWebhookRequest,
        headers?: Record<string, unknown>,
    ): boolean {
        if (headers?.['x-marusia-signature']) {
            return true;
        }
        const body = typeof query === 'string' ? JSON.parse(query) : query;
        if (!body) {
            this.appContext?.logWarn(`MarusiaAdapter:isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);
            return false;
        }
        if (body.request && body.version && body.session) {
            if (body.meta?.client_id?.includes('MailRu')) {
                return true;
            } else if (body.session.application?.application_id) {
                return (
                    body.session.application?.application_id ==
                    body.session.application?.application_id.toLowerCase()
                );
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
    #initUserCommand(request: IMarusiaRequest, controller: BotController): void {
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
     * Устанавливает состояние приложения.
     * Определяет тип хранилища и сохраняет состояние в контроллере
     * @param controller Объект состояния из запроса
     * @param state Объект состояния из запроса
     */
    #setState(controller: BotController, state: IMarusiaRequestState): void {
        if (typeof state.user !== 'undefined') {
            controller.state = state.user;
            controller.platformOptions.stateName = 'user_state_update';
        } else if (typeof state.session !== 'undefined') {
            controller.state = state.session;
            controller.platformOptions.stateName = 'session_state';
        }
    }

    setQueryData(query: string | IMarusiaWebhookRequest, controller: BotController): boolean {
        if (this.appContext) {
            if (query) {
                let content: IMarusiaWebhookRequest;
                if (typeof query === 'string') {
                    content = <IMarusiaWebhookRequest>JSON.parse(query);
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
                        'MarusiaAdapter:setQueryData(): Переданы не корректные данные!';
                    return false;
                }

                controller.requestObject = content;
                this.#initUserCommand(content.request, controller);
                if (typeof content.state !== 'undefined') {
                    this.#setState(controller, content.state);
                }

                controller.platformOptions.session = content.session;
                controller.userId = content.session.user_id as string;
                controller.nlu.setNlu(content.request.nlu || null);

                controller.userMeta = content.meta || {};
                controller.messageId = content.session.message_id;

                controller.platformOptions.appId = content.session.skill_id;
                controller.isScreen =
                    typeof (controller.userMeta as IMarusiaRequestMeta).interfaces.screen !==
                    'undefined';
                return true;
            } else {
                controller.platformOptions.error = `MarusiaAdapter:setQueryData(): ${EMPTY_QUERY_ERROR}`;
            }
        } else {
            console.error(`MarusiaAdapter:setQueryData(): ${EMPTY_CONTEXT_ERROR}`);
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
            tts: Text.resize(controller.tts, 1024),
            end_session: controller.isEnd,
        };
        if (controller.isScreen) {
            if (controller.card.images.length) {
                response.card = <IMarusiaItemsList | IMarusiaBigImage>(
                    await controller.card.getCards(cardProcessing, controller)
                );
                if (!response.card) {
                    response.card = undefined;
                }
            }
            response.buttons = controller.buttons.getButtons(buttonProcessing) as IMarusiaButton[];
        }
        return response;
    }

    async getContent(controller: BotController): Promise<IMarusiaWebhookResponse> {
        const result: IMarusiaWebhookResponse = {
            version: VERSION,
        };

        await this._initTTS(controller);
        result.response = await this._getResponse(controller);
        result.session = controller.platformOptions.session as IMarusiaWebhookResponse['session'];
        if (controller.platformOptions.stateName) {
            if (
                controller.platformOptions.isState &&
                controller.platformOptions.usedLocalStorage &&
                controller.userData
            ) {
                if (controller.state && controller.appContext.database.adapter) {
                    result[controller.platformOptions.stateName as TState] =
                        Object.keys(controller.state).length !== 0
                            ? controller.state
                            : controller.userData;
                } else {
                    result[controller.platformOptions.stateName as TState] = controller.userData;
                }
            } else if (controller.state) {
                result[controller.platformOptions.stateName as TState] = controller.state;
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
