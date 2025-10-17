import { IVkApi } from './IVkApi';

/**
 * Интерфейс для получения ссылки для загрузки изображения
 * Используется при загрузке изображений в Марусе
 *
 * @example
 * ```typescript
 * const response: IMarusiaApiPictureUpdateLink = {
 *   picture_upload_link: "https://upload.marusia.ru/upload/photo",
 *   // ... другие поля из IVkApi
 * };
 * ```
 */
export interface IMarusiaApiPictureUpdateLink extends IVkApi {
    /**
     * Адрес сервера для загрузки изображения
     * @type {string}
     * URL-адрес, на который нужно отправить изображение
     */
    picture_upload_link: string;
}

/**
 * Интерфейс для создания изображения
 * Используется после успешной загрузки изображения на сервер
 *
 * @example
 * ```typescript
 * const response: IMarusiaApiSavePicture = {
 *   app_id: 123456,
 *   photo_id: "photo123456",
 *   // ... другие поля из IVkApi
 * };
 * ```
 */
export interface IMarusiaApiSavePicture extends IVkApi {
    /**
     * Идентификатор приложения
     * @type {number}
     * Уникальный ID приложения в Марусе
     */
    app_id: number;
    /**
     * Идентификатор изображения
     * @type {string}
     * Уникальный ID загруженного изображения
     */
    photo_id: string;
}

/**
 * Интерфейс для удаления данных из Маруси
 */
export type IMarusiaApiRemove = IVkApi<number>;

/**
 * Интерфейс для получения ссылки для загрузки аудио
 * Используется при загрузке аудиофайлов в Марусе
 *
 * @example
 * ```typescript
 * const response: IMarusiaApiAudioUpdateLink = {
 *   audio_upload_link: "https://upload.marusia.ru/upload/audio",
 *   // ... другие поля из IVkApi
 * };
 * ```
 */
export interface IMarusiaApiAudioUpdateLink extends IVkApi {
    /**
     * Адрес сервера для загрузки аудио
     * @type {string}
     * URL-адрес, на который нужно отправить аудиофайл
     */
    audio_upload_link: string;
}

/**
 * Интерфейс для создания аудио
 * Используется после успешной загрузки аудио на сервер
 *
 * @example
 * ```typescript
 * const response: IMarusiaApiCreateAudio = {
 *   id: "audio123456",
 *   title: "My Audio File",
 *   // ... другие поля из IVkApi
 * };
 * ```
 */
export interface IMarusiaApiCreateAudio extends IVkApi {
    /**
     * Идентификатор аудио
     * @type {string}
     * Уникальный ID загруженного аудиофайла
     */
    id: string;
    /**
     * Название аудио
     * @type {string}
     * Отображаемое название аудиофайла
     */
    title: string;
}
