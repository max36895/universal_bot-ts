import {TemplateCardTypes} from './TemplateCardTypes';
import {Buttons, IViberButton, IViberButtonObject} from '../../button';
import {Image} from '../../image/Image';

export interface IViberCard extends IViberButton {
}

/**
 * Класс отвечающий за отображение карточки в Viber.
 * @class ViberCard
 */
export class ViberCard extends TemplateCardTypes {
    /**
     * Получение элемента карточки.
     * @param {Image} image Объект с изображением
     * @param {number} countImage Количество изображений
     * @return {IViberCard}
     * @private
     */
    protected static _getElement(image: Image, countImage: number = 1): IViberCard {
        if (!image.imageToken) {
            if (image.imageDir) {
                image.imageToken = image.imageDir;
            }
        }

        let element: IViberCard = {
            Columns: countImage,
            Rows: 6
        };
        if (image.imageToken) {
            element.Image = image.imageToken;
        }
        const btn: IViberButtonObject | null = image.button.getButtons<IViberButtonObject>(Buttons.T_VIBER_BUTTONS);
        if (btn && typeof btn.Buttons !== 'undefined') {
            element = {...element, ...btn.Buttons[0]};
            element.Text = `<font color=#000><b>${image.title}</b></font><font color=#000>${image.desc}</font>`;
        }
        return element;
    }

    /**
     * Получение карточки для отображения пользователю.
     *
     * @param  {boolean} isOne True, если в любом случае отобразить 1 элемент карточки
     * @return {Promise<IViberCard[] | IViberCard>}
     * @api
     */
    public async getCard(isOne: boolean): Promise<IViberCard[] | IViberCard> {
        const objects: IViberCard[] = [];
        let countImage = this.images.length;
        if (countImage > 7) {
            countImage = 7;
        }
        if (countImage) {
            if (countImage === 1 || isOne) {
                if (!this.images[0].imageToken) {
                    if (this.images[0].imageDir) {
                        this.images[0].imageToken = this.images[0].imageDir;
                    }
                }
                if (this.images[0].imageToken) {
                    return ViberCard._getElement(this.images[0]);
                }
            } else {
                this.images.forEach((image) => {
                    if (objects.length <= countImage) {
                        objects.push(ViberCard._getElement(image, countImage));
                    }
                })
            }
        }
        return objects;
    }
}
