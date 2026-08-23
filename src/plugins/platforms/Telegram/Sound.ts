import { ISoundInfo, SoundTokens, unlink, BotController } from '../../../index';
import { TelegramRequest, YandexSpeechKit } from '../API';
import { TTelegramChatId } from './interfaces/ITelegramPlatform';
import { getBaseDataSoundProcessing, getPlatformRequestData, getSoundToken } from '../Base/utils';
import { T_TELEGRAM } from './constants';

/** Возвращает ID чата, в котором нужно отправить аудио. */
function getChatId(controller: BotController): TTelegramChatId {
    const requestData = getPlatformRequestData<{ chatId?: TTelegramChatId }>(
        controller,
        T_TELEGRAM,
    );
    return requestData.chatId ?? (controller.userId as TTelegramChatId);
}

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
        const sound = await api.sendAudio(getChatId(controller), path);
        isCbCalled = true;

        if (sound?.ok && sound.result?.audio?.file_id !== undefined) {
            model.soundToken = sound.result.audio.file_id;
            if (await model.save(true)) {
                return model.soundToken;
            }
        }
        return null;
    });

    if (!isCbCalled && result) {
        await new TelegramRequest(controller.appContext).sendAudio(getChatId(controller), result);
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
    const { text } = soundInfo;
    const data: string[] = await getBaseDataSoundProcessing(soundInfo, controller, getSoundInDB);
    if (text) {
        const token = controller.appContext.appConfig.tokens[T_TELEGRAM]?.speech_kit_token;
        if (!token) {
            controller.appContext.logWarn('Telegram: speech_kit_token не настроен, TTS недоступен');
            return data;
        }
        const speechKit = new YandexSpeechKit(token as string, controller.appContext);
        const content = await speechKit.getTts(text);
        if (content) {
            await new TelegramRequest(controller.appContext).sendAudio(
                getChatId(controller),
                content.fileName,
            );
            try {
                await unlink(content.fileName);
            } catch {
                // Игнорируем ошибку удаления временного файла
            }
        }
    }
    return data;
}
