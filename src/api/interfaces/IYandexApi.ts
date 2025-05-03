/**
 * Интерфейсы для работы с Яндекс API
 * Определяют структуру запросов и ответов при взаимодействии с API Яндекс Диалогов
 *
 * @module api/interfaces/IYandexApi
 */

/**
 * Базовый интерфейс для всех ответов Яндекс API
 * Содержит общие поля, присутствующие во всех ответах
 *
 * @example
 * ```typescript
 * // Успешный ответ
 * const successResponse: IYandexApi = {};
 *
 * // Ответ с ошибкой
 * const errorResponse: IYandexApi = {
 *   error: "Invalid request"
 * };
 * ```
 */
export interface IYandexApi {
    /**
     * Сообщение об ошибке, если запрос завершился неудачно
     * @type {string}
     */
    error?: string;
}

/**
 * Интерфейс ответа на запрос проверки места для изображений
 * Используется для получения информации о доступном месте в хранилище изображений
 *
 * @example
 * ```typescript
 * const response: IYandexImagesCheckOutPlaceRequest = {
 *   images: {
 *     quota: {
 *       total: 1073741824, // 1GB в байтах
 *       used: "536870912"  // 512MB в байтах
 *     }
 *   }
 * };
 * ```
 */
export interface IYandexImagesCheckOutPlaceRequest extends IYandexApi {
    /**
     * Информация о квоте хранилища изображений
     * @type {{ quota: IYandexCheckOutPlace }}
     */
    images: {
        /**
         * Информация о квоте хранилища изображений
         */
        quota: IYandexCheckOutPlace;
    };
}

/**
 * Интерфейс ответа на запрос проверки места для аудиофайлов
 * Используется для получения информации о доступном месте в хранилище аудиофайлов
 *
 * @example
 * ```typescript
 * const response: IYandexSoundsCheckOutPlaceRequest = {
 *   sounds: {
 *     quota: {
 *       total: 1073741824, // 1GB в байтах
 *       used: "536870912"  // 512MB в байтах
 *     }
 *   }
 * };
 * ```
 */
export interface IYandexSoundsCheckOutPlaceRequest extends IYandexApi {
    /**
     * Информация о квоте хранилища аудиофайлов
     * @type {{ quota: IYandexCheckOutPlace }}
     */
    sounds: {
        /**
         * Информация о квоте хранилища аудиофайлов
         */
        quota: IYandexCheckOutPlace;
    };
}

/**
 * Интерфейс, описывающий информацию о квоте хранилища
 * Содержит информацию о доступном и использованном месте
 *
 * @example
 * ```typescript
 * const quota: IYandexCheckOutPlace = {
 *   total: 1073741824, // 1GB в байтах
 *   used: "536870912"  // 512MB в байтах
 * };
 * ```
 */
export interface IYandexCheckOutPlace {
    /**
     * Общий объем доступного места в байтах
     * @type {number}
     */
    total: number;

    /**
     * Объем использованного места в байтах
     * @type {string}
     */
    used: string;
}

/**
 * Интерфейс ответа на запрос загрузки одного изображения
 * Используется при загрузке изображения в хранилище
 *
 * @example
 * ```typescript
 * const response: IYandexRequestDownloadImageRequest = {
 *   image: {
 *     id: "image123456789",
 *     origUrl: "https://example.com/image.jpg",
 *     size: 1024,
 *     createdAt: 1234567890
 *   }
 * };
 * ```
 */
export interface IYandexRequestDownloadImageRequest extends IYandexApi {
    /**
     * Информация о загруженном изображении
     * @type {IYandexRequestDownloadImage}
     */
    image: IYandexRequestDownloadImage;
}

/**
 * Интерфейс ответа на запрос загрузки нескольких изображений
 * Используется при массовой загрузке изображений в хранилище
 *
 * @example
 * ```typescript
 * const response: IYandexRequestDownloadImagesRequest = {
 *   images: [
 *     {
 *       id: "image123456789",
 *       origUrl: "https://example.com/image1.jpg",
 *       size: 1024,
 *       createdAt: 1234567890
 *     },
 *     {
 *       id: "image987654321",
 *       origUrl: "https://example.com/image2.jpg",
 *       size: 2048,
 *       createdAt: 1234567891
 *     }
 *   ]
 * };
 * ```
 */
export interface IYandexRequestDownloadImagesRequest extends IYandexApi {
    /**
     * Массив с информацией о загруженных изображениях
     * @type {IYandexRequestDownloadImage[]}
     */
    images: IYandexRequestDownloadImage[];
}

