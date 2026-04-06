import { IVkCard } from '../../VK/interfaces/IVkPlatform';

/**
 * Тип идентификатора получателя в VK
 * - string: для публичных страниц и групп
 * - number: для пользователей и чатов
 */
export type TVkPeerId = string | number;

/**
 * Тип документа в VK
 * - doc: обычный документ
 * - audio_message: голосовое сообщение
 * - graffiti: граффити
 */
export type TVkDocType = 'doc' | 'audio_message' | 'graffiti';

/**
 * Базовый интерфейс для ответов от VK API
 *
 * @example
 * ```ts
 * // Успешный ответ
 * const successResponse: IVkApi<{id: number}> = {
 *   response: { id: 123456789 }
 * };
 *
 * // Ответ с ошибкой
 * const errorResponse: IVkApi = {
 *   error: "Invalid request"
 * };
 * ```
 */
export interface IVkApi<T = Record<string, unknown> | unknown> {
    /**
     * Ошибка, если таковая имеется
     */
    error?: string;

    /**
     * Ответ от API
     */
    response?: T;
}

/**
 * Интерфейс для загрузки файла в VK
 *
 * @example
 * ```ts
 * const uploadFile: IVkUploadFile = {
 *   file: "/path/to/file.jpg",
 *   photo: "photo123456789_987654321",
 *   server: "123456",
 *   hash: "abcdef123456789"
 * };
 * ```
 */
export interface IVkUploadFile extends IVkApi {
    /**
     * Путь к файлу
     */
    file: string;

    /**
     * Путь к фотографии
     */
    photo: string;

    /**
     * Сервер для загрузки
     */
    server: string;

    /**
     * Хэш для проверки загрузки
     */
    hash: string;
}

/**
 * Интерфейс для параметров метода users.get в VK API
 *
 * @example
 * ```ts
 * const params: IVkParamsUsersGet = {
 *   user_ids: ["123456789", "durov"],
 *   fields: ["photo_200", "status", "online"],
 *   name_case: "nom"
 * };
 * ```
 */
export interface IVkParamsUsersGet {
    /**
     * ID пользователей или короткие адреса
     * По умолчанию - ID текущего пользователя
     */
    user_ids: string[];

    /**
     * Поля профиля для получения
     * Возможные значения: nickname, screen_name, sex, bdate, city, country, timezone, photo, photo_medium, photo_big, has_mobile, contacts, education, online, counters, relation, last_seen, activity, can_write_private_message, can_see_all_posts, can_post, universities
     */
    fields: string[];

    /**
     * Падеж для склонения имени и фамилии
     * nom - именительный (по умолчанию)
     * gen - родительный
     * dat - дательный
     * acc - винительный
     * ins - творительный
     * abl - предложный
     */
    name_case: string;
}

/**
 * Интерфейс для параметров метода messages.send в VK API
 *
 * @example
 * ```ts
 * // Отправка текстового сообщения
 * const textMessage: IVkParams = {
 *   peer_id: 123456789,
 *   message: "Hello, world!",
 *   random_id: 123456789
 * };
 *
 * // Отправка сообщения с вложениями
 * const messageWithAttachments: IVkParams = {
 *   peer_id: 123456789,
 *   attachments: ["photo123456789_987654321", "doc123456789_987654321"],
 *   random_id: 123456789
 * };
 *
 * // Отправка сообщения с клавиатурой
 * const messageWithKeyboard: IVkParams = {
 *   peer_id: 123456789,
 *   message: "Choose an option:",
 *   keyboard: {
 *     one_time: true,
 *     buttons: [
 *       [
 *         {
 *           action: {
 *             type: "text",
 *             label: "Button 1"
 *           }
 *         }
 *       ]
 *     ]
 *   },
 *   random_id: 123456789
 * };
 * ```
 */
export interface IVkParams {
    /**
     * ID пользователя
     * По умолчанию - текущий пользователь
     */
    user_id?: number;

    /**
     * Уникальный идентификатор для избежания повторной отправки сообщения
     */
    random_id?: number;

