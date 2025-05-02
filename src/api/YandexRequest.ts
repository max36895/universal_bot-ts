import { Request } from './request/Request';
import { mmApp } from '../mmApp';
import { IRequestSend, IYandexApi } from './interfaces';

/**
 * Класс, отвечающий за отправку запросов на сервера Яндекса.
 * Предоставляет базовый функционал для работы с API Яндекса.
 * 
 * @class YandexRequest
 */
export class YandexRequest {
    /**
     * Экземпляр класса для отправки HTTP-запросов.
     * @private
     * @type {Request}
     */
    protected _request: Request;

    /**
     * Авторизационный OAuth-токен для доступа к API Яндекса.
     * Подробная информация о получении токена:
     * @see https://yandex.ru/dev/dialogs/alice/doc/resource-upload-docpage/#http-images-load__auth
     * @private
     * @type {string | null | undefined}
     */
    protected _oauth: string | null | undefined;

    /**
     * Текст последней возникшей ошибки при выполнении запроса.
     * @private
     * @type {string | null}
     */
    protected _error: string | null;

    /**
     * Создает экземпляр класса YandexRequest.
     * 
     * @param {string | null} oauth - OAuth-токен для авторизации запросов.
     */
    public constructor(oauth: string | null = null) {
        this.setOAuth(oauth || mmApp.params.yandex_token || null);
        this._request = new Request();
        this._request.maxTimeQuery = 1500;
        this._error = null;
    }

    /**
     * Устанавливает OAuth-токен для авторизации запросов.
     * Обновляет заголовки запросов с новым токеном.
     * 
     * @param {string | null} oauth - OAuth-токен для авторизации.
     */
    public setOAuth(oauth: string | null): void {
        this._oauth = oauth;
        if (this._request.header) {
            this._request.header = { 'Authorization: OAuth ': this._oauth as string };
        }
    }

    /**
     * Выполняет HTTP-запрос к API Яндекса.
     * 
     * @template T - Тип ожидаемого ответа, наследующий интерфейс IYandexApi
     * @param {string | null} url - URL-адрес эндпоинта API
     * @returns {Promise<T | null>} - Результат запроса или null в случае ошибки
     */
    public async call<T extends IYandexApi>(url: string | null = null): Promise<T | null> {
        const data: IRequestSend<T> = await this._request.send<T>(url);
        if (data.status && data.data) {
            if (data.data.hasOwnProperty('error')) {
                this._error = JSON.stringify(data.data.error);
            }
            return data.data;
        }
        this._log(data.err);
        return null;
    }

    /**
     * Сохраняет информацию об ошибках в лог-файл.
     * 
     * @param {string} error - Текст ошибки для логирования
     * @private
     */
    protected _log(error: string = ''): void {
        error = `\n${Date}Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`;
        mmApp.saveLog('YandexApi.log', error);
    }
}
