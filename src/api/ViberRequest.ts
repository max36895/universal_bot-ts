import {Request} from "./request/Request";
import {mmApp} from "../core/mmApp";
import {
    IViberGetUserDetails,
    IViberParams,
    IViberRichMediaParams,
    IViberSender,
    IViberWebhookParams
} from "./interfaces/IViberApi";
import {IViberButton} from "../components/button/interfaces/IViberButton";
import {Text} from "../components/standard/Text";

/**
 * Класс отвечающий за отправку запросов на viber сервер.
 *
 * Документация по viber api.
 * @see (https://developers.viber.com/docs/api/rest-bot-api/) Смотри тут
 *
 * @class ViberRequest
 */
export class ViberRequest {
    /**
     * @const string: Адрес, на который отправляться запрос.
     */
    private readonly API_ENDPOINT = 'https://chatapi.viber.com/pa/';

    /**
     * Отправка запросов.
     * @see Request Смотри тут
     */
    protected _request: Request;
    /**
     * Ошибки при выполнении.
     */
    protected _error: string;

    /**
     * Авторизационный токен бота, необходимый для отправки данных.
     */
    public token: string;

    /**
     * ViberRequest constructor.
     */
    public constructor() {
        this._request = new Request();
        this.token = null;
        if (mmApp.params.viber_token) {
            this.initToken(mmApp.params.viber_token);
        }
    }

    /**
     * Установить токен.
     *
     * @param {string} token Токен необходимый для отправки данных на сервер.
     * @api
     */
    public initToken(token: string): void {
        this.token = token;
    }

    /**
     * Отвечает за отправку запросов на viber сервер.
     *
     * @param {string} method Название метода.
     * @return Promise<any>
     * @api
     */
    public async call(method: string): Promise<any> {
        if (this.token) {
            if (method) {
                this._request.header = {
                    'X-Viber-Auth-Token: ': this.token
                };
                this._request.post.min_api_version = mmApp.params.viber_api_version || 2;
                const data = (await this._request.send(this.API_ENDPOINT + method)).data;
                if (typeof data.failed_list !== 'undefined' && data.failed_list.length) {
                    this._error = JSON.stringify(data.failed_list);
                    this.log(data.status_message);
                }
                if (data.status === 0) {
                    return data;
                }
                const statusMessage = typeof data.status_message !== 'undefined' ? data.status_message : 'ok';
                if (statusMessage !== 'ok') {
                    this._error = '';
                    this.log(data.status_message);
                }
            }
        } else {
            this.log('Не указан viber токен!');
        }
        return null;
    }

    /**
     * Запрос будет получать сведения о конкретном пользователе Viber на основе его уникального идентификатора.
     * Этот запрос может быть отправлен дважды в течение 12 часов для каждого идентификатора пользователя.
     * @see (https://developers.viber.com/docs/api/rest-bot-api/#get-user-details) Смотри тут
     *
     * @param {string} id Уникальный идентификатор пользователя.
     * @return Promise<IViberGetUserDetails>
     * [
     *  - int status: Результат действия.
     *  - string status_message: Статус сообщения.
     *  - int message_token: Уникальный идентификатор сообщения.
     *  - array user: Информация о пользователе.
     *  [
     *      - string id: Уникальный идентификатор пользователя Viber.
     *      - string name: Имя пользователя Viber.
     *      - string avatar: URL-адрес аватара пользователя.
     *      - string country: Код страны пользователя.
     *      - string language: Язык телефона пользователя. Будет возвращен в соответствии с языком устройства.
     *      - string primary_device_os: Тип операционной системы и версия основного устройства пользователя.
     *      - int api_version: Версия Viber, установленная на основном устройстве пользователя.
     *      - string viber_version: Версия Viber, установленная на основном устройстве пользователя.
     *      - int mcc: Мобильный код страны.
     *      - int mnc: Код мобильной сети.
     *      - string device_type: Тип устройства пользователя.
     *  ]
     * ]
     * @api
     */
    public getUserDetails(id: string): Promise<IViberGetUserDetails> {
        this._request.post = {
            id
        };
        return this.call('get_user_details');
    }

