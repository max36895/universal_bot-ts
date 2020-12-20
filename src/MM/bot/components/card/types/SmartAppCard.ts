import {TemplateCardTypes} from "./TemplateCardTypes";
import {ISberSmartAppCard, ISberSmartAppCardItem, ISberSmartAppItem} from "../../../core/interfaces/ISberSmartApp";
import {Buttons} from "../../button/Buttons";
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
     * @returns {ISberSmartAppCardItem}
     * @private
     */
    protected static _getCardItem(image: Image): ISberSmartAppCardItem {
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
        return cardItem;
    }

    /**
     * Получение карточки для отображения пользователю.
     *
     * @param {boolean} isOne True, если в любом случае отобразить 1 элемент карточки
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
                card.items = [
                    SmartAppCard._getCardItem(this.images[0])
                ];
                return {card};
            } else {
                const card: ISberSmartAppCard = {
                    can_be_disabled: false,
                    type: 'gallery_card',
                    items: []
                };
                this.images.forEach((image) => {
                    card.items.push(SmartAppCard._getCardItem(image));
                });
                return {card};
            }
        }
        return null;
    }
}