import { TemplateCardTypes } from './TemplateCardTypes';
import { ImageTokens } from '../../../models/ImageTokens';
import { Buttons, IVkButton } from '../../button';

/**
 * Интерфейс для элемента карточки.
 */
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
    };
}

/**
 * Интерфейс для карточки.
 */
export interface IVkCard {
    /**
     * Тип карточки
     */
    type: string;
    /**
     * Элементы карточки
     */
    elements: IVkCardElement[];
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
     * @return {Promise<IVkCard | string[]>}
     */
    public async getCard(isOne: boolean): Promise<IVkCard | string[]> {
        const object = [];
        const countImage = this.images.length;
        if (countImage) {
            if (countImage === 1 || isOne) {
                if (!this.images[0].imageToken) {
                    if (this.images[0].imageDir) {
                        const mImage = new ImageTokens();
                        mImage.type = ImageTokens.T_VK;
                        mImage.path = this.images[0].imageDir;
                        this.images[0].imageToken = await mImage.getToken();
                    }
                }
                if (this.images[0].imageToken) {
                    object.push(this.images[0].imageToken);
                }
            } else {
                const elements = [];
                for (let i = 0; i < this.images.length; i++) {
                    const image = this.images[i];
                    if (!image.imageToken) {
                        if (image.imageDir) {
                            const mImage = new ImageTokens();
                            mImage.type = ImageTokens.T_VK;
                            mImage.path = image.imageDir;
                            image.imageToken = await mImage.getToken();
                        }
                    }
                    if (image.imageToken) {
                        if (this.isUsedGallery) {
                            object.push(image.imageToken);
                        } else {
                            const element: IVkCardElement = {
                                title: image.title,
                                description: image.desc,
                                photo_id: image.imageToken.replace('photo', ''),
                            };
                            const button = image.button.getButtons(Buttons.T_VK_BUTTONS);
                            /*
                             * У карточки в любом случае должна быть хоть одна кнопка.
                             * Максимальное количество кнопок 3
                             */
                            if (button.one_time) {
                                element.buttons = button.buttons.splice(0, 3);
                                element.action = { type: 'open_photo' };
                                elements.push(element);
                            }
                        }
                    }
                }
                if (elements.length) {
                    return {
                        type: 'carousel',
                        elements,
                    };
                }
            }
        }
        return object;
    }
}
