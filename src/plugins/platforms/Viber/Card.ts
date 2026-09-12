/**
 * Построение карточек Viber: rich_media с min_api_version 7 и лимитом тела запроса 30 КБ.
 */
import { BotController, ICardInfo, Text, IImageType, IButtonType } from '../../../index';

import { buttonProcessing } from './Button';
import { IViberCard, IViberButtonObject } from './interfaces/IViberPlatform';

/**
 * Экранирует HTML-сущности для безопасной вставки в Viber Rich Media.
 * Предотвращает разрыв HTML-структуры при наличии <, >, &, ", ' в пользовательском контенте.
 * @param text Текст для экранирования
 * @returns Строка с заменёнными HTML-сущностями (&amp;, &lt;, &gt;, &quot;, &#39;)
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Ширина сетки rich_media в Viber (`ButtonsGroupColumns`).
 */
const VIBER_GRID_COLUMNS = 6;
/**
 * Максимум карточек, которые помещаются в сетку rich_media.
 */
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

/**
 * Собирает один элемент (ячейку) rich_media Viber из изображения.
 * Кнопка (если есть) мерджится прямо в объект элемента — вложенного поля
 * Buttons у элемента rich_media не существует.
 *
 * @param image Изображение карточки
 * @param columns Ширина карточки в колонках сетки (ButtonsGroupColumns)
 * @param rows Высота карточки в строках сетки (ButtonsGroupRows)
 * @param controller Контроллер приложения (для логирования предупреждений)
 * @returns Элемент rich_media в формате IViberCard
 */
function getElement(
    image: IImageType,
    columns: number,
    rows: number,
    controller?: BotController,
): IViberCard {
    if (!image.imageToken) {
        if (Text.isUrl(image.imageDir || '')) {
            image.imageToken = image.imageDir;
        }
    }

    let element: IViberCard = {};
    if (image.imageToken) {
        element.Image = image.imageToken;
    }
    // Замыкание передаёт appContext в обработку кнопок: иначе warn о пустой
    // подписи и молчаливый пропуск несериализуемого payload терялись —
    // в rich_media кнопка просто исчезала без объяснения.
    const btn: IViberButtonObject | null =
        image.button?.getButtons<IViberButtonObject>((buttons: IButtonType[]) =>
            buttonProcessing(buttons, controller?.appContext),
        ) || null;
    const title = Text.resize(image.title, 256);
    const description = Text.resize(image.desc, 512);
    if (btn?.Buttons !== undefined) {
        // Ячейка rich_media вмещает одну кнопку: молчаливый отбор первой
        // оставлял разработчика в неведении, почему «половина кнопок пропала».
        if (btn.Buttons.length > 1) {
            controller?.appContext.logWarn(
                `[Viber] У карточки в rich_media может быть только одна кнопка: из ${btn.Buttons.length} использована первая, остальные пропущены.`,
            );
        }
        element = { ...element, ...btn.Buttons[0] };
        // <br> разделяет заголовок и описание — без него тексты склеиваются
        // в одну строку (пример IViberCard это демонстрирует).
        element.Text = `<font color=#000><b>${escapeHtml(title)}</b></font><br><font color=#000>${escapeHtml(description)}</font>`;
    } else {
        element.ActionType = 'none';
        // Без кнопки заголовок и описание всё равно должны отображаться: в rich_media
        // текст живёт в поле Text элемента (ActionType 'none' это допускает).
        // Раньше текст заполнялся только в ветке с кнопкой, и карточка без кнопки
        // молча теряла title/description.
        if (title || description) {
            element.Text = `<font color=#000><b>${escapeHtml(title)}</b></font><br><font color=#000>${escapeHtml(description)}</font>`;
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
 * Синхронный процессор — `await` не требуется (см. Card.getCards).
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложения (для логирования предупреждений)
 * @returns {IViberCard[] | IViberCard} Массив элементов RichMedia (для галереи) либо один объект карточки; пустой массив, если валидных изображений нет
 * @example
 * ```ts
 * // Синхронный процессор — await не нужен:
 * const res = cardProcessing(cardInfo, controller);
 * const list = Array.isArray(res) ? res : res ? [res] : [];
 * if (list.length) {
 *     await viberApi.richMedia(userId, list);
 * }
 * ```
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
        const firstImage = validImages[0];
        if ((countImage === 1 || cardInfo.showOne) && firstImage) {
            if (!firstImage.imageToken && firstImage.imageDir) {
                firstImage.imageToken = firstImage.imageDir;
            }
            if (firstImage.imageToken) {
                const size = getCardSize(1);
                return getElement(firstImage, size.columns, size.rows, controller);
            }
        } else {
            const size = getCardSize(countImage);
            for (let i = 0; i < countImage; i++) {
                const image = validImages[i];
                if (!image) {
                    break;
                }
                objects.push(getElement(image, size.columns, size.rows, controller));
            }
        }
    }
    return objects;
}
