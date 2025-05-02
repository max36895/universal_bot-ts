import { IVkApi } from './IVkApi';

/**
 * Интерфейс для получения ссылки для загрузки изображения
 */
export interface IMarusiaApiPictureUpdateLink extends IVkApi {
    /**
     * Адрес сервера для загрузки изображения
     */
    picture_upload_link: string;
}

/**
 * Интерфейс для создания изображения
 */
export interface IMarusiaApiSavePicture extends IVkApi {
    /**
     * Идентификатор приложения
     */
    app_id: number;
    /**
     * Идентификатор изображения
     */
    photo_id: string;
}

/**
 * Интерфейс для получения ссылки для загрузки аудио
 */
export interface IMarusiaApiAudioUpdateLink extends IVkApi {
    /**
     * Адрес сервера для загрузки аудио
     */
    audio_upload_link: string;
}

/**
 * Интерфейс для создания аудио
 */
export interface IMarusiaApiCreateAudio extends IVkApi {
    /**
     * Идентификатор аудио
     */
    id: string;
    /**
     * Название аудио
     */
    title: string;
}
