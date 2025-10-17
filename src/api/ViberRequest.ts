import { Request } from './request/Request';
import {
    IViberApi,
    IViberGetUserDetails,
    IViberParams,
    IViberRichMediaParams,
    IViberSender,
    IViberWebhookParams,
} from './interfaces';
import { IViberButton } from '../components/button/interfaces';
import { Text } from '../utils/standard/Text';
import { AppContext } from '../core/AppContext';

/**
 * Класс для взаимодействия с API Viber
 * Предоставляет методы для отправки сообщений, файлов и других типов контента
 * @see (https://developers.viber.com/docs/api/rest-bot-api/) Смотри тут
 */
export class ViberRequest {
    /**
     * Базовый URL для всех методов Viber API
     * @private
     */
    private readonly API_ENDPOINT = 'https://chatapi.viber.com/pa/';

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
     * Токен доступа к Viber API
     */
    public token: string | null;

    /**
     * Контекст приложения.
     */
    protected _appContext: AppContext;

    /**
     * Создает экземпляр класса для работы с API Viber
     * Устанавливает токен из конфигурации приложения, если он доступен
     */
    public constructor(appContext: AppContext) {
        this._request = new Request(appContext);
        this.token = null;
        this._error = null;
        this._appContext = appContext;
        if (appContext.platformParams.viber_token) {
            this.initToken(appContext.platformParams.viber_token);
        }
        this._request.post = {};
    }

    /**
     * Инициализирует токен доступа к Viber API
     * @param token Токен для доступа к API
     */
    public initToken(token: string): void {
        this.token = token;
    }

    /**
     * Отправляет запрос к Viber API
     * @param method Название метода API
     * @returns Результат выполнения метода или null при ошибке
     */
    public async call<T extends IViberApi>(method: string): Promise<T | null> {
        if (this.token) {
            if (method) {
                this._request.header = {
                    'X-Viber-Auth-Token': this.token,
                };
                this._request.post.min_api_version =
                    this._appContext.platformParams.viber_api_version || 2;
                const data = (await this._request.send<IViberApi>(this.API_ENDPOINT + method)).data;
                if (data) {
                    if (typeof data.failed_list !== 'undefined' && data.failed_list.length) {
                        this._error = JSON.stringify(data.failed_list);
                        this._log(data.status_message);
                    }
                    if (data.status === 0) {
                        return data as T;
                    }
                    const statusMessage =
                        typeof data.status_message !== 'undefined' ? data.status_message : 'ok';
                    if (statusMessage !== 'ok') {
                        this._error = '';
                        this._log(data.status_message);
                    }
                }
            }
        } else {
            this._log('Не указан viber токен!');
        }
        return null;
    }

    /**
     * Получает информацию о пользователе Viber
     * Запрос можно отправлять не более 2 раз в течение 12 часов для каждого пользователя
     * @param id Уникальный идентификатор пользователя
     * @returns Информация о пользователе или null при ошибке
     *
     * Возвращаемые данные:
     * - id: уникальный идентификатор
     * - name: имя пользователя
     * - avatar: URL аватара
     * - country: код страны
     * - language: язык устройства
     * - primary_device_os: ОС устройства
     * - api_version: версия API
     * - viber_version: версия Viber
     * - mcc: код страны
     * - mnc: код сети
     * - device_type: тип устройства
     */
    public getUserDetails(id: string): Promise<IViberGetUserDetails | null> {
        this._request.post = {
            id,
        };
        return this.call<IViberGetUserDetails>('get_user_details');
    }

