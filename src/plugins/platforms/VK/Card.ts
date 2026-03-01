import { ICardInfo, ImageTokens, BotController } from '../../../index';

import { buttonProcessing } from './Button';
import { VkRequest } from '../API';
import { getImageToken } from '../Base/utils';
import { IVkButton, IVkButtonObject, IVkCard, IVkCardElement } from './interfaces/IVkPlatform';
import { T_VK } from './constants';
/**
 * Получение токена, необходимого для отображения картинок в карточке ВК
 * @param controller Контроллер приложения
 * @param path Путь до картинки
 */
export async function getTokenInDB(
    controller: BotController,
    path: string,
): Promise<string | null> {
    return getImageToken(path, T_VK, controller, async (model: ImageTokens) => {
        const api = new VkRequest(controller.appContext);
        const server = await api.photosGetMessagesUploadServer(controller.userId as string);
        if (!server?.upload_url) {
            return null;
        }

        const upload = await api.upload(server.upload_url, path);
        if (!upload?.photo) {
            return null;
        }

        const photo = await api.photosSaveMessagesPhoto(upload.photo, upload.server, upload.hash);
        if (photo?.[0]?.id) {
            model.imageToken = `photo${photo[0].owner_id}_${photo[0].id}`;
            if (await model.save(true)) {
                return model.imageToken;
            }
        }
        return null;
    });
}

/**
 * Получает карточку для отображения в VK.
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @returns {Promise<IVkCard | string[]>} Карточка или null
 */
export async function cardProcessing(
    cardInfo: ICardInfo,
    controller: BotController,
): Promise<IVkCard | string[]> {
    const object: IVkCard | string[] = [];
    const countImage = cardInfo.images.length;
    if (countImage) {
        if (countImage === 1 || cardInfo.showOne) {
            if (!cardInfo.images[0].imageToken) {
                if (cardInfo.images[0].imageDir) {
                    // eslint-disable-next-line require-atomic-updates
                    cardInfo.images[0].imageToken = await getTokenInDB(
                        controller,
                        cardInfo.images[0].imageDir,
                    );
                }
            }
            if (cardInfo.images[0].imageToken) {
                object.push(cardInfo.images[0].imageToken);
                return object;
            }
        } else {
            const elements = [];
            for (let i = 0; i < cardInfo.images.length; i++) {
                const image = cardInfo.images[i];
                if (!image.imageToken) {
                    if (image.imageDir) {
                        image.imageToken = await getTokenInDB(controller, image.imageDir);
                    }
                }
                if (image.imageToken) {
                    if (cardInfo.usedGallery) {
                        const element: IVkCardElement = {
                            title: image.title,
                            description: image.desc,
                            photo_id: image.imageToken.replace('photo', ''),
                        };
                        const button = image.button?.getButtons<IVkButtonObject, IVkButton>(
                            buttonProcessing,
                        );
                        if (button?.buttons?.length) {
                            element.buttons = button.buttons.slice(0, 3) as IVkButton[];
                        }
                        elements.push(element);
                    } else {
                        const element: IVkCardElement = {
                            title: image.title,
                            description: image.desc,
                            photo_id: image.imageToken.replace('photo', ''),
                        };
                        const button = image.button?.getButtons<IVkButtonObject, IVkButton>(
                            buttonProcessing,
                        );
                        /*
                         * У карточки в любом случае должна быть хоть одна кнопка.
                         * Максимальное количество кнопок 3
                         */
                        if (button?.one_time) {
                            element.buttons = button.buttons.splice(0, 3) as IVkButton[];
                            element.action = { type: 'open_photo' };
                            elements.push(element);
                        }
                    }
                }
            }
            if (elements.length) {
                return {
                    type: 'carousel',
                    elements,
                };
            }
        }
    }
    return object;
}
