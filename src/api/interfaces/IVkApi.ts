export type TVkPeerId = string | number;
export type TVkDocType = 'doc' | 'audio_message' | 'graffiti';

export interface IVkApi<T = {}> {
    error?: string;
    response?: T;
}

export interface IVkUploadFile extends IVkApi {
    file: string;
    photo: string;
    server: string;
    hash: string;
}

export interface IVkParamsUsersGet {
    /**
     * User IDs or screen names ('screen_name'). By default, current user ID.
     */
    user_ids: string[];
    /**
     * Profile fields to return. Sample values: 'nickname', 'screen_name', 'sex', 'bdate' (birthdate), 'city', 'country', 'timezone', 'photo', 'photo_medium', 'photo_big', 'has_mobile', 'contacts', 'education', 'online', 'counters', 'relation', 'last_seen', 'activity', 'can_write_private_message', 'can_see_all_posts', 'can_post', 'universities'.
     */
    fields: string[];
    /**
     * Case for declension of user name and surname: 'nom' — nominative (default), 'gen' — genitive , 'dat' — dative, 'acc' — accusative , 'ins' — instrumental , 'abl' — prepositional.
     */
    name_case: string;
}

export interface IVkParams {
    /**
     * User ID (by default — current user).
     */
    user_id?: number;
    /**
     * Unique identifier to avoid resending the message.
     */
    random_id?: number;
    /**
     * Destination ID. "For user: 'User ID', e.g. '12345'. For chat: '2000000000' + 'chat_id', e.g. '2000000001'. For community: '- community ID', e.g. '-12345'. ".
     */
    peer_id?: number;
    /**
     * User's short address (for example, 'illarionov').
     */
    domain?: string;
    /**
     * ID of conversation the message will relate to.
     */
    chat_id?: number;
    /**
     * IDs of message recipients (if new conversation shall be started).
     */
    user_ids?: number[];
    /**
     * (Required if 'attachments' is not set.) Text of the message.
     */
    message?: string;
    /**
     * Geographical latitude of a check-in, in degrees (from -90 to 90).
     */
    lat?: number;
    /**
     * Geographical longitude of a check-in, in degrees (from -180 to 180).
     */
    long?: number;
    /**
     * (Required if 'message' is not set.) List of objects attached to the message, separated by commas, in the following format: "<owner_id>_<media_id>", '' — Type of media attachment: 'photo' — photo, 'video' — video, 'audio' — audio, 'doc' — document, 'wall' — wall post, '<owner_id>' — ID of the media attachment owner. '<media_id>' — media attachment ID. Example: "photo100172_166443618".
     */
    attachments?: string[];
    reply_to?: number;
    /**
     * ID of forwarded messages, separated with a comma. Listed messages of the sender will be shown in the message body at the recipient's. Example: "123,431,544".
     */
    forward_messages?: number[];
    forward?: string;
    /**
     * Sticker id.
     */
    sticker_id?: number;
    /**
     * Group ID (for group messages with group access token).
     */
    group_id?: number;
    keyboard?: string | object;
    payload?: string;
    dont_parse_links?: boolean;
    disable_mentions?: boolean;
    template?: any;
}

export interface IVkUsersIds {
    /**
     * Идентификатор назначения
     */
    peer_id?: number;
    /**
     * Идентификатор сообщения
     */
    message_id?: number;
    error?: any
}

export interface IVKSendMessage extends IVkApi<number> {
    user_ids?: IVkUsersIds[]
}

export interface IVkUsersGet extends IVkApi {
    /**
     * Идентификатор пользователя
     */
    id: number;
    /**
     * Имя пользователя
     */
    first_name: string;
    /**
     * Фамилия пользователя
     */
    last_name: string;
    /**
     * Возвращается, если страница удалена или заблокирована
     */
    deactivated?: string;
    /**
     * Скрыт ли профиль настройками приватности
     */
    is_closed: boolean;
    /**
     * Может ли текущий пользователь видеть профиль при is_closed = 1 (например, он есть в друзьях).
     */
    can_access_closed: boolean;
}

