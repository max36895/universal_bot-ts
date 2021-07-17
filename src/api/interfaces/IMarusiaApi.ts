export interface IMarusiaApiPictureUpdateLink {
    /**
     * Адрес сервера для загрузки изображения
     */
    picture_upload_link: string;
}

export interface IMarusiaApiSavePicture {
    /**
     * Идентификатор приложения
     */
    app_id: number;
    /**
     * Идентификатор изображения
     */
    photo_id: string;
}

export interface IMarusiaApiAudioUpdateLink {
    /**
     * Адрес сервера для загрузки аудио
     */
    audio_upload_link: string;
}

export interface IMarusiaApiCreateAudio {
    /**
     * Идентификатор аудио
     */
    id: string;
    /**
     * Название аудио
     */
    title: string;
}