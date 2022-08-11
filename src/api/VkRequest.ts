import {Request} from "./request/Request";
import {mmApp} from "../core/mmApp";
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
    TVkPeerId
} from "./interfaces/IVkApi";

/**
 * Класс отвечающий за отправку запросов на Vk сервер.
 *
 * Документация по ВК api.
 * @see (https://vk.com/dev/bots_docs) Смотри тут
 *
 * @class VkRequest
 */
export class VkRequest {
    /**
     * @const string Стандартная версия Api.
     */
    protected readonly VK_API_VERSION = '5.103';
    /**
     * @const string Адрес, на который будут отправляться запросы.
     */
    protected readonly VK_API_ENDPOINT = 'https://api.vk.com/method/';

    /**
     * Используемая версия Api.
     */
    protected _vkApiVersion: string;
    /**
     * Отправка запросов.
     * @see Request Смотри тут
     */
    protected _request: Request;
    /**
     * Текст ошибки.
     */
    protected _error: string | null;

    /**
     * Vk токен, необходимый для отправки запросов на сервер.
     */
    public token: string | null;
    /**
     * Тип контента файла.
     * True, если передается содержимое файла. По умолчанию: false.
     */
    public isAttachContent: boolean;

    /**
     * VkRequest constructor.
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
     * Установить vk токен.
     *
     * @param {string} token Токен для загрузки данных на сервер.
     * @api
     */
    public initToken(token: string): void {
        this.token = token;
    }

    /**
     * Вызов методов vk.
     *
     * @param {string} method Название метода.
     * @return Promise<any>
     * @api
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
                return data.data.response as T || data.data;
            }
            this._log(data.err);
        } else {
            this._log('Не указан vk токен!');
        }
        return null;
    }

    /**
     * Загрузка файлов на vk сервер.
     *
     * @param {string} url Адрес, на который отправляется запрос.
     * @param {string} file Загружаемый файл(ссылка или содержимое файла).
     * @return Promise<IVkUploadFile>
     * [
     *  - 'photo' => array
     *  - 'server' => string
     *  - 'hash' => string
     * ]
     * or
     * [
     *  - 'file' => array
     * ]
     * @api
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
     * Отправка сообщения пользователю.
     *
     * @param {TVkPeerId} peerId Идентификатор места назначения.
     * @param {string} message Текст сообщения.
     * @param {IVkParams} params Пользовательские параметры:
     * [
     * - integer user_id: User ID (by default — current user).
     * - integer random_id: Unique identifier to avoid resending the message.
     * - integer peer_id: Destination ID. "For user: 'User ID', e.g. '12345'. For chat: '2000000000' + 'chat_id', e.g. '2000000001'. For community: '- community ID', e.g. '-12345'. ".
     * - string domain: User's short address (for example, 'illarionov').
     * - integer chat_id: ID of conversation the message will relate to.
     * - array[integer] user_ids: IDs of message recipients (if new conversation shall be started).
     * - string message: (Required if 'attachments' is not set.) Text of the message.
     * - number lat: Geographical latitude of a check-in, in degrees (from -90 to 90).
     * - number long: Geographical longitude of a check-in, in degrees (from -180 to 180).
     * - string attachment: (Required if 'message' is not set.) List of objects attached to the message, separated by commas, in the following format: "<owner_id>_<media_id>", '' — Type of media attachment: 'photo' — photo, 'video' — video, 'audio' — audio, 'doc' — document, 'wall' — wall post, '<owner_id>' — ID of the media attachment owner. '<media_id>' — media attachment ID. Example: "photo100172_166443618".
     * - integer reply_to.
     * - array[integer] forward_messages: ID of forwarded messages, separated with a comma. Listed messages of the sender will be shown in the message body at the recipient's. Example: "123,431,544".
     * - string forward.
     * - integer sticker_id: Sticker id.
     * - integer group_id: Group ID (for group messages with group access token).
     * - string keyboard.
     * - string payload.
     * - boolean dont_parse_links.
     * - boolean disable_mentions.
     * ]
     * @return Promise<IVKSendMessage>
     * - int: response
     * or in user_ids
     * [[
     *  - 'peer_id' => int Идентификатор назначения
     *  - 'message_id' => int Идентификатор сообщения
     *  - 'error' => array
     * ]]
     * @api
     */
    public async messagesSend(peerId: TVkPeerId, message: string, params: IVkParams | null = null): Promise<IVKSendMessage | null> {
        const method = 'messages.send';
        this._request.post = {
            peer_id: peerId,
            message
        };

        if (typeof peerId !== "number") {
            this._request.post.domain = peerId;
            delete this._request.post.peer_id;
        }
        if (params) {
            if (typeof params.random_id !== "undefined") {
                this._request.post.random_id = params.random_id;
            } else {
                this._request.post.random_id = Date.now();
            }

            if (typeof params.attachments !== "undefined") {
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
                this._request.post = {...params, ...this._request.post};
            }
        }
        return await this.call(method);
    }

