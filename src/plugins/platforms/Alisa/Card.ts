import { IButtonType, ICardInfo, Text, BotController } from '../../../index';

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
 * Возвращает кнопки в формате Алисы
 * @param buttons Кнопки для отображения
 */
export function alisaCardButton(buttons: IButtonType[]): IAlisaButtonCard {
    return buttonProcessing(buttons, true) as IAlisaButtonCard;
}

/**
 * Получение токена, необходимого для отображения картинок в карточке Алисы
 * @param controller Контроллер приложения
 * @param path Путь до картинки
 */
export async function getImageInDB(
    controller: BotController,
    path: string,
): Promise<string | null> {
    return getImageToken(path, T_ALISA, controller, async (model) => {
        const yImage = new YandexImageRequest(
            controller.appContext.appConfig.tokens[T_ALISA]?.token,
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
 *    - Для галереи: ALISA_MAX_GALLERY_IMAGES (10)
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
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const title = Text.resize(image.title || cardInfo.title || '', 128);
        let button: IAlisaButtonCard | null = null;
        if (!cardInfo.usedGallery && image.button) {
            button = image.button.getButtons<IAlisaButtonCard>(alisaCardButton);
            if (!button?.text) {
                button = null;
            }
        }
        if (!image.imageToken) {
            if (image.imageDir) {
                image.imageToken = await getImageInDB(controller, image.imageDir);
            }
        }
        // Документация платформы не помечает image_id обязательным, и карточка
        // с одним текстом — рабочий сценарий. Поэтому элемент без токена остаётся
        // в ответе; предупреждаем только тогда, когда картинку явно просили, но
        // получить её не удалось — иначе разработчик не поймёт, куда она делась.
        if (!image.imageToken && image.imageDir) {
            controller.appContext.logWarn(
                `[Alisa] Не удалось получить image_id для "${image.imageDir}". ` +
                    'Элемент карточки будет показан без изображения.',
            );
        }
        const item: IAlisaImage = {
            title,
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

/** Собирает одиночную карточку Алисы и загружает изображение при необходимости. */
async function getBigImage(
    cardInfo: ICardInfo,
    controller: BotController,
): Promise<IAlisaBigImage | null> {
    const image = cardInfo.images[0];
    if (!image.imageToken && image.imageDir) {
        image.imageToken = await getImageInDB(controller, image.imageDir);
    }
    if (!image.imageToken) {
        return null;
    }
    let button: IAlisaButtonCard | null = image.button?.getButtons(alisaCardButton) || null;
    if (!button?.text) {
        button = cardInfo.buttons.getButtons(alisaCardButton);
    }
    const object: IAlisaBigImage = {
        type: ALISA_CARD_BIG_IMAGE,
        image_id: image.imageToken,
        title: Text.resize(image.title || cardInfo.title, 128),
        description: Text.resize(image.desc || cardInfo.description, 1024),
    };
    if (button?.text) {
        object.button = button;
    }
    return object;
}

/**
 * Получает карточку для отображения в Алисе.
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @returns {Promise<IAlisaBigImage | IAlisaItemsList | IAlisaImageGallery | null>} Одна карточка, массив карточек или пустой массив, если нечего отобразить
 */
export async function cardProcessing(
    cardInfo: ICardInfo,
    controller: BotController,
): Promise<IAlisaBigImage | IAlisaItemsList | IAlisaImageGallery | null> {
    const countImage = cardInfo.images.length;
    if (!countImage) {
        return null;
    }
    if (cardInfo.showOne) {
        return getBigImage(cardInfo, controller);
    }
    if (cardInfo.usedGallery) {
        const object: IAlisaImageGallery = {
            type: 'ImageGallery',
        };
        object.items = await _getItem(cardInfo, controller);
        return object.items.length ? object : null;
    }
    const object: IAlisaItemsList = {
        type: ALISA_CARD_ITEMS_LIST,
    };
    const headerText = Text.resize(cardInfo.title || '', 64);
    if (headerText) {
        object.header = { text: headerText };
    }
    object.items = await _getItem(cardInfo, controller);
    if (!object.items.length) {
        return null;
    }
    const btn: IAlisaButtonCard | null = cardInfo.buttons.getButtons(alisaCardButton);
    if (btn?.text) {
        object.footer = {
            text: btn.text,
            button: btn,
        };
    }
    return object;
}
