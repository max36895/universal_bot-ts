import {Request} from "./request/Request";
import {mmApp} from "../core/mmApp";
import {IRequestSend} from "./interfaces/IRequest";
import {IYandexApi} from "./interfaces/IYandexApi";

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
    protected _oauth: string | null | undefined;
    /**
     * Текст с ошибкой
     */
    protected _error: string | null;

    /**
     * YandexRequest constructor.
     * @param {string} oauth Авторизационный токен для загрузки данных.
     */
    public constructor(oauth: string | null = null) {
        this.setOAuth(oauth || mmApp.params.yandex_token || null);
        this._request = new Request();
        this._request.maxTimeQuery = 1500;
        this._error = null;
    }

    /**
     * Установка и инициализация токена.
     *
     * @param {string} oauth Авторизационный токен для загрузки данных.
     * @api
     */
    public setOAuth(oauth: string | null): void {
        this._oauth = oauth;
        if (this._request.header) {
            this._request.header = {'Authorization: OAuth ': this._oauth as string};
        }
    }

    /**
     * Отправка запроса для обработки данных.
     *
     * @param {string} url Адрес запроса.
     * @return Promise<any>
     * @api
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
     * Сохранение логов
     *
     * @param {string} error Текст ошибки
     * @api
     */
    protected _log(error: string = ''): void {
        error = `\n${Date}Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`;
        mmApp.saveLog('YandexApi.log', error);
    }
}
