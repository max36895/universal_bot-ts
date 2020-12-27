import {ISound} from "../interfaces/sound";

/**
 * @class TemplateSoundTypes
 *
 * Шаблонный класс для обработки звуков.
 * Нужен для воспроизведения звуков в ответе пользователю.
 */
export interface TemplateSoundTypes {
    /**
     * Получение звуков, которые необходимо воспроизвести или отправить.
     * В случае Алисы, Маруси и Сбер это tts.
     *
     * @param {ISound[]} sounds Массив звуков.
     * @param {string} text Исходный текст.
     * @return any
     */
    getSounds(sounds: ISound[], text?: string): any;
}
