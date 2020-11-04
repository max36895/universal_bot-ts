/**
 * Class TemplateSoundTypes
 * @package bot\components\sound\types
 *
 * Шаблонный класс для второстепенных классов.
 * Нужен для воспроизведения звуков в ответе пользователю.
 */
import {ISound} from "../interfaces/sound";

export interface TemplateSoundTypes {
    /**
     * Получить звуки, которые необходимо отобразить в приложении.
     * В случае Алисы это tts.
     *
     * @param sounds Массив звуков.
     * @param text Исходный текст.
     * @return any
     */
    getSounds(sounds: ISound[], text: string): any;
}
