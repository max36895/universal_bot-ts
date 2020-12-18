export interface IYandexCheckOutPlace {
    /**
     * Сколько всего места
     */
    total: number;
    /**
     * Сколько места осталось
     */
    used: string;
}

export interface IYandexRequestDownloadImage {
    /**
     * Ид загруженой картинки
     */
    id: string;
    /**
     * Оригинальный адрес, с которого была загружена картинка
     */
    origUrl: string;
    /**
     * Размер картинки
     */
    size: number;
    /**
     * Дата загрузки картинки
     */
    createdAt: number;
}

export interface IYandexRequestDownloadSound {
    /**
     * Ид загруженного звука
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
