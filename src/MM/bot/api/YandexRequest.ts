/**
 * Отправка запросов на Yandex сервер.
 *
 * Class YandexRequest
 * @package bot\core\api
 */
import {Request} from "./request/Request";
import {mmApp} from "../core/mmApp";
import {IRequestSend} from "./interfaces/IRequest";

export class YandexRequest {
    /**
     * Отправка запроса.
     * @var request Отправка запроса.
     * @see Request Смотри тут
     */
    protected _request: Request;

    /**
     * Авторизационный токен.
     * @var oauth Авторизационный токен.
     * О том как получить авторизационный токен сказано тут:
     * @see (https://yandex.ru/dev/dialogs/alice/doc/resource-upload-docpage/#http-images-load__auth) Смотри тут
     */
    protected _oauth: string;
    /**
     * Текст с ошибкой
     * @var error Текст с ошибкой
     */
    protected _error: string;

    /**
     * YandexRequest constructor.
     * @param oauth Авторизационный токен для загрузки данных.
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
     * @param oauth Авторизационный токен для загрузки данных.
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
     * @param url Адрес запроса.
     * @return any
     * @api
     */
    public call(url: string = null): any {
        const data: IRequestSend = this._request.send(url);
        if (data.status) {
            if (typeof data.err !== 'undefined') {
                this._error = JSON.stringify(data.err);
            }
            return data.data;
        }
        this._log(data.err);
        return null;
    }

    /**
     * Сохранение логов
     *
     * @param error Текст ошибки
     * @api
     */
    protected _log(error: string): void {
        error = `\n${Date}Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`;
        mmApp.saveLog('YandexApi.log', error);
    }
}
