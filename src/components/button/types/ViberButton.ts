import {TemplateButtonTypes} from "./TemplateButtonTypes";
import {IViberButton, IViberButtonObject} from "../interfaces/IViberButton";

/**
 * Класс отвечающий за отображение кнопок в Viber
 * @class ViberButton
 */
export class ViberButton extends TemplateButtonTypes {
    public static readonly T_REPLY = 'reply';
    public static readonly T_OPEN_URL = 'open-url';
    public static readonly T_LOCATION_PICKER = 'location-picker';
    public static readonly T_SHARE_PHONE = 'share-phone';
    public static readonly T_NONE = 'none';

    /**
     * Получение массива с кнопками для ответа пользователю.
     *
     * @return IViberButtonObject
     * @api
     */
    public getButtons(): IViberButtonObject {
        let object: IViberButtonObject = null;
        const buttons: IViberButton[] = [];
        this.buttons.forEach((button) => {
            let btn: IViberButton = {
                Text: button.title
            };
            if (button.url) {
                btn.ActionType = ViberButton.T_OPEN_URL;
                btn.ActionBody = button.url;
            } else {
                btn.ActionType = ViberButton.T_REPLY;
                btn.ActionBody = button.title;
            }
            btn = <IViberButton>{...btn, ...button.options};

            buttons.push(btn);
        });

        if (buttons.length) {
            object = {
                DefaultHeight: true,
                BgColor: '#FFFFFF',
                Buttons: buttons
            };
        }
        return object;
    }
}