/**
 * Интерфейс, описывающий информацию о загруженном изображении
 * Содержит метаданные загруженного изображения
 *
 * @example
 * ```typescript
 * const image: IYandexRequestDownloadImage = {
 *   id: "image123456789",
 *   origUrl: "https://example.com/image.jpg",
 *   size: 1024,
 *   createdAt: 1234567890
 * };
 * ```
 */
export interface IYandexRequestDownloadImage {
    /**
     * Уникальный идентификатор изображения в системе Яндекса
     * @type {string}
     */
    id: string;

    /**
     * Оригинальный URL изображения
     * @type {string}
     */
    origUrl: string;

    /**
     * Размер изображения в байтах
     * @type {number}
     */
    size: number;

    /**
     * Timestamp создания изображения
     * @type {number}
     * Unix timestamp
     */
    createdAt: number;
}

/**
 * Интерфейс ответа на запрос загрузки одного аудиофайла
 * Используется при загрузке аудиофайла в хранилище
 *
 * @example
 * ```typescript
 * const response: IYandexRequestDownloadSoundRequest = {
 *   sound: {
 *     id: "sound123456789",
 *     skillId: "skill123456789",
 *     size: 1024,
 *     originalName: "audio.mp3",
 *     createdAt: "2024-03-20T12:00:00Z",
 *     isProcessed: true
 *   }
 * };
 * ```
 */
export interface IYandexRequestDownloadSoundRequest extends IYandexApi {
    /**
     * Информация о загруженном аудиофайле
     * @type {IYandexRequestDownloadSound}
     */
    sound: IYandexRequestDownloadSound;
}

/**
 * Интерфейс ответа на запрос загрузки нескольких аудиофайлов
 * Используется при массовой загрузке аудиофайлов в хранилище
 *
 * @example
 * ```typescript
 * const response: IYandexRequestDownloadSoundsRequest = {
 *   sounds: [
 *     {
 *       id: "sound123456789",
 *       skillId: "skill123456789",
 *       size: 1024,
 *       originalName: "audio1.mp3",
 *       createdAt: "2024-03-20T12:00:00Z",
 *       isProcessed: true
 *     },
 *     {
 *       id: "sound987654321",
 *       skillId: "skill123456789",
 *       size: 2048,
 *       originalName: "audio2.mp3",
 *       createdAt: "2024-03-20T12:01:00Z",
 *       isProcessed: false
 *     }
 *   ]
 * };
 * ```
 */
export interface IYandexRequestDownloadSoundsRequest extends IYandexApi {
    /**
     * Массив с информацией о загруженных аудиофайлах
     * @type {IYandexRequestDownloadSound[]}
     */
    sounds: IYandexRequestDownloadSound[];
}

/**
 * Интерфейс, описывающий информацию о загруженном аудиофайле
 * Содержит метаданные загруженного аудиофайла
 *
 * @example
 * ```typescript
 * const sound: IYandexRequestDownloadSound = {
 *   id: "sound123456789",
 *   skillId: "skill123456789",
 *   size: 1024,
 *   originalName: "audio.mp3",
 *   createdAt: "2024-03-20T12:00:00Z",
 *   isProcessed: true
 * };
 * ```
 */
export interface IYandexRequestDownloadSound {
    /**
     * Уникальный идентификатор аудиофайла в системе Яндекса
     * @type {string}
     */
    id: string;

    /**
     * Идентификатор навыка, через который был загружен файл
     * @type {string}
     */
    skillId: string;

    /**
     * Размер аудиофайла в байтах
     * @type {number}
     */
    size: number;

    /**
     * Оригинальное имя загруженного файла
     * @type {string}
     */
    originalName: string;

    /**
     * Дата и время загрузки файла
     * @type {string}
     * ISO 8601 формат
     */
    createdAt: string;

    /**
     * Флаг завершения обработки файла
     * @type {boolean}
     * - true: файл обработан и готов к использованию
     * - false: файл находится в процессе обработки
     */
    isProcessed: boolean;
}

/**
 * Интерфейс ответа на запрос удаления ресурса
 * Используется при удалении изображений или аудиофайлов из хранилища
 *
 * @example
 * ```typescript
 * const response: IYandexRemoveRequest = {
 *   result: "success"
 * };
 *
 * // Пример ошибки
 * const errorResponse: IYandexRemoveRequest = {
 *   error: "Resource not found"
 * };
 * ```
 */
export interface IYandexRemoveRequest extends IYandexApi {
    /**
     * Результат выполнения операции удаления
     * @type {string}
     */
    result?: string;
}
