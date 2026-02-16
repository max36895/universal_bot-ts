import { Text, BotController, Request, IRequestSend } from '../../../index';
import { BasePlatform, EMPTY_CONTEXT_ERROR, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { T_SMART_APP, DEVICE, ANNOTATIONS } from './constants';
import {
    ISberSmartAppWebhookRequest,
    ISberSmartAppWebhookResponse,
    ISberSmartAppSession,
    ISberSmartAppResponsePayload,
    TSberSmartAppEmotionId,
    ISberSmartAppItem,
    ISberSmartAppSuggestionButton,
} from './interfaces/ISmartAppPlatform';

/**
 * Адаптер для Сбер.SmartApp.
 *
 * Автоматически обрабатывает только те запросы, которые прошли проверку
 * через {@link isPlatformOnQuery} — т.е. действительно пришли от SmartApp.
 * Не влияет на обработку запросов от других платформ.
 *
 * Поддерживает:
 * - голосовые и текстовые запросы;
 * - карточки, кнопки, TTS-эффекты;
 *
 * Подключается как любой другой адаптер: `bot.use(new SmartAppAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 */
export class Adapter extends BasePlatform<string | ISberSmartAppWebhookRequest> {
    platformName = T_SMART_APP;

    isPlatformOnQuery(
        query: string | ISberSmartAppWebhookRequest,
        headers?: Record<string, unknown>,
    ): boolean {
        if (headers?.['x-sber-smartapp-webhook-token'] || headers?.['x-sber-token']) {
            return true;
        }
        const body: ISberSmartAppWebhookRequest =
            typeof query === 'string' ? JSON.parse(query) : query;
        if (!body) {
            this.appContext?.logWarn(`SmartAppAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);
            return false;
        }

        return !!(
            body.messageName &&
            body.uuid &&
            body.payload &&
            body.payload.character &&
            body.payload?.app_info
        );
    }

    /**
     * Инициализирует команду пользователя.
     * Обрабатывает различные типы сообщений и событий
     * @param content Объект запроса от пользователя
     * @param controller Объект запроса от пользователя
     *
     * Поддерживаемые типы сообщений:
     * - MESSAGE_TO_SKILL: сообщение пользователя
     * - CLOSE_APP: закрытие приложения
     * - SERVER_ACTION: действие сервера
     * - RUN_APP: запуск приложения
     * - RATING_RESULT: результат оценки
     */
    #initUserCommand(content: ISberSmartAppWebhookRequest, controller: BotController): void {
        controller.requestObject = content;
        controller.messageId = content.messageId;
        switch (content.messageName) {
            case 'MESSAGE_TO_SKILL':
            case 'CLOSE_APP':
                controller.userCommand = content.payload.message.normalized_text;
                controller.originalUserCommand = content.payload.message.original_text;
                break;

            case 'SERVER_ACTION':
            case 'RUN_APP':
                controller.payload = content.payload?.server_action?.parameters;
                if (typeof controller.payload === 'string') {
                    controller.userCommand = controller.originalUserCommand = controller.payload;
                }
                if (content.messageName === 'RUN_APP') {
                    controller.messageId = 0;
                    controller.originalUserCommand = controller.userCommand;
                    controller.userCommand = '';
                }
                break;

            case 'RATING_RESULT':
                controller.payload = content.payload;
                controller.messageId = 0;
                controller.userEvents = {
                    rating: {
                        status: content.payload.status_code?.code === 1,
                        value: content.payload.rating?.estimation,
                    },
                };
                break;
        }

        if (!controller.userCommand) {
            controller.userCommand = controller.originalUserCommand;
        }
    }

    setQueryData(query: string | ISberSmartAppWebhookRequest, controller: BotController): boolean {
        if (this.appContext) {
            if (query) {
                let content: ISberSmartAppWebhookRequest;
                if (typeof query === 'string') {
                    content = <ISberSmartAppWebhookRequest>JSON.parse(query);
                } else {
                    content = query;
                }

                this.#initUserCommand(content, controller);

                controller.platformOptions.session = {
                    device: content.payload.device,
                    meta: content.payload.meta,
                    sessionId: content.sessionId,
                    messageId: content.messageId,
                    uuid: content.uuid,
                    projectName: content.payload.projectName,
                };

                controller.oldIntentName = content.payload.intent;
                controller.appeal = content.payload.character.appeal;
                controller.userId = content.uuid.userId;
                const nlu = {
                    entities: content.payload.message.entities,
                    tokens: content.payload.message.tokenized_elements_list,
                };
                controller.nlu.setNlu(nlu);

                controller.userMeta = content.payload.meta || {};

                controller.platformOptions.appId = content.payload.app_info.applicationId;
                if (
                    content.payload.device.capabilities &&
                    content.payload.device.capabilities.screen
                ) {
                    controller.isScreen = content.payload.device.capabilities.screen.available;
                } else {
                    controller.isScreen = true;
                }

                return true;
            } else {
                controller.platformOptions.error = `SmartAppAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`;
            }
        } else {
            console.error(`SmartAppAdapter.isPlatformOnQuery(): ${EMPTY_CONTEXT_ERROR}`);
        }
        return false;
    }

    /**
     * Формирует ответ для пользователя.
     * Собирает текст, TTS, карточки и кнопки в единый объект ответа
     * @returns {Promise<ISberSmartAppResponsePayload>} Объект ответа для SmartApp
     */
    #getPayload(controller: BotController): ISberSmartAppResponsePayload {
        const payload: ISberSmartAppResponsePayload = {
            pronounceText: controller.text,
            pronounceTextType: 'application/text',
            device: (controller.platformOptions.session as ISberSmartAppSession).device,
            intent: controller.thisIntentName as string,
            projectName: (controller.platformOptions.session as ISberSmartAppSession).projectName,
            auto_listening: !controller.isEnd,
            finished: controller.isEnd,
        };

        if (controller.emotion) {
            payload.emotion = {
                emotionId: <TSberSmartAppEmotionId>controller.emotion,
            };
        }
        if (controller.text) {
            payload.items = [
                {
                    bubble: {
                        text: Text.resize(controller.text, 250),
                        markdown: true,
                        expand_policy: 'auto_expand',
                    },
                },
            ];
        }
        if (controller.tts) {
            payload.pronounceText = controller.tts;
            payload.pronounceTextType = 'application/ssml';
        }

        if (controller.isScreen) {
            if (controller.card.images.length) {
                if (payload.items === undefined) {
                    payload.items = [];
                }
                const cards: ISberSmartAppItem | null =
                    controller.card.getCards<ISberSmartAppItem | null>(cardProcessing, controller);
                if (cards) {
                    payload.items.push(cards);
                }
            }
            payload.suggestions = {
                buttons: controller.buttons.getButtons(
                    buttonProcessing,
                ) as ISberSmartAppSuggestionButton[],
            };
        }
        if (controller.isEnd) {
            if (payload.items === undefined) {
                payload.items = [];
            }
            payload.items.push({
                command: {
                    type: 'close_app',
                },
            });
        }
        return payload;
    }

    getContent(controller: BotController): ISberSmartAppWebhookResponse {
        const result: ISberSmartAppWebhookResponse = {
            messageName: 'ANSWER_TO_USER',
            sessionId: (controller.platformOptions.session as ISberSmartAppSession).sessionId,
            messageId: (controller.platformOptions.session as ISberSmartAppSession).messageId,
            uuid: (controller.platformOptions.session as ISberSmartAppSession).uuid,
        };

        if (controller.sound.sounds.length) {
            if (controller.tts === null) {
                controller.tts = controller.text;
            }
        }
        result.payload = this.#getPayload(controller);
        this._timeLimitLog(controller);
        return result;
    }

    /**
     * Формирует ответ с оценкой навыка
     * @returns {Promise<ISberSmartAppWebhookResponse>} Объект ответа для вебхука
     */
    public getRatingContext(controller: BotController): ISberSmartAppWebhookResponse {
        return {
            messageName: 'CALL_RATING',
            sessionId: (controller.platformOptions.session as ISberSmartAppSession).sessionId,
            messageId: (controller.platformOptions.session as ISberSmartAppSession).messageId,
            uuid: (controller.platformOptions.session as ISberSmartAppSession).uuid,
            payload: {},
        };
    }

    /**
     * Получает данные пользователя из хранилища
     * @returns {Promise<unknown | string>} Данные пользователя или строка с ошибкой
     * @protected
     */
    protected async _getUserData(controller: BotController): Promise<unknown> {
        const request = new Request(controller.appContext);
        request.url = `https://smartapp-code.sberdevices.ru/tools/api/data/${controller.userId}`;
        const result = await request.send();
        if (result.status && result.data) {
            return result.data;
        }
        return {};
    }

    /**
     * Сохраняет данные пользователя в хранилище
     */
    protected async _setUserData(
        data: unknown,
        controller: BotController,
    ): Promise<IRequestSend<unknown>> {
        const request = new Request(controller.appContext);
        request.header = Request.HEADER_AP_JSON;
        request.url = `https://smartapp-code.sberdevices.ru/tools/api/data/${controller.userId}`;
        request.post = data as Record<string, unknown>;
        return await request.send();
    }

    public async setLocalStorage(data: unknown, controller: BotController): Promise<void> {
        await this._setUserData(data, controller);
    }

    /**
     * Получает данные из локального хранилища
     * @returns {Promise<any | string>} Данные из хранилища или строка с ошибкой
     */
    public getLocalStorage<TStorageResult = unknown>(
        controller: BotController,
    ): Promise<TStorageResult> {
        return this._getUserData(controller) as Promise<TStorageResult>;
    }

    isLocalStorage(): boolean {
        return true;
    }

    send(): boolean {
        return false;
    }

    getQueryExample(query: string, userId: string, count: number): Record<string, unknown> {
        return {
            messageName: 'MESSAGE_TO_SKILL',
            uuid: { userId: `${+userId}`, userChannel: '', sub: '' },
            messageId: count,
            sessionId: `${userId}`,
            payload: {
                device: DEVICE,
                app_info: {
                    projectId: '',
                    applicationId: '',
                    appversionId: '',
                },
                character: {
                    id: 'sber',
                    name: 'Сбер',
                    gender: 'male',
                    appeal: 'official',
                },
                intent: '',
                original_intent: '',
                intent_meta: {},
                meta: {
                    time: {
                        timezone_id: '',
                        timezone_offset_sec: 0,
                        timestamp: Date.now(),
                    },
                },
                projectName: 'test',
                annotations: ANNOTATIONS,
                strategies: {
                    happy_birthday: false,
                    last_call: 0,
                },
                new_session: count === 0,
                message: {
                    normalized_text: query,
                    original_text: query,
                    asr_normalized_message: '',
                    tokenized_elements_list: [],
                },
            },
        };
    }
}
