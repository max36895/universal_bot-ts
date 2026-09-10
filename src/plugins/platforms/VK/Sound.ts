import { ISoundInfo, Text, unlink, BotController } from '../../../index';
import { YandexSpeechKit, VkRequest } from '../API';
import { getBaseDataSoundProcessing, getPlatformRequestData, getSoundToken } from '../Base/utils';
import { T_VK } from './constants';

/**
 * Возвращает peer_id диалога, из которого пришёл запрос.
 */
function getPeerId(controller: BotController): string | number {
    const requestData = getPlatformRequestData<{ peerId?: string | number }>(controller, T_VK);
    return requestData.peerId ?? (controller.userId as string | number);
}

/**
 * Получение токена, необходимого для воспроизведения звуков в Vk
 * @param controller Контроллер приложения
 * @param path Путь до аудиофайла (URL не поддерживается — VK требует загрузку файла)
 * @param isAttachContent Определяет передано ли содержимое файла или сам файл
 * @returns Строка-вложение (doc<owner_id>_<id>) либо `null` при ошибке загрузки/сохранения
 */
export async function getSoundInDB(
    controller: BotController,
    path: string,
    isAttachContent: boolean = false,
): Promise<string | null> {
    if (Text.isUrl(path)) {
        controller.appContext.logWarn(
            'VK.getSoundInDB(): VK принимает голосовые сообщения только после загрузки файла; URL пропущен.',
        );
        return null;
    }
    return getSoundToken(path, T_VK, controller, async (model) => {
        const vkApi = new VkRequest(controller.appContext);
        vkApi.isAttachContent = isAttachContent;
        const uploadServerResponse = await vkApi.docsGetMessagesUploadServer(
            getPeerId(controller),
            'audio_message',
        );
        if (uploadServerResponse) {
            const uploadResponse = await vkApi.upload(uploadServerResponse.upload_url, path);
            if (uploadResponse?.file) {
                const doc = await vkApi.docsSave(uploadResponse.file, 'Voice message');
                if (doc) {
                    model.soundToken = `doc${doc.owner_id}_${doc.id}`;
                    if (await model.save(true)) {
                        return model.soundToken;
                    }
                }
            }
        }
        return null;
    });
}

/**
 * Получение корректного ответа для озвучивания запроса пользователю VK:
 * загружает аудио (в т.ч. TTS через SpeechKit) как голосовое сообщение.
 * @param soundInfo Информация необходимая для обработки аудио
 * @param controller Контроллер приложения
 * @returns Массив строк-вложений (doc<owner_id>_<id>) для отправки в attachments
 */
export async function soundProcessing(
    soundInfo: ISoundInfo,
    controller: BotController,
): Promise<string[]> {
    const { text } = soundInfo;
    const data: string[] = await getBaseDataSoundProcessing(soundInfo, controller, getSoundInDB);

    if (text) {
        const token = controller.appContext.appConfig.tokens[T_VK]?.speech_kit_token;
        if (!token) {
            controller.appContext.logWarn('VK: speech_kit_token не настроен, TTS недоступен');
            return data;
        }
        const speechKit = new YandexSpeechKit(token as string, controller.appContext);
        const content = await speechKit.getTts(text);
        let sText = null;
        if (content) {
            // SpeechKit возвращает путь к временному файлу, а не его содержимое.
            sText = await getSoundInDB(controller, content.fileName);
            try {
                await unlink(content.fileName);
            } catch {
                // Игнорируем ошибку удаления временного файла
            }
        }
        if (sText) {
            data.push(sText);
        }
    }
    return data;
}
