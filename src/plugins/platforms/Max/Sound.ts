/**
 * Обработка звуков MAX: TTS через Yandex SpeechKit и отправка аудиофайлов через /uploads.
 */
import { ISoundInfo, isFile, Text, unlink, BotController } from '../../../index';
import { getSoundToken } from '../Base/utils';
import { IMaxAudio, MaxRequest, YandexSpeechKit } from '../API';
import { T_MAX_APP } from './constants';

/**
 * Получение токена, необходимого для воспроизведения звуков в MAX
 * @param controller Контроллер приложения
 * @param path Путь до аудиофайла
 * @returns Токен/URL загруженного аудио либо `null` при ошибке загрузки/сохранения
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
 * Получение корректного ответа для озвучивания запроса пользователю MAX:
 * загружает аудио (в т.ч. TTS через SpeechKit) как upload-token вложения.
 * @param soundInfo Информация необходимая для обработки аудио
 * @param controller Контроллер приложения
 * @returns Массив аудио-вложений IMaxAudio либо `null`, если не удалось получить ни одного звука (пустой результат)
 */
export async function soundProcessing(
    soundInfo: ISoundInfo,
    controller: BotController,
): Promise<IMaxAudio[] | null> {
    const { sounds, text } = soundInfo;
    const data: IMaxAudio[] = [];
    if (sounds) {
        for (let i = 0; i < sounds.length; i++) {
            const sound = sounds[i];
            if (sound?.sounds !== undefined && sound?.key !== undefined) {
                let sText: string | null = Text.getText(sound.sounds);
                if (Text.isUrl(sText)) {
                    controller.appContext.logWarn(
                        'Max.soundProcessing(): MAX принимает аудио только по upload-token; URL пропущен.',
                    );
                    continue;
                }
                if (await isFile(sText)) {
                    sText = await getSoundInDB(controller, sText);
                }

                if (sText) {
                    data.push({ type: 'audio', payload: { token: sText } });
                }
            }
        }
    }
    if (text) {
        const token = controller.appContext.appConfig.tokens[T_MAX_APP]?.speech_kit_token;
        if (!token) {
            controller.appContext.logWarn('Max: speech_kit_token не настроен, TTS недоступен');
            return data.length ? data : null;
        }
        const speechKit = new YandexSpeechKit(token as string, controller.appContext);
        const content = await speechKit.getTts(text);
        let sText = null;
        if (content) {
            sText = await getSoundInDB(controller, content.fileName);
            try {
                await unlink(content.fileName);
            } catch {
                // Игнорируем ошибку удаления временного файла
            }
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