export interface IVkUploadServer extends IVkApi {
    /**
     * Адрес сервера для загрузки изображения
     */
    upload_url: string;
    /**
     * Идентификатор альбома
     */
    album_id?: string;
    /**
     * Идентификатор сообщества
     */
    group_id?: string;
}

export interface IVkPhotosSave extends IVkApi {
    /**
     * Идентификатор изображения
     */
    id: number;
    pid: number;
    aid: number;
    /**
     * Идентификатор пользователя, загрузившего изображение
     */
    owner_id: number;
    /**
     * Расположение изображения
     */
    src: string;
    /**
     * Расположение большой версии изображения
     */
    src_big: string;
    /**
     * Расположение маленькой версии изображения
     */
    src_small: string;
    /**
     * Дата загрузки изображения в unix time
     */
    created: number;
    /**
     * Для изображений с большим разрешением
     */
    src_xbig: string;
    /**
     * Для изображений с большим разрешением
     */
    src_xxbig: string;
}

interface IVkDocInfo {
    /**
     * Идентификатор документа
     */
    id: number;
    /**
     * Идентификатор пользователя, загрузившего документ
     */
    owner_id: number;
}

export interface IVkGraffiti extends IVkDocInfo {
    /**
     * Адрес документа, по которому его можно загрузить
     */
    url: string;
    /**
     * Ширина изображения в px
     */
    width: number;
    /**
     * Высота изображения в px
     */
    height: number;
}

export interface IVkAudioMessageInfo {
    /**
     * Длительность аудио сообщения в секундах
     */
    duration: number;
    /**
     * Массив значений для визуального отображения звука
     */
    waleform: number[];
    /**
     * .ogg файла
     */
    link_ogg?: string;
    /**
     * .mp3 файла
     */
    link_mp3?: string;
}

export interface IVkAudioMessage extends IVkDocInfo, IVkAudioMessageInfo {

}

export interface IVkPreview {
    /**
     * Массив копий изображения в разных размерах. Подробное описание структуры (https://vk.com/dev/objects/photo_sizes)
     */
    photo?: string[];
    /**
     * Данные о граффити
     */
    graffiti?: {
        /**
         * url Документа с граффити
         */
        src: string;
        /**
         * Ширина изображения в px
         */
        width: number;
        /**
         * Высота изображения в px
         */
        height: number;
    }
    /**
     * Данные об аудиосообщении
     */
    audio_message?: IVkAudioMessageInfo
}

export interface IVKDoc extends IVkDocInfo {
    /**
     * Адрес документа, по которому его можно загрузить
     */
    url: string;
    /**
     * Название документа
     */
    title: string;
    /**
     * Размер документа в байтах
     */
    size: number;
    /**
     * Расширение документа
     */
    ext: string;
    /**
     * Дата добавления в формате unix time
     */
    date: number;
    /**
     * Тип документа. (1 - текстовый документ; 2 - архивы; 3 - gif; 4 - изображения; 5 - аудио; 6 - видео; 7 - электронные книги; 8 - неизвестно)
     */
    type: number;
    preview: IVkPreview
}

export interface IVkDocSave extends IVkDocInfo, IVkApi {
    /**
     * Тип загруженного документа
     */
    type: TVkDocType;
    graffiti?: IVkGraffiti;
    audio_message?: IVkAudioMessage;
    doc?: IVKDoc;
    /**
     * Идентификатор документа
     */
    id: number;
    /**
     * Адрес документа, по которому его можно загрузить (Для граффити и документа)
     */
    url: string;
    /**
     * Ширина изображения в px (Для граффити)
     */
    width?: number;
    /**
     * Высота изображения в px (Для граффити)
     */
    height?: number;
    /**
     * Длительность аудио сообщения в секундах(Для Голосового сообщения)
     */
    duration?: number;
    /**
     * Массив значений для визуального отображения звука(Для Голосового сообщения)
     */
    waleform?: number[];
    /**
     * .ogg файла(Для Голосового сообщения)
     */
    link_ogg?: string;
    /**
     * .mp3 файла(Для Голосового сообщения)
     */
    link_mp3?: string;
}
