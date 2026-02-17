import { IButtonOptions } from './interfaces/IButton';
import { Text } from '../../utils';
import { AppContext } from '../../core';

/**
 * Класс для создания и управления интерактивными кнопками в различных платформах.
 *
 * Класс предоставляет функциональность для создания кнопок двух типов:
 * 1. **Сайджест-кнопки** (ссылки под текстом) - используются для навигации и внешних ссылок
 * 2. **Интерактивные кнопки** - используются для взаимодействия с пользователем
 *
 * Ограничения:
 * - Ограничения самих платформ
 * - URL должен быть валидным и начинаться с http:// или https://
 */
export class Button<TButtonPayload = Record<string, unknown> | string | null> {
    /**
     * Константа для создания кнопки в виде ссылки (сайджест).
     */
    public static readonly B_LINK: boolean = false;

    /**
     * Константа для создания кнопки в виде интерактивной кнопки.
     */
    public static readonly B_BTN: boolean = true;

    /**
     * Тип кнопки.
     * Определяет поведение и внешний вид кнопки на разных платформах.
     */
    public type: string | null;

    /**
     * Текст, отображаемый на кнопке.
     */
    public title: string | null;

    /**
     * URL для перехода при нажатии на кнопку.
     * Для кнопок-ссылок обязательный параметр.
     */
    public url: string | null;

    /**
     * Произвольные данные, отправляемые при нажатии на кнопку.
     * Используются для передачи дополнительной информации в обработчике.
     */
    public payload: TButtonPayload | null;

    /**
     * Флаг, определяющий отображение кнопки как сайджеста.
     * true - интерактивная кнопка
     * false - кнопка-ссылка (сайджест)
     */
    public hide: boolean;

    /**
     * Дополнительные параметры кнопки.
     * Могут включать специфичные для платформы настройки.
     */
    public options: IButtonOptions;

    /**
     * Контекст приложения.
     */
    #appContext: AppContext | undefined;

    /**
     * Создает новый экземпляр кнопки.
     * Предоставляет унифицированный интерфейс для описания кнопки.
     * Фактическая адаптация под формат целевой платформы происходит в адаптере платформы.
     * @param {string} title Текст кнопки
     * @param {string} url URL для перехода
     * @param {TButtonPayload} payload Дополнительные данные
     * @param {boolean} hide Тип отображения кнопки
     * @param {IButtonOptions} options Дополнительные параметры
     */
    public constructor(
        title: string | null = null,
        url: string | null = null,
        payload: TButtonPayload = {} as TButtonPayload,
        hide: boolean = Button.B_LINK,
        options: IButtonOptions = {},
    ) {
        this.type = null;
        this.title = title;
        this.url = url;
        this.payload = payload;
        this.hide = hide;
        this.options = options;
        this.#init(title, url, payload, hide, options);
    }

    /**
     * Устанавливает контекст приложения.
     * @param appContext
     */
    public setAppContext(appContext: AppContext): this {
        this.#appContext = appContext;
        return this;
    }

    /**
     * Возвращает разделитель для GET-запросов в URL.
     * @param {string} url URL для проверки
     * @returns {string} Разделитель '?' или '&'
     */
    static #getUrlSeparator(url: string): string {
        return url.includes('?') ? '&' : '?';
    }

    /**
     * Инициализирует кнопку с заданными параметрами.
     *
     * @param {string} title Текст кнопки
     * @param {string} url URL для перехода
     * @param {TButtonPayload} payload Дополнительные данные
     * @param {boolean} hide Тип отображения кнопки
     * @param {IButtonOptions} options Дополнительные параметры
     * @returns {boolean} true если инициализация успешна
     */
    #init(
        title: string | null,
        url: string | null,
        payload: TButtonPayload | null,
        hide: boolean,
        options: IButtonOptions = {},
    ): boolean {
        if (title || title === '') {
            this.title = title;
            let correctUrl = url;
            if (correctUrl && Text.isUrl(correctUrl)) {
                if (this.#appContext?.platformParams.utm_text === null) {
                    if (!correctUrl.includes('utm_source')) {
                        correctUrl += `${Button.#getUrlSeparator(correctUrl)}utm_source=${options.utmSource || 'umBot'}&utm_medium=${options.utmMedium || 'cpc'}&utm_campaign=${options.utmCampaign || 'phone'}`;
                    }
                } else if (this.#appContext?.platformParams.utm_text) {
                    correctUrl +=
                        Button.#getUrlSeparator(correctUrl) +
                        this.#appContext?.platformParams.utm_text;
                }
            } else {
                correctUrl = null;
            }
            this.url = correctUrl;
            this.payload = payload;
            this.hide = hide;
            this.options = options;
            return true;
        }
        return false;
    }

    /**
     * Инициализирует кнопку в виде сайджеста (ссылки под текстом).
     *
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
     * @returns {boolean} true — кнопка добавлена, false — отклонена (например, пустой title).
     * При возврате false кнопка НЕ появится в ответе платформы.
     */
    public initLink(
        title: string | null,
        url: string | null = '',
        payload: TButtonPayload | null = null,
        options: IButtonOptions = {},
    ): boolean {
        return this.#init(title, url, payload, Button.B_LINK, options);
    }

    /**
     * Инициализирует кнопку в виде интерактивной кнопки.
     *
     * @param {string} title Текст кнопки
     * @param {string} [url=''] URL для перехода
     * @param {TButtonPayload} [payload=null] Дополнительные данные для обработки нажатия.
     *                                        Может быть строкой или объектом.
     * @param {IButtonOptions} [options={}] Дополнительные параметры:
     *
     * Общие параметры:
     * - hide: boolean - скрыть кнопку после нажатия
     *
     * Дополнительные параметры:
     * - string: any - любой специфичный для платформы параметр
     *
     * @returns {boolean} true — кнопка добавлена, false — отклонена (например, пустой title).
     * При возврате false кнопка НЕ появится в ответе платформы.
     */
    public initBtn(
        title: string | null,
        url: string | null = '',
        payload: TButtonPayload | null = null,
        options: IButtonOptions = {},
    ): boolean {
        return this.#init(title, url, payload, Button.B_BTN, options);
    }
}
