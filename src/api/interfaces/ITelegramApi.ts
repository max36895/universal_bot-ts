/**
 * Типы вопросов для опросов в Telegram
 * @typedef {('quiz' | 'regular')} TTelegramQuestionType
 * - quiz: опрос с правильным ответом
 * - regular: обычный опрос без правильного ответа
 */
export type TTelegramQuestionType = 'quiz' | 'regular';

/**
 * Тип идентификатора чата в Telegram
 * @typedef {(string | number)} TTelegramChatId
 * - string: для публичных каналов (@channelname)
 * - number: для приватных чатов и групп
 */
export type TTelegramChatId = string | number;

/**
 * Интерфейс параметров для API Telegram
 * Определяет все возможные параметры для отправки сообщений и других действий
 *
 * @example
 * ```typescript
 * // Отправка текстового сообщения
 * const textParams: ITelegramParams = {
 *   chat_id: 123456789,
 *   text: "Hello, world!",
 *   parse_mode: "HTML"
 * };
 *
 * // Отправка опроса
 * const pollParams: ITelegramParams = {
 *   chat_id: 123456789,
 *   question: "What is your favorite color?",
 *   options: ["Red", "Blue", "Green"],
 *   type: "regular",
 *   is_anonymous: false
 * };
 * ```
 */
export interface ITelegramParams {
    /**
     * Уникальный идентификатор целевого чата или имя пользователя целевого канала
     * @type {TTelegramChatId}
     * - Для приватных чатов: числовой ID
     * - Для каналов: @channelname
     */
    chat_id?: TTelegramChatId;

    /**
     * Текст отправляемого сообщения
     * @type {string}
     * 1-4096 символов после синтаксического анализа сущностей
     */
    text?: string;

    /**
     * Режим форматирования текста
     * @type {string}
     * Поддерживает Markdown или HTML для форматирования текста
     */
    parse_mode?: string;

    /**
     * Отключает предварительный просмотр ссылок
     * @type {boolean}
     * @defaultValue false
     */
    disable_web_page_preview?: boolean;

    /**
     * Отправляет сообщение без звука
     * @type {boolean}
     * @defaultValue false
     */
    disable_notification?: boolean;

    /**
     * ID сообщения, на которое отвечаем
     * @type {number}
     */
    reply_to_message_id?: number;

    /**
     * Дополнительные опции интерфейса
     * @type {string}
     * JSON-сериализованный объект для клавиатуры и других элементов управления
     */
    reply_markup?: string;

    // Параметры для опросов
    /**
     * Вопрос для опроса
     * @type {string}
     * 1-255 символов
     */
    question?: string;

    /**
     * Варианты ответов для опроса
     * @type {any}
     * JSON-сериализованный список из 2-10 строк по 1-100 символов
     */
    options?: any;

    /**
     * Флаг анонимности опроса
     * @type {boolean}
     * @defaultValue true
     */
    is_anonymous?: boolean;

    /**
     * Тип опроса
     * @type {TTelegramQuestionType}
     * @defaultValue "regular"
     */
    type?: TTelegramQuestionType;

    /**
     * Разрешает множественный выбор в опросе
     * @type {boolean}
     * @defaultValue false
     * @remarks Не работает для опросов типа "quiz"
     */
    allows_multiple_answers?: boolean;

    /**
     * ID правильного варианта ответа
     * @type {number}
     * Требуется только для опросов типа "quiz"
     */
    correct_option_id?: number;

    /**
     * Флаг закрытия опроса
     * @type {boolean}
     * @defaultValue false
     */
    is_closed?: boolean;

    // Параметры для медиафайлов
    /**
     * Фото для отправки
     * @type {string}
     * file_id или URL для загрузки
     */
    photo?: string;

    /**
     * Подпись к фотографии
     * @type {string}
     * 0-1024 символа
     */
    caption?: string;

    /**
     * Документ для отправки
     * @type {string}
     * file_id или URL для загрузки
     */
    document?: string;

