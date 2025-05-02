/**
 * Базовый интерфейс для всех ответов Яндекс API.
 * Содержит общие поля, присутствующие во всех ответах.
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
 * @extends IYandexApi
 */
export interface IYandexImagesCheckOutPlaceRequest extends IYandexApi {
    /**
     * Информация о квоте хранилища изображений
     * @type {{ quota: IYandexCheckOutPlace }}
     */
    images: {
        quota: IYandexCheckOutPlace;
    };
}

/**
 * Интерфейс ответа на запрос проверки места для аудиофайлов
 * @extends IYandexApi
 */
export interface IYandexSoundsCheckOutPlaceRequest extends IYandexApi {
    /**
     * Информация о квоте хранилища аудиофайлов
     * @type {{ quota: IYandexCheckOutPlace }}
     */
    sounds: {
        quota: IYandexCheckOutPlace;
    };
}

/**
 * Интерфейс, описывающий информацию о квоте хранилища
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
 * @extends IYandexApi
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
 * @extends IYandexApi
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
     * Timestamp создания изображения в формате Unix timestamp
     * @type {number}
     */
    createdAt: number;
}

/**
 * Интерфейс ответа на запрос загрузки одного аудиофайла
 * @extends IYandexApi
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
 * @extends IYandexApi
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
     * Дата и время загрузки файла в ISO формате
     * @type {string}
     */
    createdAt: string;

    /**
     * Флаг завершения обработки файла
     * @type {boolean}
     * true - файл обработан и готов к использованию
     * false - файл находится в процессе обработки
     */
    isProcessed: boolean;
}

/**
 * Интерфейс ответа на запрос удаления ресурса
 * @extends IYandexApi
 */
export interface IYandexRemoveRequest extends IYandexApi {
    /**
     * Результат выполнения операции удаления
     * @type {string}
     */
    result?: string;
}
