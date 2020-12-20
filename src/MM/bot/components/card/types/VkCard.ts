import {TemplateCardTypes} from "./TemplateCardTypes";
import {ImageTokens} from "../../../models/ImageTokens";
import {Buttons} from "../../button/Buttons";
import {IVkButton} from "../../button/interfaces/IVkButton";

export interface IVkCardElement {
    /**
     * Заголовок
     */
    title: string;
    /**
     * Описание
     */
    description: string;
    /**
     * Ид изображения
     */
    photo_id: string;
    /**
     * Кнопки
     */
    buttons?: IVkButton[];
    /**
     * Действие, происходящее при нажатии на элемент карточки
     */
    action?: {
        type: string;
    }
}

export interface IVkCard {
    /**
     * Тип карточки
     */
    type: string;
    /**
     * Элементы карточки
     */
    elements: IVkCardElement[]
}

/**
 * Класс отвечающий за отображение карточки в ВКонтакте.
 * @class VkCard
 */
export class VkCard extends TemplateCardTypes {
    /**
     * Получение карточки для отображения пользователю.
     *
     * @param {boolean} isOne True, если в любом случае отобразить 1 элемент карточки
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
