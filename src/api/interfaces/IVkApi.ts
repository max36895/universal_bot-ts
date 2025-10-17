/**
 * Тип идентификатора получателя в VK
 * @typedef {(string | number)} TVkPeerId
 * - string: для публичных страниц и групп
 * - number: для пользователей и чатов
 */
export type TVkPeerId = string | number;

/**
 * Тип документа в VK
 * @typedef {('doc' | 'audio_message' | 'graffiti')} TVkDocType
 * - doc: обычный документ
 * - audio_message: голосовое сообщение
 * - graffiti: граффити
 */
export type TVkDocType = 'doc' | 'audio_message' | 'graffiti';

/**
 * Базовый интерфейс для ответов от VK API
 *
 * @example
 * ```typescript
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
     * @type {string}
     */
    error?: string;

    /**
     * Ответ от API
     * @type {T}
     */
    response?: T;
}

/**
 * Интерфейс для загрузки файла в VK
 *
 * @example
 * ```typescript
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
     * @type {string}
     */
    file: string;

    /**
     * Путь к фотографии
     * @type {string}
     */
    photo: string;

    /**
     * Сервер для загрузки
     * @type {string}
     */
    server: string;

    /**
     * Хэш для проверки загрузки
     * @type {string}
     */
    hash: string;
}

/**
 * Интерфейс для параметров метода users.get в VK API
 *
 * @example
 * ```typescript
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
     * @type {string[]}
     * По умолчанию - ID текущего пользователя
     */
    user_ids: string[];

    /**
     * Поля профиля для получения
     * @type {string[]}
     * Возможные значения: nickname, screen_name, sex, bdate, city, country, timezone, photo, photo_medium, photo_big, has_mobile, contacts, education, online, counters, relation, last_seen, activity, can_write_private_message, can_see_all_posts, can_post, universities
     */
    fields: string[];

    /**
     * Падеж для склонения имени и фамилии
     * @type {string}
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
 * ```typescript
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
     * @type {number}
     * По умолчанию - текущий пользователь
     */
    user_id?: number;

    /**
     * Уникальный идентификатор для избежания повторной отправки сообщения
     * @type {number}
     */
    random_id?: number;

    /**
     * ID получателя
     * @type {number}
     * Для пользователя: ID пользователя
     * Для чата: 2000000000 + ID чата
     * Для сообщества: -ID сообщества
     */
    peer_id?: number;

    /**
     * Короткий адрес пользователя
     * @type {string}
     * Например, 'illarionov'
     */
    domain?: string;

    /**
     * ID беседы
     * @type {number}
     */
    chat_id?: number;

    /**
     * ID получателей сообщения
     * @type {number[]}
     * Используется при создании новой беседы
     */
    user_ids?: number[];

    /**
     * Текст сообщения
     * @type {string}
     * Обязателен, если не указаны вложения
     */
    message?: string;

    /**
     * Географическая широта
     * @type {number}
     * От -90 до 90 градусов
     */
    lat?: number;

    /**
     * Географическая долгота
     * @type {number}
     * От -180 до 180 градусов
     */
    long?: number;

    /**
     * Список вложений
     * @type {string[]}
     * Обязателен, если не указан текст сообщения
     * Формат: "<owner_id>_<media_id>"
     * Пример: "photo100172_166443618"
     */
    attachments?: string[];

    /**
     * ID сообщения, на которое отвечаем
     * @type {number}
     */
    reply_to?: number;

    /**
     * ID пересылаемых сообщений
     * @type {number[]}
     * Разделяются запятой
     * Пример: "123,431,544"
     */
    forward_messages?: number[];

    /**
     * Параметры пересылки
     * @type {string}
     */
    forward?: string;

    /**
     * ID стикера
     * @type {number}
     */
    sticker_id?: number;

    /**
     * ID группы
     * @type {number}
     * Для сообщений от имени группы
     */
    group_id?: number;

    /**
     * Клавиатура
     * @type {string | object}
     */
    keyboard?: string | object;

    /**
     * Полезная нагрузка
     * @type {string}
     */
    payload?: string;

    /**
     * Отключить разбор ссылок
     * @type {boolean}
     */
    dont_parse_links?: boolean;

    /**
     * Отключить упоминания
     * @type {boolean}
     */
    disable_mentions?: boolean;

    /**
     * Шаблон сообщения
     * @type {any}
     */
    template?: any;
}

