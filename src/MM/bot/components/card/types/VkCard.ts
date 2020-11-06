/**
 * Класс отвечающий за отображение карточки в ВКонтакте.
 * Class VkCard
 * @package bot\components\card\types
 */
import {TemplateCardTypes} from "./TemplateCardTypes";
import {ImageTokens} from "../../../models/ImageTokens";
import {Buttons} from "../../button/Buttons";
import {IVkButton} from "../../button/interfaces/IVkButton";

export interface IVkCardElement {
    title: string;
    description: string;
    photo_id: string;
    buttons?: IVkButton[];
    action?: {
        type: string;
    }
}

export interface IVkCard {
    type: string;
    elements: IVkCardElement[]
}

export class VkCard extends TemplateCardTypes {
    /**
     * Получить карточку для отображения пользователю.
     *
     * @param isOne True, если в любом случае использовать 1 картинку.
     * @return IVkCard | string[]
     * @api
     */
    public getCard(isOne: boolean): IVkCard | string[] {
        let object = [];
        const countImage = this.images.length;
        if (countImage) {
            if (countImage === 1 || isOne) {
                if (!this.images[0].imageToken) {
                    if (this.images[0].imageDir) {
                        const mImage = new ImageTokens();
                        mImage.type = ImageTokens.T_VK;
                        this.images[0].imageToken = mImage.getToken();
                    }
                }
                if (this.images[0].imageToken) {
                    object.push(this.images[0].imageToken);
                }
            } else {
                const elements = [];
                this.images.forEach((image) => {
                    if (!image.imageToken) {
                        if (image.imageDir) {
                            const mImage = new ImageTokens();
                            mImage.type = ImageTokens.T_VK;
                            image.imageToken = mImage.getToken();
                        }
                    }
                    if (image.imageToken) {
                        const element: IVkCardElement = {
                            title: image.title,
                            description: image.desc,
                            photo_id: image.imageToken.replace('photo', '')
                        };
                        const button = image.button.getButtons(Buttons.T_VK_BUTTONS);
                        /**
                         * У карточки в любом случае должна быть хоть одна кнопка.
                         * Максимальное количество кнопок 3
                         */
                        if (button.one_time) {
                            element.buttons = button.buttons.splice(0, 3);
                            element.action = {type: 'open_photo'};
                            elements.push(element);
                        }
                    }
                });
                if (elements.length) {
                    return {
                        type: 'carousel',
                        elements
                    };
                }
            }
        }
        return object;
    }
}
