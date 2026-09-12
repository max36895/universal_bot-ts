/**
 * Построение карточек SmartApp: list_card с image_cell_view/text_cell_view, только URL-изображения.
 */
import { IButtonType, ICardInfo, IImageType, Text } from '../../../index';
import { buttonProcessing } from './Button';
import {
    ISberSmartAppCardItem,
    ISberSmartAppCard,
    ISberSmartAppItem,
    ISberSmartAppCardAction,
    ISberSmartAppSuggestionButton,
    ISberSmartImageParam,
    TSberSmartAppTextColor,
    TSberSmartAppTypeface,
} from './interfaces/ISmartAppPlatform';

function buttonCardProcessing(
    buttons: IButtonType[],
): ISberSmartAppSuggestionButton[] | ISberSmartAppCardAction | null {
    return buttonProcessing(buttons, true);
}

/**
 * Возвращает только явно заданную разработчиком подпись кнопки карточки.
 */
function getButtonTitle(image: IImageType<ISberSmartImageParam>): string {
    return Text.resize(image.button?.buttons[0]?.title || '', 64);
}

function getOneElement(image: IImageType<ISberSmartImageParam>): ISberSmartAppCardItem[] {
    const res: ISberSmartAppCardItem[] = [];
    if (image.imageDir && Text.isUrl(image.imageDir)) {
        res.push({
            type: 'image_cell_view',
            content: {
                url: image.imageDir,
            },
        });
    }
    if (image.title) {
        res.push({
            type: 'text_cell_view',
            paddings: {
                top: '6x',
                left: '8x',
                right: '8x',
            },
            content: {
                text: image.title,
                typeface: image.params.titleTypeface || 'title1',
                text_color: image.params.titleText_color || 'default',
            },
        });
    }
    if (image.desc) {
        res.push({
            type: 'text_cell_view',
            paddings: {
                top: '4x',
                left: '8x',
                right: '8x',
            },
            content: {
                text: image.desc,
                typeface: image.params.descTypeface || 'footnote1',
                text_color: image.params.descText_color || 'secondary',
            },
        });
    }
    const button = image.button?.getButtons(buttonCardProcessing) as ISberSmartAppCardAction | null;
    if (button && !Array.isArray(button)) {
        const buttonTitle = button.text || getButtonTitle(image) || image.title || image.desc;
        if (buttonTitle) {
            res.push({
                type: 'text_cell_view',
                paddings: {
                    top: '12x',
                    left: '8x',
                    right: '8x',
                },
                content: {
                    actions: [button],
                    text: buttonTitle,
                    typeface: 'button1',
                    text_color: 'brand',
                },
            });
        }
    }
    return res;
}

/**
 * Формирует карточку только с изображением, не создавая отсутствующую подпись.
 */
function getImageOnlyItem(
    image: IImageType<ISberSmartImageParam>,
    button: ISberSmartAppCardAction | null,
): ISberSmartAppCardItem | null {
    if (!image.imageDir || !Text.isUrl(image.imageDir)) {
        return null;
    }
    return {
        type: 'image_cell_view',
        content: {
            url: image.imageDir,
            ...(button && !Array.isArray(button) ? { actions: [button] } : {}),
        },
    };
}

function getCardItem(
    image: IImageType<ISberSmartImageParam>,
    showOne: boolean = false,
): ISberSmartAppCardItem | ISberSmartAppCardItem[] | null {
    if (showOne) {
        return getOneElement(image);
    }
    const button = image.button?.getButtons(buttonCardProcessing) as ISberSmartAppCardAction | null;
    const title = image.title || image.desc || getButtonTitle(image);
    if (!title) {
        return getImageOnlyItem(image, button);
    }
    const description = image.desc || image.title || getButtonTitle(image);
    const displayText = title === description ? title : `${title}\n${description}`;
    const left: {
        type: 'simple_left_view';
        icon_vertical_gravity: 'top';
        icon?: {
            address: { type: 'url'; url: string };
            size: { width: 'xlarge'; height: 'xlarge' };
            margins: { left: '0x'; right: '6x' };
        };
        texts: {
            title: {
                text: string;
                typeface: TSberSmartAppTypeface;
                text_color: TSberSmartAppTextColor;
                max_lines: number;
            };
        };
    } = {
        type: 'simple_left_view',
        icon_vertical_gravity: 'top',
        texts: {
            title: {
                text: displayText,
                typeface: image.params.titleTypeface || 'headline2',
                text_color: image.params.titleText_color || 'default',
                max_lines: image.params.titleMax_lines || image.params.descMax_lines || 0,
            },
        },
    };
    const cardItem: ISberSmartAppCardItem = {
        type: 'left_right_cell_view',
        paddings: {
            left: '4x',
            top: '4x',
            right: '4x',
            bottom: '4x',
        },
        left,
    };
    if (image.imageDir && Text.isUrl(image.imageDir)) {
        left.icon = {
            address: {
                type: 'url',
                url: image.imageDir,
            },
            size: {
                width: 'xlarge',
                height: 'xlarge',
            },
            margins: {
                left: '0x',
                right: '6x',
            },
        };
    }
    if (button && !Array.isArray(button)) {
        cardItem.actions = [button];
    }
    return cardItem;
}

/**
 * Получает карточку для отображения в Сбер SmartApp.
 * Синхронный процессор — `await` не требуется (см. Card.getCards).
 * @param cardInfo Информация о карточке
 * @returns Элемент items ({card}) с list_card либо `null`, если нечего отобразить
 */
export function cardProcessing(cardInfo: ICardInfo): ISberSmartAppItem | null {
    const countImage = cardInfo.images.length;
    if (countImage) {
        if (cardInfo.showOne) {
            const card: ISberSmartAppCard = {
                type: 'list_card',
            };
            card.cells = getCardItem(
                cardInfo.images[0] as IImageType<ISberSmartImageParam>,
                true,
            ) as ISberSmartAppCardItem[];
            return card.cells.length ? { card } : null;
        } else {
            const card: ISberSmartAppCard = {
                type: 'list_card',
                cells: [],
            };
            if (cardInfo.title) {
                (card as Required<ISberSmartAppCard>).cells.push({
                    type: 'text_cell_view',
                    paddings: {
                        top: '4x',
                        left: '2x',
                        right: '2x',
                    },
                    content: {
                        text: cardInfo.title,
                        typeface: 'title1',
                        text_color: 'default',
                    },
                });
            }
            cardInfo.images.forEach((image) => {
                const item = getCardItem(image as IImageType<ISberSmartImageParam>);
                if (item && !Array.isArray(item)) {
                    (card as Required<ISberSmartAppCard>).cells.push(item);
                }
            });
            return (card as Required<ISberSmartAppCard>).cells.length ? { card } : null;
        }
    }
    return null;
}