/**
 * Интерфейс для идентификаторов пользователей
 *
 * @example
 * ```typescript
 * const userIds: IVkUsersIds = {
 *   peer_id: 123456789,
 *   message_id: 987654321
 * };
 * ```
 */
export interface IVkUsersIds {
    /**
     * ID получателя
     * @type {number}
     */
    peer_id?: number;

    /**
     * ID сообщения
     * @type {number}
     */
    message_id?: number;

    /**
     * Ошибка, если таковая имеется
     * @type {any}
     */
    error?: any;
}

/**
 * Интерфейс для отправки сообщения в VK
 *
 * @example
 * ```typescript
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
     * @type {IVkUsersIds[]}
     */
    user_ids?: IVkUsersIds[];
}

/**
 * Интерфейс для информации о пользователе в VK
 *
 * @example
 * ```typescript
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
     * @type {number}
     */
    id: number;

    /**
     * Имя пользователя
     * @type {string}
     */
    first_name: string;

    /**
     * Фамилия пользователя
     * @type {string}
     */
    last_name: string;

    /**
     * Статус страницы
     * @type {string}
     * Возвращается, если страница удалена или заблокирована
     */
    deactivated?: string;

    /**
     * Скрыт ли профиль настройками приватности
     * @type {boolean}
     */
    is_closed: boolean;

    /**
     * Может ли текущий пользователь видеть профиль
     * @type {boolean}
     * Актуально при is_closed = 1
     */
    can_access_closed: boolean;
}

/**
 * Интерфейс для сервера загрузки фотографий в VK
 *
 * @example
 * ```typescript
 * const uploadServer: IVkUploadServer = {
 *   response: {
 *     upload_url: "https://upload.vk.ru/upload.php",
 *     album_id: "123456789",
 *     group_id: "987654321"
 *   }
 * };
 * ```
 */
export interface IVkUploadServer extends IVkApi {
    /**
     * Адрес сервера для загрузки
     * @type {string}
     */
    upload_url: string;

    /**
     * ID альбома
     * @type {string}
     */
    album_id?: string;

    /**
     * ID сообщества
     * @type {string}
     */
    group_id?: string;
}

/**
 * Интерфейс для сохранения фотографии в VK
 *
 * @example
 * ```typescript
 * const savedPhoto: IVkPhotosSave = {
 *   response: [{
 *     id: 123456789,
 *     pid: 987654321,
 *     aid: 123456,
 *     owner_id: 123456789,
 *     src: "https://vk.ru/photo123456789_987654321",
 *     src_big: "https://vk.ru/photo123456789_987654321_big",
 *     src_small: "https://vk.ru/photo123456789_987654321_small",
 *     created: 1234567890,
 *     src_xbig: "https://vk.ru/photo123456789_987654321_xbig",
 *     src_xxbig: "https://vk.ru/photo123456789_987654321_xxbig"
 *   }]
 * };
 * ```
 */
export interface IVkPhotosSave extends IVkApi {
    /**
     * ID изображения
     * @type {number}
     */
    id: number;

    /**
     * ID изображения
     * @type {number}
     */
    pid: number;

    /**
     * ID альбома
     * @type {number}
     */
    aid: number;

    /**
     * ID владельца изображения
     * @type {number}
     */
    owner_id: number;

    /**
     * URL изображения
     * @type {string}
     */
    src: string;

    /**
     * URL большой версии изображения
     * @type {string}
     */
    src_big: string;

