import { Request } from './request/Request';
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
import { AppContext } from '../core/AppContext';
import { httpBuildQuery } from '../utils';

/**
 * Класс для взаимодействия с API ВКонтакте
 * Предоставляет методы для отправки сообщений, загрузки файлов и работы с другими функциями API
 * @see (https://vk.ru/dev/bots_docs) Смотри тут
 *
 * @example
 * ```typescript
 * import { VkRequest } from './api/VkRequest';
 *
 * // Создание экземпляра
 * const vk = new VkRequest();
 * vk.initToken('your-vk-token');
 *
 * // Отправка простого сообщения
 * await vk.messagesSend(12345, 'Привет!');
 *
 * // Отправка сообщения с клавиатурой
 * const keyboard = {
 *   one_time: true,
 *   buttons: [[{
 *     action: {
 *       type: 'text',
 *       label: 'Кнопка',
 *       payload: '{"button": 1}'
 *     },
 *     color: 'primary'
 *   }]]
 * };
 *
 * await vk.messagesSend(12345, 'Выберите действие:', {
 *   keyboard: JSON.stringify(keyboard)
 * });
 *
 * // Загрузка и отправка фото
 * const server = await vk.photosGetMessagesUploadServer(12345);
 * if (server) {
 *   const upload = await vk.upload(server.upload_url, 'path/to/photo.jpg');
 *   if (upload) {
 *     const photo = await vk.photosSaveMessagesPhoto(
 *       upload.photo,
 *       upload.server,
 *       upload.hash
 *     );
 *     if (photo) {
 *       await vk.messagesSend(12345, 'Фото:', {
 *         attachments: [`photo${photo.owner_id}_${photo.id}`]
 *       });
 *     }
 *   }
 * }
 * ```
 */
export class VkRequest {
    /**
     * Версия VK API по умолчанию
     */
    protected readonly VK_API_VERSION = '5.103';

    /**
     * Базовый URL для всех методов VK API
     */
    protected readonly VK_API_ENDPOINT = 'https://api.vk.ru/method/';