    /**
     * Миниатюра документа
     * @type {string}
     * JPEG, < 200KB, размеры до 320x320
     */
    thumb?: string;

    /**
     * Аудиофайл для отправки
     * @type {string}
     * file_id или URL для загрузки
     */
    audio?: string;

    /**
     * Длительность аудио в секундах
     * @type {number}
     */
    duration?: number;

    /**
     * Исполнитель аудио
     * @type {string}
     */
    performer?: string;

    /**
     * Название аудиотрека
     * @type {string}
     */
    title?: string;

    /**
     * Видео для отправки
     * @type {string}
     * file_id или URL для загрузки
     */
    video?: string;

    /**
     * Поддержка стриминга для видео
     * @type {boolean}
     * @defaultValue false
     */
    supports_streaming?: boolean;
}

/**
 * Интерфейс с информацией об отправителе сообщения
 *
 * @example
 * ```typescript
 * const from: ITelegramFrom = {
 *   id: 123456789,
 *   is_bot: false,
 *   first_name: "John",
 *   username: "johndoe"
 * };
 * ```
 */
export interface ITelegramFrom {
    /**
     * Идентификатор отправителя
     * @type {number}
     */
    id: number;

    /**
     * Флаг, указывающий является ли отправитель ботом
     * @type {boolean}
     */
    is_bot: boolean;

    /**
     * Имя отправителя
     * @type {string}
     */
    first_name: string;

    /**
     * Никнейм отправителя
     * @type {string}
     */
    username: string;
}

/**
 * Интерфейс с информацией о чате
 *
 * @example
 * ```typescript
 * const chat: ITelegramChat = {
 *   id: 123456789,
 *   first_name: "John",
 *   last_name: "Doe",
 *   username: "johndoe",
 *   type: "private"
 * };
 * ```
 */
export interface ITelegramChat {
    /**
     * Идентификатор чата
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
     * Никнейм пользователя
     * @type {string}
     */
    username: string;

    /**
     * Тип чата
     * @type {string}
     * Возможные значения: "private", "group", "supergroup", "channel"
     */
    type: string;
}

/**
 * Интерфейс с информацией об опросе
 *
 * @example
 * ```typescript
 * const poll: ITelegramPoll = {
 *   id: "123456789",
 *   question: "What is your favorite color?",
 *   options: [
 *     { text: "Red", voter_count: 5 },
 *     { text: "Blue", voter_count: 3 },
 *     { text: "Green", voter_count: 2 }
 *   ],
 *   total_voter_count: 10,
 *   is_closed: false,
 *   is_anonymous: true,
 *   type: "regular",
 *   allows_multiple_answers: false
 * };
 * ```
 */
export interface ITelegramPoll {
    /**
     * Уникальный идентификатор опроса
     * @type {string}
     */
    id: string;

    /**
     * Вопрос опроса
     * @type {string}
     */
    question: string;

    /**
     * Варианты ответов
     * @type {Array<{text: string, voter_count: number}>}
     */
    options: Array<{
        /**
         * Текст варианта ответа
         * @type {string}
         */
        text: string;
        /**
         * Количество проголосовавших за этот вариант
         * @type {number}
         */
        voter_count: number;
    }>;

    /**
     * Общее количество проголосовавших
     * @type {number}
     */
    total_voter_count: number;

    /**
     * Флаг закрытия опроса
     * @type {boolean}
     */
    is_closed: boolean;

    /**
     * Флаг анонимности опроса
     * @type {boolean}
     */
    is_anonymous: boolean;

    /**
     * Тип опроса
     * @type {TTelegramQuestionType}
     */
    type: TTelegramQuestionType;

    /**
     * Разрешение множественного выбора
     * @type {boolean}
     */
    allows_multiple_answers: boolean;

    /**
     * ID правильного варианта ответа
     * @type {number}
     * Доступно только для закрытых опросов типа "quiz"
     */
    correct_option_id: number;
}

