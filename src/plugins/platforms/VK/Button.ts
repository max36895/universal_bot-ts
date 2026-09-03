import { Buttons, IButtonType, Text } from '../../../index';
import { IVkButton, IVkButtonObject } from './interfaces/IVkPlatform';
import { getCorrectButtons, serializePlatformPayload } from '../Base/utils';

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

/**
 * Минимальный интерфейс логгера, используемый buttonProcessing для предупреждений
 * о невалидных payload кнопок (совместим с AppContext).
 */
export type TVkButtonLogger = {
    logWarn(message: string, meta?: Record<string, unknown>): void;
};

function _validateVkPayload(payload: unknown, appContext?: TVkButtonLogger): string | null {
    if (payload == null) return '';

    const str = serializePlatformPayload(payload, 'VK', appContext);
    if (str === null) return null;

    const length = Array.from(str).length;
    if (length > 255) {
        appContext?.logWarn(
            `[VK] payload кнопки превышает лимит 255 символов (${length} символов). Кнопка будет пропущена без изменения данных.`,
        );
        return null;
    }

    return str;
}

/** Возвращает цвет кнопки: из options либо из payload для обратной совместимости. */
function _getVkButtonColor<TPayload>(button: IButtonType<TPayload>): string | undefined {
    const payloadColor =
        typeof button.payload === 'object' && button.payload !== null
            ? ((button.payload as Record<string, unknown>).color as string | undefined)
            : undefined;
    return (button.options?.color ?? payloadColor) as string | undefined;
}

/** Возвращает hash для кнопки VK Pay, если он явно задан в payload. */
function _getVkPayHash(payload: unknown): string | null {
    let payloadObj: Record<string, unknown> | null = null;
    if (typeof payload === 'string') {
        try {
            payloadObj = JSON.parse(payload) as Record<string, unknown>;
        } catch {
            return null;
        }
    } else if (typeof payload === 'object' && payload !== null) {
        payloadObj = payload as Record<string, unknown>;
    }
    return typeof payloadObj?.hash === 'string' ? payloadObj.hash : null;
}

/** Преобразует одну универсальную кнопку в документированный объект VK. */
function _getVkButton<TPayload>(
    button: IButtonType<TPayload>,
    appContext?: TVkButtonLogger,
): IVkButton | null {
    const buttonType =
        button.type ?? (button.hide === Buttons.B_LINK ? VK_TYPE_LINK : VK_TYPE_TEXT);
    // label — обязательное поле кнопки ВК. Без проверки в запрос уходила кнопка
    // с пустой подписью, и API отклонял её вместе со всей клавиатурой.
    if (!button.title?.trim()) {
        appContext?.logWarn('[VK] Кнопка с пустым label пропущена.');
        return null;
    }
    if ((button.title?.length ?? 0) > 40) {
        appContext?.logWarn('[VK] label кнопки превышает 40 символов и будет сокращён.');
    }
    const object: IVkButton = {
        action: {
            type: buttonType,
            label: Text.resize(button.title, 40),
        },
    };
    if (button.url) {
        object.action.type = VK_TYPE_LINK;
        object.action.link = button.url;
    }
    if (button.payload) {
        const payload = _validateVkPayload(button.payload, appContext);
        if (payload === null && !button.url) {
            return null;
        }
        if (payload !== null) {
            object.action.payload = payload;
        }
    }

    const buttonColor = _getVkButtonColor(button);
    if (buttonColor !== undefined && !button.url) {
        object.color = buttonColor;
    }
    if (buttonType === VK_TYPE_PAY) {
        // По документации VK API hash у vkpay-кнопки находится внутри action.
        // Верхнеуровневый hash — недокументированное поле, а hash: null приводило
        // к отклонению всей клавиатуры ошибкой 100.
        const hash = _getVkPayHash(button.payload);
        if (hash) {
            object.action.hash = hash;
        }
    }
    return object;
}

/**
 * Получение кнопок в формате ВК
 * @param buttons Кнопки, которые необходимо отобразить
 */
export function buttonProcessing<TPayload>(
    buttons: IButtonType<TPayload>[],
    appContext?: TVkButtonLogger,
): IVkButtonObject | null {
    const groups: number[] = [];
    const finalButtons: IVkButton[] | IVkButton[][] = [];
    let index = 0;
    getCorrectButtons(buttons).forEach((button) => {
        const object = _getVkButton(button, appContext);
        if (!object) {
            return;
        }
        // Опциональная цепочка на случай кнопок, собранных вне компонента Buttons:
        // интерфейс требует options, но TypeError на кривом вводе не нужен.
        const groupOptions = button.options?.[GROUP_NAME];
        if (groupOptions === undefined) {
            finalButtons[index] = [object];
            index++;
        } else {
            if (object[GROUP_NAME] !== undefined) {
                // exactOptionalPropertyTypes: поле группы убираем целиком,
                // а не присваиваем undefined.
                delete object[GROUP_NAME];
            }
            const groupIndex = groups[+groupOptions];
            if (groupIndex === undefined) {
                groups[+groupOptions] = index;
                finalButtons[index] = [object];
                index++;
            } else {
                const groupButtons = finalButtons[groupIndex] as IVkButton[];
                groupButtons.push(object);
            }
        }
    });

    return finalButtons.length
        ? {
              one_time: true,
              buttons: finalButtons,
          }
        : null;
}
