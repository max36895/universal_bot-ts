import { TemplateButtonTypes } from './TemplateButtonTypes';
import { IVkButton, IVkButtonObject } from '../interfaces';
import { Button } from '../Button';

/**
 * Класс отвечающий за отображение кнопок в ВКонтакте
 * @class VkButton
 */
export class VkButton extends TemplateButtonTypes {
    /**
     * Название для группы. Использовать следующим способом:
     * button.payload[VkButton.GROUP_NAME] = <Название_группы>
     * Используется для группировки кнопок
     */
    public static readonly GROUP_NAME = '_group';

    /**
     * Получение массива с кнопками для ответа пользователю.
     *
     * @return IVkButtonObject
     */
    public getButtons(): IVkButtonObject {
        const groups: number[] = [];
        const buttons: IVkButton[] | IVkButton[][] = [];
        let index = 0;
        this.buttons.forEach((button) => {
            if (button.type === null) {
                if (button.hide === Button.B_LINK) {
                    button.type = Button.VK_TYPE_LINK;
                } else {
                    button.type = Button.VK_TYPE_TEXT;
                }
            }
            let object: IVkButton = {
                action: {
                    type: button.type,
                },
            };
            if (button.url) {
                object.action.type = Button.VK_TYPE_LINK;
                object.action.link = button.url;
            }
            object.action.label = button.title;
            if (button.payload) {
                if (typeof button.payload === 'string') {
                    object.action.payload = button.payload;
                } else {
                    object.action.payload = { ...button.payload };
                }
            }

            if (typeof button.payload.color !== 'undefined' && !button.url) {
                object.color = button.payload.color;
            }
            if (button.type === Button.VK_TYPE_PAY) {
                object.hash = button.payload.hash || null;
            }
            object = { ...object, ...button.options };
            const groupOptions = button.options[VkButton.GROUP_NAME];
            if (typeof groupOptions !== 'undefined') {
                if (typeof object[VkButton.GROUP_NAME] !== 'undefined') {
                    delete object[VkButton.GROUP_NAME];
                }
                if (typeof groups[+groupOptions] !== 'undefined') {
                    (<IVkButton[]>buttons[groups[+groupOptions]]).push(object);
                } else {
                    groups[+groupOptions] = index;
                    buttons[index] = [object];
                    index++;
                }
            } else {
                buttons[index] = object;
                index++;
            }
            if (object.action.payload && typeof object.action.payload !== 'string') {
                object.action.payload = JSON.stringify(object.action.payload);
            }
        });

        return {
            one_time: !!buttons.length,
            buttons: buttons,
        };
    }
}
