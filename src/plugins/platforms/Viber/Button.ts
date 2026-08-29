import { AppContext, IButtonType } from '../../../index';
import { IViberButton, IViberButtonObject } from './interfaces/IViberPlatform';
import { getCorrectButtons, serializePlatformPayload } from '../Base/utils';

/**
 * Тип кнопки для отправки ответа.
 * Возвращает `ActionBody` как обычное сообщение от пользователя.
 *
 * @readonly
 *
 * @example
 * ```ts
 * import { getButton } from 'umbot';
 * import { ViberButton } from 'umbot/plugins';
 *
 * controller.buttons.add(
 *     getButton(appContext, 'Подтвердить', null, { action: 'confirm' })
 * );
 * // Дальше можно дополнительно подсказать платформе через options:
 * // { ActionType: ViberButton.T_REPLY, ActionBody: 'custom_payload' }
 * ```
 */
export const T_REPLY = 'reply';

/**
 * Тип кнопки для открытия URL в браузере Viber.
 *
 * @readonly
 *
 * @example
 * ```ts
 * import { getLinkButton } from 'umbot';
 * import { ViberButton } from 'umbot/plugins';
 *
 * controller.buttons.add(
 *     getLinkButton(appContext, 'Открыть сайт', 'https://example.com')
 * );
 * // Опционально: уточнить платформенный тип через options.
 * ```
 */
export const T_OPEN_URL = 'open-url';

/**
 * Тип кнопки для запроса местоположения у пользователя.
 * Результат приходит в отдельном сообщении Viber.
 *
 * @readonly
 *
 * @example
 * ```ts
 * import { getButton } from 'umbot';
 * import { ViberButton } from 'umbot/plugins';
 *
 * controller.buttons.add(
 *     getButton(appContext, 'Выбрать адрес', null, null, { ActionType: ViberButton.T_LOCATION_PICKER })
 * );
 * ```
 */
export const T_LOCATION_PICKER = 'location-picker';

/**
 * Тип кнопки для получения телефона пользователя.
 * После нажатия Viber отправит номер в бот.
 *
 * @readonly
 *
 * @example
 * ```ts
 * import { getButton } from 'umbot';
 * import { ViberButton } from 'umbot/plugins';
 *
 * controller.buttons.add(
 *     getButton(appContext, 'Поделиться телефоном', null, null, { ActionType: ViberButton.T_SHARE_PHONE })
 * );
 * ```
 */
export const T_SHARE_PHONE = 'share-phone';

/**
 * Тип кнопки без действия. Используется для информационных элементов.
 *
 * @readonly
 *
 * @example
 * ```ts
 * import { getButton } from 'umbot';
 * import { ViberButton } from 'umbot/plugins';
 *
 * controller.buttons.add(
 *     getButton(appContext, 'Информация', null, null, {
 *         ActionType: ViberButton.T_NONE,
 *         TextSize: 'small',
 *         TextColor: '#cccccc',
 *     })
 * );
 * ```
 */
export const T_NONE = 'none';

/** Поля кнопки, которые Viber принимает в объекте `keyboard.Buttons`. */
const VIBER_BUTTON_OPTION_FIELDS = new Set([
    'Columns',
    'Rows',
    'BgColor',
    'BgMedia',
    'BgMediaType',
    'BgMediaScaleType',
    'BgLoop',
    'ActionType',
    'ActionBody',
    'Image',
    'ImageScaleType',
    'Text',
    'TextVAlign',
    'TextHAlign',
    'TextPaddings',
    'TextOpacity',
    'TextSize',
    'OpenURLType',
    'OpenURLMediaType',
    'TextBgGradientColor',
    'TextShouldFit',
    'Silent',
    'InternalBrowser',
]);

/** Извлекает только документированные платформенные поля кнопки Viber. */
function getViberButtonOptions(options: IButtonType['options']): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    Object.entries(options).forEach(([name, value]) => {
        if (VIBER_BUTTON_OPTION_FIELDS.has(name) && value !== undefined) {
            result[name] = value;
        }
    });
    return result;
}

/**
 * Преобразует универсальные кнопки в формат Viber.
 *
 * @param buttons Кнопки, которые необходимо отобразить.
 * @returns Объект клавиатуры Viber или null, если передан пустой список.
 */
export function buttonProcessing(
    buttons: IButtonType[],
    appContext?: AppContext,
): IViberButtonObject | null {
    let object: IViberButtonObject | null = null;
    const buttonsResult: IViberButton[] = [];
    getCorrectButtons(buttons, 6).forEach((button) => {
        // Кнопка без подписи в Viber выглядит как пустой прямоугольник и ничего
        // не сообщает пользователю — такие кнопки не отправляем.
        if (!button.title?.trim()) {
            appContext?.logWarn('[Viber] Кнопка с пустым Text пропущена.');
            return;
        }
        let btn: IViberButton = {
            Text: button.title,
        };
        if (button.url) {
            btn.ActionType = T_OPEN_URL;
            btn.ActionBody = button.url;
        } else {
            btn.ActionType = T_REPLY;
            if (button.payload) {
                const payload = serializePlatformPayload(button.payload, 'Viber', appContext);
                if (payload === null) {
                    return;
                }
                btn.ActionBody = payload;
            } else {
                btn.ActionBody = button.title;
            }
        }
        if (button.options.request_contact === true) {
            btn.ActionType = T_SHARE_PHONE;
            btn.ActionBody = button.title;
        } else if (button.options.request_location === true) {
            btn.ActionType = T_LOCATION_PICKER;
            btn.ActionBody = button.title;
        }
        btn = <IViberButton>{ ...btn, ...getViberButtonOptions(button.options) };

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
