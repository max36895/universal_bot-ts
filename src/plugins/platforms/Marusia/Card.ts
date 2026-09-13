/**
 * Построение карточек Маруси по протоколу скиллов: BigImage (одно изображение)
 * и ItemsList (набор изображений). Элементы карточек Маруси содержат только
 * `image_id` (integer) — заголовков, описаний и кнопок в карточках нет.
 */
import { ICardInfo, BotController } from '../../../index';

import { MarusiaRequest } from '../API';
import { getImageToken, cacheMediaToken } from '../Base/utils';
import { IMarusiaBigImage, IMarusiaItemsList } from './interfaces/IMarusiaPlatform';
import {
    T_MARUSIA,
    MARUSIA_MAX_IMAGES,
    MARUSIA_MAX_GALLERY_IMAGES,
    MARUSIA_CARD_BIG_IMAGE,
    MARUSIA_CARD_ITEMS_LIST,
} from './constants';

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

        // Картинки Маруси загружаются на ту же инфраструктуру, что и фото VK
        // (ответ {server, photo, hash}) — файл принимается только в поле `photo`.
        const upload = await mImage.upload(uploadLink.picture_upload_link, path, 'photo');
        if (!upload?.photo || !upload.server || !upload.hash) {
            return null;
        }

        const picture = await mImage.marusiaSavePicture(upload.photo, upload.server, upload.hash);
        if (picture?.photo_id) {
            model.imageToken = String(picture.photo_id);
            await cacheMediaToken(model, controller);
            return model.imageToken;
        }
        return null;
    });
}

/**
 * Приводит токен изображения к `image_id` протокола Маруси (integer).
 * Токены хранятся строкой (модель ImageTokens), а протокол требует число.
 *
 * @param token Токен изображения
 * @returns Числовой image_id либо `null`, если токен не число
 */
function toMarusiaImageId(token: string): number | null {
    const id = Number(token);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Возвращает image_id изображений карточки, загружая их при необходимости.
 * Изображения без корректного image_id пропускаются с предупреждением:
 * в протоколе Маруси image_id — обязательное поле элемента.
 *
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @param limit Максимальное число изображений
 * @returns Список числовых image_id
 */
async function getImageIds(
    cardInfo: ICardInfo,
    controller: BotController,
    limit: number,
): Promise<number[]> {
    const ids: number[] = [];
    for (const image of cardInfo.images.slice(0, limit)) {
        if (!image.imageToken && image.imageDir) {
            image.imageToken = await getImageInDB(controller, image.imageDir);
        }
        const id = image.imageToken ? toMarusiaImageId(image.imageToken) : null;
        if (id === null) {
            controller.appContext.logWarn(
                `[Marusia] Нет корректного image_id (integer) для "${image.imageDir ?? image.imageToken ?? ''}" — ` +
                    'изображение пропущено: в карточках Маруси image_id обязателен.',
            );
            continue;
        }
        ids.push(id);
    }
    return ids;
}

/**
 * Получает карточку для отображения в Марусе.
 * Асинхронный процессор — вызывать с `await` (см. Card.getCards).
 *
 * По протоколу скиллов Маруси карточка изображений — это `BigImage`
 * (`{type, image_id}`) либо `ItemsList` (`{type, items: [{image_id}]}`).
 * Типа `ImageGallery` у Маруси нет — галерея отправляется как `ItemsList`.
 * Заголовки, описания и кнопки изображений в карточках Маруси не
 * поддерживаются: текст ответа передавайте в `controller.text`.
 *
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения
 * @returns {Promise<IMarusiaBigImage | IMarusiaItemsList | null>} Карточка либо `null`, если нет ни одного изображения с image_id
 */
export async function cardProcessing(
    cardInfo: ICardInfo,
    controller: BotController,
): Promise<IMarusiaBigImage | IMarusiaItemsList | null> {
    if (!cardInfo.images.length) {
        return null;
    }
    if (cardInfo.showOne) {
        const [imageId] = await getImageIds(cardInfo, controller, 1);
        return imageId === undefined ? null : { type: MARUSIA_CARD_BIG_IMAGE, image_id: imageId };
    }
    const limit = cardInfo.usedGallery ? MARUSIA_MAX_GALLERY_IMAGES : MARUSIA_MAX_IMAGES;
    const ids = await getImageIds(cardInfo, controller, limit);
    if (!ids.length) {
        return null;
    }
    return {
        type: MARUSIA_CARD_ITEMS_LIST,
        items: ids.map((imageId) => ({ image_id: imageId })),
    };
}
