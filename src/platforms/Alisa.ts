import {TemplateTypeModel} from './TemplateTypeModel';
import {
    IAlisaBigImage,
    IAlisaButton,
    IAlisaItemsList, IAlisaRequest, IAlisaRequestState,
    IAlisaResponse,
    IAlisaSession,
    IAlisaWebhookRequest,
    IAlisaWebhookResponse
} from './interfaces';
import {BotController} from '../controller';
import {mmApp} from '../mmApp';
import {Text} from '../utils/standard/Text';

/**
 * Класс, отвечающий за корректную инициализацию и отправку ответа для Алисы
 * @class Alisa
 * @see TemplateTypeModel Смотри тут
 */
export class Alisa extends TemplateTypeModel {
    /**
     * @const string Версия Алисы.
     */
    private readonly VERSION: string = '1.0';
    /**
     * @const float Максимально время, за которое должен ответить навык.
     */
    private readonly MAX_TIME_REQUEST: number = 2800;
    /**
     * Информация о сессии пользователя.
     */
    protected _session: IAlisaSession | undefined;
    /**
     * Использование хранилища. True - используется, false - нет.
     */
    protected _isState: boolean = false;
    /**
     * Название хранилища. Зависит от того, от куда берутся данные (локально, глобально).
     */
    protected _stateName: 'user_state_update' | 'application_state' | 'session_state' | null = null;

    /**
     * Получение данных, необходимых для построения ответа пользователю.
     *
     * @return {Promise<IAlisaResponse>}
     * @private
     */
    protected async _getResponse(): Promise<IAlisaResponse> {
        const response: IAlisaResponse = {
            text: Text.resize(this.controller.text, 1024),
            tts: Text.resize(this.controller.tts, 1024),
            end_session: this.controller.isEnd
        };
        if (this.controller.isScreen) {
            if (this.controller.card.images.length) {
                response.card = <IAlisaItemsList | IAlisaBigImage>(await this.controller.card.getCards());
                if (!response.card) {
                    response.card = undefined;
                }
            }
            response.buttons = this.controller.buttons.getButtons<IAlisaButton[]>();
        }
        return response;
    }

    /**
     * Устанавливает состояние приложения
     *
     * @param state
     * @private
     */
    private _setState(state: IAlisaRequestState): void {
        if (typeof state.user !== 'undefined') {
            this.controller.state = state.user;
            this._stateName = 'user_state_update';
        } else if (typeof state.application !== 'undefined') {
            this.controller.state = state.application;
            this._stateName = 'application_state';
        } else if (typeof state.session !== 'undefined') {
            this.controller.state = state.session;
            this._stateName = 'session_state';
        }
    }

    /**
     * Инициализирует введенные пользователем данные
     *
     * @param request
     * @private
     */
    private _initUserCommand(request: IAlisaRequest): void {
        if (request.type === 'SimpleUtterance') {
            this.controller.userCommand = request.command.trim() || '';
            this.controller.originalUserCommand = request.original_utterance.trim() || '';
        } else {
            if (typeof request.payload === 'string') {
                this.controller.userCommand = request.payload;
                this.controller.originalUserCommand = request.payload;
            } else {
                this.controller.userCommand = request.command?.trim() || '';
                this.controller.originalUserCommand = request.original_utterance?.trim() || '';
            }
            this.controller.payload = request.payload;
        }
        if (!this.controller.userCommand) {
            this.controller.userCommand = this.controller.originalUserCommand;
        }
    }

    /**
     * Устанавливает идентификатор пользователя
     * @private
     */
    private _setUserId(): void {
        if (this._session) {
            let userId: string | null = null;
            this._isState = false;
            if (mmApp.params.y_isAuthUser) {
                if (typeof this._session.user !== 'undefined' && typeof this._session.user.user_id !== 'undefined') {
                    userId = this._session.user.user_id;
                    this._isState = true;
                    this.controller.userToken = this._session.user.access_token || null;
                }
            }

            if (userId === null) {
                if (typeof this._session.application !== 'undefined' && this._session.application.application_id !== 'undefined') {
                    userId = this._session.application.application_id;
                } else {
                    userId = this._session.user_id as string;
                }
            }

            mmApp.params.user_id = this.controller.userId = userId;
        }
    }

    /**
     * Инициализация основных параметров. В случае успешной инициализации, вернет true, иначе false.
     *
     * @param {IAlisaWebhookRequest|string} query Запрос пользователя.
     * @param {BotController} controller Ссылка на класс с логикой навык/бота.
     * @return Promise<boolean>
     * @see TemplateTypeModel.init() Смотри тут
     * @api
     */
    public async init(query: string | IAlisaWebhookRequest, controller: BotController): Promise<boolean> {
        if (query) {
            let content: IAlisaWebhookRequest;
            if (typeof query === 'string') {
                content = <IAlisaWebhookRequest>JSON.parse(query);
            } else {
                content = {...query};
            }

            if (typeof content.session === 'undefined' && typeof content.request === 'undefined') {
                if (content.account_linking_complete_event) {
                    this.controller.userEvents = {
                        auth: {
                            status: true
                        }
                    };
                    return true;
                }
                this.error = 'Alisa.init(): Не корректные данные!';
                return false;
            }
            if (!this.controller) {
                this.controller = controller;
            }
            this.controller.requestObject = content;
            this._initUserCommand(content.request);
            this._session = content.session;
            this._setUserId();
            this.controller.nlu.setNlu(content.request.nlu || {});

            this.controller.userMeta = content.meta || {};
            this.controller.messageId = this._session.message_id;

            if (typeof content.state !== 'undefined') {
                this._setState(content.state);
            }

            mmApp.params.app_id = this._session.skill_id;
            this.controller.isScreen = typeof this.controller.userMeta.interfaces.screen !== 'undefined';
            /**
             * Раз в какое-то время Яндекс отправляет запрос ping, для проверки корректности работы навыка.
             * @see (https://yandex.ru/dev/dialogs/alice/doc/health-check-docpage/) Смотри тут
             */
            if (this.controller.originalUserCommand === 'ping') {
                this.controller.text = 'pong';
                this.sendInInit = this.getContext();
            }
            return true;
        } else {
            this.error = 'Alisa:init(): Отправлен пустой запрос!';
        }
        return false;
    }

    /**
     * Получение ответа, который отправится пользователю. В случае с Алисой, Марусей и Сбер, возвращается json. С остальными типами, ответ отправляется непосредственно на сервер.
     *
     * @return {Promise<IAlisaWebhookResponse>}
     * @see TemplateTypeModel.getContext() Смотри тут
     * @api
     */
    public async getContext(): Promise<IAlisaWebhookResponse> {
        const result: IAlisaWebhookResponse = {
            version: this.VERSION,
        };
        if (this.controller.isAuth && this.controller.userToken === null) {
            result.start_account_linking = function () {
            };
        } else {
            await this._initTTS();
            result.response = await this._getResponse();
        }
        if ((this._isState || this.isUsedLocalStorage) && this._stateName) {
            if (this.isUsedLocalStorage && this.controller.userData) {
                result[this._stateName] = this.controller.userData;
            } else if (this.controller.state) {
                result[this._stateName] = this.controller.state;
            }
        }
        const timeEnd: number = this.getProcessingTime();
        if (timeEnd >= this.MAX_TIME_REQUEST) {
            this.error = `Alisa:getContext(): Превышено ограничение на отправку ответа. Время ответа составило: ${timeEnd} сек.`;
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
