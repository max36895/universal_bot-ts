import { IButtonOptions } from './interfaces/IButton';
import { Text } from '../../utils';
import { AppContext } from '../../core';

/**
 * Базовый тип для задания placeholder для кнопок
 */
export type TBtnPayload = Record<string, unknown> | string | null;

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

function init<TButtonPayload = TBtnPayload>(
    appContext: AppContext,
    title: string | null,
    url: string | null,
    payload: TButtonPayload | null,
    hide: boolean,
    options: IButtonOptions = {},
): IButtonType<TButtonPayload> | null {
    let res: IButtonType<TButtonPayload> | null = null;
    if (title !== null) {
        res = {
            title,
            type: null,
            payload,
            hide,
            options,
        };
        let correctUrl = url;
        if (correctUrl && Text.isUrl(correctUrl)) {
            // Извлекаем фрагмент, если он есть (RFC 3986: # должен быть в конце)
            const hashIndex = correctUrl.indexOf('#');
            const baseUrl = hashIndex !== -1 ? correctUrl.substring(0, hashIndex) : correctUrl;
            const fragment = hashIndex !== -1 ? correctUrl.substring(hashIndex) : '';

            if (appContext?.platformParams.utm_text === null) {
                if (!baseUrl.includes('utm_source')) {
                    const separator = baseUrl.includes('?') ? '&' : '?';
                    correctUrl = `${baseUrl}${separator}utm_source=${encodeURIComponent(options.utmSource || 'umBot')}&utm_medium=${encodeURIComponent(options.utmMedium || 'cpc')}&utm_campaign=${encodeURIComponent(options.utmCampaign || 'phone')}${fragment}`;
                }
            } else if (appContext?.platformParams.utm_text) {
                if (!baseUrl.includes('utm_source')) {
                    const separator = baseUrl.includes('?') ? '&' : '?';
                    correctUrl = `${baseUrl}${separator}${appContext?.platformParams.utm_text}${fragment}`;
                }
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
 * @param {string | null} title Текст кнопки
 * @param {string | null} [url=''] URL для перехода (должен начинаться с http:// или https://)
 * @param {TBtnPayload | null} [payload=null] Дополнительные данные для обработки нажатия
 * @param {IButtonOptions} [options={}] Дополнительные параметры:
 * - utmSource: источник перехода
 * - utmMedium: тип рекламного канала
 * - utmCampaign: название рекламной кампании
 *
 * @example
 * ```ts
 * // Простая ссылка
 * const button1 = getLinkButton(appContext, 'Перейти на сайт', 'http://localhost');
 *
 * // Ссылка с UTM-метками
 * const button2 = getLinkButton(appContext, 'Купить', 'http://localhost/product', null, {
 *   utmSource: 'bot',
 *   utmMedium: 'button',
 *   utmCampaign: 'spring_sale'
 * });
 *
 * // Ссылка с дополнительными данными
 * const button3 = getLinkButton(appContext, 'Подробнее', 'http://localhost/article', {
 *   action: 'read',
 *   article_id: 123
 * });
 * ```
 *
 * @returns {IButtonType | null} Возвращается объект, если кнопка добавлена, и null в случае, если переданы некорректные настройки для кнопки
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
 * @param {string | null} title Текст кнопки
 * @param {string | null} [url=''] URL для перехода
 * @param {TBtnPayload | null} [payload=null] Дополнительные данные для обработки нажатия.
 *                                        Может быть строкой или объектом.
 * @param {IButtonOptions} [options={}] Дополнительные параметры:
 * - utmSource: источник перехода
 * - utmMedium: тип рекламного канала
 * - utmCampaign: название рекламной кампании
 *
 * @returns {IButtonType | null} Возвращается объект, если кнопка добавлена, и null в случае, если переданы некорректные настройки для кнопки.
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
