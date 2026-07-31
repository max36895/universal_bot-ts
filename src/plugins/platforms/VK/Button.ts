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
 * Ключи options, которые управляются фреймворком и не должны перезаписываться пользователем.
 * Spread оператор не должен инжектить эти поля во избежание нарушения контрактов VK API.
 */
const VK_PROTECTED_KEYS = new Set(['action', 'color', 'hash', GROUP_NAME]);

/**
 * Фильтрует options, исключая защищённые ключи фреймворка.
 * Предотвращает инжекцию критических полей через spread оператор.
 * @param options Пользовательские опции кнопки
 * @returns Новый объект без защищённых ключей
 */
function _filterSafeOptions(options: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(options)) {
        if (!VK_PROTECTED_KEYS.has(key)) {
            result[key] = options[key];
        }
    }
    return result;
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
                object.action.payload = _validateVkPayload(button.payload);
            } else {
                object.action.payload = _validateVkPayload(JSON.stringify(button.payload));
            }
        }

        // Приоритет: options.color > payload.color (обратная совместимость)
        const buttonColor = (button.options?.color ?? button.payload?.color) as string | undefined;
        if (buttonColor !== undefined && !button.url) {
            object.color = buttonColor;
        }
        if (button.type === VK_TYPE_PAY) {
            const payloadObj =
                typeof button.payload === 'string'
                    ? ((): Record<string, string> | null => {
                          try {
                              return JSON.parse(button.payload);
                          } catch {
                              return null;
                          }
                      })()
                    : button.payload;
            object.hash = payloadObj?.hash || null;
        }
        object = { ...object, ..._filterSafeOptions(button.options) } as IVkButton;
        const groupOptions = button.options[GROUP_NAME];
        if (groupOptions === undefined) {
            finalButtons[index] = [object];
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
    });

    return {
        one_time: !!finalButtons.length,
        buttons: finalButtons,
    };
}
