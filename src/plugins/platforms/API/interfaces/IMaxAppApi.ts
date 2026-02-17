import { IMaxButtonObject, IMaxMessage } from '../../Max/interfaces/IMaxPlatform';

/**
 * @interface IMaxCard
 * Интерфейс для карточки Max.
 */
export interface IMaxCard {
    /**
     * Тип карточки.
     */
    type: 'image';

    /**
     * Массив элементов карточки.
     * Каждый элемент представляет собой отдельную карточку в карусели.
     */
    payload: {
        /**
         * Ссылка на изображение.
         */
        url?: string;
        /**
         * Токен изображения.
         */
        token?: string;
        /**
         * Массив токенов изображений.
         */
        photos?: string[];
    };
}

/**
 * @interface IMaxCard
 * Интерфейс для аудио Max.
 */
export interface IMaxAudio {
    /**
     * Тип аудио.
     */
    type: 'audio';

    /**
     * элемент аудио
     */
    payload: {
        /**
         * Токен аудиофайла.
         */
        token?: string;
    };
}

/**
 * Тип для загрузки файла
 */
export type TMaxUploadFile = 'image' | 'video' | 'audio' | 'file';

/**
 * Интерфейс для загрузки файла в Max
 */
export interface IMaxUploadFile {
    /**
     * URL для загрузки файла
     * @type {string}
     */
    url: string;

    /**
     * Видео- или аудио-токен для отправки сообщения
     * @type {string}
     */
    token?: string;
}

/**
 * Параметры для отправки сообщения
 */
export interface IMaxParams {
    /**
     * Настройки для отображения клавиатуры
     */
    keyboard?: IMaxButtonObject;
    /**
     * Настройки для отображения вложений
     */
    attachments?: (IMaxAudio | IMaxCard)[] | null;
}

/**
 * Интерфейс для API Max
 */
export interface IMaxAppApi {
    /**
     * Дополнительные параметры
     */
    [name: string]: unknown;
}

/**
 * Интерфейс для отправки сообщения
 */
export interface IMaxSendMessage extends IMaxAppApi {
    /**
     * Само содержимое сообщения
     */
    message: IMaxMessage;
}