    /**
     * ID получателя
     * Для пользователя: ID пользователя
     * Для чата: 2000000000 + ID чата
     * Для сообщества: -ID сообщества
     */
    peer_id?: number;

    /**
     * Короткий адрес пользователя
     * Например, 'illarionov'
     */
    domain?: string;

    /**
     * ID беседы
     */
    chat_id?: number;

    /**
     * ID получателей сообщения.
     * Используется при создании новой беседы
     */
    user_ids?: number[];

    /**
     * Текст сообщения.
     * Обязателен, если не указаны вложения
     */
    message?: string;

    /**
     * Географическая широта
     * От -90 до 90 градусов
     */
    lat?: number;

    /**
     * Географическая долгота
     * От -180 до 180 градусов
     */
    long?: number;

    /**
     * Список вложений
     * Обязателен, если не указан текст сообщения
     * Формат: "<owner_id>_<media_id>"
     * Пример: "photo100172_166443618"
     */
    attachments?: string[];

    /**
     * ID сообщения, на которое отвечаем
     */
    reply_to?: number;

    /**
     * ID пересылаемых сообщений.
     * Разделяются запятой.
     * Пример: "123,431,544"
     */
    forward_messages?: number[];

    /**
     * Параметры пересылки
     */
    forward?: string;

    /**
     * ID стикера
     */
    sticker_id?: number;

    /**
     * ID группы.
     * Для сообщений от имени группы
     */
    group_id?: number;

    /**
     * Клавиатура
     */
    keyboard?: string | object;

    /**
     * Полезная нагрузка
     */
    payload?: string;

    /**
     * Отключить разбор ссылок
     */
    dont_parse_links?: boolean;

    /**
     * Отключить упоминания
     */
    disable_mentions?: boolean;

    /**
     * Шаблон сообщения
     */
    template?: string[] | IVkCard | string;
}

/**
 * Интерфейс для идентификаторов пользователей
 *
 * @example
 * ```ts
 * const userIds: IVkUsersIds = {
 *   peer_id: 123456789,
 *   message_id: 987654321
 * };
 * ```
 */
export interface IVkUsersIds {
    /**
     * ID получателя
     */
    peer_id?: number;

    /**
     * ID сообщения
     */
    message_id?: number;

    /**
     * Ошибка, если таковая имеется
     */
    error?: unknown;
}

/**
 * Интерфейс для отправки сообщения в VK
 *
 * @example
 * ```ts
 * const sendMessage: IVKSendMessage = {
 *   response: 123456789,
 *   user_ids: [
 *     {
 *       peer_id: 123456789,
 *       message_id: 987654321
 *     }
 *   ]
 * };
 * ```
 */
export interface IVKSendMessage extends IVkApi<number> {
    /**
     * Массив идентификаторов пользователей
     */
    user_ids?: IVkUsersIds[];
}

/**
 * Интерфейс для информации о пользователе в VK
 *
 * @example
 * ```ts
 * const user: IVkUsersGet = {
 *   id: 123456789,
 *   first_name: "John",
 *   last_name: "Doe",
 *   is_closed: false,
 *   can_access_closed: true
 * };
 * ```
 */
export interface IVkUsersGet extends IVkApi {
    /**
     * ID пользователя
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
     * Статус страницы
     * Возвращается, если страница удалена или заблокирована
     */
    deactivated?: string;

    /**
     * Скрыт ли профиль настройками приватности
     */
    is_closed: boolean;

    /**
     * Может ли текущий пользователь видеть профиль
     * Актуально при is_closed = 1
     */
    can_access_closed: boolean;
}

/**
 * Интерфейс для сервера загрузки фотографий в VK
 *
 * @example
 * ```ts
 * const uploadServer: IVkUploadServer = {
 *   response: {
 *     upload_url: "{UPLOAD_URL}",
 *     album_id: "123456789",
 *     group_id: "987654321"
 *   }
 * };
 * ```
 */
export interface IVkUploadServer extends IVkApi {
    /**
     * Адрес сервера для загрузки
     */
    upload_url: string;

