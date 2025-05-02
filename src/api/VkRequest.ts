import { Request } from './request/Request';
import { mmApp } from '../mmApp';
import {
    IVkApi,
    IVkDocSave,
    IVkParams,
    IVkParamsUsersGet,
    IVkPhotosSave,
    IVKSendMessage,
    IVkUploadFile,
    IVkUploadServer,
    IVkUsersGet,
    TVkDocType,
    TVkPeerId,
} from './interfaces';

/**
 * Класс для взаимодействия с API ВКонтакте.
 * Предоставляет методы для отправки сообщений, загрузки файлов и работы с другими функциями API.
 * 
 * Официальная документация VK API для ботов:
 * @see https://vk.com/dev/bots_docs
 * 
 * @class VkRequest
 */
export class VkRequest {
    /**
     * Версия VK API по умолчанию 5.103
     * @type {string}
     * @readonly
     */
    protected readonly VK_API_VERSION = '5.103';

    /**
     * Базовый URL для всех методов VK API
     * @type {string}
     * @readonly
     */
    protected readonly VK_API_ENDPOINT = 'https://api.vk.com/method/';

    /**
     * Текущая используемая версия VK API
     * @type {string}
     * @private
     */
    protected _vkApiVersion: string;

    /**
     * Экземпляр класса для выполнения HTTP-запросов
     * @type {Request}
     * @private
     */
    protected _request: Request;

    /**
     * Текст последней возникшей ошибки
     * @type {string | null}
     * @private
     */
    protected _error: string | null;

    /**
     * Токен доступа к VK API
     * @type {string | null}
     * @public
     */
    public token: string | null;

    /**
     * Флаг, указывающий, передается ли содержимое файла напрямую
     * @type {boolean}
     * @public
     * @default false
     */
    public isAttachContent: boolean;

    /**
     * Создает экземпляр класса VkRequest.
     * Инициализирует параметры запросов и устанавливает токен из конфигурации приложения, если он доступен.
     */
    public constructor() {
        this._request = new Request();
        this._request.maxTimeQuery = 5500;
        this.isAttachContent = false;
        if (mmApp.params.vk_api_version) {
            this._vkApiVersion = mmApp.params.vk_api_version;
        } else {
            this._vkApiVersion = this.VK_API_VERSION;
        }
        this.token = null;
        this._error = null;
        if (mmApp.params.vk_token) {
            this.initToken(mmApp.params.vk_token);
        }
    }

    /**
     * Инициализирует токен доступа к VK API.
     * 
     * @param {string} token - Токен доступа к VK API
     */
    public initToken(token: string): void {
        this.token = token;
    }

    /**
     * Выполняет вызов метода VK API.
     * 
     * @template T - Тип ответа, наследующий интерфейс IVkApi
     * @param {string} method - Название метода VK API
     * @returns {Promise<T | null>} Результат выполнения метода или null в случае ошибки
     */
    public async call<T extends IVkApi>(method: string): Promise<T | null> {
        if (this.token) {
            this._request.header = null;
            this._request.post.access_token = this.token;
            this._request.post.v = this._vkApiVersion;
            const data = await this._request.send<T>(this.VK_API_ENDPOINT + method);
            if (data.status && data.data) {
                this._error = JSON.stringify(data.err || []);
                if (typeof data.data.error !== 'undefined') {
                    this._error = JSON.stringify(data.data.error);
                    this._log();
                    return null;
                }
                return (data.data.response as T) || data.data;
            }
            this._log(data.err);
        } else {
            this._log('Не указан vk токен!');
        }
        return null;
    }

    /**
     * Загружает файл на сервера ВКонтакте.
     * 
     * @param {string} url - URL для загрузки файла
     * @param {string} file - Путь к файлу или его содержимое (зависит от флага isAttachContent)
     * @returns {Promise<IVkUploadFile | null>} Информация о загруженном файле или null в случае ошибки
     * 
     * Возвращает объект с одной из следующих структур:
     * 1. Для фотографий:
     * ```typescript
     * {
     *   photo: string[],
     *   server: string,
     *   hash: string
     * }
     * ```
     * 
     * 2. Для других типов файлов:
     * ```typescript
     * {
     *   file: string[]
     * }
     * ```
     */
    public async upload(url: string, file: string): Promise<IVkUploadFile | null> {
        this._request.attach = file;
        this._request.isAttachContent = this.isAttachContent;
        this._request.header = Request.HEADER_FORM_DATA;
        const data = await this._request.send<IVkUploadFile>(url);
        if (data.status && data.data) {
            if (typeof data.data.error !== 'undefined') {
                this._error = JSON.stringify(data.data.error);
                this._log();
                return null;
            }
            return data.data;
        }
        this._log(data.err);
        return null;
    }

