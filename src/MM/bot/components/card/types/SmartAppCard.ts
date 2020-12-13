/**
 * Класс отвечающий за отображение карточки в Сбер SmartApp
 * Class SmartAppCard
 * @package bot\components\button\types
 */
import {TemplateCardTypes} from "./TemplateCardTypes";
import {ISberSmartAppCard, ISberSmartAppCardItem, ISberSmartAppItem} from "../../../core/interfaces/ISberSmartApp";
import {Buttons} from "../../button/Buttons";

export class SmartAppCard extends TemplateCardTypes {

    /**
     * Получить карточку для отображения пользователю.
     *
     * @param isOne True, если в любом случае использовать 1 картинку.
     * @return ISberSmartAppItem
     * @api
     */
    public getCard(isOne: boolean): ISberSmartAppItem {
        const countImage = this.images.length;
        if (countImage) {
            if (isOne) {
                const card: ISberSmartAppCard = {
                    can_be_disabled: false,
                    type: 'gallery_card'
                };
                const cardItem: ISberSmartAppCardItem = {
                    type: 'media_gallery_item',
                    top_text: {
                        text: this.images[0].title,
                        typeface: this.images[0].params.topTypeface || 'footnote1',
                        text_color: this.images[0].params.topText_color || 'default',
                        margins: this.images[0].params.topMargins || undefined,
                        max_lines: this.images[0].params.topMax_lines || 0,
                    },
                    bottom_text: {
                        text: this.images[0].desc,
                        typeface: this.images[0].params.bottomTypeface || 'caption',
                        text_color: this.images[0].params.bottomText_color || 'default',
                        margins: this.images[0].params.bottomMargins || undefined,
                        max_lines: this.images[0].params.bottomMax_lines || 0,
                    },
                    image: {
                        url: this.images[0].imageDir
                    }
                };
                const button = this.images[0].button.getButtons(Buttons.T_SMARTAPP_BUTTON_CARD);
                if (button) {
                    cardItem.bottom_text.actions = button;
                }
                card.items = [
                    cardItem
                ];
                return {card};
            } else {
                const card: ISberSmartAppCard = {
                    can_be_disabled: false,
                    type: 'gallery_card',
                    items: []
                };
                this.images.forEach((image) => {
                    const cardItem: ISberSmartAppCardItem = {
                        type: 'media_gallery_item',
                        top_text: {
                            text: image.title,
                            typeface: image.params.topTypeface || 'footnote1',
                            text_color: image.params.topText_color || 'default',
                            margins: image.params.topMargins || undefined,
                            max_lines: image.params.topMax_lines || 0,
                        },
                        bottom_text: {
                            text: image.desc,
                            typeface: image.params.bottomTypeface || 'caption',
                            text_color: image.params.bottomText_color || 'default',
                            margins: image.params.bottomMargins || undefined,
                            max_lines: image.params.bottomMax_lines || 0,
                        },
                        image: {
                            url: image.imageDir
                        }
                    };
                    const button = image.button.getButtons(Buttons.T_SMARTAPP_BUTTON_CARD);
                    if (button) {
                        cardItem.bottom_text.actions = button;
                    }
                    card.items.push(cardItem);
                });
                return {card};
            }
        }
        return null;
    }
}