/**
 * Базовый интерфейс для информации о файле
 *
 * @example
 * ```typescript
 * const fileInfo: IFileInfo = {
 *   file_id: "AgACAgIAAxkBAAIB",
 *   file_unique_id: "AQADBAADYc0GAAE",
 *   file_size: 1024
 * };
 * ```
 */
interface IFileInfo {
    /**
     * Идентификатор файла
     * @type {string}
     * Может быть использован для повторной отправки файла
     */
    file_id: string;

    /**
     * Уникальный идентификатор файла
     * @type {string}
     * Неизменный идентификатор файла
     */
    file_unique_id: string;

    /**
     * Размер файла в байтах
     * @type {number}
     */
    file_size: number;
}

/**
 * Интерфейс с информацией о фотографии
 *
 * @example
 * ```typescript
 * const photo: ITelegramPhoto = {
 *   file_id: "AgACAgIAAxkBAAIB",
 *   file_unique_id: "AQADBAADYc0GAAE",
 *   file_size: 1024,
 *   width: 800,
 *   height: 600
 * };
 * ```
 */
export interface ITelegramPhoto extends IFileInfo {
    /**
     * Ширина изображения в пикселях
     * @type {number}
     */
    width: number;

    /**
     * Высота изображения в пикселях
     * @type {number}
     */
    height: number;
}

/**
 * Интерфейс с информацией о миниатюре
 *
 * @example
 * ```typescript
 * const thumb: ITelegramThumb = {
 *   file_id: "AgACAgIAAxkBAAIB",
 *   file_unique_id: "AQADBAADYc0GAAE",
 *   file_size: 1024,
 *   width: 320,
 *   height: 320
 * };
 * ```
 */
export interface ITelegramThumb extends IFileInfo {
    /**
     * Ширина миниатюры в пикселях
     * @type {number}
     */
    width?: number;

    /**
     * Высота миниатюры в пикселях
     * @type {number}
     */
    height?: number;
}

/**
 * Интерфейс с информацией о документе
 *
 * @example
 * ```typescript
 * const document: ITelegramDocument = {
 *   file_id: "AgACAgIAAxkBAAIB",
 *   file_unique_id: "AQADBAADYc0GAAE",
 *   file_size: 1024,
 *   file_name: "document.pdf",
 *   mime_type: "application/pdf",
 *   thumb: {
 *     file_id: "AgACAgIAAxkBAAIB",
 *     file_unique_id: "AQADBAADYc0GAAE",
 *     file_size: 1024,
 *     width: 320,
 *     height: 320
 *   }
 * };
 * ```
 */
export interface ITelegramDocument extends IFileInfo {
    /**
     * Оригинальное имя файла
     * @type {string}
     */
    file_name: string;

    /**
     * MIME-тип файла
     * @type {string}
     */
    mime_type: string;

    /**
     * Миниатюра документа
     * @type {ITelegramThumb}
     */
    thumb: ITelegramThumb;
}

/**
 * Интерфейс с информацией об аудиофайле
 *
 * @example
 * ```typescript
 * const audio: ITelegramAudio = {
 *   file_id: "AgACAgIAAxkBAAIB",
 *   file_unique_id: "AQADBAADYc0GAAE",
 *   file_size: 1024,
 *   name: "song.mp3",
 *   mime_type: "audio/mpeg",
 *   duration: 180,
 *   performer: "Artist",
 *   thumb: {
 *     file_id: "AgACAgIAAxkBAAIB",
 *     file_unique_id: "AQADBAADYc0GAAE",
 *     file_size: 1024,
 *     width: 320,
 *     height: 320
 *   }
 * };
 * ```
 */
export interface ITelegramAudio extends IFileInfo {
    /**
     * Оригинальное имя файла
     * @type {string}
     */
    name: string;

    /**
     * MIME-тип файла
     * @type {string}
     */
    mime_type: string;

    /**
     * Длительность аудио в секундах
     * @type {number}
     */
    duration: number;

    /**
     * Исполнитель
     * @type {string}
     */
    performer: string;

    /**
     * Миниатюра аудио
     * @type {ITelegramThumb}
     */
    thumb: ITelegramThumb;
}