    /**
     * ID альбома
     */
    album_id?: string;

    /**
     * ID сообщества
     */
    group_id?: string;
}

/**
 * Интерфейс для сохранения фотографии в VK
 *
 * @example
 * ```ts
 * const savedPhoto: IVkPhotosSave = {
 *   response: [{
 *     id: 123456789,
 *     pid: 987654321,
 *     aid: 123456,
 *     owner_id: 123456789,
 *     src: "/photo123456789_987654321",
 *     src_big: "/photo123456789_987654321_big",
 *     src_small: "/photo123456789_987654321_small",
 *     created: 1234567890,
 *     src_xbig: "/photo123456789_987654321_xbig",
 *     src_xxbig: "/photo123456789_987654321_xxbig"
 *   }]
 * };
 * ```
 */
export interface IVkPhotosSave extends IVkApi {
    /**
     * ID изображения
     */
    id: number;

    /**
     * ID изображения
     */
    pid: number;

    /**
     * ID альбома
     */
    aid: number;

    /**
     * ID владельца изображения
     */
    owner_id: number;

    /**
     * URL изображения
     */
    src: string;

    /**
     * URL большой версии изображения
     */
    src_big: string;

    /**
     * URL маленькой версии изображения
     */
    src_small: string;

    /**
     * Дата загрузки
     * Unix timestamp
     */
    created: number;

    /**
     * URL очень большой версии изображения
     */
    src_xbig: string;

    /**
     * URL максимально большой версии изображения
     */
    src_xxbig: string;
}

/**
 * Базовый интерфейс для информации о документе
 *
 * @example
 * ```ts
 * const docInfo: IVkDocInfo = {
 *   id: 123456789,
 *   owner_id: 987654321
 * };
 * ```
 */
interface IVkDocInfo {
    /**
     * ID документа
     */
    id: number;

    /**
     * ID владельца документа
     */
    owner_id: number;
}

/**
 * Интерфейс для информации о граффити
 *
 * @example
 * ```ts
 * const graffiti: IVkGraffiti = {
 *   id: 123456789,
 *   owner_id: 987654321,
 *   url: "/doc123456789_987654321",
 *   width: 800,
 *   height: 600
 * };
 * ```
 */
export interface IVkGraffiti extends IVkDocInfo {
    /**
     * URL документа
     */
    url: string;

    /**
     * Ширина изображения
     */
    width: number;

    /**
     * Высота изображения
     */
    height: number;
}

/**
 * Интерфейс для информации о голосовом сообщении
 *
 * @example
 * ```ts
 * const audioMessage: IVkAudioMessageInfo = {
 *   duration: 30,
 *   waleform: [0, 1, 2, 3, 4, 5],
 *   link_ogg: "{...}.ogg",
 *   link_mp3: "{...}.mp3"
 * };
 * ```
 */
export interface IVkAudioMessageInfo {
    /**
     * Длительность в секундах
     */
    duration: number;

    /**
     * Массив значений для визуализации звука
     */
    waleform: number[];

    /**
     * URL .ogg файла
     */
    link_ogg?: string;

    /**
     * URL .mp3 файла
     */
    link_mp3?: string;
}

/**
 * Интерфейс для голосового сообщения
 *
 * @example
 * ```ts
 * const audioMessage: IVkAudioMessage = {
 *   id: 123456789,
 *   owner_id: 987654321,
 *   duration: 30,
 *   waleform: [0, 1, 2, 3, 4, 5],
 *   link_ogg: "/audio_message123456789_987654321.ogg",
 *   link_mp3: "/audio_message123456789_987654321.mp3"
 * };
 * ```
 */
export interface IVkAudioMessage extends IVkDocInfo, IVkAudioMessageInfo {}

