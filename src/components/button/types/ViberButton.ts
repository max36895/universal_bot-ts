import { TemplateButtonTypes } from './TemplateButtonTypes';
import { IViberButton, IViberButtonObject } from '../interfaces';

/**
 * @class ViberButton
 * Класс для работы с кнопками в Viber
 *
 * Предоставляет функциональность для создания и отображения кнопок в Viber:
 * - Поддержка различных типов кнопок (ответ, ссылка, выбор локации, шаринг телефона)
 * - Настройка внешнего вида кнопок (цвет, размер, изображения)
 * - Поддержка payload для передачи данных
 * - Возможность скрытия кнопок
 *
 * @extends {TemplateButtonTypes}
 *
 * @example
 * ```typescript
 * const viberButton = new ViberButton();
 *
 * // Создание кнопки-ответа
 * const replyButton = new Button();
 * replyButton.initBtn('Ответить', '', null, {
 *     ActionType: ViberButton.T_REPLY,
 *     ActionBody: 'Ответить',
 *     TextSize: 'large',
 *     TextVAlign: 'middle',
 *     TextHAlign: 'center'
 * });
 * viberButton.buttons = [replyButton];
 * const replyResult = viberButton.getButtons();
 * // replyResult: {
 * //   DefaultHeight: true,
 * //   BgColor: '#FFFFFF',
 * //   Buttons: [{
 * //     Text: 'Ответить',
 * //     ActionType: 'reply',
 * //     ActionBody: 'Ответить',
 * //     TextSize: 'large',
 * //     TextVAlign: 'middle',
 * //     TextHAlign: 'center'
 * //   }]
 * // }
 *
 * // Создание кнопки-ссылки
 * const linkButton = new Button();
 * linkButton.initLink('Открыть сайт', 'https://example.com');
 * viberButton.buttons = [linkButton];
 * const linkResult = viberButton.getButtons();
 * // linkResult: {
 * //   DefaultHeight: true,
 * //   BgColor: '#FFFFFF',
 * //   Buttons: [{
 * //     Text: 'Открыть сайт',
 * //     ActionType: 'open-url',
 * //     ActionBody: 'https://example.com'
 * //   }]
 * // }
 * ```
 */
export class ViberButton extends TemplateButtonTypes {
    /**
     * Тип кнопки для отправки ответа
     *
     * @readonly
     *
     * @example
     * ```typescript
     * const viberButton = new ViberButton();
     *
     * // Создание кнопки-ответа
     * const replyButton = new Button();
     * replyButton.initBtn('Ответить', '', null, {
     *     ActionType: ViberButton.T_REPLY,
     *     ActionBody: 'custom_payload'
     * });
     * viberButton.buttons = [replyButton];
     * ```
     */
    public static readonly T_REPLY = 'reply';

    /**
     * Тип кнопки для открытия URL
     *
     * @readonly
     *
     * @example
     * ```typescript
     * const viberButton = new ViberButton();
     *
     * // Создание кнопки-ссылки
     * const linkButton = new Button();
     * linkButton.initBtn('Открыть сайт', 'https://example.com', null, {
     *     ActionType: ViberButton.T_OPEN_URL,
     *     ActionBody: 'https://example.com'
     * });
     * viberButton.buttons = [linkButton];
     * ```
     */
    public static readonly T_OPEN_URL = 'open-url';

    /**
     * Тип кнопки для выбора локации
     *
     * @readonly
     *
     * @example
     * ```typescript
     * const viberButton = new ViberButton();
     *
     * // Создание кнопки выбора локации
     * const locationButton = new Button();
     * locationButton.initBtn('Выбрать адрес', '', null, {
     *     ActionType: ViberButton.T_LOCATION_PICKER,
     *     ActionBody: 'location_payload'
     * });
     * viberButton.buttons = [locationButton];
     * ```
     */
    public static readonly T_LOCATION_PICKER = 'location-picker';

    /**
     * Тип кнопки для шаринга телефона
     *
     * @readonly
     *
     * @example
     * ```typescript
     * const viberButton = new ViberButton();
     *
     * // Создание кнопки шаринга телефона
     * const phoneButton = new Button();
     * phoneButton.initBtn('Поделиться телефоном', '', null, {
     *     ActionType: ViberButton.T_SHARE_PHONE,
     *     ActionBody: 'phone_payload'
     * });
     * viberButton.buttons = [phoneButton];
     * ```
     */
    public static readonly T_SHARE_PHONE = 'share-phone';

    /**
     * Тип кнопки без действия
     *
     * @readonly
     *
     * @example
     * ```typescript
     * const viberButton = new ViberButton();
     *
     * // Создание информационной кнопки
     * const infoButton = new Button();
     * infoButton.initBtn('Информация', '', null, {
     *     ActionType: ViberButton.T_NONE,
     *     TextSize: 'small',
     *     TextColor: '#666666'
     * });
     * viberButton.buttons = [infoButton];
     * ```
     */
    public static readonly T_NONE = 'none';

    /**
     * Получение кнопок в формате Viber
     *
     * @returns {IViberButtonObject | null} - Объект с кнопками в формате Viber или null, если кнопок нет:
     *                                        - DefaultHeight: флаг стандартной высоты
     *                                        - BgColor: цвет фона
     *                                        - Buttons: массив кнопок
     *
     * Поддерживаемые типы кнопок:
     * - reply: Кнопка-ответ
     * - open-url: Кнопка-ссылка
     * - location-picker: Кнопка выбора локации
     * - share-phone: Кнопка шаринга телефона
     * - none: Кнопка без действия
     *
     * @example
     * ```typescript
     * const viberButton = new ViberButton();
     *
     * // Создание кнопки выбора локации
     * const locationButton = new Button();
     * locationButton.initBtn('Выбрать адрес', '', null, {
     *     ActionType: ViberButton.T_LOCATION_PICKER,
     *     ActionBody: 'location_payload',
     *     Image: 'https://example.com/location.png'
     * });
     * viberButton.buttons = [locationButton];
     * const locationResult = viberButton.getButtons();
     * // locationResult: {
     * //   DefaultHeight: true,
     * //   BgColor: '#FFFFFF',
     * //   Buttons: [{
     * //     Text: 'Выбрать адрес',
     * //     ActionType: 'location-picker',
     * //     ActionBody: 'location_payload',
     * //     Image: 'https://example.com/location.png'
     * //   }]
     * // }
     *
     * // Создание кнопки шаринга телефона
     * const phoneButton = new Button();
     * phoneButton.initBtn('Поделиться телефоном', '', null, {
     *     ActionType: ViberButton.T_SHARE_PHONE,
     *     ActionBody: 'phone_payload',
     *     BgColor: '#2DB9EF'
     * });
     * viberButton.buttons = [phoneButton];
     * const phoneResult = viberButton.getButtons();
     * // phoneResult: {
     * //   DefaultHeight: true,
     * //   BgColor: '#FFFFFF',
     * //   Buttons: [{
     * //     Text: 'Поделиться телефоном',
     * //     ActionType: 'share-phone',
     * //     ActionBody: 'phone_payload',
     * //     BgColor: '#2DB9EF'
     * //   }]
     * // }
     * ```
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
