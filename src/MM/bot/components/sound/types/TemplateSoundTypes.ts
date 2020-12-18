import {ISound} from "../interfaces/sound";

/**
 * Class TemplateSoundTypes
 * @class bot\components\sound\types
 *
 * Шаблонный класс для второстепенных классов.
 * Нужен для воспроизведения звуков в ответе пользователю.
 */
export interface TemplateSoundTypes {
    /**
     * Получить звуки, которые необходимо отобразить в приложении.
     * В случае Алисы, Маруси и Сбер это tts.
     *
     * @param {ISound[]} sounds Массив звуков.
     * @param {string} text Исходный текст.
     * @return any
     */
    getSounds(sounds: ISound[], text?: string): any;
}
