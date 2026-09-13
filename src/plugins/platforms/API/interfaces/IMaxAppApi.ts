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
         * @deprecated MAX принимает одно изображение на attachment. Поле сохранено только для
         * обратной совместимости типов и не формируется адаптером.
         */
        photos?: string[];
    };
}

/**
 * @interface IMaxAudio
 * Интерфейс для аудио-вложения Max (токен выдаётся POST /uploads?type=audio).
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
 * @interface IMaxVideo
 * Интерфейс для видео-вложения Max (токен выдаётся POST /uploads?type=video).
 */
export interface IMaxVideo {
    /**
     * Тип вложения — видео.
     */
    type: 'video';

    /**
     * Данные видео.
     */
    payload: {
        /**
         * Токен видео, полученный из upload.
         */
        token?: string;
    };
}

/**
 * @interface IMaxFile
 * Интерфейс для файлового вложения Max (токен выдаётся POST /uploads?type=file).
 */
export interface IMaxFile {
    /**
     * Тип вложения — файл.
     */
    type: 'file';

    /**
     * Данные файла.
     */
    payload: {
        /**
         * Токен файла, полученный из upload.
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
export interface IMaxUploadFile extends IMaxAppApi {
    /**
     * Адрес для загрузки контента, выданный POST /uploads (файл отправляется именно на него)
     */
    url: string;

    /**
     * Результирующий токен вложения для отправки сообщения (для изображений не выдаётся — картинка передаётся по url)
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
    attachments?: (IMaxAudio | IMaxCard | IMaxVideo | IMaxFile)[] | null;
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
