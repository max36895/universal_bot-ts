import {TemplateCardTypes} from "./TemplateCardTypes";
import {Buttons} from "../../button";
import {
    IAlisaBigImage,
    IAlisaButtonCard,
    IAlisaImage,
    IAlisaImageGallery,
    IAlisaItemsList
} from "../../../core/interfaces/IAlisa";
import {Text} from "../../standard/Text";
import {ImageTokens} from "../../../models/ImageTokens";

/**
 * Класс отвечающий за отображение карточки в Алисе.
 * @class AlisaCard
 */
export class AlisaCard extends TemplateCardTypes {
    public static readonly ALISA_CARD_BIG_IMAGE = 'BigImage';
    public static readonly ALISA_CARD_ITEMS_LIST = 'ItemsList';
    public static readonly ALISA_MAX_IMAGES = 5;
    public static readonly ALISA_MAX_GALLERY_IMAGES = 7;

    /**
     * Получаем элемент карточки
     * @return {Promise<IAlisaImage[]>}
     * @private
     */
    protected async _getItem(): Promise<IAlisaImage[]> {
        const items: IAlisaImage[] = [];
        const maxCount = this.isUsedGallery ? AlisaCard.ALISA_MAX_GALLERY_IMAGES : AlisaCard.ALISA_MAX_IMAGES;
        const images = this.images.slice(0, maxCount);
        for (const image of images) {
            let button: IAlisaButtonCard | null = null;
            if (!this.isUsedGallery) {
                button = image.button.getButtons<IAlisaButtonCard>(Buttons.T_ALISA_CARD_BUTTON);
                if (!button?.text) {
                    button = null;
                }
            }
            if (!image.imageToken) {
                if (image.imageDir) {
                    const mImage = new ImageTokens();
                    mImage.type = ImageTokens.T_ALISA;
                    mImage.path = image.imageDir;
                    image.imageToken = await mImage.getToken();
                }
            }
            const item: IAlisaImage = {
                title: Text.resize(image.title, 128),
            };
            if (!this.isUsedGallery) {
                item.description = Text.resize(image.desc, 256);
            }
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
     * @return {Promise<IAlisaBigImage | IAlisaItemsList | IAlisaImageGallery>}
     * @api
     */
    public async getCard(isOne: boolean): Promise<IAlisaBigImage | IAlisaItemsList | IAlisaImageGallery | null> {
        this.button.type = Buttons.T_ALISA_CARD_BUTTON;
        const countImage = this.images.length;
        if (countImage) {
            if (isOne) {
                if (!this.images[0].imageToken) {
                    if (this.images[0].imageDir) {
                        const mImage = new ImageTokens();
                        mImage.type = ImageTokens.T_ALISA;
                        mImage.path = this.images[0].imageDir;
                        this.images[0].imageToken = await mImage.getToken();
                    }
                }
                if (this.images[0].imageToken) {
                    let button: IAlisaButtonCard | null = this.images[0].button.getButtons(Buttons.T_ALISA_CARD_BUTTON);
                    if (!button?.text) {
                        button = this.button.getButtons();
                    }
                    const object: IAlisaBigImage = {
                        type: AlisaCard.ALISA_CARD_BIG_IMAGE,
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
                if (this.isUsedGallery) {
                    const object: IAlisaImageGallery = {
                        type: "ImageGallery"
                    };
                    object.items = await this._getItem();
                    return object;
                } else {
                    const object: IAlisaItemsList = {
                        type: AlisaCard.ALISA_CARD_ITEMS_LIST,
                        header: {
                            text: Text.resize(this.title || '', 64)
                        }
                    };
                    object.items = await this._getItem();
                    const btn: IAlisaButtonCard | null = this.button.getButtons(Buttons.T_ALISA_CARD_BUTTON);
                    if (btn?.text) {
                        object.footer = {
                            text: btn.text,
                            button: btn
                        };
                    }
                    return object;
                }
            }
        }
        return null;
    }
}
