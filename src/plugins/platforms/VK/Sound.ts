import { ISoundInfo, isFile, Text, unlink, BotController } from '../../../index';
import { YandexSpeechKit, VkRequest } from '../API';
import { getSoundToken } from '../Base/utils';
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
    const { sounds, text } = soundInfo;
    const data: string[] = [];
    if (sounds) {
        for (let i = 0; i < sounds.length; i++) {
            const sound = sounds[i];
            if (sound.sounds !== undefined && sound.key !== undefined) {
                let sText: string | null = Text.getText(sound.sounds);
                if (Text.isUrl(sText) || (await isFile(sText))) {
                    sText = await getSoundInDB(controller, sText);
                }

                if (sText) {
                    data.push(sText);
                }
            }
        }
    }
    if (text) {
        const speechKit = new YandexSpeechKit(
            controller.appContext.appConfig.tokens[T_VK].speech_kit_token as string,
            controller.appContext,
        );
        const content = await speechKit.getTts(text);
        let sText = null;
        if (content) {
            sText = await getSoundInDB(controller, content.fileName, true);
            unlink(content.fileName);
        }
        if (sText) {
            data.push(sText);
        }
    }
    return data;
}
