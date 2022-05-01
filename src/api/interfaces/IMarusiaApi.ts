import {IVkApi} from "./IVkApi";

export interface IMarusiaApiPictureUpdateLink extends IVkApi {
    /**
     * Адрес сервера для загрузки изображения
     */
    picture_upload_link: string;
}

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

export interface IMarusiaApiAudioUpdateLink extends IVkApi {
    /**
     * Адрес сервера для загрузки аудио
     */
    audio_upload_link: string;
}

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
