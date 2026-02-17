import { Button, ICardInfo, Text, BotController } from '../../../index';

import { buttonProcessing } from './Button';
import { MarusiaRequest } from '../API';
import { getImageToken } from '../Base/utils';
import {
    IMarusiaImage,
    IMarusiaButtonCard,
    IMarusiaBigImage,
    IMarusiaItemsList,
} from './interfaces/IMarusiaPlatform';
import {
    T_MARUSIA,
    MARUSIA_MAX_IMAGES,
    MARUSIA_CARD_BIG_IMAGE,
    MARUSIA_CARD_ITEMS_LIST,
} from './constants';

/**
 * Возвращает кнопки для кнопок в нужном для Алисы виде
 * @param buttons Кнопки для отображения
 */
function marusiaCardButton(buttons: Button[]): IMarusiaButtonCard {
    return buttonProcessing(buttons, true) as IMarusiaButtonCard;
}
/**
 * Получение токена, необходимого для отображения картинок в карточке Марусе
 * @param controller Контроллер приложения
 * @param path Путь до картинки
 */
export async function getValueInDB(
    controller: BotController,
    path: string,
): Promise<string | null> {
    return getImageToken(path, T_MARUSIA, controller, async (model) => {
        const mImage = new MarusiaRequest(controller.appContext);
        const uploadLink = await mImage.marusiaGetPictureUploadLink();
        if (!uploadLink) {
            return null;
        }

        const upload = await mImage.upload(uploadLink.picture_upload_link, path);
        if (!upload) {
            return null;
        }

        const picture = await mImage.marusiaSavePicture(upload.photo, upload.server, upload.hash);
        if (picture?.photo_id) {
            model.imageToken = picture.photo_id;
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
async function _getItem(cardInfo: ICardInfo, controller: BotController): Promise<IMarusiaImage[]> {
    const items: IMarusiaImage[] = [];
    const images = cardInfo.images.slice(0, MARUSIA_MAX_IMAGES);
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        let button: IMarusiaButtonCard | null =
            image.button.getButtons<IMarusiaButtonCard>(marusiaCardButton);
        if (!button?.text) {
            button = null;
        }
        if (!image.imageToken) {
            if (image.imageDir) {
                image.imageToken = await getValueInDB(controller, image.imageDir);
            }
        }
        const item: IMarusiaImage = {
            title: Text.resize(image.title, 128),
        };
        item.description = Text.resize(image.desc, 256);

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
 * Получает карточку для отображения в Марусе.
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @returns {Promise<IMarusiaButtonCard | IMarusiaItemsList | IMarusiaBigImage | null>} Карточка или null
 */
export async function cardProcessing(
    cardInfo: ICardInfo,
    controller: BotController,
): Promise<IMarusiaButtonCard | IMarusiaItemsList | IMarusiaBigImage | null> {
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
                let button: IMarusiaButtonCard | null =
                    cardInfo.images[0].button.getButtons(marusiaCardButton);
                if (!button?.text) {
                    button = cardInfo.buttons.getButtons(marusiaCardButton);
                }
                const object: IMarusiaBigImage = {
                    type: MARUSIA_CARD_BIG_IMAGE,
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
            const object: IMarusiaItemsList = {
                type: MARUSIA_CARD_ITEMS_LIST,
                header: {
                    text: Text.resize(cardInfo.title || '', 64),
                },
            };
            object.items = await _getItem(cardInfo, controller);
            const btn: IMarusiaButtonCard | null = cardInfo.buttons.getButtons(marusiaCardButton);
            if (btn?.text) {
                object.footer = {
                    text: btn.text,
                    button: btn,
                };
            }
            return object;
        }
    }
    return null;
}
