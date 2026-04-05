import { ICardInfo, ImageTokens, Text, BotController } from '../../../index';

import { TelegramRequest } from '../API';
import { ITelegramMedia, TTelegramChatId } from './interfaces/ITelegramPlatform';
import { getImageToken } from '../Base/utils';
import { T_TELEGRAM } from './constants';

/**
 * Получение токена, необходимого для отображения картинок в карточке Телеграм
 * @param controller Контроллер приложения
 * @param path Путь до картинки
 * @param caption Заголовок для картинки
 */
export async function getImageInDB(
    controller: BotController,
    path: string,
    caption: string,
): Promise<string | null> {
    let isCbCalled = false;
    const result = await getImageToken(path, T_TELEGRAM, controller, async (model: ImageTokens) => {
        const api = new TelegramRequest(controller.appContext);
        const photo = await api.sendPhoto(controller.userId as string, path, caption || undefined);
        isCbCalled = true;

        if (photo?.ok && photo.result?.photo?.file_id) {
            model.imageToken = photo.result.photo.file_id;
            if (await model.save(true)) {
                return model.imageToken;
            }
        }
        return null;
    });

    if (!isCbCalled && result) {
        await new TelegramRequest(controller.appContext).sendPhoto(
            controller.userId as string,
            result,
            caption || undefined,
        );
    }

    return result;
}

/**
 * Получает карточку для отображения в Telegram.
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @returns {Promise<ITelegramMedia[]>} Карточка или null
 */
export async function cardProcessing(
    cardInfo: ICardInfo,
    controller: BotController,
): Promise<ITelegramMedia[] | null> {
    let object: ITelegramMedia[] | null = null;
    if (cardInfo.showOne || cardInfo.images.length === 1) {
        const image = cardInfo.images[0];
        try {
            if (!image.imageToken) {
                if (image.imageDir) {
                    image.imageToken = await getImageInDB(
                        controller,
                        image.imageDir,
                        Text.resize(image.desc, 1024),
                    );
                }
            } else {
                await new TelegramRequest(controller.appContext).sendPhoto(
                    controller.userId as TTelegramChatId,
                    image.imageToken,
                    Text.resize(image.desc, 1024),
                );
            }
        } catch (e) {
            // Логируем ошибку, но не прерываем цикл
            controller.appContext.logError(
                `Telegram.cardProcessing(): Произошла ошибка при загрузке изображения для Telegram`,
                {
                    error: e,
                },
            );
        }
        return object;
    } else {
        object = [];
        for (let i = 0; i < cardInfo.images.length; i++) {
            const image = cardInfo.images[i];
            let field: string | null;
            if (!image.imageToken) {
                if (image.imageDir) {
                    field = `attach://${image.imageDir}`;
                } else {
                    continue;
                }
            } else {
                field = image.imageToken;
            }
            object.push({
                type: 'photo',
                media: field,
                caption: Text.resize(image.desc, 200),
            });
        }
    }

    return object;
}
