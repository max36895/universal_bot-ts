import { ICardInfo, ImageTokens, Text, BotController } from '../../../index';

import { TelegramRequest } from '../API';
import { ITelegramMedia, TTelegramChatId } from './interfaces/ITelegramPlatform';
import { getImageToken, getPlatformRequestData } from '../Base/utils';
import { T_TELEGRAM } from './constants';

const MAX_TELEGRAM_MEDIA_GROUP_ITEMS = 10;

/** Возвращает ID чата, в котором нужно отправить медиа. */
function getChatId(controller: BotController): TTelegramChatId {
    const requestData = getPlatformRequestData<{ chatId?: TTelegramChatId }>(
        controller,
        T_TELEGRAM,
    );
    return requestData.chatId ?? (controller.userId as TTelegramChatId);
}

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
        const photo = await api.sendPhoto(getChatId(controller), path, caption || undefined);
        isCbCalled = true;

        if (photo?.ok && photo.result?.photo?.length) {
            const lastPhoto = photo.result.photo[photo.result.photo.length - 1];
            model.imageToken = lastPhoto.file_id;
            if (await model.save(true)) {
                return model.imageToken;
            }
        }
        return null;
    });

    if (!isCbCalled && result) {
        await new TelegramRequest(controller.appContext).sendPhoto(
            getChatId(controller),
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
 * @returns {Promise<ITelegramMedia[] | null>} Массив медиа-объектов или null, если нечего отобразить
 */
export async function cardProcessing(
    cardInfo: ICardInfo,
    controller: BotController,
): Promise<ITelegramMedia[] | null> {
    let object: ITelegramMedia[] | null = null;
    // Защита от пустого массива images при showOne=true
    if (cardInfo.images.length === 0) {
        return null;
    }
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
                    getChatId(controller),
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
        for (
            let i = 0;
            i < cardInfo.images.length && object.length < MAX_TELEGRAM_MEDIA_GROUP_ITEMS;
            i++
        ) {
            const image = cardInfo.images[i];
            let field: string | null;
            if (!image.imageToken) {
                if (image.imageDir) {
                    field = Text.isUrl(image.imageDir)
                        ? image.imageDir
                        : `attach://${image.imageDir}`;
                } else {
                    continue;
                }
            } else {
                field = image.imageToken;
            }
            object.push({
                type: 'photo',
                media: field,
                caption: Text.resize(image.desc, 1024),
            });
        }
        // Telegram API требует 2-10 элементов для sendMediaGroup.
        // Если после фильтрации осталось < 2 элементов — отправляем через sendPhoto.
        if (object.length === 1) {
            const media = object[0];
            // Префикс attach:// нужен только для FormData в sendMediaGroup:
            // sendPhoto ожидает локальный путь, URL или file_id.
            const photo = media.media.startsWith('attach://')
                ? media.media.replace('attach://', '')
                : media.media;
            await new TelegramRequest(controller.appContext).sendPhoto(
                getChatId(controller),
                photo,
                media.caption || undefined,
            );
            return null;
        }
    }

    return object;
}
