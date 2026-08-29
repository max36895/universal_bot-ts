import { BotController, ICardInfo, Text, IImageType } from '../../../index';

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

/** Ширина сетки rich_media в Viber (`ButtonsGroupColumns`). */
const VIBER_GRID_COLUMNS = 6;
/** Максимум карточек, которые помещаются в сетку rich_media. */
const VIBER_MAX_CARDS = 6;

/**
 * Считает размер одной карточки в сетке rich_media.
 *
 * `Columns` — это сколько из шести колонок сетки занимает карточка, а не количество
 * карточек. Раньше сюда подставлялось число картинок, из-за чего одиночная карточка
 * занимала 1/6 ширины экрана, а пять карточек по 5 колонок выстраивались в 10 строк
 * при лимите в 7 и обрезались Viber'ом.
 *
 * @param countImage Количество карточек в галерее
 * @returns Ширина и высота одной карточки в ячейках сетки
 */
function getCardSize(countImage: number): { columns: number; rows: number } {
    const perRow = Math.min(3, Math.max(1, countImage));
    // Высота подобрана так, чтобы ceil(count / perRow) * rows не превышало
    // ButtonsGroupRows = 7 при любом количестве карточек до VIBER_MAX_CARDS.
    return {
        columns: Math.floor(VIBER_GRID_COLUMNS / perRow),
        rows: countImage <= 3 ? 3 : 2,
    };
}

function getElement(image: IImageType, columns: number, rows: number): IViberCard {
    if (!image.imageToken) {
        if (Text.isUrl(image.imageDir || '')) {
            image.imageToken = image.imageDir;
        }
    }

    let element: IViberCard = {};
    if (image.imageToken) {
        element.Image = image.imageToken;
    }
    const btn: IViberButtonObject | null =
        image.button?.getButtons<IViberButtonObject>(buttonProcessing) || null;
    const title = Text.resize(image.title, 256);
    const description = Text.resize(image.desc, 512);
    if (btn?.Buttons !== undefined) {
        element = { ...element, ...btn.Buttons[0] };
        element.Text = `<font color=#000><b>${escapeHtml(title)}</b></font><font color=#000>${escapeHtml(description)}</font>`;
    } else {
        element.ActionType = 'none';
        // Без кнопки заголовок и описание всё равно должны отображаться: в rich_media
        // текст живёт в поле Text элемента (ActionType 'none' это допускает).
        // Раньше текст заполнялся только в ветке с кнопкой, и карточка без кнопки
        // молча теряла title/description.
        if (title || description) {
            element.Text = `<font color=#000><b>${escapeHtml(title)}</b></font><font color=#000>${escapeHtml(description)}</font>`;
        }
    }
    // Размер выставляем после слияния с кнопкой: раскладку сетки определяет карточка,
    // а не платформенные опции отдельной кнопки.
    element.Columns = columns;
    element.Rows = rows;
    return element;
}

/**
 * Получает карточку для отображения в Viber.
 * @param cardInfo Информация о карточке
 * @returns {IViberCard[] | IViberCard} Массив элементов RichMedia (для галереи) либо один объект карточки; пустой массив, если валидных изображений нет
 */
export function cardProcessing(
    cardInfo: ICardInfo,
    controller?: BotController,
): IViberCard[] | IViberCard {
    const objects: IViberCard[] = [];
    const validImages = cardInfo.images.filter(
        (image) => Boolean(image.imageToken) || Text.isUrl(image.imageDir || ''),
    );
    if (validImages.length < cardInfo.images.length) {
        controller?.appContext.logWarn(
            '[Viber] Локальные изображения без публичного URL не поддерживаются и были пропущены.',
        );
    }
    if (validImages.length > VIBER_MAX_CARDS) {
        controller?.appContext.logWarn(
            `[Viber] Галерея ограничена ${VIBER_MAX_CARDS} карточками; лишние изображения пропущены.`,
        );
    }
    const countImage = Math.min(validImages.length, VIBER_MAX_CARDS);
    if (countImage) {
        if (countImage === 1 || cardInfo.showOne) {
            if (!validImages[0].imageToken && validImages[0].imageDir) {
                validImages[0].imageToken = validImages[0].imageDir;
            }
            if (validImages[0].imageToken) {
                const size = getCardSize(1);
                return getElement(validImages[0], size.columns, size.rows);
            }
        } else {
            const size = getCardSize(countImage);
            for (let i = 0; i < countImage; i++) {
                objects.push(getElement(validImages[i], size.columns, size.rows));
            }
        }
    }
    return objects;
}