    /**
     * URL маленькой версии изображения
     * @type {string}
     */
    src_small: string;

    /**
     * Дата загрузки
     * @type {number}
     * Unix timestamp
     */
    created: number;

    /**
     * URL очень большой версии изображения
     * @type {string}
     */
    src_xbig: string;

    /**
     * URL максимально большой версии изображения
     * @type {string}
     */
    src_xxbig: string;
}

/**
 * Базовый интерфейс для информации о документе
 *
 * @example
 * ```typescript
 * const docInfo: IVkDocInfo = {
 *   id: 123456789,
 *   owner_id: 987654321
 * };
 * ```
 */
interface IVkDocInfo {
    /**
     * ID документа
     * @type {number}
     */
    id: number;

    /**
     * ID владельца документа
     * @type {number}
     */
    owner_id: number;
}

/**
 * Интерфейс для информации о граффити
 *
 * @example
 * ```typescript
 * const graffiti: IVkGraffiti = {
 *   id: 123456789,
 *   owner_id: 987654321,
 *   url: "https://vk.ru/doc123456789_987654321",
 *   width: 800,
 *   height: 600
 * };
 * ```
 */
export interface IVkGraffiti extends IVkDocInfo {
    /**
     * URL документа
     * @type {string}
     */
    url: string;

    /**
     * Ширина изображения
     * @type {number}
     */
    width: number;

    /**
     * Высота изображения
     * @type {number}
     */
    height: number;
}

/**
 * Интерфейс для информации о голосовом сообщении
 *
 * @example
 * ```typescript
 * const audioMessage: IVkAudioMessageInfo = {
 *   duration: 30,
 *   waleform: [0, 1, 2, 3, 4, 5],
 *   link_ogg: "https://vk.ru/audio_message123456789_987654321.ogg",
 *   link_mp3: "https://vk.ru/audio_message123456789_987654321.mp3"
 * };
 * ```
 */
export interface IVkAudioMessageInfo {
    /**
     * Длительность в секундах
     * @type {number}
     */
    duration: number;

    /**
     * Массив значений для визуализации звука
     * @type {number[]}
     */
    waleform: number[];

    /**
     * URL .ogg файла
     * @type {string}
     */
    link_ogg?: string;

    /**
     * URL .mp3 файла
     * @type {string}
     */
    link_mp3?: string;
}

/**
 * Интерфейс для голосового сообщения
 *
 * @example
 * ```typescript
 * const audioMessage: IVkAudioMessage = {
 *   id: 123456789,
 *   owner_id: 987654321,
 *   duration: 30,
 *   waleform: [0, 1, 2, 3, 4, 5],
 *   link_ogg: "https://vk.ru/audio_message123456789_987654321.ogg",
 *   link_mp3: "https://vk.ru/audio_message123456789_987654321.mp3"
 * };
 * ```
 */
export interface IVkAudioMessage extends IVkDocInfo, IVkAudioMessageInfo {}

/**
 * Интерфейс для предпросмотра документа
 *
 * @example
 * ```typescript
 * const preview: IVkPreview = {
 *   photo: [
 *     "https://vk.ru/photo123456789_987654321_s",
 *     "https://vk.ru/photo123456789_987654321_m",
 *     "https://vk.ru/photo123456789_987654321_x"
 *   ],
 *   graffiti: {
 *     src: "https://vk.ru/graffiti123456789_987654321",
 *     width: 800,
 *     height: 600
 *   },
 *   audio_message: {
 *     duration: 30,
 *     waleform: [0, 1, 2, 3, 4, 5],
 *     link_ogg: "https://vk.ru/audio_message123456789_987654321.ogg",
 *     link_mp3: "https://vk.ru/audio_message123456789_987654321.mp3"
 *   }
 * };
 * ```
 */
export interface IVkPreview {
    /**
     * Массив копий изображения
     * @type {string[]}
     * Подробное описание структуры: https://vk.ru/dev/objects/photo_sizes
     */
    photo?: string[];

