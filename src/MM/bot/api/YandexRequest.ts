import {Request} from "./request/Request";
import {mmApp} from "../core/mmApp";
import {IRequestSend} from "./interfaces/IRequest";

/**
 * Класс отвечающий за отправку запросов на Yandex сервер.
 *
 * @class YandexRequest
 */
export class YandexRequest {
    /**
     * Отправка запроса.
     * @see Request Смотри тут
     */
    protected _request: Request;

    /**
     * Авторизационный токен.
     * О том как получить авторизационный токен сказано тут:
     * @see (https://yandex.ru/dev/dialogs/alice/doc/resource-upload-docpage/#http-images-load__auth) Смотри тут
     */
    protected _oauth: string;
    /**
     * Текст с ошибкой
     */
    protected _error: string;

    /**
     * YandexRequest constructor.
     * @param {string} oauth Авторизационный токен для загрузки данных.
     */
    public constructor(oauth: string = null) {
        if (oauth) {
            this.setOAuth(oauth);
        } else {
            this.setOAuth(mmApp.params.yandex_token || null);
        }
        this._request = new Request();
        this._request.maxTimeQuery = 1500;
    }

    /**
     * Установка и инициализация токена.
     *
     * @param {string} oauth Авторизационный токен для загрузки данных.
     * @api
     */
    public setOAuth(oauth: string): void {
        this._oauth = oauth;
        if (this._request.header) {
            this._request.header = {'Authorization: OAuth ': this._oauth};
        }
    }

    /**
     * Отправка запроса для обработки данных.
     *
     * @param {string} url Адрес запроса.
     * @return any
     * @api
     */
    public call(url: string = null): any {
        const data: IRequestSend = this._request.send(url);
        if (data.status) {
            if (typeof data.data.error !== 'undefined') {
                this._error = JSON.stringify(data.data.error);
            }
            return data.data;
        }
        this._log(data.err);
        return null;
    }

    /**
     * Сохранение логов
     *
     * @param {string} error Текст ошибки
     * @api
     */
    protected _log(error: string): void {
        error = `\n${Date}Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`;
        mmApp.saveLog('YandexApi.log', error);
    }
}
