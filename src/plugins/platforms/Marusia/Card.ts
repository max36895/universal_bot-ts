/**
 * Построение карточек Маруси: BigImage, ItemsList (до 5) и ImageGallery (до 7 изображений).
 */
import { IButtonType, ICardInfo, Text, BotController, AppContext } from '../../../index';

import { buttonProcessing } from './Button';
import { MarusiaRequest } from '../API';
import { getImageToken } from '../Base/utils';
import {
    IMarusiaImage,
    IMarusiaButtonCard,
    IMarusiaBigImage,
    IMarusiaItemsList,
    IMarusiaImageGallery,
} from './interfaces/IMarusiaPlatform';
import {
    T_MARUSIA,
    MARUSIA_MAX_IMAGES,
    MARUSIA_MAX_GALLERY_IMAGES,
    MARUSIA_CARD_BIG_IMAGE,
    MARUSIA_CARD_ITEMS_LIST,
} from './constants';

/**
 * Возвращает кнопки в формате Маруси
 * @param buttons Кнопки для отображения
 * @param appContext Контекст приложения — передаётся дальше в buttonProcessing,
 * чтобы предупреждения о невалидной кнопке не терялись (без него кнопка
 * отбрасывалась молча)
 * @returns Первая кнопка в карточечном формате IMarusiaButtonCard
 */
function marusiaCardButton(buttons: IButtonType[], appContext?: AppContext): IMarusiaButtonCard {
    return buttonProcessing(buttons, true, appContext) as IMarusiaButtonCard;
}

/**
 * Получение токена, необходимого для отображения картинок в карточке Маруси
 * @param controller Контроллер приложения
 * @param path Путь до картинки
 * @returns Токен загруженного изображения либо `null` при ошибке загрузки/сохранения
 */
export async function getImageInDB(
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
        if (!upload?.photo || !upload.server || !upload.hash) {
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
 * Получает элементы карточки для Маруси.
 *
 * Процесс работы:
 * 1. Определяет максимальное количество изображений:
 *    - Для галереи: MARUSIA_MAX_GALLERY_IMAGES (7)
 *    - Для списка: MARUSIA_MAX_IMAGES (5)
 * 2. Обрабатывает каждое изображение:
 *    - Создает токен изображения, если его нет
 *    - Добавляет кнопки (если не галерея)
 *    - Ограничивает длину текста:
 *      * Заголовок: 128 символов
 *      * Описание: 256 символов
 *
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @returns {Promise<IMarusiaImage[]>} Массив элементов карточки
 */
async function _getItem(cardInfo: ICardInfo, controller: BotController): Promise<IMarusiaImage[]> {
    const items: IMarusiaImage[] = [];
    const maxCount = cardInfo.usedGallery ? MARUSIA_MAX_GALLERY_IMAGES : MARUSIA_MAX_IMAGES;
    const images = cardInfo.images.slice(0, maxCount);
    // Замыкание передаёт appContext в обработку кнопок: иначе warn о невалидной
    // кнопке терялся, и кнопка исчезала молча.
    const cardButton = (buttons: IButtonType[]): IMarusiaButtonCard =>
        marusiaCardButton(buttons, controller.appContext);
    for (const image of images) {
        const title = Text.resize(image.title || cardInfo.title || '', 128);
        let button: IMarusiaButtonCard | null = null;
        if (!cardInfo.usedGallery) {
            button = image.button?.getButtons<IMarusiaButtonCard>(cardButton) || null;
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
                `[Marusia] Не удалось получить image_id для "${image.imageDir}". ` +
                    'Элемент карточки будет показан без изображения.',
            );
        }
        const item: IMarusiaImage = {
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
 * Собирает одиночную карточку Маруси и загружает изображение при необходимости.
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @returns Карточка BigImage либо `null`, если нет изображения или токен не получен
 */
async function getBigImage(
    cardInfo: ICardInfo,
    controller: BotController,
): Promise<IMarusiaBigImage | null> {
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
    const cardButton = (buttons: IButtonType[]): IMarusiaButtonCard =>
        marusiaCardButton(buttons, controller.appContext);
    let button: IMarusiaButtonCard | null = image.button?.getButtons(cardButton) || null;
    if (!button?.text) {
        button = cardInfo.buttons.getButtons(cardButton);
    }
    const object: IMarusiaBigImage = {
        type: MARUSIA_CARD_BIG_IMAGE,
        image_id: image.imageToken,
        title: Text.resize(image.title || cardInfo.title, 128),
        // Лимит описания BigImage у Маруси — 256 символов (у Алисы 1024)
        description: Text.resize(image.desc || cardInfo.description, 256),
    };
    if (button?.text) {
        object.button = button;
    }
    return object;
}

/**
 * Получает карточку для отображения в Марусе.
 * Асинхронный процессор — вызывать с `await` (см. Card.getCards).
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @returns {Promise<IMarusiaBigImage | IMarusiaItemsList | IMarusiaImageGallery | null>} Объект карточки (BigImage, ItemsList или ImageGallery) либо `null`, если нечего отобразить
 */
export async function cardProcessing(
    cardInfo: ICardInfo,
    controller: BotController,
): Promise<IMarusiaBigImage | IMarusiaItemsList | IMarusiaImageGallery | null> {
    const countImage = cardInfo.images.length;
    if (!countImage) {
        return null;
    }
    if (cardInfo.showOne) {
        return getBigImage(cardInfo, controller);
    }
    if (cardInfo.usedGallery) {
        const object: IMarusiaImageGallery = {
            type: 'ImageGallery',
        };
        object.items = await _getItem(cardInfo, controller);
        return object.items.length ? object : null;
    }
    const object: IMarusiaItemsList = {
        type: MARUSIA_CARD_ITEMS_LIST,
    };
    const headerText = Text.resize(cardInfo.title || cardInfo.images[0]?.title || '', 64);
    if (headerText) {
        object.header = { text: headerText };
    }
    object.items = await _getItem(cardInfo, controller);
    if (!object.items.length) {
        return null;
    }
    const btn: IMarusiaButtonCard | null = cardInfo.buttons.getButtons((buttons: IButtonType[]) =>
        marusiaCardButton(buttons, controller.appContext),
    );
    if (btn?.text) {
        object.footer = {
            text: btn.text,
            button: btn,
        };
    }
    return object;
}