    /**
     * Получение данные о пользователе.
     *
     * @param {TVkPeerId | string[]} userId Идентификатор пользователя.
     * @param {IVkParamsUsersGet} params Пользовательские параметры:
     * [
     * - array[string] user_ids: User IDs or screen names ('screen_name'). By default, current user ID.
     * - array fields: Profile fields to return. Sample values: 'nickname', 'screen_name', 'sex', 'bdate' (birthdate), 'city', 'country', 'timezone', 'photo', 'photo_medium', 'photo_big', 'has_mobile', 'contacts', 'education', 'online', 'counters', 'relation', 'last_seen', 'activity', 'can_write_private_message', 'can_see_all_posts', 'can_post', 'universities'.
     * - string name_case: Case for declension of user name and surname: 'nom' — nominative (default), 'gen' — genitive , 'dat' — dative, 'acc' — accusative , 'ins' — instrumental , 'abl' — prepositional.
     * ]
     * @return Promise<IVkUsersGet>
     * [
     *  - 'id' => int Идентификатор пользователя
     *  - 'first_name' => string Имя пользователя
     *  - 'last_name' => string Фамилия пользователя
     *  - 'deactivated' => string Возвращается, если страница удалена или заблокирована
     *  - 'is_closed' => bool Скрыт ли профиль настройками приватности
     *  - 'can_access_closed' => bool Может ли текущий пользователь видеть профиль при is_closed = 1 (например, он есть в друзьях).
     * ]
     * @api
     */
    public usersGet(userId: TVkPeerId | string[], params: IVkParamsUsersGet | null = null): Promise<IVkUsersGet | null> {
        if (typeof userId !== 'number') {
            this._request.post = {user_ids: userId};
        } else {
            this._request.post = {user_id: userId};
        }
        if (params) {
            this._request.post = {...this._request.post, ...params};
        }
        return this.call<IVkUsersGet>('users.get');
    }

    /**
     * Получение данные по загрузке изображения на vk сервер.
     *
     * @param {TVkPeerId} peerId Идентификатор места назначения.
     * @return Promise<IVkUploadServer>
     * [
     *  - 'upload_url' => string Адрес сервера для загрузки изображения
     *  - 'album_id' => int Идентификатор альбома
     *  - 'group_id' => int Идентификатор сообщества
     * ]
     * @api
     */
    public photosGetMessagesUploadServer(peerId: TVkPeerId): Promise<IVkUploadServer | null> {
        this._request.post = {peer_id: peerId};
        return this.call<IVkUploadServer>('photos.getMessagesUploadServer');
    }

    /**
     * Сохранение файла на vk сервер.
     *
     * @param {string} photo Фотография.
     * @param {string} server Сервер.
     * @param {string} hash Хэш.
     * @return Promise<IVkPhotosSave>
     * [
     *  - 'id' => int Идентификатор изображения
     *  - 'pid' => int
     *  - 'aid' => int
     *  - 'owner_id' => int Идентификатор пользователя, загрузившего изображение
     *  - 'src' => string Расположение изображения
     *  - 'src_big' => string Расположение большой версии изображения
     *  - 'src_small' => string Расположение маленькой версии изображения
     *  - 'created' => int Дата загрузки изображения в unix time
     *  - 'src_xbig' => string Для изображений с большим разрешением
     *  - 'src_xxbig' => string Для изображений с большим разрешением
     * ]
     * @see upload() Смотри тут
     * @api
     */
    public photosSaveMessagesPhoto(photo: string, server: string, hash: string): Promise<IVkPhotosSave | null> {
        this._request.post = {
            photo,
            server,
            hash
        };
        return this.call<IVkPhotosSave>('photos.saveMessagesPhoto');
    }

