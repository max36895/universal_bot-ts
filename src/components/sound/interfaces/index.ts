/**
 * @interface ISound
 * Интерфейс для работы с аудио-записями в различных платформах
 *
 * Используется для определения звуков, которые могут быть воспроизведены
 * в ответ на определенные ключевые слова или события.
 *
 * @example
 * ```ts
 * // Пример определения звука приветствия
 * const greetingSound: ISound = {
 *     key: "#greeting#",
 *     sounds: [
 *         "alisa_sounds/greeting_1",
 *         "alisa_sounds/greeting_2"
 *     ]
 * };
 *
 * // Пример определения звука ошибки
 * const errorSound: ISound = {
 *     key: "#error#",
 *     sounds: ["alisa_sounds/error"]
 * };
 * ```
 */
export interface ISound {
    /**
     * Ключ. Рекомендуется ключи формировать в следующем виде: "#my_key#"
     */
    key: string;
    /**
     * Звуки, соответствующие ключу
     */
    sounds: string[];
}

/**
 * Интерфейс для звуковых эффектов
 */
export interface IEffect {
    /**
     * Ключ
     */
    key: string;
    /**
     * Звуки, соответствующие ключу
     */
    effect: string;
}
