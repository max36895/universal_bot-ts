import {TemplateButtonTypes} from "./TemplateButtonTypes";
import {IAlisaButton, IAlisaButtonCard} from "../../../core/interfaces/IAlisa";
import {Text} from "../../standard/Text";

/**
 * Класс отвечающий за отображение кнопок в Алисе
 * @class AlisaButton
 */
export class AlisaButton extends TemplateButtonTypes {
    /**
     * Использование кнопок для карточки
     * True, если нужно отобразить кнопку для карточки. По умолчанию false
     */
    public isCard: boolean;

    /**
     * AlisaButton constructor.
     */
    public constructor() {
        super();
        this.isCard = false;
    }

    /**
     * Получение массива с кнопками для ответа пользователю.
     *
     * @return IAlisaButton[]|IAlisaButtonCard
     * [
     *  - string text: Текст на кнопке.
     *  - string payload: Произвольные данные, которые будут отправлены при нажатии на кнопку.
     *  - string url: Ссылка по которой будет произведен переход после нажатия на кнопку.
     * ]
     * @api
     */
    public getButtons(): IAlisaButton[] | IAlisaButtonCard {
        const objects: IAlisaButton[] = [];
        if (this.isCard) {
            for (const button of this.buttons) {
                const text = Text.resize(button.title, 64);
                if (text) {
                    const object: IAlisaButtonCard = {
                        text
                    };
                    if (button.payload) {
                        object.payload = button.payload;
                    }
                    if (button.url) {
                        object.url = Text.resize(button.url, 1024);
                    }
                    return object;
                }
            }
        } else {
            this.buttons.forEach((button) => {
                const title = Text.resize(button.title, 64);
                if (title) {
                    const object: IAlisaButton = {
                        title,
                        hide: button.hide
                    };
                    if (button.payload) {
                        object.payload = button.payload;
                    }
                    if (button.url) {
                        object.url = Text.resize(button.url, 1024);
                    }
                    objects.push(object);
                }
            })
        }
        return objects;
    }
}
