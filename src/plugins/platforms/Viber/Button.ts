import { IButtonType } from '../../../index';
import { IViberButton, IViberButtonObject } from './interfaces/IViberPlatform';
import { getCorrectButtons } from '../Base/utils';

/**
 * Тип кнопки для отправки ответа
 *
 * @readonly
 *
 * @example
 * ```ts
 * const viberButton = new ViberButton();
 *
 * // Создание кнопки-ответа
 * const replyButton = getButton('Ответить', '', null, {
 *     ActionType: ViberButton.T_REPLY,
 *     ActionBody: 'custom_payload'
 * });
 * viberButton.buttons = [replyButton];
 * ```
 */
export const T_REPLY = 'reply';

/**
 * Тип кнопки для открытия URL
 *
 * @readonly
 *
 * @example
 * ```ts
 * const viberButton = new ViberButton();
 *
 * // Создание кнопки-ссылки
 * const linkButton = getButton('Открыть сайт', 'https://example.com', null, {
 *     ActionType: ViberButton.T_OPEN_URL,
 *     ActionBody: 'https://example.com'
 * });
 * viberButton.buttons = [linkButton];
 * ```
 */
export const T_OPEN_URL = 'open-url';

/**
 * Тип кнопки для выбора локации
 *
 * @readonly
 *
 * @example
 * ```ts
 * const viberButton = new ViberButton();
 *
 * // Создание кнопки выбора локации
 * const locationButton = getButton('Выбрать адрес', '', null, {
 *     ActionType: ViberButton.T_LOCATION_PICKER,
 *     ActionBody: 'location_payload'
 * });
 * viberButton.buttons = [locationButton];
 * ```
 */
export const T_LOCATION_PICKER = 'location-picker';

/**
 * Тип кнопки для шаринга телефона
 *
 * @readonly
 *
 * @example
 * ```ts
 * const viberButton = new ViberButton();
 *
 * // Создание кнопки шаринга телефона
 * const phoneButton = getButton('Поделиться телефоном', '', null, {
 *     ActionType: ViberButton.T_SHARE_PHONE,
 *     ActionBody: 'phone_payload'
 * });
 * viberButton.buttons = [phoneButton];
 * ```
 */
export const T_SHARE_PHONE = 'share-phone';

/**
 * Тип кнопки без действия
 *
 * @readonly
 *
 * @example
 * ```ts
 * const viberButton = new ViberButton();
 *
 * // Создание информационной кнопки
 * const infoButton = getButton('Информация', '', null, {
 *     ActionType: ViberButton.T_NONE,
 *     TextSize: 'small',
 *     TextColor: '#cccccc'
 * });
 * viberButton.buttons = [infoButton];
 * ```
 */
export const T_NONE = 'none';

/**
 * Получение кнопок в формате Viber
 * @param buttons Кнопки, которые необходимо отобразить
 */
export function buttonProcessing(buttons: IButtonType[]): IViberButtonObject | null {
    let object: IViberButtonObject | null = null;
    const buttonsResult: IViberButton[] = [];
    getCorrectButtons(buttons, 6).forEach((button) => {
        let btn: IViberButton = {
            Text: button.title,
        };
        if (button.url) {
            btn.ActionType = T_OPEN_URL;
            btn.ActionBody = button.url;
        } else {
            btn.ActionType = T_REPLY;
            btn.ActionBody = button.title;
        }
        btn = <IViberButton>{ ...btn, ...button.options };

        buttonsResult.push(btn);
    });

    if (buttonsResult.length) {
        object = {
            DefaultHeight: true,
            BgColor: '#FFFFFF',
            Buttons: buttonsResult,
        };
    }
    return object;
}
