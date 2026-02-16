import { ISoundInfo, isFile, Text, unlink, BotController } from '../../../index';
import { getSoundToken } from '../Base/utils';
import { IMaxAudio, MaxRequest, YandexSpeechKit } from '../API';
import { T_MAX_APP } from './constants';

/**
 * Получение токена, необходимого для воспроизведения звуков в MAX
 * @param controller Контроллер приложения
 * @param path Путь до аудиофайла
 */
async function getSoundInDB(controller: BotController, path: string): Promise<string | null> {
    return getSoundToken(path, T_MAX_APP, controller, async (model) => {
        const api = new MaxRequest(controller.appContext);
        const upload = await api.upload(path, 'audio');
        if (upload?.token || upload?.url) {
            model.soundToken = upload.token || upload.url;
            if (await model.save(true)) {
                return model.soundToken;
            }
        }
        return null;
    });
}
/**
 * Получение корректного ответа для озвучивания запроса пользователю MAX
 * @param soundInfo Информация необходимая для обработки аудио
 * @param controller Контроллер приложения
 */
export async function soundProcessing(
    soundInfo: ISoundInfo,
    controller: BotController,
): Promise<IMaxAudio[] | null> {
    const { sounds, text } = soundInfo;
    const data: IMaxAudio[] = [];
    if (sounds) {
        for (const element of sounds) {
            const sound = element;
            if (sound) {
                if (sound.sounds !== undefined && sound.key !== undefined) {
                    let sText: string | null = Text.getText(sound.sounds);
                    if (isFile(sText) || Text.isUrl(sText)) {
                        sText = await getSoundInDB(controller, sText);
                    }

                    if (sText) {
                        data.push({ type: 'audio', payload: { token: sText } });
                    }
                }
            }
        }
    }
    if (text) {
        const speechKit = new YandexSpeechKit(
            controller.appContext.appConfig.tokens[T_MAX_APP].speech_kit_token,
            controller.appContext,
        );
        const content = await speechKit.getTts(text);
        let sText = null;
        if (content) {
            sText = await getSoundInDB(controller, content.fileName);
            unlink(content.fileName);
        }
        if (sText) {
            data.push({ type: 'audio', payload: { token: sText } });
        }
    }
    if (data.length) {
        return data;
    }
    return null;
}
