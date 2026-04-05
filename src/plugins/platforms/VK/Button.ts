import { Buttons, IButtonType } from '../../../index';
import { IVkButton, IVkButtonObject } from './interfaces/IVkPlatform';
import { getCorrectButtons } from '../Base/utils';

/**
 * Поле для группировки
 */
export const GROUP_NAME = '_group';

/**
 * Цвет кнопки primary в ВК.
 */
export const VK_COLOR_PRIMARY = 'primary';
/**
 * Цвет кнопки secondary в ВК.
 */
export const VK_COLOR_SECONDARY = 'secondary';
/**
 * Цвет кнопки negative в ВК.
 */
export const VK_COLOR_NEGATIVE = 'negative';
/**
 * Цвет кнопки positive в ВК.
 */
export const VK_COLOR_POSITIVE = 'positive';

/**
 * Тип кнопки текст
 */
export const VK_TYPE_TEXT = 'text';
/**
 * Тип кнопки ссылка
 */
export const VK_TYPE_LINK = 'open_link';
/**
 * Тип кнопки поделиться локацией
 */
export const VK_TYPE_LOCATION = 'location';
/**
 * Тип кнопки оплатить
 */
export const VK_TYPE_PAY = 'vkpay';
/**
 * Тип кнопки открыть приложение
 */
export const VK_TYPE_APPS = 'open_app';

function _validateVkPayload(payload: unknown): string {
    if (payload == null) return '';

    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    if (bytes.length > 255) {
        return new TextDecoder().decode(bytes.slice(0, 255));
    }

    return str;
}

/**
 * Получение кнопок в формате ВК
 * @param buttons Кнопки, которые необходимо отобразить
 */
export function buttonProcessing(buttons: IButtonType<IVkButton>[]): IVkButtonObject | null {
    const groups: number[] = [];
    const finalButtons: IVkButton[] | IVkButton[][] = [];
    let index = 0;
    getCorrectButtons(buttons).forEach((button) => {
        if (button.type === null) {
            button.type = button.hide === Buttons.B_LINK ? VK_TYPE_LINK : VK_TYPE_TEXT;
        }
        let object: IVkButton = {
            action: {
                type: button.type,
            },
        };
        if (button.url) {
            object.action.type = VK_TYPE_LINK;
            object.action.link = button.url;
        }
        object.action.label = button.title;
        if (button.payload) {
            if (typeof button.payload === 'string') {
                object.action.payload = button.payload;
            } else {
                object.action.payload = JSON.stringify(button.payload);
            }
        }

        if (button.payload?.color !== undefined && !button.url) {
            object.color = button.payload.color;
        }
        if (button.type === VK_TYPE_PAY) {
            object.hash = button.payload?.hash || null;
        }
        object = { ...object, ...button.options } as IVkButton;
        const groupOptions = button.options[GROUP_NAME];
        if (groupOptions === undefined) {
            finalButtons[index] = object;
            index++;
        } else {
            if (object[GROUP_NAME] !== undefined) {
                object[GROUP_NAME] = undefined;
            }
            if (groups[+groupOptions] === undefined) {
                groups[+groupOptions] = index;
                finalButtons[index] = [object];
                index++;
            } else {
                (<IVkButton[]>finalButtons[groups[+groupOptions]]).push(object);
            }
        }
        if (object.action.payload && typeof object.action.payload !== 'string') {
            object.action.payload = _validateVkPayload(object.action.payload);
        }
    });

    return {
        one_time: !!finalButtons.length,
        buttons: finalButtons,
    };
}