/**
 * Интерфейс для предпросмотра документа
 *
 * @example
 * ```ts
 * const preview: IVkPreview = {
 *   photo: [
 *     "/photo123456789_987654321_s",
 *     "/photo123456789_987654321_m",
 *     "/photo123456789_987654321_x"
 *   ],
 *   graffiti: {
 *     src: "/graffiti123456789_987654321",
 *     width: 800,
 *     height: 600
 *   },
 *   audio_message: {
 *     duration: 30,
 *     waleform: [0, 1, 2, 3, 4, 5],
 *     link_ogg: "/audio_message123456789_987654321.ogg",
 *     link_mp3: "/audio_message123456789_987654321.mp3"
 *   }
 * };
 * ```
 */
export interface IVkPreview {
    /**
     * Массив копий изображения
     * Подробное описание структуры см в документации
     * @see https://vk.ru/dev/objects/photo_sizes
     */
    photo?: string[];

    /**
     * Данные о граффити
     */
    graffiti?: {
        /**
         * URL документа с граффити
         */
        src: string;

        /**
         * Ширина изображения
         */
        width: number;

        /**
         * Высота изображения
         */
        height: number;
    };

    /**
     * Данные о голосовом сообщении
     */
    audio_message?: IVkAudioMessageInfo;
}

/**
 * Интерфейс для документа
 *
 * @example
 * ```ts
 * const doc: IVKDoc = {
 *   id: 123456789,
 *   owner_id: 987654321,
 *   url: "/doc123456789_987654321",
 *   title: "document.pdf",
 *   size: 1024,
 *   ext: "pdf",
 *   date: 1234567890,
 *   type: 1,
 *   preview: {
 *     photo: [
 *       "/photo123456789_987654321_s",
 *       "/photo123456789_987654321_m",
 *       "/photo123456789_987654321_x"
 *     ]
 *   }
 * };
 * ```
 */
export interface IVKDoc extends IVkDocInfo {
    /**
     * URL документа
     */
    url: string;

    /**
     * Название документа
     */
    title: string;

    /**
     * Размер в байтах
     */
    size: number;

    /**
     * Расширение файла
     */
    ext: string;

    /**
     * Дата добавления
     * Unix timestamp
     */
    date: number;

    /**
     * Тип документа
     * 1 - текстовый документ
     * 2 - архивы
     * 3 - gif
     * 4 - изображения
     * 5 - аудио
     * 6 - видео
     * 7 - электронные книги
     * 8 - неизвестно
     */
    type: number;

    /**
     * Данные для предпросмотра
     */
    preview: IVkPreview;
}

/**
 * Интерфейс для сохранения документа
 *
 * @example
 * ```ts
 * const savedDoc: IVkDocSave = {
 *   response: {
 *     type: "doc",
 *     id: 123456789,
 *     owner_id: 987654321,
 *     url: "/doc123456789_987654321",
 *     title: "document.pdf",
 *     size: 1024,
 *     ext: "pdf",
 *     date: 1234567890,
 *     type: 1,
 *     preview: {
 *       photo: [
 *         "/photo123456789_987654321_s",
 *         "/photo123456789_987654321_m",
 *         "/photo123456789_987654321_x"
 *       ]
 *     }
 *   }
 * };
 * ```
 */
export interface IVkDocSave extends IVkDocInfo, IVkApi {
    /**
     * Тип документа
     */
    type: TVkDocType;

    /**
     * Данные о граффити
     */
    graffiti?: IVkGraffiti;

    /**
     * Данные о голосовом сообщении
     */
    audio_message?: IVkAudioMessage;

    /**
     * Данные о документе
     */
    doc?: IVKDoc;

    /**
     * ID документа
     */
    id: number;

    /**
     * URL документа
     * Для граффити и документа
     */
    url: string;

    /**
     * Ширина изображения
     * Для граффити
     */
    width?: number;

    /**
     * Высота изображения
     * Для граффити
     */
    height?: number;

    /**
     * Длительность в секундах
     * Для голосового сообщения
     */
    duration?: number;

    /**
     * Массив значений для визуализации звука
     * Для голосового сообщения
     */
    waleform?: number[];

    /**
     * URL .ogg файла
     * Для голосового сообщения
     */
    link_ogg?: string;

    /**
     * URL .mp3 файла
     * Для голосового сообщения
     */
    link_mp3?: string;
}
