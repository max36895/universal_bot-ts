import { IButtonOptions } from './interfaces/IButton';
import { Text } from '../../utils';
import { AppContext } from '../../core';

type TBtnPayload = Record<string, unknown> | string | null;

/**
 * Интерфейс для кнопок
 */
export interface IButtonType<TButtonPayload = TBtnPayload> {
    /**
     * Тип кнопки.
     * Определяет поведение и внешний вид кнопки на разных платформах.
     */
    type: string | null;

    /**
     * Текст, отображаемый на кнопке.
     */
    title: string | null;

    /**
     * URL для перехода при нажатии на кнопку.
     * Для кнопок-ссылок обязательный параметр.
     */
    url?: string | null;

    /**
     * Произвольные данные, отправляемые при нажатии на кнопку.
     * Используются для передачи дополнительной информации в обработчике.
     */
    payload: TButtonPayload | null;

    /**
     * Флаг, определяющий отображение кнопки как сайджеста.
     * true - интерактивная кнопка
     * false - кнопка-ссылка (сайджест)
     */
    hide: boolean;

    /**
     * Дополнительные параметры кнопки.
     * Могут включать специфичные для платформы настройки.
     */
    options: IButtonOptions;
}

function getUrlSeparator(url: string): string {
    return url.includes('?') ? '&' : '?';
}

function init<TButtonPayload = TBtnPayload>(
    appContext: AppContext,
    title: string | null,
    url: string | null,
    payload: TButtonPayload | null,
    hide: boolean,
    options: IButtonOptions = {},
): IButtonType<TButtonPayload> | null {
    let res: IButtonType<TButtonPayload> | null = null;
    if (title || title === '') {
        res = {
            title,
            type: null,
            payload,
            hide,
            options,
        };
        let correctUrl = url;
        if (correctUrl && Text.isUrl(correctUrl)) {
            if (appContext?.platformParams.utm_text === null) {
                if (!correctUrl.includes('utm_source')) {
                    correctUrl += `${getUrlSeparator(correctUrl)}utm_source=${options.utmSource || 'umBot'}&utm_medium=${options.utmMedium || 'cpc'}&utm_campaign=${options.utmCampaign || 'phone'}`;
                }
            } else if (appContext?.platformParams.utm_text) {
                correctUrl += getUrlSeparator(correctUrl) + appContext?.platformParams.utm_text;
            }
        } else {
            correctUrl = null;
        }
        res.url = correctUrl;
    }
    return res;
}

/**
 * Возвращает кнопку в виде сайджеста (ссылки под текстом).
 *
 * @param {AppContext} appContext Контекст приложения
 * @param {string} title Текст кнопки
 * @param {string} [url=''] URL для перехода (должен начинаться с http:// или https://)
 * @param {TButtonPayload} [payload=null] Дополнительные данные для обработки нажатия
 * @param {IButtonOptions} [options={}] Дополнительные параметры:
 * - utmSource: источник перехода
 * - utmMedium: тип рекламного канала
 * - utmCampaign: название рекламной кампании
 *
 * @example
 * ```ts
 * // Простая ссылка
 * const button1 = new Button();
 * button1.initLink('Перейти на сайт', 'https://example.com');
 *
 * // Ссылка с UTM-метками
 * const button2 = new Button();
 * button2.initLink('Купить', 'https://shop.com/product', null, {
 *   utmSource: 'bot',
 *   utmMedium: 'button',
 *   utmCampaign: 'spring_sale'
 * });
 *
 * // Ссылка с дополнительными данными
 * const button3 = new Button();
 * button3.initLink('Подробнее', 'https://example.com/article', {
 *   action: 'read',
 *   article_id: 123
 * });
 * ```
 *
 * @returns {IButtonType | null} Вернется объект если кнопка добавлена, и null в случае если переданы не корректные настройки для кнопки
 */
export function getLinkButton<TButtonPayload = TBtnPayload>(
    appContext: AppContext,
    title: string | null,
    url: string | null = '',
    payload: TButtonPayload | null = null,
    options: IButtonOptions = {},
): IButtonType<TButtonPayload> | null {
    return init(appContext, title, url, payload, false, options);
}

/**
 * Возвращает кнопку в виде интерактивной кнопки.
 *
 * @param {AppContext} appContext Контекст приложения
 * @param {string} title Текст кнопки
 * @param {string} [url=''] URL для перехода
 * @param {TButtonPayload} [payload=null] Дополнительные данные для обработки нажатия.
 *                                        Может быть строкой или объектом.
 * @param {IButtonOptions} [options={}] Дополнительные параметры:
 * - utmSource: источник перехода
 * - utmMedium: тип рекламного канала
 * - utmCampaign: название рекламной кампании
 *
 * @returns {IButtonType | null} Вернется объект если кнопка добавлена, и null в случае если переданы не корректные настройки для кнопки.
 */
export function getButton<TButtonPayload = TBtnPayload>(
    appContext: AppContext,
    title: string | null,
    url: string | null = '',
    payload: TButtonPayload | null = null,
    options: IButtonOptions = {},
): IButtonType<TButtonPayload> | null {
    return init(appContext, title, url, payload, true, options);
}
