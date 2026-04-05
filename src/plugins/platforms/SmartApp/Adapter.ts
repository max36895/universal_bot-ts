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
 * Адаптер, обеспечивающий полную поддержку платформы Салют от Сбер(SmartApp). Позволяет разрабатывать навыки для "Салют"(SmartApp) на TypeScript с использованием всего функционала платформы: от обработки голосовых запросов до работы с карточками и кнопками.
 *
 * Этот адаптер автоматически обрабатывает входящие webhook`и от SmartApp,
 * преобразует их в унифицированный формат фреймворка и формирует ответ,
 * совместимый с требованиями платформы. Подключается одной строкой и
 * не мешает работе других адаптеров (например, для Telegram или VK).
 *
 * Поддерживает:
 * - голосовые и текстовые запросы;
 * - карточки, кнопки, TTS-эффекты;
 *
 * Подключается как любой другой адаптер: `bot.use(new SmartAppAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 * @example
 * // Простейший навык, который отвечает на приветствие
 * import { Bot } from 'umbot';
 * import { SmartAppAdapter } from 'umbot/plugins';
 *
 * const bot = new Bot()
 *     .use(new SmartAppAdapter('YOUR_SMARTAPP_TOKEN'))
 *     .addCommand('start', ['привет'], (_text, ctx) => {
 *         ctx.text = 'Привет! Я твой первый навык для SmartApp';
 *     });
 *
 * bot.start('localhost', 3000);
 *
 * @see Bot
 * @see BotController
 * @see BasePlatform
 */
export class SmartAppAdapter extends BasePlatform<string | ISberSmartAppWebhookRequest> {
    platformName = T_SMART_APP;

    isPlatformOnQuery(
        query: ISberSmartAppWebhookRequest,
        headers?: Record<string, unknown>,
    ): boolean {
        if (headers?.['x-sber-smartapp-webhook-token'] || headers?.['x-sber-token']) {
            return true;
        }
        if (!query) {
            this.appContext?.logWarn(`SmartAppAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);
            return false;
        }

        return !!(
            query.messageName &&
            query.uuid &&
            query.payload?.character &&
            query.payload?.app_info
        );
    }

    /**
     * Инициализирует команду пользователя.
     * Обрабатывает различные типы сообщений и событий
     * @param content Объект webhook-запроса SmartApp
     * @param controller Экземпляр контроллера приложения
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
            case 'CLOSE_APP': {
                const msg = content.payload?.message;
                controller.userCommand = msg?.normalized_text ?? '';
                controller.originalUserCommand = msg?.original_text ?? '';
                break;
            }

            case 'SERVER_ACTION':
            case 'RUN_APP':
                controller.payload = content.payload?.server_action?.parameters;
                /*if (typeof controller.payload === 'string') {
                    controller.userCommand = controller.originalUserCommand = controller.payload;
                }*/
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

    setQueryData(query: ISberSmartAppWebhookRequest, controller: BotController): boolean {
        if (this.appContext) {
            if (query) {
                this.#initUserCommand(query, controller);

                controller.platformOptions.session = {
                    device: query.payload.device,
                    meta: query.payload.meta,
                    sessionId: query.sessionId,
                    messageId: query.messageId,
                    uuid: query.uuid,
                    projectName: query.payload.projectName,
                };

                controller.oldIntentName = query.payload.intent;
                controller.appeal = query.payload.character?.appeal ?? null;
                controller.userId = query.uuid.userId;
                const msg = query.payload.message;
                const nlu = {
                    entities: msg?.entities,
                    tokens: msg?.tokenized_elements_list,
                };
                controller.nlu.setNlu(nlu);

                controller.userMeta = query.payload.meta || {};

                controller.platformOptions.appId = query.payload.app_info.applicationId;
                if (query.payload.device?.capabilities?.screen) {
                    controller.isScreen = query.payload.device.capabilities.screen.available;
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
            if (controller.isCardInit() && controller.card.images.length) {
                payload.items ??= [];
                const cards: ISberSmartAppItem | null =
                    controller.card.getCards<ISberSmartAppItem | null>(cardProcessing, controller);
                if (cards) {
                    payload.items.push(cards);
                }
            }
            payload.suggestions = {
                buttons: controller.isButtonsInit()
                    ? (controller.buttons.getButtons(
                          buttonProcessing,
                      ) as ISberSmartAppSuggestionButton[])
                    : [],
            };
        }
        if (controller.isEnd) {
            payload.items ??= [];
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
            controller.tts ??= controller.text;
        }
        result.payload = this.#getPayload(controller);
        this._timeLimitLog(controller);
        return result;
    }

    /**
     * Формирует ответ с оценкой навыка
     * @returns {Promise<ISberSmartAppWebhookResponse>} Объект ответа для webhook`а
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
        request.header = Request.HEADER_JSON;
        request.url = `https://smartapp-code.sberdevices.ru/tools/api/data/${controller.userId}`;
        request.post = data as Record<string, unknown>;
        return await request.send();
    }

    public async setLocalStorage(data: unknown, controller: BotController): Promise<void> {
        await this._setUserData(data, controller);
    }

    /**
     * Получает данные из локального хранилища
     * @returns  Данные из хранилища или строка с ошибкой
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
