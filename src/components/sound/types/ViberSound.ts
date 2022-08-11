import {TemplateSoundTypes} from "./TemplateSoundTypes";
import {ISound} from "../interfaces/sound";
import {Text} from "../../standard/Text";
import {mmApp} from "../../../core/mmApp";
import {ViberRequest} from "../../../api/ViberRequest";

/**
 * Класс отвечающий за отправку голосовых сообщений в Viber.
 * @class ViberSound
 */
export class ViberSound implements TemplateSoundTypes {
    /**
     * Возвращаем массив с воспроизводимыми звуками.
     * В случае если передается параметр text, то отправляется запрос в Yandex SpeechKit, для преобразования текста в голос(не отправляется!).
     *
     * @param {ISound[]} sounds Массив звуков.
     * @param {string} text Исходный текст.
     * @return {Promise<string[]>}
     * @api
     */
    public async getSounds(sounds: ISound[], text: string = ''): Promise<string[]> {
        if (sounds) {
            sounds.forEach((sound) => {
                if (sound) {
                    if (typeof sound.sounds !== 'undefined' && typeof sound.key !== 'undefined') {
                        let sText = Text.getText(sound.sounds);
                        (new ViberRequest()).sendFile(<string>mmApp.params.user_id, sText);
                    }
                }
            })
        }
        /*
        if (text) {
            speechKit = new YandexSpeechKit();
            content = speechKit.getTts(text);
            if (content) {
                (new ViberRequest()).sendFile(mmApp.params['user_id'], content);
            }
        }*/
        return [];
    }
}
