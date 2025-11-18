import { TemplateTypeModel } from './TemplateTypeModel';
import { BotController } from '../controller';
import {
    ISberSmartAppItem,
    ISberSmartAppResponsePayload,
    ISberSmartAppSession,
    ISberSmartAppSuggestionButton,
    ISberSmartAppWebhookRequest,
    ISberSmartAppWebhookResponse,
    TSberSmartAppEmotionId,
} from './interfaces';
import { Text } from '../utils/standard/Text';
import { Buttons } from '../components/button';
import { IRequestSend, Request } from '../api';
import { T_SMARTAPP } from '../core';

/**
 * Класс для работы с платформой Сбер SmartApp.
 * Отвечает за инициализацию и обработку запросов от пользователя,
 * а также формирование ответов в формате SmartApp
 * @class SmartApp
 * @extends TemplateTypeModel
 * @see TemplateTypeModel Смотри тут
 */
export class SmartApp extends TemplateTypeModel {
    /**
     * Максимальное время ответа навыка в миллисекундах
     */
    private readonly MAX_TIME_REQUEST: number = 2800;

    /**
     * Информация о сессии пользователя
     * @protected
     */
    protected _session: ISberSmartAppSession | null = null;

    /**
     * Формирует ответ для пользователя.
     * Собирает текст, TTS, карточки и кнопки в единый объект ответа
     * @returns {Promise<ISberSmartAppResponsePayload>} Объект ответа для SmartApp
     */
    protected async _getPayload(): Promise<ISberSmartAppResponsePayload> {
        const payload: ISberSmartAppResponsePayload = {
            pronounceText: this.controller.text,
            pronounceTextType: 'application/text',
            device: (this._session as ISberSmartAppSession).device,
            intent: this.controller.thisIntentName as string,
            projectName: (this._session as ISberSmartAppSession).projectName,
            auto_listening: !this.controller.isEnd,
            finished: this.controller.isEnd,
        };

        if (this.controller.emotion) {
            payload.emotion = {
                emotionId: <TSberSmartAppEmotionId>this.controller.emotion,
            };
        }
        if (this.controller.text) {
            payload.items = [
                {
                    bubble: {
                        text: Text.resize(this.controller.text, 250),
                        markdown: true,
                        expand_policy: 'auto_expand',
                    },
                },
            ];
        }
        if (this.controller.tts) {
            payload.pronounceText = this.controller.tts;
            payload.pronounceTextType = 'application/ssml';
        }

        if (this.controller.isScreen) {
            if (this.controller.card.images.length) {
                if (typeof payload.items === 'undefined') {
                    payload.items = [];
                }
                const cards: ISberSmartAppItem = await this.controller.card.getCards(T_SMARTAPP);
                payload.items.push(cards);
            }
            payload.suggestions = {
                buttons: this.controller.buttons.getButtons<ISberSmartAppSuggestionButton[]>(
                    Buttons.T_SMARTAPP_BUTTONS,
                ),
            };
        }
        if (this.controller.isEnd) {
            if (typeof payload.items === 'undefined') {
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

    /**
     * Инициализирует команду пользователя.
     * Обрабатывает различные типы сообщений и событий
     * @param content Объект запроса от пользователя
     *
     * Поддерживаемые типы сообщений:
     * - MESSAGE_TO_SKILL: сообщение пользователя
     * - CLOSE_APP: закрытие приложения
     * - SERVER_ACTION: действие сервера
     * - RUN_APP: запуск приложения
     * - RATING_RESULT: результат оценки
     */
    #initUserCommand(content: ISberSmartAppWebhookRequest): void {
        this.controller.requestObject = content;
        this.controller.messageId = content.messageId;
        switch (content.messageName) {
            case 'MESSAGE_TO_SKILL':
            case 'CLOSE_APP':
                this.controller.userCommand = content.payload.message.normalized_text;
                this.controller.originalUserCommand = content.payload.message.original_text;
                break;

            case 'SERVER_ACTION':
            case 'RUN_APP':
                this.controller.payload = content.payload?.server_action?.parameters;
                if (typeof this.controller.payload === 'string') {
                    this.controller.userCommand = this.controller.originalUserCommand =
                        this.controller.payload;
                }
                if (content.messageName === 'RUN_APP') {
                    this.controller.messageId = 0;
                    this.controller.originalUserCommand = this.controller.userCommand;
                    this.controller.userCommand = '';
                }
                break;

            case 'RATING_RESULT':
                this.controller.payload = content.payload;
                this.controller.messageId = 0;
                this.controller.userEvents = {
                    rating: {
                        status: content.payload.status_code?.code === 1,
                        value: content.payload.rating?.estimation,
                    },
                };
                break;
        }

        if (!this.controller.userCommand) {
            this.controller.userCommand = this.controller.originalUserCommand;
        }
    }

    /**
     * Инициализирует основные параметры для работы с запросом
     * @param query Запрос пользователя в формате строки или объекта
     * @param controller Контроллер с логикой навыка
     * @returns {Promise<boolean>} true при успешной инициализации, false при ошибке
     * @see TemplateTypeModel.init() Смотри тут
     */
    public async init(
        query: string | ISberSmartAppWebhookRequest,
        controller: BotController,
    ): Promise<boolean> {
        if (query) {
            let content: ISberSmartAppWebhookRequest;
            if (typeof query === 'string') {
                content = <ISberSmartAppWebhookRequest>JSON.parse(query);
            } else {
                content = { ...query };
            }

            this.controller = controller;
            this.#initUserCommand(content);

            this._session = {
                device: content.payload.device,
                meta: content.payload.meta,
                sessionId: content.sessionId,
                messageId: content.messageId,
                uuid: content.uuid,
                projectName: content.payload.projectName,
            };

            this.controller.oldIntentName = content.payload.intent;
            this.controller.appeal = content.payload.character.appeal;
            this.controller.userId = content.uuid.userId;
            this.appContext.platformParams.user_id = this.controller.userId;
            const nlu = {
                entities: content.payload.message.entities,
                tokens: content.payload.message.tokenized_elements_list,
            };
            this.controller.nlu.setNlu(nlu);

            this.controller.userMeta = content.payload.meta || {};

            this.appContext.platformParams.app_id = content.payload.app_info.applicationId;
            if (content.payload.device.capabilities && content.payload.device.capabilities.screen) {
                this.controller.isScreen = content.payload.device.capabilities.screen.available;
            } else {
                this.controller.isScreen = true;
            }

            return true;
        } else {
            this.error = 'SmartApp:init(): Отправлен пустой запрос!';
        }
        return false;
    }

    /**
     * Формирует ответ с оценкой навыка
     * @returns {Promise<ISberSmartAppWebhookResponse>} Объект ответа для вебхука
     */
    public async getRatingContext(): Promise<ISberSmartAppWebhookResponse> {
        return {
            messageName: 'CALL_RATING',
            sessionId: (this._session as ISberSmartAppSession).sessionId,
            messageId: (this._session as ISberSmartAppSession).messageId,
            uuid: (this._session as ISberSmartAppSession).uuid,
            payload: {},
        };
    }

    /**
     * Формирует полный ответ для отправки пользователю.
     * Включает версию API, ответ навыка и данные сессии
     * @returns {Promise<ISberSmartAppWebhookResponse>} Объект ответа для вебхука
     * @see TemplateTypeModel.getContext() Смотри тут
     */
    public async getContext(): Promise<ISberSmartAppWebhookResponse> {
        const result: ISberSmartAppWebhookResponse = {
            messageName: 'ANSWER_TO_USER',
            sessionId: (this._session as ISberSmartAppSession).sessionId,
            messageId: (this._session as ISberSmartAppSession).messageId,
            uuid: (this._session as ISberSmartAppSession).uuid,
        };

        if (this.controller.sound.sounds.length /* || this.controller.sound.isUsedStandardSound*/) {
            if (this.controller.tts === null) {
                this.controller.tts = this.controller.text;
            }
            this.controller.tts = await this.controller.sound.getSounds(
                this.controller.tts,
                T_SMARTAPP,
            );
        }
        result.payload = await this._getPayload();
        const timeEnd: number = this.getProcessingTime();
        if (timeEnd >= this.MAX_TIME_REQUEST) {
            this.error = `SmartApp:getContext(): Превышено ограничение на отправку ответа. Время ответа составило: ${timeEnd / 1000} сек.`;
        }
        return result;
    }

    /**
     * Получает данные пользователя из хранилища
     * @returns {Promise<unknown | string>} Данные пользователя или строка с ошибкой
     * @protected
     */
    protected async _getUserData(): Promise<unknown | string> {
        const request = new Request(this.appContext);
        request.url = `https://smartapp-code.sberdevices.ru/tools/api/data/${this.controller.userId}`;
        const result = await request.send();
        if (result.status && result.data) {
            return result.data;
        }
        return {};
    }

    /**
     * Сохраняет данные пользователя в хранилище
     * @param data Данные для сохранения
     * @returns {Promise<IRequestSend<unknown>>} Результат сохранения
     * @protected
     */
    protected async _setUserData(data: any): Promise<IRequestSend<unknown>> {
        const request = new Request(this.appContext);
        request.header = Request.HEADER_AP_JSON;
        request.url = `https://smartapp-code.sberdevices.ru/tools/api/data/${this.controller.userId}`;
        request.post = data;
        return await request.send();
    }

    /**
     * Сохраняет данные в локальное хранилище
     * @param data Данные для сохранения
     */
    public async setLocalStorage(data: any): Promise<void> {
        await this._setUserData(data);
    }

    /**
     * Получает данные из локального хранилища
     * @returns {Promise<any | string>} Данные из хранилища или строка с ошибкой
     */
    public async getLocalStorage(): Promise<any | string> {
        return this._getUserData();
    }

    /**
     * Проверяет, используется ли локальное хранилище
     * @returns {boolean} true если используется локальное хранилище
     */
    public isLocalStorage(): boolean {
        return true;
    }
}
