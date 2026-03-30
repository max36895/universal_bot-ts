import { ICardInfo, ImageTokens, Text, BotController } from '../../../index';

import { IMaxCard, MaxRequest } from '../API';
import { getImageToken } from '../Base/utils';
import { T_MAX_APP } from './constants';

/**
 * Получение токена, необходимого для отображения картинок в карточке Max
 * @param controller Контроллер приложения
 * @param path Путь до картинки
 */
export async function getImageInDB(
    controller: BotController,
    path: string,
): Promise<string | null> {
    return getImageToken(path, T_MAX_APP, controller, async (model: ImageTokens) => {
        const api = new MaxRequest(controller.appContext);
        const upload = await api.upload(path, 'image');
        if (upload?.token || upload?.url) {
            model.imageToken = upload.token || upload.url;
            if (await model.save(true)) {
                return model.imageToken;
            }
        }
        return null;
    });
}

/**
 * Получает карточку для отображения в Max.
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @returns {Promise<IMaxCard[]>} Карточка или null
 */
export async function cardProcessing(
    cardInfo: ICardInfo,
    controller: BotController,
): Promise<IMaxCard[] | null> {
    if (cardInfo.images.length === 1 || cardInfo.showOne) {
        if (!cardInfo.images[0].imageToken) {
            if (cardInfo.images[0].imageDir) {
                // eslint-disable-next-line require-atomic-updates
                cardInfo.images[0].imageToken = await getImageInDB(
                    controller,
                    cardInfo.images[0].imageDir,
                );
            }
        }
        if (cardInfo.images[0].imageToken) {
            return [
                {
                    type: 'image',
                    payload: {
                        [Text.isUrl(cardInfo.images[0].imageToken) ? 'url' : 'token']:
                            cardInfo.images[0].imageToken,
                    },
                },
            ];
        }
    } else {
        const elements = [];
        for (let i = 0; i < cardInfo.images.length; i++) {
            const image = cardInfo.images[i];
            if (!image.imageToken && image.imageDir) {
                image.imageToken = await getImageInDB(controller, image.imageDir);
            }
            if (image.imageToken) {
                elements.push(image.imageToken);
            }
        }
        if (elements.length) {
            return [
                {
                    type: 'image',
                    payload: {
                        photos: elements,
                    },
                },
            ];
        }
    }
    return null;
}
