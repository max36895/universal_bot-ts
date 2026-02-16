import { ISoundInfo, isFile, Text, SoundTokens, unlink, BotController } from '../../../index';
import { TelegramRequest, YandexSpeechKit } from '../API';
import { TTelegramChatId } from './interfaces/ITelegramPlatform';
import { getSoundToken } from '../Base/utils';
import { T_TELEGRAM } from './constants';

/**
 * Получение токена, необходимого для воспроизведения звуков в Telegram
 * @param controller Контроллер приложения
 * @param path Путь до аудиофайла
 */
export async function getSoundInDB(
    controller: BotController,
    path: string,
): Promise<string | null> {
    let isCbCalled = false;
    const result = await getSoundToken(path, T_TELEGRAM, controller, async (model: SoundTokens) => {
        const api = new TelegramRequest(controller.appContext);
        const sound = await api.sendAudio(controller.userId as string, path);
        isCbCalled = true;

        if (sound?.ok && sound.result?.audio && typeof sound.result.audio.file_id !== 'undefined') {
            model.soundToken = sound.result.audio.file_id;
            if (await model.save(true)) {
                return model.soundToken;
            }
        }
        return null;
    });

    if (!isCbCalled && result) {
        await new TelegramRequest(controller.appContext).sendAudio(
            controller.userId as string,
            result,
        );
    }

    return result;
}

/**
 * Получение корректного ответа для озвучивания запроса пользователю Telegram
 * @param soundInfo Информация необходимая для обработки аудио
 * @param controller Контроллер приложения
 */
export async function soundProcessing(
    soundInfo: ISoundInfo,
    controller: BotController,
): Promise<string[]> {
    const { sounds, text } = soundInfo;
    const data: string[] = [];
    if (sounds) {
        for (let i = 0; i < sounds.length; i++) {
            const sound = sounds[i];
            if (sound) {
                if (typeof sound.sounds !== 'undefined' && typeof sound.key !== 'undefined') {
                    let sText: string | null = Text.getText(sound.sounds);
                    if (isFile(sText) || Text.isUrl(sText)) {
                        sText = await getSoundInDB(controller, sText);
                    } else {
                        await new TelegramRequest(controller.appContext).sendAudio(
                            controller.userId as TTelegramChatId,
                            sText,
                        );
                    }

                    if (sText) {
                        data.push(sText);
                    }
                }
            }
        }
    }
    if (text) {
        const speechKit = new YandexSpeechKit(
            controller.appContext.appConfig.tokens[T_TELEGRAM].speech_kit_token,
            controller.appContext,
        );
        const content = await speechKit.getTts(text);
        if (content) {
            await new TelegramRequest(controller.appContext).sendAudio(
                controller.userId as TTelegramChatId,
                content.fileName,
            );
            unlink(content.fileName);
        }
    }
    return data;
}
