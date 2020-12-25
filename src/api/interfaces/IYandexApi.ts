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
    /**
     * Ошибка при загрузке файла
     */
    error?: string;
}
