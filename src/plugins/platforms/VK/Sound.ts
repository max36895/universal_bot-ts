import { ISoundInfo, unlink, BotController } from '../../../index';
import { YandexSpeechKit, VkRequest } from '../API';
import { getBaseDataSoundProcessing, getSoundToken } from '../Base/utils';
import { T_VK } from './constants';

/**
 * Получение токена, необходимого для воспроизведения звуков в Vk
 * @param controller Контроллер приложения
 * @param path Путь до аудиофайла
 * @param isAttachContent Определяет передано ли содержимое файла или сам файл
 */
export async function getSoundInDB(
    controller: BotController,
    path: string,
    isAttachContent: boolean = false,
): Promise<string | null> {
    return getSoundToken(path, T_VK, controller, async (model) => {
        const vkApi = new VkRequest(controller.appContext);
        vkApi.isAttachContent = isAttachContent;
        const uploadServerResponse = await vkApi.docsGetMessagesUploadServer(
            controller.userId as string,
            'audio_message',
        );
        if (uploadServerResponse) {
            const uploadResponse = await vkApi.upload(uploadServerResponse.upload_url, path);
            if (uploadResponse) {
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
 * Получение корректного ответа для озвучивания запроса пользователю VK
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
        const token = controller.appContext.appConfig.tokens[T_VK]?.speech_kit_token;
        if (!token) {
            controller.appContext.logWarn('VK: speech_kit_token не настроен, TTS недоступен');
            return data;
        }
        const speechKit = new YandexSpeechKit(token as string, controller.appContext);
        const content = await speechKit.getTts(text);
        let sText = null;
        if (content) {
            sText = await getSoundInDB(controller, content.fileName, true);
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
