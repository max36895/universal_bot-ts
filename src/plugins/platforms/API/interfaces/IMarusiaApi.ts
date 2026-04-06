import { IVkApi } from './IVkApi';

/**
 * Интерфейс для получения ссылки для загрузки изображения.
 * Используется при загрузке изображений в Марусе
 *
 * @example
 * ```ts
 * const response: IMarusiaApiPictureUpdateLink = {
 *   picture_upload_link: "/photo",
 *   // ... другие поля из IVkApi
 * };
 * ```
 */
export interface IMarusiaApiPictureUpdateLink extends IVkApi {
    /**
     * Адрес сервера для загрузки изображения
     * URL-адрес, на который нужно отправить изображение
     */
    picture_upload_link: string;
}

/**
 * Интерфейс для создания изображения
 * Используется после успешной загрузки изображения на сервер
 *
 * @example
 * ```ts
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
     * Уникальный ID приложения в Марусе
     */
    app_id: number;
    /**
     * Идентификатор изображения
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
 * ```ts
 * const response: IMarusiaApiAudioUpdateLink = {
 *   audio_upload_link: "/audio",
 *   // ... другие поля из IVkApi
 * };
 * ```
 */
export interface IMarusiaApiAudioUpdateLink extends IVkApi {
    /**
     * Адрес сервера для загрузки аудио
     * URL-адрес, на который нужно отправить аудиофайл
     */
    audio_upload_link: string;
}

/**
 * Интерфейс для создания аудио
 * Используется после успешной загрузки аудио на сервер
 *
 * @example
 * ```ts
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
     * Уникальный ID загруженного аудиофайла
     */
    id: string;
    /**
     * Название аудио
     * Отображаемое название аудиофайла
     */
    title: string;
}