    /**
     * Данные о граффити
     * @type {Object}
     */
    graffiti?: {
        /**
         * URL документа с граффити
         * @type {string}
         */
        src: string;

        /**
         * Ширина изображения
         * @type {number}
         */
        width: number;

        /**
         * Высота изображения
         * @type {number}
         */
        height: number;
    };

    /**
     * Данные о голосовом сообщении
     * @type {IVkAudioMessageInfo}
     */
    audio_message?: IVkAudioMessageInfo;
}

/**
 * Интерфейс для документа
 *
 * @example
 * ```typescript
 * const doc: IVKDoc = {
 *   id: 123456789,
 *   owner_id: 987654321,
 *   url: "https://vk.ru/doc123456789_987654321",
 *   title: "document.pdf",
 *   size: 1024,
 *   ext: "pdf",
 *   date: 1234567890,
 *   type: 1,
 *   preview: {
 *     photo: [
 *       "https://vk.ru/photo123456789_987654321_s",
 *       "https://vk.ru/photo123456789_987654321_m",
 *       "https://vk.ru/photo123456789_987654321_x"
 *     ]
 *   }
 * };
 * ```
 */
export interface IVKDoc extends IVkDocInfo {
    /**
     * URL документа
     * @type {string}
     */
    url: string;

    /**
     * Название документа
     * @type {string}
     */
    title: string;

    /**
     * Размер в байтах
     * @type {number}
     */
    size: number;

    /**
     * Расширение файла
     * @type {string}
     */
    ext: string;

    /**
     * Дата добавления
     * @type {number}
     * Unix timestamp
     */
    date: number;

    /**
     * Тип документа
     * @type {number}
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
     * @type {IVkPreview}
     */
    preview: IVkPreview;
}

/**
 * Интерфейс для сохранения документа
 *
 * @example
 * ```typescript
 * const savedDoc: IVkDocSave = {
 *   response: {
 *     type: "doc",
 *     id: 123456789,
 *     owner_id: 987654321,
 *     url: "https://vk.ru/doc123456789_987654321",
 *     title: "document.pdf",
 *     size: 1024,
 *     ext: "pdf",
 *     date: 1234567890,
 *     type: 1,
 *     preview: {
 *       photo: [
 *         "https://vk.ru/photo123456789_987654321_s",
 *         "https://vk.ru/photo123456789_987654321_m",
 *         "https://vk.ru/photo123456789_987654321_x"
 *       ]
 *     }
 *   }
 * };
 * ```
 */
export interface IVkDocSave extends IVkDocInfo, IVkApi {
    /**
     * Тип документа
     * @type {TVkDocType}
     */
    type: TVkDocType;

    /**
     * Данные о граффити
     * @type {IVkGraffiti}
     */
    graffiti?: IVkGraffiti;

    /**
     * Данные о голосовом сообщении
     * @type {IVkAudioMessage}
     */
    audio_message?: IVkAudioMessage;

    /**
     * Данные о документе
     * @type {IVKDoc}
     */
    doc?: IVKDoc;

    /**
     * ID документа
     * @type {number}
     */
    id: number;

    /**
     * URL документа
     * @type {string}
     * Для граффити и документа
     */
    url: string;

    /**
     * Ширина изображения
     * @type {number}
     * Для граффити
     */
    width?: number;

    /**
     * Высота изображения
     * @type {number}
     * Для граффити
     */
    height?: number;

    /**
     * Длительность в секундах
     * @type {number}
     * Для голосового сообщения
     */
    duration?: number;

    /**
     * Массив значений для визуализации звука
     * @type {number[]}
     * Для голосового сообщения
     */
    waleform?: number[];

    /**
     * URL .ogg файла
     * @type {string}
     * Для голосового сообщения
     */
    link_ogg?: string;

    /**
     * URL .mp3 файла
     * @type {string}
     * Для голосового сообщения
     */
    link_mp3?: string;
}
