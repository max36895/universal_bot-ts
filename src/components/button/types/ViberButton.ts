import { TemplateButtonTypes } from './TemplateButtonTypes';
import { IViberButton, IViberButtonObject } from '../interfaces';

/**
 * Класс отвечающий за отображение кнопок в Viber
 * @class ViberButton
 */
export class ViberButton extends TemplateButtonTypes {
    /**
     * Тип кнопки, при нажатии на которую, отправится запрос на сервер с содержимым кнопки.
     */
    public static readonly T_REPLY = 'reply';
    /**
     * Тип кнопки, при нажатии на которую, пользователь перейдет по ссылке.
     */
    public static readonly T_OPEN_URL = 'open-url';
    /**
     * Тип кнопки, при нажатии на которую, пользователь сможет выбрать свой адрес.
     */
    public static readonly T_LOCATION_PICKER = 'location-picker';
    /**
     * Тип кнопки, при нажатии на которую, пользователь сможет расшарить свой контактный номер телефона.
     */
    public static readonly T_SHARE_PHONE = 'share-phone';
    /**
     * Тип кнопки, без действия.
     */
    public static readonly T_NONE = 'none';

    /**
     * Получение массива с кнопками для ответа пользователю.
     *
     * @return IViberButtonObject
     */
    public getButtons(): IViberButtonObject | null {
        let object: IViberButtonObject | null = null;
        const buttons: IViberButton[] = [];
        this.buttons.forEach((button) => {
            let btn: IViberButton = {
                Text: button.title,
            };
            if (button.url) {
                btn.ActionType = ViberButton.T_OPEN_URL;
                btn.ActionBody = button.url;
            } else {
                btn.ActionType = ViberButton.T_REPLY;
                btn.ActionBody = button.title;
            }
            btn = <IViberButton>{ ...btn, ...button.options };

            buttons.push(btn);
        });

        if (buttons.length) {
            object = {
                DefaultHeight: true,
                BgColor: '#FFFFFF',
                Buttons: buttons,
            };
        }
        return object;
    }
}
