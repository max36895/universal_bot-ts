import {TemplateCardTypes} from "./TemplateCardTypes";
import {Buttons} from "../../button";
import {ImageTokens} from "../../../models/ImageTokens";
import {Text} from "../../standard/Text";
import {
    IMarusiaBigImage,
    IMarusiaButtonCard,
    IMarusiaImage,
    IMarusiaItemsList
} from "../../../core/interfaces/IMarusia";

/**
 * Класс отвечающий за отображение карточки в Марусе.
 * @class MarusiaCard
 */
export class MarusiaCard extends TemplateCardTypes {
    public static readonly MARUSIA_CARD_BIG_IMAGE = 'BigImage';
    public static readonly MARUSIA_CARD_ITEMS_LIST = 'ItemsList';
    public static readonly MARUSIA_MAX_IMAGES = 5;

    /**
     * Получаем элемент карточки
     * @return {Promise<IMarusiaImage[]>}
     * @private
     */
    protected async _getItem(): Promise<IMarusiaImage[]> {
        let items: IMarusiaImage[] = [];
        const images = this.images.slice(0, MarusiaCard.MARUSIA_MAX_IMAGES);
        for (const image of images) {
            let button: IMarusiaButtonCard | null = image.button.getButtons<IMarusiaButtonCard>(Buttons.T_ALISA_CARD_BUTTON);
            if (!button?.text) {
                button = null;
            }
            if (!image.imageToken) {
                if (image.imageDir) {
                    const mImage = new ImageTokens();
                    mImage.type = ImageTokens.T_MARUSIA;
                    mImage.path = image.imageDir;
                    image.imageToken = await mImage.getToken();
                }
            }
            const item: IMarusiaImage = {
                title: Text.resize(image.title, 128),
            };
            item.description = Text.resize(image.desc, 256);
            if (image.imageToken) {
                item.image_id = image.imageToken;
            }
            if (button && !this.isUsedGallery) {
                item.button = button;
            }
            items.push(item);
        }
        return items;
    }

    /**
     * Получение карточки для отображения пользователю.
     *
     * @param {boolean} isOne True, если в любом случае отобразить 1 элемент карточки
     * @return {Promise<IMarusiaBigImage | IMarusiaItemsList>}
     * @api
     */
    public async getCard(isOne: boolean): Promise<IMarusiaBigImage | IMarusiaItemsList | null> {
        this.button.type = Buttons.T_ALISA_CARD_BUTTON;
        const countImage = this.images.length;
        if (countImage) {
            if (isOne) {
                if (!this.images[0].imageToken) {
                    if (this.images[0].imageDir) {
                        const mImage = new ImageTokens();
                        mImage.type = ImageTokens.T_MARUSIA;
                        mImage.path = this.images[0].imageDir;
                        this.images[0].imageToken = await mImage.getToken();
                    }
                }
                if (this.images[0].imageToken) {
                    let button: IMarusiaButtonCard | null = this.images[0].button.getButtons<IMarusiaButtonCard>(Buttons.T_ALISA_CARD_BUTTON);
                    if (!button?.text) {
                        button = this.button.getButtons<IMarusiaButtonCard>();
                    }
                    const object: IMarusiaBigImage = {
                        type: MarusiaCard.MARUSIA_CARD_BIG_IMAGE,
                        image_id: this.images[0].imageToken,
                        title: Text.resize(this.images[0].title, 128),
                        description: Text.resize(this.images[0].desc, 256)
                    };
                    if (button?.text) {
                        object.button = button;
                    }
                    return object;
                }
            } else {
                const object: IMarusiaItemsList = {
                    type: MarusiaCard.MARUSIA_CARD_ITEMS_LIST,
                    header: {
                        text: Text.resize(this.title || '', 64)
                    }
                };
                object.items = await this._getItem();
                const btn: IMarusiaButtonCard | null = this.button.getButtons(Buttons.T_ALISA_CARD_BUTTON);
                if (btn?.text) {
                    object.footer = {
                        text: btn.text,
                        button: btn
                    };
                }
                return object;
            }
        }
        return null;
    }
}
