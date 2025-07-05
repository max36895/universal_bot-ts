import { TemplateTypeModel } from './TemplateTypeModel';
import {
    IMarusiaBigImage,
    IMarusiaButton,
    IMarusiaItemsList,
    IMarusiaRequest,
    IMarusiaRequestState,
    IMarusiaResponse,
    IMarusiaSession,
    IMarusiaSessionResponse,
    IMarusiaWebhookRequest,
    IMarusiaWebhookResponse,
} from './interfaces';
import { BotController } from '../controller';
import { mmApp } from '../mmApp';
import { Text } from '../utils/standard/Text';

/**
 * Класс для работы с платформой Маруся.
 * Отвечает за инициализацию и обработку запросов от пользователя,
 * а также формирование ответов в формате Маруси
 * @class Marusia
 * @extends TemplateTypeModel
 * @see TemplateTypeModel Смотри тут
 */
export class Marusia extends TemplateTypeModel {
    /**
     * Версия API Маруси
     * @private
     */
    private readonly VERSION: string = '1.0';

    /**
     * Максимальное время ответа навыка в секундах
     * @private
     */
    private readonly MAX_TIME_REQUEST: number = 2.8;

    /**
     * Информация о сессии пользователя
     * @protected
     */
    protected _session: IMarusiaSession | null = null;

    /**
     * Название хранилища данных
     * Может быть одним из:
     * - user_state_update: данные пользователя
     * - session_state: данные сессии
     * @protected
     */
    protected _stateName: 'user_state_update' | 'session_state' | null = null;

    /**
     * Формирует ответ для пользователя.
     * Собирает текст, TTS, карточки и кнопки в единый объект ответа
     * @returns {Promise<IMarusiaResponse>} Объект ответа для Маруси
     * @protected
     */
    protected async _getResponse(): Promise<IMarusiaResponse> {
        const response: IMarusiaResponse = {
            text: Text.resize(this.controller.text, 1024),
            tts: Text.resize(this.controller.tts, 1024),
            end_session: this.controller.isEnd,
        };
        if (this.controller.isScreen) {
            if (this.controller.card.images.length) {
                response.card = <IMarusiaItemsList | IMarusiaBigImage>(
                    await this.controller.card.getCards()
                );
                if (!response.card) {
                    response.card = undefined;
                }
            }
            response.buttons = this.controller.buttons.getButtons<IMarusiaButton[]>();
        }
        return response;
    }

    /**
     * Получает информацию о текущей сессии
     * @returns {IMarusiaSessionResponse} Объект с данными сессии
     * @protected
     */
    protected _getSession(): IMarusiaSessionResponse {
        return {
            session_id: (this._session as IMarusiaSession).session_id,
            message_id: (this._session as IMarusiaSession).message_id,
            user_id: (this._session as IMarusiaSession).user_id as string,
        };
    }

    /**
     * Устанавливает состояние приложения.
     * Определяет тип хранилища и сохраняет состояние в контроллере
     * @param state Объект состояния из запроса
     * @private
     */
    private _setState(state: IMarusiaRequestState): void {
        if (typeof state.user !== 'undefined') {
            this.controller.state = state.user;
            this._stateName = 'user_state_update';
        } else if (typeof state.session !== 'undefined') {
            this.controller.state = state.session;
            this._stateName = 'session_state';
        }
    }

    /**
     * Инициализирует команду пользователя.
     * Обрабатывает различные типы запросов и сохраняет команду в контроллере
     * @param request Объект запроса от пользователя
     * @private
     */
    private _initUserCommand(request: IMarusiaRequest): void {
        if (request.type === 'SimpleUtterance') {
            this.controller.userCommand = request.command.trim();
            this.controller.originalUserCommand = request.original_utterance.trim();
        } else {
            if (typeof request.payload === 'string') {
                this.controller.userCommand = request.payload;
                this.controller.originalUserCommand = request.payload;
            } else {
                this.controller.userCommand = request.command?.trim();
                this.controller.originalUserCommand = request.original_utterance?.trim();
            }
            this.controller.payload = request.payload;
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
        query: string | IMarusiaWebhookRequest,
        controller: BotController,
    ): Promise<boolean> {
        if (query) {
            let content: IMarusiaWebhookRequest;
            if (typeof query === 'string') {
                content = <IMarusiaWebhookRequest>JSON.parse(query);
            } else {
                content = { ...query };
            }
            if (typeof content.session === 'undefined' && typeof content.request === 'undefined') {
                if (typeof content.account_linking_complete_event !== 'undefined') {
                    this.controller.userEvents = {
                        auth: {
                            status: true,
                        },
                    };
                    return true;
                }
                this.error = 'Marusia.init(): Не корректные данные!';
                return false;
            }
            if (!this.controller) {
                this.controller = controller;
            }
            this.controller.requestObject = content;
            this._initUserCommand(content.request);
            if (typeof content.state !== 'undefined') {
                this._setState(content.state);
            }

            this._session = content.session;

            this.controller.userId = this._session.user_id as string;
            mmApp.params.user_id = this.controller.userId;
            this.controller.nlu.setNlu(content.request.nlu || null);

            this.controller.userMeta = content.meta || [];
            this.controller.messageId = this._session.message_id;

            mmApp.params.app_id = this._session.skill_id;
            this.controller.isScreen =
                typeof this.controller.userMeta.interfaces.screen !== 'undefined';
            return true;
        } else {
            this.error = 'Marusia:init(): Отправлен пустой запрос!';
        }
        return false;
    }

    /**
     * Формирует полный ответ для отправки пользователю.
     * Включает версию API, ответ навыка, данные сессии и состояние
     * @returns {Promise<IMarusiaWebhookResponse>} Объект ответа для вебхука
     * @see TemplateTypeModel.getContext() Смотри тут
     */
    public async getContext(): Promise<IMarusiaWebhookResponse> {
        const result: IMarusiaWebhookResponse = {
            version: this.VERSION,
        };
        await this._initTTS();
        result.response = await this._getResponse();
        result.session = this._getSession();
        if (this.isUsedLocalStorage && this.controller.userData && this._stateName) {
            result[this._stateName] = this.controller.userData;
        }
        const timeEnd = this.getProcessingTime();
        if (timeEnd >= this.MAX_TIME_REQUEST) {
            this.error = `Marusia:getContext(): Превышено ограничение на отправку ответа. Время ответа составило: ${timeEnd} сек.`;
        }
        return result;
    }

    /**
     * Получение данные из локального хранилища Алисы
     * @return {Promise<Object | string>}
     */
    public async getLocalStorage(): Promise<any | string> {
        return Promise.resolve(this.controller.state);
    }

    /**
     * Проверка на использование локального хранилища
     * @return {boolean}
     */
    public isLocalStorage(): boolean {
        return this.controller.state !== null;
    }
}
