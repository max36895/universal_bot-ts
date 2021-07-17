import {TemplateCardTypes} from "./TemplateCardTypes";
import {TelegramRequest} from "../../../api/TelegramRequest";
import {mmApp} from "../../../core/mmApp";
import {ImageTokens} from "../../../models/ImageTokens";

export interface ITelegramCard {
    /**
     * Опрос
     */
    question: string;
    /**
     * Варианты ответа
     */
    options: string[];
}

/**
 * Класс отвечающий за отображение карточки в Телеграме.
 * @class TelegramCard
 */
export class TelegramCard extends TemplateCardTypes {
    /**
     * Получение карточки для отображения пользователю.
     *
     * todo подумать над корректным отображением.
     * @param {boolean} isOne True, если нужно отобразить только 1 элемент. Не используется.
     * @return {Promise<ITelegramCard>}
     * @api
     */
    public async getCard(isOne: boolean): Promise<ITelegramCard> {
        let object: ITelegramCard = null;
        const options: string[] = [];
        for (let i = 0; i < this.images.length; i++) {
            const image = this.images[i];
            if (!image.imageToken) {
                if (image.imageDir) {
                    const mImage = new ImageTokens();
                    mImage.type = ImageTokens.T_TELEGRAM;
                    mImage.caption = image.desc;
                    mImage.path = image.imageDir;
                    image.imageToken = await mImage.getToken();
                }
            } else {
                await (new TelegramRequest()).sendPhoto(mmApp.params.user_id, image.imageToken, image.desc);
            }
            options.push(image.title);
        }
        if (options.length > 1) {
            object = {
                question: this.title,
                options: options
            };
        }
        return object;
    }
}
