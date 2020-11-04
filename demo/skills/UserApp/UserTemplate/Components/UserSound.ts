import {TemplateSoundTypes} from "../../../../../src/MM/bot/components/sound/types/TemplateSoundTypes";
import {ISound} from "../../../../../src/MM/bot/components/sound/interfaces/sound";
import {YandexSpeechKit} from "../../../../../src/MM/bot/api/YandexSpeechKit";
import {Text} from "../../../../../src/MM/bot/components/standard/Text";

export class UserSound implements TemplateSoundTypes {
    /**
     * Возвращает массив с отображаемыми звуками.
     * В случае если передается параметр text, то можно отправить запрос в Yandex SpeechKit, для преобразования текста в голос
     *
     * @param sounds Массив звуков
     * @param text Исходный текст
     * @return array
     */
    public getSounds(sounds: ISound[], text: string = ''): string {
        if (sounds) {
            sounds.forEach((sound) => {
                if (sound) {
                    if (typeof sound.sounds !== 'undefined' && typeof sound.key !== 'undefined') {
                        /*
                         * Сохраняем данные в массив, либо отправляем данные через запрос
                         */
                        return Text.getText(sound.sounds);
                    }
                }
            })
        }
        /*
         * если есть необходимость для прочтения текста
         */
        if (text) {
            const speechKit = new YandexSpeechKit();
            const content = speechKit.getTts(text);
            if (content) {
                /*
                * Сохраняем данные в массив, либо отправляем данные через запрос.
                 * п.с. В content находится содержимое файла!
                */
            }
        }
        return null;
    }
}
