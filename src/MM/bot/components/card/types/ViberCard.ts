/**
 * Класс отвечающий за отображение карточки в Viber.
 * Class ViberCard
 * @package bot\components\card\types
 */
import {TemplateCardTypes} from "./TemplateCardTypes";
import {IViberButtonObject} from "../../button/interfaces/IViberButton";
import {Buttons} from "../../button/Buttons";

export interface IViberCard {
    Columns: number;
    Rows: number;
    Image?: string;
    Text?: string;
    ActionType?: string;
    ActionBody?: string;
}

export class ViberCard extends TemplateCardTypes {
    /**
     * Получить карточку для отображения пользователю.
     *
     * @param  isOne True, если в любом случае использовать 1 картинку.
     * @return IViberCard[] | IViberCard
     * @api
     */
    public getCard(isOne: boolean): IViberCard[] | IViberCard {
        let objects: IViberCard[] = [];
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
                    let element: IViberCard = {
                        Columns: 1,
                        Rows: 6,
                        Image: this.images[0].imageToken
                    };
                    const btn: IViberButtonObject = this.images[0].button.getButtons(Buttons.T_VIBER_BUTTONS);
                    if (btn && typeof btn.Buttons !== 'undefined') {
                        element = {...element, ...btn.Buttons[0]};
                        element.Text = `<font color=#000><b>${this.images[0].title}</b></font><font color=#000>${this.images[0].desc}</font>`;
                    }
                    return element;
                }
            } else {
                this.images.forEach((image) => {
                    if (!image.imageToken) {
                        if (image.imageDir) {
                            image.imageToken = image.imageDir;
                        }
                    }

                    let element: IViberCard = {
                        Columns: countImage,
                        Rows: 6,
                    };
                    if (image.imageToken) {
                        element.Image = image.imageToken;
                    }
                    const btn: IViberButtonObject = image.button.getButtons(Buttons.T_VIBER_BUTTONS);
                    if (btn && typeof btn.Buttons !== 'undefined') {
                        element = {...element, ...btn.Buttons[0]};
                        element.Text = `<font color=#000><b>${image.title}</b></font><font color=#000>${image.desc}</font>`;
                    }
                    objects.push(element);
                })
            }
        }
        return objects;
    }
}