    /**
     * Отправляет сообщение пользователю
     * Сообщение можно отправить только после того, как пользователь подпишется на бота
     * @param receiver ID пользователя Viber
     * @param sender Информация об отправителе:
     * - name: имя (до 28 символов)
     * - avatar: URL аватара (до 100 Кб, 720x720)
     * @param text Текст сообщения
     * @param params Дополнительные параметры:
     * - type: тип сообщения (text, picture, video, file, location, contact, sticker, carousel, url)
     * - tracking_data: данные для отслеживания
     * - min_api_version: минимальная версия API
     * - media: URL контента
     * - thumbnail: URL превью
     * - size: размер файла
     * - duration: длительность видео/аудио
     * - file_name: имя файла
     * - contact: контактная информация
     * - location: координаты
     * - sticker_id: ID стикера
     * @returns Результат отправки или null при ошибке
     */
    public sendMessage(
        receiver: string,
        sender: IViberSender | string,
        text: string,
        params: IViberParams | null = null,
    ): Promise<IViberApi | null> {
        this._request.post.receiver = receiver;
        if (typeof sender !== 'string') {
            this._request.post.sender = sender;
        } else {
            this._request.post.sender = {
                name: sender,
            };
        }
        this._request.post.text = text;
        this._request.post.type = 'text';
        if (params) {
            this._request.post = { ...this._request.post, ...params };
        }
        return this.call<IViberApi>('send_message');
    }

    /**
     * Устанавливает webhook для получения событий
     * @param url URL для получения событий
     * @param params Дополнительные параметры:
     * - event_types: типы событий
     * - send_name: отправлять имя
     * - send_photo: отправлять фото
     * @returns Результат установки или null при ошибке
     */
    public setWebhook(
        url: string,
        params: IViberWebhookParams | null = null,
    ): Promise<IViberApi | null> {
        if (url) {
            this._request.post = {
                url,
                event_types: [
                    'delivered',
                    'seen',
                    'failed',
                    'subscribed',
                    'unsubscribed',
                    'conversation_started',
                ],
                send_name: true,
                send_photo: true,
            };
        } else {
            this._request.post = {
                url: '',
            };
        }
        if (params) {
            this._request.post = { ...this._request.post, ...params };
        }
        return this.call<IViberApi>('set_webhook');
    }

    /**
     * Отправляет карточку с кнопками
     * @param receiver ID пользователя Viber
     * @param richMedia Массив кнопок для отображения
     * @param params Дополнительные параметры:
     * - tracking_data: данные для отслеживания
     * - min_api_version: минимальная версия API
     * - alt_text: альтернативный текст
     * @returns Результат отправки или null при ошибке
     */
    public richMedia(
        receiver: string,
        richMedia: IViberButton[],
        params: IViberRichMediaParams | null = null,
    ): Promise<IViberApi | null> {
        this._request.post = {
            receiver,
            type: 'rich_media',
            rich_media: {
                Type: 'rich_media',
                ButtonsGroupColumns: 6,
                ButtonsGroupRows: richMedia.length,
                BgColor: '#FFFFFF',
                Buttons: richMedia,
            },
        };
        if (params) {
            this._request.post = { ...this._request.post, ...params };
        }
        return this.call<IViberApi>('send_message');
    }

    /**
     * Отправляет файл
     * @param receiver ID пользователя Viber
     * @param file Путь к файлу или его содержимое
     * @param params Дополнительные параметры:
     * - tracking_data: данные для отслеживания
     * - min_api_version: минимальная версия API
     * - file_name: имя файла
     * - size: размер файла
     * @returns Результат отправки или null при ошибке
     */
    public sendFile(
        receiver: string,
        file: string,
        params: IViberParams | null = null,
    ): Promise<IViberApi | null> | null {
        this._request.post = {
            receiver,
        };
        if (Text.isSayText(['http://', 'https://'], file)) {
            this._request.post.type = 'file';
            this._request.post.media = file;
            this._request.post.size = 10e4;
            this._request.post.file_name = Text.resize(file, 150);
            if (params) {
                this._request.post = { ...this._request.post, ...params };
            }
            return this.call<IViberApi>('send_message');
        }
        return null;
    }

    /**
     * Записывает информацию об ошибках в лог-файл
     * @param error Текст ошибки для логирования
     * @private
     */
    protected _log(error: string = ''): void {
        error = `\n(${Date}): Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`;
        this._appContext.saveLog('viberApi.log', error);
    }
}
