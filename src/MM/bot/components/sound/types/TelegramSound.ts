import {TemplateSoundTypes} from "./TemplateSoundTypes";
import {ISound} from "../interfaces/sound";
import {Text} from "../../standard/Text";
import {is_file} from "../../../utils/functins";
import {TelegramRequest} from "../../../api/TelegramRequest";
import {mmApp} from "../../../core/mmApp";
import {YandexSpeechKit} from "../../../api/YandexSpeechKit";
import {SoundTokens} from "../../../models/SoundTokens";

/**
 * Класс отвечающий за отправку голосовых сообщений в Телеграме.
 * Class TelegramSound
 * @class bot\components\sound\types
 */
export class TelegramSound implements TemplateSoundTypes {
    /**
     * Возвращает массив с отображаемыми звуками.
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
                    if (sound.sounds && sound.key) {
                        let sText = Text.getText(sound.sounds);
                        if (is_file(sText) || Text.isSayText(['http\:\/\/', 'https\:\/\/'], sText)) {
                            const sModel = new SoundTokens();
                            sModel.type = SoundTokens.T_TELEGRAM;
                            sModel.path = sText;
                            sText = sModel.getToken();
                        } else {
                            (new TelegramRequest()).sendAudio(mmApp.params.user_id, sText);
                        }

                        if (sText) {
                            data.push(sText);
                        }
                    }
                }
            })
        }
        if (text) {
            const speechKit = new YandexSpeechKit();
            const content = speechKit.getTts(text);
            if (content) {
                (new TelegramRequest()).sendAudio(mmApp.params.user_id, content);
            }
        }
        return data;
    }
}
