import { ICardInfo, Text, IImageType } from '../../../index';

import { buttonProcessing } from './Button';
import { IViberCard, IViberButtonObject } from './interfaces/IViberPlatform';

/**
 * Экранирует HTML-сущности для безопасной вставки в Viber Rich Media.
 * Предотвращает разрыв HTML-структуры при наличии <, >, &, ", ' в пользовательском контенте.
 * @param text Текст для экранирования
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getElement(image: IImageType, countImage: number = 1): IViberCard {
    if (!image.imageToken) {
        if (Text.isUrl(image.imageDir || '')) {
            image.imageToken = image.imageDir;
        }
    }

    let element: IViberCard = {
        Columns: countImage,
        Rows: 2,
    };
    if (image.imageToken) {
        element.Image = image.imageToken;
    }
    const btn: IViberButtonObject | null =
        image.button?.getButtons<IViberButtonObject>(buttonProcessing) || null;
    if (btn?.Buttons !== undefined) {
        element = { ...element, ...btn.Buttons[0] };
        element.Text = `<font color=#000><b>${escapeHtml(image.title)}</b></font><font color=#000>${escapeHtml(image.desc)}</font>`;
    }
    return element;
}

/**
 * Получает карточку для отображения в Viber.
 * @param cardInfo Информация о карточке
 * @returns {IViberCard[] | IViberCard} Одна карточка, массив карточек или пустой массив, если нечего отобразить
 */
export function cardProcessing(cardInfo: ICardInfo): IViberCard[] | IViberCard {
    const objects: IViberCard[] = [];
    let countImage = cardInfo.images.length;
    if (countImage > 6) {
        countImage = 6;
    }
    if (countImage) {
        if (countImage === 1 || cardInfo.showOne) {
            if (!cardInfo.images[0].imageToken && cardInfo.images[0].imageDir) {
                cardInfo.images[0].imageToken = cardInfo.images[0].imageDir;
            }
            if (cardInfo.images[0].imageToken) {
                return getElement(cardInfo.images[0]);
            }
        } else {
            cardInfo.images.forEach((image) => {
                if (objects.length < countImage) {
                    objects.push(getElement(image, countImage));
                }
            });
        }
    }
    return objects;
}
