import {TemplateButtonTypes} from "./TemplateButtonTypes";
import {IAlisaButton, IAlisaButtonCard} from "../../../core/interfaces/IAlisa";
import {Text} from "../../standard/Text";
import {Button} from "../Button";

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
     * Отображаем кнопку
     *
     * @param {Button} button Кнопка для отображения
     * @return {IAlisaButtonCard | IAlisaButton}
     * @private
     */
    protected _getButton(button: Button): IAlisaButtonCard | IAlisaButton | null {
        const title = Text.resize(button.title || '', 64);
        if (title) {
            let object: IAlisaButtonCard | IAlisaButton;
            if (this.isCard) {
                object = <IAlisaButtonCard>{
                    text: title
                }
            } else {
                object = <IAlisaButton>{
                    title,
                    hide: button.hide
                }
            }
            if (button.payload) {
                object.payload = button.payload;
            }
            if (button.url) {
                object.url = Text.resize(button.url, 1024);
            }
            return object;
        }
        return null;
    }

    /**
     * Получение массива с кнопками для ответа пользователю.
     *
     * @return IAlisaButton[]|IAlisaButtonCard
     * [
     *  - string text: Текст в кнопке.
     *  - string payload: Произвольные данные, которые будут отправлены при нажатии на кнопку.
     *  - string url: Ссылка по которой будет произведен переход после нажатия на кнопку.
     * ]
     * @api
     */
    public getButtons(): IAlisaButton[] | IAlisaButtonCard | null {
        const objects: IAlisaButton[] = [];
        if (this.isCard) {
            if (this.buttons.length) {
                return this._getButton(this.buttons[0]);
            }
        } else {
            this.buttons.forEach((button) => {
                const object: IAlisaButton | null = this._getButton(button);
                if (object) {
                    objects.push(object);
                }
            })
        }
        return objects;
    }
}