    /**
     * Текущая используемая версия VK API
     * @private
     */
    protected _vkApiVersion: string;

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
     * Токен доступа к VK API
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
        this._request.header = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        this._request.maxTimeQuery = 5500;
        this.isAttachContent = false;
        this._appContext = appContext;
        if (appContext.platformParams.vk_api_version) {
            this._vkApiVersion = appContext.platformParams.vk_api_version;
        } else {
            this._vkApiVersion = this.VK_API_VERSION;
        }
        this.token = null;
        this._error = null;
        if (appContext.platformParams.vk_token) {
            this.initToken(appContext.platformParams.vk_token);
        }
    }

    /**
     * Инициализирует токен доступа к VK API
     * @param token Токен доступа к VK API
     */
    public initToken(token: string): void {
        this.token = token;
    }

    /**
     * Выполняет вызов метода VK API
     * @param method Название метода VK API
     * @returns Результат выполнения метода или null при ошибке
     */
    public async call<T extends IVkApi>(method: string): Promise<T | null> {
        if (this.token) {
            if (!this._request.attach) {
                // vk принимает post только в таком формате
                this._request.header = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                };
            }
            if (!this._request.post) {
                this._request.post = {};
            }
            this._request.post.access_token = this.token;
            this._request.post.v = this._vkApiVersion;
            if (!this._request.attach) {
                // vk принимает post только в таком формате
                this._request.post = httpBuildQuery(this._request.post);
            }
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
     * Загружает файл на сервера ВКонтакте
     * @param url URL для загрузки файла
     * @param file Путь к файлу или его содержимое
     * @returns Информация о загруженном файле или null при ошибке
     *
     * @remarks
     * Для фотографий возвращает:
     * - photo: строка, содержащая информацию о фото
     * - server: строка, идентификатор сервера
     * - hash: строка, хеш загруженного файла
     *
     * Для документов возвращает:
     * - file: строка, информация о загруженном файле
     *
     * @example
     * ```typescript
     * // Загрузка фото
     * const server = await vk.photosGetMessagesUploadServer(12345);
     * if (server) {
     *   const upload = await vk.upload(server.upload_url, 'photo.jpg');
     *   if (upload) {
     *     const photo = await vk.photosSaveMessagesPhoto(
     *       upload.photo,
     *       upload.server,
     *       upload.hash
     *     );
     *   }
     * }
     *
     * // Загрузка документа
     * const server = await vk.docsGetMessagesUploadServer(12345, 'doc');
     * if (server) {
     *   const upload = await vk.upload(server.upload_url, 'document.pdf');
     *   if (upload) {
     *     const doc = await vk.docsSave(
     *       upload.file,
     *       'Документ',
     *       'тег1,тег2'
     *     );
     *   }
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
     * Отправляет сообщение пользователю или в чат
     * @param peerId Идентификатор получателя:
     * - ID пользователя (например, "12345")
     * - ID чата: 2000000000 + chat_id (например, для чата 1: 2000000001)
     * - ID сообщества: -ID сообщества (например, "-123456789")
     * @param message Текст сообщения
     * @param params Дополнительные параметры:
     * - random_id: уникальный ID для избежания повторов
     * - attachment: медиавложения в формате "<type><owner_id>_<media_id>"
     *   Примеры:
     *   - Фото: "photo123456_789"
     *   - Документ: "doc123456_789"
     *   - Аудио: "audio123456_789"
     *   - Видео: "video123456_789"
     * - keyboard: клавиатура в JSON формате или строкой
     * - template: шаблон карусели в JSON формате или строкой
     *
     * @example
     * ```typescript
     * // Простое сообщение
     * await vk.messagesSend(12345, 'Привет!');
     *
     * // Сообщение с вложениями
     * await vk.messagesSend(12345, 'Фото:', {
     *   attachments: ['photo123_456', 'doc123_456']
     * });
     *
     * // Сообщение с клавиатурой
     * const keyboard = {
     *   one_time: true,
     *   buttons: [[{
     *     action: {
     *       type: 'text',
     *       label: 'Кнопка',
     *       payload: '{"button": 1}'
     *     },
     *     color: 'primary'
     *   }]]
     * };
     * await vk.messagesSend(12345, 'Выберите:', {
     *   keyboard: JSON.stringify(keyboard)
     * });
     *
     * // Сообщение с каруселью
     * const template = {
     *   type: 'carousel',
     *   elements: [{
     *     title: 'Заголовок',
     *     description: 'Описание',
     *     photo_id: '-123456_789',
     *     buttons: [{
     *       action: {
     *         type: 'text',
     *         label: 'Кнопка',
     *         payload: '{"button": 1}'
     *       }
     *     }]
     *   }]
     * };
     * await vk.messagesSend(12345, '', {
     *   template: JSON.stringify(template)
     * });
     * ```
     *
     * @returns Информация об отправленном сообщении или null при ошибке
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
                    // await this.call<IVKSendMessage>(method);
                    delete this._request.post.template;
                }
                if (typeof params.keyboard !== 'string') {
                    params.keyboard = JSON.stringify(params.keyboard);
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
     * Получает информацию о пользователе или списке пользователей
     * @param userId ID пользователя или массив ID
     * @param params Дополнительные параметры запроса
     * @returns Информация о пользователях или null при ошибке
     */
    public async usersGet(
        userId: TVkPeerId | string[],
        params: IVkParamsUsersGet | null = null,
    ): Promise<IVkUsersGet | null> {
        if (typeof userId === 'number') {
            this._request.post = { user_id: userId };
        } else {
            this._request.post = { user_ids: userId };
        }
        if (params) {
            this._request.post = { ...this._request.post, ...params };
        }
        return this.call<IVkUsersGet>('users.get');
    }

    /**
     * Получает URL для загрузки фотографий в сообщения
     * @param peerId ID получателя сообщения
     * @returns Данные для загрузки или null при ошибке
     */
    public async photosGetMessagesUploadServer(peerId: TVkPeerId): Promise<IVkUploadServer | null> {
        this._request.post = { peer_id: peerId };
        return this.call<IVkUploadServer>('photos.getMessagesUploadServer');
    }

    /**
     * Сохраняет загруженную фотографию в сообщениях
     * @param photo Идентификатор фотографии
     * @param server Идентификатор сервера
     * @param hash Хэш-сумма фотографии
     * @returns Информация о сохраненной фотографии или null при ошибке
     */
    public async photosSaveMessagesPhoto(
        photo: string,
        server: string,
        hash: string,
    ): Promise<IVkPhotosSave[] | null> {
        this._request.post = {
            photo,
            server,
            hash,
        };
        return this.call<IVkPhotosSave>('photos.saveMessagesPhoto') as unknown as IVkPhotosSave[];
    }

    /**
     * Получает URL для загрузки документов в сообщения
     * @param peerId ID получателя сообщения
     * @param type Тип документа:
     * - 'doc': обычный документ (PDF, ZIP и т.д.)
     * - 'audio_message': голосовое сообщение
     * - 'graffiti': граффити
     * @returns Данные для загрузки или null при ошибке
     *
     * @example
     * ```typescript
     * // Загрузка обычного документа
     * const server = await vk.docsGetMessagesUploadServer(12345, 'doc');
     *
     * // Загрузка голосового сообщения
     * const server = await vk.docsGetMessagesUploadServer(12345, 'audio_message');
     *
     * // Загрузка граффити
     * const server = await vk.docsGetMessagesUploadServer(12345, 'graffiti');
     * ```
     */
    public async docsGetMessagesUploadServer(
        peerId: TVkPeerId,
        type: TVkDocType,
    ): Promise<IVkUploadServer | null> {
        this._request.post = {
            peer_id: peerId,
            type,
        };
        return this.call<IVkUploadServer>('docs.getMessagesUploadServer');
    }

    /**
     * Сохраняет загруженный документ
     * @param file Идентификатор документа
     * @param title Название документа
     * @param tags Теги документа
     * @returns Информация о сохраненном документе или null при ошибке
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
     * Записывает информацию об ошибках в лог-файл
     * @param error Текст ошибки для логирования
     * @private
     */
    protected _log(error: string = ''): void {
        this._appContext.logError(
            `VkApi: (${new Date()}): Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`,
        );
    }
}
