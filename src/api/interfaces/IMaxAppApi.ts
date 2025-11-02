import { IMaxMessage } from '../../platforms/interfaces/IMaxApp';

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
    keyboard?: Record<string, unknown>;
    /**
     * Настройки для отображения вложений
     */
    attachments?: Record<string, unknown>[];
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
