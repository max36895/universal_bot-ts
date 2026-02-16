import { Button, ICardInfo, Text, BotController } from '../../../index';

import { buttonProcessing } from './Button';
import { YandexImageRequest } from '../API';
import { getImageToken } from '../Base/utils';
import {
    IAlisaBigImage,
    IAlisaButtonCard,
    IAlisaImage,
    IAlisaImageGallery,
    IAlisaItemsList,
} from './interfaces/IAlisaPlatform';
import {
    T_ALISA,
    ALISA_CARD_BIG_IMAGE,
    ALISA_MAX_IMAGES,
    ALISA_CARD_ITEMS_LIST,
    ALISA_MAX_GALLERY_IMAGES,
} from './constants';

/**
 * Возвращает кнопки для кнопок в нужном для Алисы виде
 * @param buttons Кнопки для отображения
 */
export function alisaCardButton(buttons: Button[]): IAlisaButtonCard {
    return buttonProcessing(buttons, true) as IAlisaButtonCard;
}

/**
 * Получение токена, необходимого для отображения картинок в карточке Алисы
 * @param controller Контроллер приложения
 * @param path Путь до картинки
 */
export async function getValueInDB(
    controller: BotController,
    path: string,
): Promise<string | null> {
    return getImageToken(path, T_ALISA, controller, async (model) => {
        const yImage = new YandexImageRequest(
            controller.appContext.appConfig.tokens[T_ALISA].token,
            controller.platformOptions.appId,
            controller.appContext,
        );
        const result = Text.isUrl(path)
            ? await yImage.downloadImageUrl(path)
            : await yImage.downloadImageFile(path);
        if (result?.id) {
            model.imageToken = result?.id;
            if (await model.save(true)) {
                return model.imageToken;
            }
        }
        return null;
    });
}

/**
 * Получает элементы карточки для Алисы.
 *
 * Процесс работы:
 * 1. Определяет максимальное количество изображений:
 *    - Для галереи: ALISA_MAX_GALLERY_IMAGES (7)
 *    - Для списка: ALISA_MAX_IMAGES (5)
 * 2. Обрабатывает каждое изображение:
 *    - Создает токен изображения, если его нет
 *    - Добавляет кнопки (если не галерея)
 *    - Ограничивает длину текста:
 *      * Заголовок: 128 символов
 *      * Описание: 256 символов
 *
 * @returns {Promise<IAlisaImage[]>} Массив элементов карточки
 */
async function _getItem(cardInfo: ICardInfo, controller: BotController): Promise<IAlisaImage[]> {
    const items: IAlisaImage[] = [];
    const maxCount = cardInfo.usedGallery ? ALISA_MAX_GALLERY_IMAGES : ALISA_MAX_IMAGES;
    const images = cardInfo.images.slice(0, maxCount);
    for (const image of images) {
        let button: IAlisaButtonCard | null = null;
        if (!cardInfo.usedGallery) {
            button = image.button.getButtons<IAlisaButtonCard>(alisaCardButton);
            if (!button?.text) {
                button = null;
            }
        }
        if (!image.imageToken) {
            if (image.imageDir) {
                image.imageToken = await getValueInDB(controller, image.imageDir);
            }
        }
        const item: IAlisaImage = {
            title: Text.resize(image.title, 128),
        };
        if (!cardInfo.usedGallery) {
            item.description = Text.resize(image.desc, 256);
        }
        if (image.imageToken) {
            item.image_id = image.imageToken;
        }
        if (button && !cardInfo.usedGallery) {
            item.button = button;
        }
        items.push(item);
    }
    return items;
}

/**
 * Получает карточку для отображения в Алисе.
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @returns {Promise<IAlisaBigImage | IAlisaItemsList | IAlisaImageGallery | null>} Карточка или null
 */
export async function cardProcessing(
    cardInfo: ICardInfo,
    controller: BotController,
): Promise<IAlisaBigImage | IAlisaItemsList | IAlisaImageGallery | null> {
    const countImage = cardInfo.images.length;
    if (countImage) {
        if (cardInfo.showOne) {
            if (!cardInfo.images[0].imageToken) {
                if (cardInfo.images[0].imageDir) {
                    // eslint-disable-next-line require-atomic-updates
                    cardInfo.images[0].imageToken = await getValueInDB(
                        controller,
                        cardInfo.images[0].imageDir,
                    );
                }
            }
            if (cardInfo.images[0].imageToken) {
                let button: IAlisaButtonCard | null =
                    cardInfo.images[0].button.getButtons(alisaCardButton);
                if (!button?.text) {
                    button = cardInfo.buttons.getButtons(alisaCardButton);
                }
                const object: IAlisaBigImage = {
                    type: ALISA_CARD_BIG_IMAGE,
                    image_id: cardInfo.images[0].imageToken,
                    title: Text.resize(cardInfo.images[0].title, 128),
                    description: Text.resize(cardInfo.images[0].desc, 256),
                };
                if (button?.text) {
                    object.button = button;
                }
                return object;
            }
        } else {
            if (cardInfo.usedGallery) {
                const object: IAlisaImageGallery = {
                    type: 'ImageGallery',
                };
                object.items = await _getItem(cardInfo, controller);
                return object;
            } else {
                const object: IAlisaItemsList = {
                    type: ALISA_CARD_ITEMS_LIST,
                    header: {
                        text: Text.resize(cardInfo.title || '', 64),
                    },
                };
                object.items = await _getItem(cardInfo, controller);
                const btn: IAlisaButtonCard | null = cardInfo.buttons.getButtons(alisaCardButton);
                if (btn?.text) {
                    object.footer = {
                        text: btn.text,
                        button: btn,
                    };
                }
                return object;
            }
        }
    }
    return null;
}
