export interface IYandexApi {
    /**
     * Ошибка при выполнении действия
     */
    error?: string;
}

export interface IYandexImagesCheckOutPlaceRequest extends IYandexApi {
    /**
     * Данные с картинками
     */
    images: {
        quota: IYandexCheckOutPlace;
    }
}

export interface IYandexSoundsCheckOutPlaceRequest extends IYandexApi {
    /**
     * Данные с аудиофайлами
     */
    sounds: {
        quota: IYandexCheckOutPlace;
    }
}

export interface IYandexCheckOutPlace {
    /**
     * Все доступное место.
     */
    total: number;
    /**
     * Занятое место.
     */
    used: string;
}

export interface IYandexRequestDownloadImageRequest extends IYandexApi {
    /**
     * Загруженная картинка
     */
    image: IYandexRequestDownloadImage;
}

export interface IYandexRequestDownloadImagesRequest extends IYandexApi {
    /**
     * Загруженные картинки
     */
    images: IYandexRequestDownloadImage[];
}

export interface IYandexRequestDownloadImage {
    /**
     * Ид загруженной изображения
     */
    id: string;
    /**
     * Адрес изображения
     */
    origUrl: string;
    /**
     * Размер изображения
     */
    size: number;
    /**
     * Дата загрузки изображения
     */
    createdAt: number;
}

export interface IYandexRequestDownloadSoundRequest extends IYandexApi {
    /**
     * Загруженный аудиофайл
     */
    sound: IYandexRequestDownloadSound;
}

export interface IYandexRequestDownloadSoundsRequest extends IYandexApi {
    /**
     * Загруженные аудиофайлы
     */
    sounds: IYandexRequestDownloadSound[];
}

export interface IYandexRequestDownloadSound {
    /**
     * Ид загруженного аудиофайла
     */
    id: string;
    /**
     * Ид навыка, с которого произошла загрузка
     */
    skillId: string;
    /**
     * Размер аудио файла
     */
    size: number;
    /**
     * Оригинальное название файла
     */
    originalName: string;
    /**
     * Дата загрузки файла
     */
    createdAt: string;
    /**
     * Статус обработки файла. До тех пор, пока значение false, Алиса не сможет его воспроизвести
     */
    isProcessed: boolean;
}

export interface IYandexRemoveRequest extends IYandexApi {
    /**
     * Результат выполнения действия
     */
    result?: string;
}
