import {TemplateCardTypes} from "./TemplateCardTypes";
import {ISberSmartAppCard, ISberSmartAppCardItem, ISberSmartAppItem} from "../../../core/interfaces/ISberSmartApp";
import {Buttons} from "../../button";
import {Image} from "../../image/Image";

/**
 * Класс отвечающий за отображение карточки в Сбер SmartApp
 * @class SmartAppCard
 */
export class SmartAppCard extends TemplateCardTypes {
    /**
     * Получение элементов для карточки
     *
     * @param {Image} image Объект с картинкой
     * @param {boolean} isOne Получить результат для 1 карточки
     * @return {ISberSmartAppCardItem}
     * @private
     */
    protected static _getCardItem(image: Image, isOne: boolean = false): ISberSmartAppCardItem | ISberSmartAppCardItem[] {
        if (isOne) {
            const res: ISberSmartAppCardItem[] = [];
            if (image.imageDir) {
                res.push({
                    type: "image_cell_view",
                    content: {
                        url: image.imageDir
                    }
                });
            }
            if (image.title) {
                res.push({
                    type: "text_cell_view",
                    paddings: {
                        top: "6x",
                        left: "8x",
                        right: "8x"
                    },
                    content: {
                        text: image.title,
                        typeface: image.params.titleTypeface || "title1",
                        text_color: image.params.titleText_color || "default"
                    }
                });
            }
            if (image.desc) {
                res.push({
                    type: "text_cell_view",
                    paddings: {
                        top: "4x",
                        left: "8x",
                        right: "8x"
                    },
                    content: {
                        text: image.desc,
                        typeface: image.params.descTypeface || "footnote1",
                        text_color: image.params.descText_color || "secondary"
                    }
                });
            }
            const button = image.button.getButtons(Buttons.T_SMARTAPP_BUTTON_CARD);
            if (button) {
                res.push({
                    type: "text_cell_view",
                    paddings: {
                        top: "12x",
                        left: "8x",
                        right: "8x"
                    },
                    content: {
                        actions: [
                            button
                        ],
                        text: button.text,
                        typeface: "button1",
                        text_color: "brand"
                    }
                });
            }
            return res;
        }
        const cardItem: ISberSmartAppCardItem = {
            type: 'left_right_cell_view',
            paddings: {
                left: "4x",
                top: "4x",
                right: "4x",
                bottom: "4x",
            },
            left: {
                type: 'fast_answer_left_view',
                icon_vertical_gravity: "top",
                icon_and_value: {
                    value: {
                        text: image.desc,
                        typeface: image.params.descTypeface || 'body3',
                        text_color: image.params.descText_color || 'default',
                        max_lines: image.params.descMax_lines || 0
                    }
                },
                label: {
                    text: image.title,
                    typeface: image.params.titleTypeface || 'headline2',
                    text_color: image.params.titleText_color || 'default',
                    max_lines: image.params.titleMax_lines || 0
                }
            }
        };
        if (image.imageDir) {
            //@ts-ignore
            cardItem.left.icon_and_value.icon = {
                address: {
                    type: 'url',
                    url: image.imageDir
                },
                size: {
                    width: 'xlarge',
                    height: 'xlarge'
                },
                margin: {
                    left: '0x',
                    right: '6x'
                }
            }
        }
        const button = image.button.getButtons(Buttons.T_SMARTAPP_BUTTON_CARD);
        if (button) {
            if (!cardItem.bottom_text) {
                cardItem.bottom_text = {
                    text: image.title,
                    typeface: image.params.descTypeface || 'body3',
                    text_color: image.params.descText_color || 'default',
                };
            }
            cardItem.bottom_text.actions = button;
        }
        return cardItem;
    }

    /**
     * Получение карточки для отображения пользователю.
     *
     * @param {boolean} isOne True, если в любом случае отобразить 1 элемент карточки
     * @return {Promise<ISberSmartAppItem>}
     * @api
     */
    public async getCard(isOne: boolean): Promise<ISberSmartAppItem | null> {
        const countImage = this.images.length;
        if (countImage) {
            if (isOne) {
                const card: ISberSmartAppCard = {
                    type: 'list_card'
                };
                card.cells = SmartAppCard._getCardItem(this.images[0], true) as ISberSmartAppCardItem[];
                return {card};
            } else {
                const card: ISberSmartAppCard = {
                    type: 'list_card',
                    cells: []
                };
                if (this.title) {
                    // @ts-ignore
                    card.cells.push({
                        type: "text_cell_view",
                        paddings: {
                            top: "4x",
                            left: "2x",
                            right: "2x"
                        },
                        content: {
                            text: this.title,
                            typeface: "title1",
                            text_color: "default"
                        }
                    })
                }
                this.images.forEach((image) => {
                    //@ts-ignore
                    card.cells.push(SmartAppCard._getCardItem(image) as ISberSmartAppCardItem);
                });
                return {card};
            }
        }
        return null;
    }
}
