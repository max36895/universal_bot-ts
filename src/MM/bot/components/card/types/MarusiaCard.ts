import {TemplateCardTypes} from "./TemplateCardTypes";
import {Buttons} from "../../button/Buttons";
import {ImageTokens} from "../../../models/ImageTokens";
import {Text} from "../../standard/Text";
import {IAlisaButtonCard, IAlisaImage, IAlisaItemsList} from "../../../core/interfaces/IAlisa";

/**
 * Класс отвечающий за отображение карточки в Марусе.
 * @class MarusiaCard
 */
export class MarusiaCard extends TemplateCardTypes {
    public static readonly MARUSIA_CARD_BIG_IMAGE = 'BigImage';
    public static readonly MARUSIA_CARD_ITEMS_LIST = 'ItemsList';
    public static readonly MARUSIA_MAX_IMAGES = 5;

    /**
     * Получение карточки для отображения пользователю.
     *
     * @param {boolean} isOne True, если в любом случае отобразить 1 элемент карточки
     * @return IAlisaBigImage | IAlisaItemsList
     * @api
     */
    public getCard(isOne: boolean): any {
        let object = {};
        this.button.type = Buttons.T_ALISA_CARD_BUTTON;
        const countImage = this.images.length;
        if (countImage) {
            if (isOne) {
                if (!this.images[0].imageToken) {
                    if (this.images[0].imageDir) {
                        const mImage = new ImageTokens();
                        mImage.type = ImageTokens.T_ALISA;
                        this.images[0].imageToken = mImage.getToken();
                    }
                }
                if (this.images[0].imageToken) {
                    object = {
                        type: MarusiaCard.MARUSIA_CARD_BIG_IMAGE,
                        image_id: this.images[0].imageToken,
                        title: Text.resize(this.images[0].title, 128),
                        description: Text.resize(this.images[0].desc, 256)
                    };
                }
            } else {
                const tmp: IAlisaItemsList = {
                    type: MarusiaCard.MARUSIA_CARD_ITEMS_LIST,
                    header: {
                        text: Text.resize(this.title, 64)
                    }
                };
                let items: IAlisaImage[] = [];
                for (const image of this.images) {
                    if (items.length <= MarusiaCard.MARUSIA_MAX_IMAGES) {
                        let button: IAlisaButtonCard = image.button.getButtons(Buttons.T_ALISA_CARD_BUTTON);
                        if (!button.text) {
                            button = null;
                        }
                        if (!image.imageToken) {
                            if (image.imageDir) {
                                const mImage = new ImageTokens();
                                mImage.type = ImageTokens.T_ALISA;
                                image.imageToken = mImage.getToken();
                            }
                        }
                        //if (image.imageToken !== null) {
                        const item: IAlisaImage = {
                            title: Text.resize(image.title, 128),
                            description: Text.resize(image.desc, 256),
                        };
                        if (image.imageToken) {
                            item.image_id = image.imageToken;
                        }
                        if (button) {
                            item.button = button;
                        }
                        items.push(item);
                    }
                    //}
                }
                tmp.items = items;
                items = null;
                return tmp;
            }
        }
        return object;
    }
}