    /**
     * Отправка сообщения пользователю.
     * Отправка сообщения пользователю будет возможна только после того, как пользователь подпишется на бота, отправив ему сообщение.
     * @see (https://developers.viber.com/docs/api/rest-bot-api/#send-message) Смотри тут
     *
     * @param {string} receiver Уникальный идентификатор пользователя Viber.
     * @param {IViberSender} sender Отправитель:
     * [
     *  - string name: Имя отправителя для отображения (Максимум 28 символов).
     *  - string avatar: URL-адрес Аватара отправителя (Размер аватара должен быть не более 100 Кб. Рекомендуется 720x720).
     * ]
     * @param {string} text Текст сообщения.
     * @param {IViberParams} params Дополнительные параметры:
     * [
     *  - string receiver: Уникальный идентификатор пользователя Viber.
     *  - string type: Тип сообщения. (Доступные типы сообщений: text, picture, video, file, location, contact, sticker, carousel content и url).
     *  - string sender Отправитель.
     *  - string tracking_data: Разрешить учетной записи отслеживать сообщения и ответы пользователя. Отправлено tracking_data значение будет передано обратно с ответом пользователя.
     *  - string min_api_version: Минимальная версия API, необходимая клиентам для этого сообщения (по умолчанию 1).
     *  - string text Текст сообщения. (Обязательный параметр).
     *  - string media: Url адрес отправляемого контента. Актуально при отправке файлов.
     *  - string thumbnail: URL-адрес изображения уменьшенного размера. Актуально при отправке файлов.
     *  - int size: Размер файла в байтах.
     *  - int duration: Продолжительность видео или аудио в секундах. Будет отображаться на приемнике.
     *  - string file_name: Имя файла. Актуально для type = file.
     *  - array contact: Контакты пользователя. Актуально для type = contact.
     *  [
     *      - string name: Имя контактного лица.
     *      - string phone_number: Номер телефона контактного лица.
     *  ]
     *  - array location: Координаты местоположения. Актуально для type = location.
     *  [
     *      - string lat: Координата lat.
     *      - string lon: Координата lon.
     *  ]
     *  - int sticker_id: Уникальный идентификатор стикера Viber. Актуально для type = sticker.
     * ]
     * @return Promise<any>
     * @api
     */
    public sendMessage(receiver: string, sender: IViberSender | string, text: string, params: IViberParams = null): Promise<any> {
        this._request.post.receiver = receiver;
        if (typeof sender !== 'string') {
            this._request.post.sender = sender;
        } else {
            this._request.post.sender = {
                name: sender
            };
        }
        this._request.post.text = text;
        this._request.post.type = 'text';
        if (params) {
            this._request.post = {...this._request.post, ...params};
        }
        return this.call('send_message');
    }

    /**
     * Установка webhook для vider.
     * @see (https://developers.viber.com/docs/api/rest-bot-api/#webhooks) Смотри тут
     *
     * @param {string} url Адрес webhook`а.
     * @param {IViberWebhookParams} params Дополнительные параметры.
     * @return Promise<any>
     * @api
     */
    public setWebhook(url: string, params: IViberWebhookParams = null): Promise<any> {
        if (url) {
            this._request.post = {
                url,
                event_types: [
                    'delivered',
                    'seen',
                    'failed',
                    'subscribed',
                    'unsubscribed',
                    'conversation_started'
                ],
                send_name: true,
                send_photo: true
            };
        } else {
            this._request.post = {
                url: ''
            };
        }
        if (params) {
            this._request.post = {...this._request.post, ...params};
        }
        return this.call('set_webhook');
    }

    /**
     * Отправка карточки пользователю.
     * @see (https://developers.viber.com/docs/api/rest-bot-api/#message-types) Смотри тут
     *
     * @param {string} receiver Уникальный идентификатор пользователя Viber.
     * @param {IViberButton} richMedia Отображаемые данные. Параметр 'Buttons'.
     * @param {IViberRichMediaParams} params Дополнительные параметры.
     * @return Promise<any>
     * @see sendMessage() Смотри тут
     * @api
     */
    public richMedia(receiver: string, richMedia: IViberButton[], params: IViberRichMediaParams = null): Promise<any> {
        this._request.post = {
            receiver,
            type: 'rich_media',
            rich_media: {
                Type: 'rich_media',
                ButtonsGroupColumns: 6,
                ButtonsGroupRows: richMedia.length,
                BgColor: '#FFFFFF',
                Buttons: richMedia
            }
        };
        if (params) {
            this._request.post = {...this._request.post, ...params};
        }
        return this.call('send_message');
    }

    /**
     * Отправить файл на сервер.
     *
     * @param {string} receiver Уникальный идентификатор пользователя Viber.
     * @param {string} file Ссылка на файл.
     * @param {IViberParams} params Дополнительные параметры.
     * @return Promise<any>
     * @see sendMessage() Смотри тут
     * @api
     */
    public sendFile(receiver: string, file: string, params: IViberParams = null): Promise<any> {
        this._request.post = {
            receiver
        };
        if (Text.isSayText(['http:\/\/', 'https:\/\/'], file)) {
            this._request.post.type = 'file';
            this._request.post.media = file;
            this._request.post.size = 10e4;
            this._request.post.file_name = Text.resize(file, 150);
            if (params) {
                this._request.post = {...this._request.post, ...params};
            }
            return this.call('send_message');
        }
        return null;
    }

    /**
     * Запись логов.
     *
     * @param {string} error Текст ошибки.
     */
    protected log(error: string): void {
        error = `\n(${Date}): Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`;
        mmApp.saveLog('viberApi.log', error);
    }
}
