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
 * Class TelegramCard
 * @class bot\components\card\types
 */
export class TelegramCard extends TemplateCardTypes {
    /**
     * Получение карточки для отображения пользователю.
     *
     * todo подумать над корректным отображением.
     * @param {boolean} isOne True, если отобразить только 1 картинку. Не используется.
     * @return ITelegramCard
     * @api
     */
    public getCard(isOne: boolean): ITelegramCard {
        let object: ITelegramCard = null;
        const options: string[] = [];
        this.images.forEach((image) => {
            if (!image.imageToken) {
                if (image.imageDir) {
                    const mImage = new ImageTokens();
                    mImage.type = ImageTokens.T_TELEGRAM;
                    mImage.caption = image.desc;
                    image.imageToken = mImage.getToken();
                }
            } else {
                (new TelegramRequest()).sendPhoto(mmApp.params.user_id, image.imageToken, image.desc);
            }
            options.push(image.title);
        });
        if (options.length > 1) {
            object = {
                question: this.title,
                options: options
            };
        }
        return object;
    }
}