    /**
     * Отправляет сообщение пользователю или в чат.
     * 
     * @param {TVkPeerId} peerId - Идентификатор получателя:
     *                             - Для пользователя: ID пользователя (например, "12345")
     *                             - Для чата: 2000000000 + chat_id (например, "2000000001")
     *                             - Для сообщества: -ID сообщества (например, "-12345")
     * @param {string} message - Текст сообщения
     * @param {IVkParams | null} params - Дополнительные параметры отправки:
     *                                    - random_id: уникальный идентификатор для избежания повторной отправки
     *                                    - attachment: медиавложения в формате "<тип><owner_id>_<media_id>"
     *                                    - keyboard: клавиатура в JSON формате
     *                                    - и другие параметры из документации VK API
     * @returns {Promise<IVKSendMessage | null>} Информация об отправленном сообщении или null в случае ошибки
     */
    public async messagesSend(
        peerId: TVkPeerId,
        message: string,
        params: IVkParams | null = null,
    ): Promise<IVKSendMessage | null> {
        const method = 'messages.send';
        this._request.post = {
            peer_id: peerId,
            message,
        };

        if (typeof peerId !== 'number') {
            this._request.post.domain = peerId;
            delete this._request.post.peer_id;
        }
        if (params) {
            if (typeof params.random_id !== 'undefined') {
                this._request.post.random_id = params.random_id;
            } else {
                this._request.post.random_id = Date.now();
            }

            if (typeof params.attachments !== 'undefined') {
                this._request.post.attachment = params.attachments.join(',');
                delete params.attachments;
            }

            if (typeof params.template !== 'undefined') {
                if (typeof params.template !== 'string') {
                    params.template = JSON.stringify(params.template);
                }
                this._request.post.template = params.template;
                delete params.template;
            }

            if (typeof params.keyboard !== 'undefined') {
                if (typeof this._request.post.template !== 'undefined') {
                    await this.call<IVKSendMessage>(method);
                    delete this._request.post.template;
                }
                if (typeof params.keyboard !== 'string') {
                    params.template = JSON.stringify(params.keyboard);
                }
                this._request.post.keyboard = params.keyboard;
                delete params.keyboard;
            }

            if (Object.keys(params).length) {
                this._request.post = { ...params, ...this._request.post };
            }
        }
        return await this.call(method);
    }

    /**
     * Получает информацию о пользователе или списке пользователей.
     * 
     * @param {TVkPeerId | string[]} userId - ID пользователя или массив ID пользователей
     * @param {IVkParamsUsersGet | null} params - Дополнительные параметры запроса:
     *                                            - fields: список дополнительных полей
     *                                            - name_case: падеж для склонения имени и фамилии
     * @returns {Promise<IVkUsersGet | null>} Информация о пользователе(ях) или null в случае ошибки
     */
    public async usersGet(
        userId: TVkPeerId | string[],
        params: IVkParamsUsersGet | null = null,
    ): Promise<IVkUsersGet | null> {
        if (typeof userId !== 'number') {
            this._request.post = { user_ids: userId };
        } else {
            this._request.post = { user_id: userId };
        }
        if (params) {
            this._request.post = { ...this._request.post, ...params };
        }
        return this.call<IVkUsersGet>('users.get');
    }

    /**
     * Получает адрес сервера для загрузки фотографий в сообщения.
     * 
     * @param {TVkPeerId} peerId - Идентификатор назначения (пользователь/чат/сообщество)
     * @returns {Promise<IVkUploadServer | null>} URL и параметры для загрузки или null в случае ошибки
     */
    public async photosGetMessagesUploadServer(peerId: TVkPeerId): Promise<IVkUploadServer | null> {
        this._request.post = { peer_id: peerId };
        return this.call<IVkUploadServer>('photos.getMessagesUploadServer');
    }

    /**
     * Сохраняет фотографию после успешной загрузки.
     * 
     * @param {string} photo - Параметр photo, полученный после загрузки
     * @param {string} server - ID сервера, полученный после загрузки
     * @param {string} hash - Хэш, полученный после загрузки
     * @returns {Promise<IVkPhotosSave | null>} Информация о сохраненной фотографии или null в случае ошибки
     */
    public async photosSaveMessagesPhoto(
        photo: string,
        server: string,
        hash: string,
    ): Promise<IVkPhotosSave | null> {
        this._request.post = {
            photo,
            server,
            hash,
        };
        return this.call<IVkPhotosSave>('photos.saveMessagesPhoto');
    }

    /**
     * Получает адрес сервера для загрузки документов в сообщения.
     * 
     * @param {TVkPeerId} peerId - Идентификатор назначения (пользователь/чат/сообщество)
     * @param {TVkDocType} type - Тип документа (doc, audio_message, graffiti)
     * @returns {Promise<IVkUploadServer | null>} URL и параметры для загрузки или null в случае ошибки
     */
    public async docsGetMessagesUploadServer(
        peerId: TVkPeerId,
        type: TVkDocType,
    ): Promise<IVkUploadServer | null> {
        this._request.post = {
            peer_id: peerId,
            type,
        };
        return this.call<IVkUploadServer>('docs.getMessagesUploadServe');
    }

    /**
     * Сохраняет документ после успешной загрузки.
     * 
     * @param {string} file - Параметр file, полученный после загрузки
     * @param {string} title - Название документа
     * @param {string | null} tags - Теги для поиска
     * @returns {Promise<IVkDocSave | null>} Информация о сохраненном документе или null в случае ошибки
     */
    public async docsSave(
        file: string,
        title: string,
        tags: string | null = null,
    ): Promise<IVkDocSave | null> {
        this._request.post = {
            file,
            title,
        };
        if (tags) {
            this._request.post.tags = tags;
        }
        return this.call<IVkDocSave>('docs.save');
    }

    /**
     * Записывает информацию об ошибках в лог-файл VkApi.log.
     * 
     * @param {string} error - Текст ошибки для логирования
     * @protected
     */
    protected _log(error: string = ''): void {
        error = `\n(${Date}): Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`;
        mmApp.saveLog('vkApi.log', error);
    }
}
