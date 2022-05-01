import {TemplateButtonTypes} from "./TemplateButtonTypes";
import {Text} from "../../standard/Text";
import {ISberSmartAppCardAction, ISberSmartAppSuggestionButton} from "../../../core/interfaces/ISberSmartApp";

/**
 * Класс отвечающий за отображение кнопок в Сбер SmartApp
 * @class SmartAppButton
 */
export class SmartAppButton extends TemplateButtonTypes {
    /**
     * Использование кнопок для карточки
     * True, если нужно отобразить кнопку для карточки. По умолчанию false
     */
    public isCard: boolean;

    /**
     * SmartAppButton constructor.
     */
    public constructor() {
        super();
        this.isCard = false;
    }

    /**
     * Получение массива с кнопками для ответа пользователю.
     *
     * @return ISberSmartAppSuggestionButton[]|ISberSmartAppCardAction
     * [
     *  - string text: Текст в кнопке.
     *  - string payload: Произвольные данные, которые будут отправлены при нажатии на кнопку.
     *  - string url: Ссылка по которой будет произведен переход после нажатия на кнопку.
     * ]
     * @api
     */
    public getButtons(): ISberSmartAppSuggestionButton[] | ISberSmartAppCardAction {
        const objects: ISberSmartAppSuggestionButton[] = [];
        if (this.isCard) {
            const button = this.buttons[0];
            if (button) {
                if (button.url) {
                    return {
                        deep_link: button.url,
                        type: 'deep_link'
                    };
                } else {
                    const text = Text.resize(button.title || '', 64);
                    if (text) {
                        return {
                            text,
                            type: 'text'
                        };
                    }
                }
            }
        } else {
            this.buttons.forEach((button) => {
                const title = Text.resize(button.title || '', 64);
                if (title) {
                    const object: ISberSmartAppSuggestionButton = {
                        title,
                    };
                    if (button.payload) {
                        object.action = {
                            server_action: button.payload,
                            type: 'server_action'
                        };
                    } else {
                        object.action = {
                            text: title,
                            type: 'text'
                        }
                    }
                    objects.push(object);
                }
            })
        }
        return objects;
    }
}
