import {ISound} from "../interfaces/sound";
import {TemplateSoundTypes} from "./TemplateSoundTypes";
import {is_file} from "../../../utils/functins";
import {Text} from "../../standard/Text";
import {SoundTokens} from "../../../models/SoundTokens";
import {YandexSpeechKit} from "../../../api/YandexSpeechKit";

/**
 * Класс отвечающий за отправку голосовых сообщений в ВКонтакте.
 * @class VkSound
 */
export class VkSound implements TemplateSoundTypes {
    /**
     * Возвращаем массив с отображаемыми звуками.
     * В случае если передается параметр text, то отправляется запрос в Yandex SpeechKit, для преобразования текста в голос.
     *
     * @param {ISound[]} sounds Массив звуков.
     * @param {string} text Исходный текст.
     * @return string[]
     * @api
     */
    public getSounds(sounds: ISound[], text: string = ''): string[] {
        const data: string[] = [];
        if (sounds) {
            sounds.forEach((sound) => {
                if (sound) {
                    if (typeof sound.sounds !== 'undefined' && typeof sound.key !== 'undefined') {
                        let sText = Text.getText(sound.sounds);
                        if (is_file(sText) || Text.isSayText(['http\:\/\/', 'https\:\/\/'], sText)) {
                            const sModel = new SoundTokens();
                            sModel.type = SoundTokens.T_VK;
                            sModel.path = sText;
                            sText = sModel.getToken();
                        }

                        if (sText) {
                            data.push(sText);
                        }
                    }
                }
            });
        }
        if (text) {
            const speechKit = new YandexSpeechKit();
            const content = speechKit.getTts(text);
            let sText = null;
            if (content) {
                const sModel = new SoundTokens();
                sModel.type = SoundTokens.T_VK;
                sModel.isAttachContent = true;
                sModel.path = content;
                sText = sModel.getToken();
            }
            if (sText) {
                data.push(sText);
            }
        }
        return data;
    }
}