/**
 * Интерфейс с информацией о видеофайле
 *
 * @example
 * ```typescript
 * const video: ITelegramVideo = {
 *   file_id: "AgACAgIAAxkBAAIB",
 *   file_unique_id: "AQADBAADYc0GAAE",
 *   file_size: 1024,
 *   name: "video.mp4",
 *   mime_type: "video/mp4",
 *   duration: 180,
 *   performer: "Artist",
 *   width: 1280,
 *   height: 720,
 *   thumb: {
 *     file_id: "AgACAgIAAxkBAAIB",
 *     file_unique_id: "AQADBAADYc0GAAE",
 *     file_size: 1024,
 *     width: 320,
 *     height: 320
 *   }
 * };
 * ```
 */
export interface ITelegramVideo extends ITelegramAudio {
    /**
     * Ширина видео в пикселях
     * @type {number}
     */
    width: number;

    /**
     * Высота видео в пикселях
     * @type {number}
     */
    height: number;
}

/**
 * Интерфейс с содержимым результата запроса
 *
 * @example
 * ```typescript
 * const result: ITelegramResultContent = {
 *   message_id: 123,
 *   from: {
 *     id: 123456789,
 *     is_bot: false,
 *     first_name: "John",
 *     username: "johndoe"
 *   },
 *   chat: {
 *     id: 123456789,
 *     first_name: "John",
 *     last_name: "Doe",
 *     username: "johndoe",
 *     type: "private"
 *   },
 *   date: 1234567890,
 *   text: "Hello, world!"
 * };
 * ```
 */
export interface ITelegramResultContent {
    /**
     * Идентификатор сообщения
     * @type {number}
     */
    message_id: number;

    /**
     * Информация об отправителе
     * @type {ITelegramFrom}
     */
    from: ITelegramFrom;

    /**
     * Информация о чате
     * @type {ITelegramChat}
     */
    chat?: ITelegramChat;

    /**
     * Дата отправки сообщения
     * @type {number}
     * Unix timestamp
     */
    date?: number;

    /**
     * Текст сообщения
     * @type {string}
     */
    text?: string;

    /**
     * Информация об опросе
     * @type {ITelegramPoll}
     */
    poll?: ITelegramPoll;

    /**
     * Информация о фотографии
     * @type {ITelegramPhoto}
     */
    photo?: ITelegramPhoto;

    /**
     * Информация о документе
     * @type {ITelegramDocument}
     */
    document?: ITelegramDocument;

    /**
     * Информация об аудиофайле
     * @type {ITelegramAudio}
     */
    audio?: ITelegramAudio;

    /**
     * Информация о видеофайле
     * @type {ITelegramVideo}
     */
    video?: ITelegramVideo;
}

/**
 * Интерфейс результата запроса к API Telegram
 *
 * @example
 * ```typescript
 * const response: ITelegramResult = {
 *   ok: true,
 *   result: {
 *     message_id: 123,
 *     from: {
 *       id: 123456789,
 *       is_bot: false,
 *       first_name: "John",
 *       username: "johndoe"
 *     },
 *     chat: {
 *       id: 123456789,
 *       first_name: "John",
 *       last_name: "Doe",
 *       username: "johndoe",
 *       type: "private"
 *     },
 *     date: 1234567890,
 *     text: "Hello, world!"
 *   }
 * };
 *
 * // Пример ошибки
 * const errorResponse: ITelegramResult = {
 *   ok: false,
 *   result: null,
 *   error_code: 400,
 *   description: "Bad Request"
 * };
 * ```
 */
export interface ITelegramResult {
    /**
     * Статус выполнения запроса
     * @type {boolean}
     */
    ok: boolean;

    /**
     * Содержимое результата
     * @type {ITelegramResultContent}
     */
    result: ITelegramResultContent;

    /**
     * Код ошибки
     * @type {number}
     * Присутствует только в случае ошибки
     */
    error_code?: number;

    /**
     * Описание ошибки
     * @type {string}
     * Присутствует только в случае ошибки
     */
    description?: string;
}
