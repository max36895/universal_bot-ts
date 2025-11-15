import { Request } from './request/Request';
import { IMaxSendMessage, IMaxParams, IMaxAppApi } from './interfaces';
import { IMaxUploadFile, TMaxUploadFile } from './interfaces/IMaxAppApi';
import { AppContext } from '../core/AppContext';

/**
 * Класс для взаимодействия с API Max
 * Предоставляет методы для отправки сообщений, загрузки файлов
 * @see (https://dev.max.ru/docs-api) Смотри тут
 */
export class MaxRequest {
    /**
     * Базовый URL для всех методов Max API
     */
    protected readonly MAX_API_ENDPOINT = 'https://platform-api.max.ru/';

    /**
     * Экземпляр класса для выполнения HTTP-запросов
     * @private
     */
    protected _request: Request;

    /**
     * Текст последней возникшей ошибки
     * @private
     */
    protected _error: string | null;

    /**
     * Токен доступа к Max API
     */
    public token: string | null;

    /**
     * Флаг для прямой передачи содержимого файла
     * По умолчанию: false
     */
    public isAttachContent: boolean;

    /**
     * Контекст приложения.
     */
    protected _appContext: AppContext;

    /**
     * Создает экземпляр класса для работы с API ВКонтакте
     * Устанавливает токен из конфигурации приложения, если он доступен
     */
    public constructor(appContext: AppContext) {
        this._request = new Request(appContext);
        this._request.maxTimeQuery = 5500;
        this.isAttachContent = false;
        this.token = null;
        this._error = null;
        this._request.post = {};
        this._appContext = appContext;
        if (appContext.platformParams.max_token) {
            this.initToken(appContext.platformParams.max_token);
        }
    }

    /**
     * Инициализирует токен доступа к MAX API
     * @param token Токен доступа к MAX API
     */
    public initToken(token: string): void {
        this.token = token;
    }

    /**
     * Устанавливает токен доступа к MAX API
     * @param accessToken
     * @protected
     */
    protected _setAccessToken(accessToken: string): void {
        if (!this._request.header) {
            this._request.header = {} as Record<string, string>;
        }
        (this._request.header as Record<string, string>).Authorization = accessToken;
        this._request.post.access_token = this.token;
    }

    /**
     * Выполняет вызов метода MAX API
     * @param method Название метода MAX API
     * @returns Результат выполнения метода или null при ошибке
     */
    public async call<T extends IMaxAppApi>(method: string): Promise<T | null> {
        if (this.token) {
            this._request.header = null;
            this._setAccessToken(this.token);
            const data = await this._request.send<T>(this.MAX_API_ENDPOINT + method);
            if (data.status && data.data) {
                return data.data;
            }
            this._log(data.err);
        } else {
            this._log('Не указан MAX токен!');
        }
        return null;
    }

    /**
     * Загружает файл на сервера Max
     * @param file Путь к файлу или его содержимое
     * @param type Тип загружаемого файла
     * @returns Информация о загруженном файле или null при ошибке
     */
    public async upload(file: string, type: TMaxUploadFile): Promise<IMaxUploadFile | null> {
        if (this.token) {
            this._request.attach = file;
            this._request.isAttachContent = this.isAttachContent;
            this._request.header = Request.HEADER_FORM_DATA;
            this._request.post.type = type;
            this._setAccessToken(this.token);
            const data = await this._request.send<IMaxUploadFile>(
                this.MAX_API_ENDPOINT + 'uploads',
            );
            if (data.status && data.data) {
                return data.data;
            }
            this._log(data.err);
        } else {
            this._log('Не указан MAX токен!');
        }
        return null;
    }

    /**
     * Отправляет сообщение пользователю или в чат
     * @param peerId Идентификатор получателя:
     * @param message Текст сообщения
     * @param params Дополнительные параметры:
     * @returns Информация об отправленном сообщении или null при ошибке
     */
    public async messagesSend(
        peerId: number | string,
        message: string,
        params: IMaxParams | null = null,
    ): Promise<IMaxSendMessage | null> {
        const method = 'messages';
        this._request.post = {
            user_id: peerId,
            text: message,
        };

        if (params) {
            if (params.attachments || params.keyboard) {
                this._request.post.attachment = [];
            }
            if (typeof params.attachments !== 'undefined') {
                if (Array.isArray(params.attachments)) {
                    this._request.post.attachment.push(...params.attachments);
                } else {
                    this._request.post.attachment.push(params.attachments);
                }
                delete params.attachments;
            }

            if (typeof params.keyboard !== 'undefined') {
                this._request.post.attachment.push({
                    type: 'inline_keyboard',
                    payload: params.keyboard,
                });
                delete params.keyboard;
            }

            if (Object.keys(params).length) {
                this._request.post = { ...params, ...this._request.post };
            }
        }
        return await this.call(method);
    }

    /**
     * Регистрирует событие для получения уведомлений о новых сообщениях в MAX
     * @param url
     */
    public subscriptions(url: string): Promise<any> {
        this._request.post = {
            url,
        };
        return this.call('subscriptions');
    }

    /**
     * Записывает информацию об ошибках в лог-файл
     * @param error Текст ошибки для логирования
     * @private
     */
    protected _log(error: string = ''): void {
        this._appContext.logError(
            `MaxApi: (${new Date()}): Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`,
        );
    }
}