    /**
     * Получение данные по загрузке файла на vk сервер.
     *
     * @param {TVkPeerId} peerId Идентификатор места назначения.
     * @param {TVkDocType} type ('doc' - Обычный документ, 'audio_message' - Голосовое сообщение, 'graffiti' - Граффити).
     * @return Promise<IVkUploadServer>
     * [
     *  - 'upload_url' => url Адрес сервера для загрузки документа
     * ]
     * @api
     */
    public docsGetMessagesUploadServer(peerId: TVkPeerId, type: TVkDocType): Promise<IVkUploadServer | null> {
        this._request.post = {
            peer_id: peerId,
            type
        };
        return this.call<IVkUploadServer>('docs.getMessagesUploadServe');
    }

    /**
     * Загрузка файла на vk сервер.
     *
     * @param {string} file Сам файл.
     * @param {string} title Заголовок файла.
     * @param {string} tags Теги, по которым будет осуществляться поиск.
     * @return Promise<IVkDocSave>
     * [
     *  - 'type' => string Тип загруженного документа
     *  - 'graffiti' => [
     *      - 'id' => int Идентификатор документа
     *      - 'owner_id' => int Идентификатор пользователя, загрузившего документ
     *      - 'url' => string Адрес документа, по которому его можно загрузить
     *      - 'width' => int Ширина изображения в px
     *      - 'height' => int Высота изображения в px
     *  ]
     * or
     *  - 'audio_message' => [
     *      - 'id' => int Идентификатор документа
     *      - 'owner_id' => int Идентификатор пользователя, загрузившего документ
     *      - 'duration' => int Длительность аудио сообщения в секундах
     *      - 'waveform' => int[] Массив значений для визуального отображения звука
     *      - 'link_ogg' => url .ogg файла
     *      - 'link_mp3' => url .mp3 файла
     *  ]
     * or
     *  - 'doc' =>[
     *      - 'id' => int Идентификатор документа
     *      - 'owner_id' => int Идентификатор пользователя, загрузившего документ
     *      - 'url' => string Адрес документа, по которому его можно загрузить
     *      - 'title' => string Название документа
     *      - 'size' => int Размер документа в байтах
     *      - 'ext' => string Расширение документа
     *      - 'date' => int Дата добавления в формате unix time
     *      - 'type' => int Тип документа. (1 - текстовый документ; 2 - архивы; 3 - gif; 4 - изображения; 5 - аудио; 6 - видео; 7 - электронные книги; 8 - неизвестно)
     *      - 'preview' => [ Информация для предварительного просмотра документа.
     *          - 'photo' => [Изображения для предпросмотра.
     *              - 'sizes' => array Массив копий изображения в разных размерах. Подробное описание структуры (https://vk.com/dev/objects/photo_sizes)
     *          ]
     *          or
     *          - 'graffiti' => [ Данные о граффити
     *              - 'src' => string url Документа с граффити
     *              - 'width' => int Ширина изображения в px
     *              - 'height' => int Высота изображения в px
     *          ]
     *          or
     *          - 'audio_message' => [ Данные об аудиосообщении
     *              - 'duration' => int Длительность аудио сообщения в секундах
     *              - 'waveform' => int[] Массив значений для визуального отображения звука
     *              - 'link_ogg' => url .ogg файла
     *              - 'link_mp3' => url .mp3 файла
     *          ]
     *      ]
     *  ]
     *  - 'id' => int Идентификатор документа
     *  - 'owner_id' => int Идентификатор пользователя, загрузившего документ
     *  - 'url' => string Адрес документа, по которому его можно загрузить (Для граффити и документа)
     *  - 'width' => int Ширина изображения в px (Для граффити)
     *  - 'height' => int Высота изображения в px (Для граффити)
     *  - 'duration' => int Длительность аудио сообщения в секундах(Для Голосового сообщения)
     *  - 'waleform' => int[] Массив значений для визуального отображения звука(Для Голосового сообщения)
     *  - 'link_ogg' => url .ogg файла(Для Голосового сообщения)
     *  - 'link_mp3' => url .mp3 файла(Для Голосового сообщения)
     * ]
     * @api
     */
    public docsSave(file: string, title: string, tags: string | null = null): Promise<IVkDocSave | null> {
        this._request.post = {
            file,
            title
        };
        if (tags) {
            this._request.post.tags = tags;
        }
        return this.call<IVkDocSave>('docs.save');
    }

    /**
     * Сохранение логов.
     *
     * @param {string} error Текст ошибки.
     */
    protected _log(error: string = ''): void {
        error = `\n(${Date}): Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`;
        mmApp.saveLog('vkApi.log', error);
    }
}
