import {TemplateSoundTypes} from "./TemplateSoundTypes";
import {ISound} from "../interfaces/sound";
import {Text} from "../../standard/Text";
import {is_file} from "../../../utils";
import {mmApp} from "../../../core/mmApp";
import {TelegramRequest, YandexSpeechKit} from "../../../api";
import {SoundTokens} from "../../../models/SoundTokens";

/**
 * Класс отвечающий за отправку голосовых сообщений в Телеграме.
 * @class TelegramSound
 */
export class TelegramSound implements TemplateSoundTypes {
    /**
     * Возвращаем массив с воспроизводимыми звуками.
     * В случае если передается параметр text, то отправляется запрос в Yandex SpeechKit, для преобразования текста в голос.
     *
     * @param {ISound[]} sounds Массив звуков.
     * @param {string} text Исходный текст.
     * @return {Promise<string[]>}
     * @api
     */
    public async getSounds(sounds: ISound[], text: string = ''): Promise<string[]> {
        const data: string[] = [];
        if (sounds) {
            for (let i = 0; i < sounds.length; i++) {
                const sound = sounds[i];
                if (sound) {
                    if (sound.sounds && sound.key) {
                        let sText = Text.getText(sound.sounds);
                        if (is_file(sText) || Text.isSayText(['http\:\/\/', 'https\:\/\/'], sText)) {
                            const sModel = new SoundTokens();
                            sModel.type = SoundTokens.T_TELEGRAM;
                            sModel.path = sText;
                            sText = await sModel.getToken();
                        } else {
                            await (new TelegramRequest()).sendAudio(mmApp.params.user_id, sText);
                        }

                        if (sText) {
                            data.push(sText);
                        }
                    }
                }
            }
        }
        if (text) {
            const speechKit = new YandexSpeechKit();
            const content = await speechKit.getTts(text);
            if (content) {
                await (new TelegramRequest()).sendAudio(mmApp.params.user_id, content);
            }
        }
        return data;
    }
}
