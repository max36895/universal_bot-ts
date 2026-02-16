import { Button, ICardInfo, Image } from '../../../index';
import { buttonProcessing } from './Button';
import {
    ISberSmartAppCardItem,
    ISberSmartAppCard,
    ISberSmartAppItem,
    ISberSmartAppCardAction,
    ISberSmartAppSuggestionButton,
    TSberSmartAppTypeface,
    TSberSmartAppTextColor,
    ISberSmartImageParam,
} from './interfaces/ISmartAppPlatform';

function buttonCardProcessing(
    buttons: Button[],
): ISberSmartAppSuggestionButton[] | ISberSmartAppCardAction {
    return buttonProcessing(buttons, true);
}

function getOneElement(image: Image<ISberSmartImageParam>): ISberSmartAppCardItem[] {
    const res: ISberSmartAppCardItem[] = [];
    if (image.imageDir) {
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
    const button = image.button.getButtons(buttonCardProcessing) as ISberSmartAppCardAction;
    if (button) {
        res.push({
            type: 'text_cell_view',
            paddings: {
                top: '12x',
                left: '8x',
                right: '8x',
            },
            content: {
                actions: [button],
                text: button.text,
                typeface: 'button1',
                text_color: 'brand',
            },
        });
    }
    return res;
}

function getCardItem(
    image: Image<ISberSmartImageParam>,
    showOne: boolean = false,
): ISberSmartAppCardItem | ISberSmartAppCardItem[] {
    if (showOne) {
        return getOneElement(image);
    }
    const cardItem: ISberSmartAppCardItem = {
        type: 'left_right_cell_view',
        paddings: {
            left: '4x',
            top: '4x',
            right: '4x',
            bottom: '4x',
        },
        left: {
            type: 'fast_answer_left_view',
            icon_vertical_gravity: 'top',
            icon_and_value: {
                value: {
                    text: image.desc,
                    typeface: image.params.descTypeface || 'body3',
                    text_color: image.params.descText_color || 'default',
                    max_lines: image.params.descMax_lines || 0,
                },
            },
            label: {
                text: image.title,
                typeface: image.params.titleTypeface || 'headline2',
                text_color: image.params.titleText_color || 'default',
                max_lines: image.params.titleMax_lines || 0,
            },
        },
    };
    if (image.imageDir) {
        (cardItem as Required<ISberSmartAppCardItem>).left.icon_and_value.icon = {
            address: {
                type: 'url',
                url: image.imageDir,
            },
            size: {
                width: 'xlarge',
                height: 'xlarge',
            },
            margin: {
                left: '0x',
                right: '6x',
            },
        };
    }
    const button = image.button.getButtons(buttonCardProcessing) as ISberSmartAppCardAction;
    if (button) {
        if (!cardItem.bottom_text) {
            cardItem.bottom_text = {
                text: image.title,
                typeface: (image.params.descTypeface as TSberSmartAppTypeface) || 'body3',
                text_color: (image.params.descText_color as TSberSmartAppTextColor) || 'default',
            };
        }
        cardItem.bottom_text.actions = button;
    }
    return cardItem;
}

/**
 * Получает карточку для отображения в Сбер.SmartApp.
 * @param cardInfo Информация о карточке
 */
export function cardProcessing(cardInfo: ICardInfo): ISberSmartAppItem | null {
    const countImage = cardInfo.images.length;
    if (countImage) {
        if (cardInfo.showOne) {
            const card: ISberSmartAppCard = {
                type: 'list_card',
            };
            card.cells = getCardItem(
                cardInfo.images[0] as Image<ISberSmartImageParam>,
                true,
            ) as ISberSmartAppCardItem[];
            return { card };
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
                (card as Required<ISberSmartAppCard>).cells.push(
                    getCardItem(image as Image<ISberSmartImageParam>) as ISberSmartAppCardItem,
                );
            });
            return { card };
        }
    }
    return null;
}
