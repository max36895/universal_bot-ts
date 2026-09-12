/**
 * Построение карточек Алисы: BigImage, ItemsList (до 5) и ImageGallery (до 10) с лимитами полей по протоколу Яндекс.Диалогов.
 */
import { IButtonType, ICardInfo, Text, BotController, AppContext } from '../../../index';

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
 * @param appContext Контекст приложения — передаётся дальше в buttonProcessing,
 * чтобы предупреждения о невалидной кнопке не терялись (без него кнопка
 * отбрасывалась молча)
 * @returns Первая кнопка в карточечном формате IAlisaButtonCard
 */
export function alisaCardButton(
    buttons: IButtonType[],
    appContext?: AppContext<unknown, string>,
): IAlisaButtonCard {
    return buttonProcessing(buttons, true, appContext) as IAlisaButtonCard;
}

/**
 * Получение токена, необходимого для отображения картинок в карточке Алисы
 * @param controller Контроллер приложения
 * @param path Путь до картинки
 * @returns Токен загруженного изображения либо `null` при ошибке загрузки/сохранения
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
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @returns {Promise<IAlisaImage[]>} Массив элементов карточки
 */
async function _getItem(cardInfo: ICardInfo, controller: BotController): Promise<IAlisaImage[]> {
    const items: IAlisaImage[] = [];
    const maxCount = cardInfo.usedGallery ? ALISA_MAX_GALLERY_IMAGES : ALISA_MAX_IMAGES;
    const images = cardInfo.images.slice(0, maxCount);
    // Замыкание передаёт appContext в обработку кнопок: иначе warn о невалидной
    // кнопке (payload/URL сверх лимита) терялся, и кнопка исчезала молча.
    const cardButton = (buttons: IButtonType[]): IAlisaButtonCard =>
        alisaCardButton(buttons, controller.appContext);
    for (const image of images) {
        const title = Text.resize(image.title || cardInfo.title || '', 128);
        let button: IAlisaButtonCard | null = null;
        if (!cardInfo.usedGallery && image.button) {
            button = image.button.getButtons<IAlisaButtonCard>(cardButton);
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

/**
 * Собирает одиночную карточку Алисы и загружает изображение при необходимости.
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @returns Карточка BigImage либо `null`, если нет изображения или токен не получен
 */
async function getBigImage(
    cardInfo: ICardInfo,
    controller: BotController,
): Promise<IAlisaBigImage | null> {
    const image = cardInfo.images[0];
    if (!image) {
        return null;
    }
    if (!image.imageToken && image.imageDir) {
        image.imageToken = await getImageInDB(controller, image.imageDir);
    }
    if (!image.imageToken) {
        return null;
    }
    // Замыкание передаёт appContext в обработку кнопок — warn о невалидной
    // кнопке не должен теряться (см. _getItem).
    const cardButton = (buttons: IButtonType[]): IAlisaButtonCard =>
        alisaCardButton(buttons, controller.appContext);
    let button: IAlisaButtonCard | null = image.button?.getButtons(cardButton) || null;
    if (!button?.text) {
        button = cardInfo.buttons.getButtons(cardButton);
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
 * Асинхронный процессор — вызывать с `await` (см. Card.getCards).
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @returns {Promise<IAlisaBigImage | IAlisaItemsList | IAlisaImageGallery | null>} Объект карточки (BigImage, ItemsList или ImageGallery) либо `null`, если нечего отобразить
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
    const btn: IAlisaButtonCard | null = cardInfo.buttons.getButtons((buttons: IButtonType[]) =>
        alisaCardButton(buttons, controller.appContext),
    );
    if (btn?.text) {
        object.footer = {
            text: btn.text,
            button: btn,
        };
    }
    return object;
}
