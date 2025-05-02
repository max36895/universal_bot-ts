/**
 * Интерфейс для аудио-записей
 */
export interface ISound {
    /**
     * Ключ
     */
    key: string;
    /**
     * Звуки, соответствующие ключу
     */
    sounds: string[];
}
