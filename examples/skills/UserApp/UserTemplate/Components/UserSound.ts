import { TemplateSoundTypes, ISound, YandexSpeechKit, Text } from '../../../../../src';

export class UserSound implements TemplateSoundTypes {
    /**
     * Возвращаем массив с воспроизводимыми звуками.
     * В случае если передается параметр text, то можно отправить запрос в Yandex SpeechKit, для преобразования текста в голос
     *
     * @param sounds Массив звуков
     * @param text Исходный текст
     * @return {Promise<string>}
     */
    public async getSounds(sounds: ISound[], text: string = ''): Promise<string | null> {
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
            });
        }
        /*
         * если есть необходимость для прочтения текста
         */
        if (text) {
            const speechKit = new YandexSpeechKit();
            const content = await speechKit.getTts(text);
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
