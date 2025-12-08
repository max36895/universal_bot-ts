import { IButtonOptions, TButtonPayload } from './interfaces';
import { Text } from '../../utils/standard/Text';
import { AppContext } from '../../core/AppContext';

/**
 * @class Button
 * Класс для создания и управления интерактивными кнопками в различных платформах.
 *
 * Класс предоставляет функциональность для создания кнопок двух типов:
 * 1. **Сайджест-кнопки** (ссылки под текстом) - используются для навигации и внешних ссылок
 * 2. **Интерактивные кнопки** - используются для взаимодействия с пользователем
 *
 * Ограничения:
 * - Длина текста кнопки: до 64 символов для Алисы, до 40 для VK, без ограничений для Telegram
 * - Максимум кнопок: 4 в строке для Алисы, 5 для VK, без ограничений для Telegram
 * - URL должен быть валидным и начинаться с http:// или https://
 *
 * @example
 * ```typescript
 * import { Button } from './components/button/Button';
 *
 * // Создание кнопки-ссылки
 * const linkButton = new Button();
 * linkButton.initLink(
 *   'Перейти на сайт',
 *   'https://example.com',
 *   null,  // payload
 *   {}     // options
 * );
 *
 * // Создание интерактивной кнопки для VK
 * const vkButton = new Button();
 * vkButton.initBtn(
 *   'Нажми меня',
 *   '',
 *   { action: 'click' },
 *   {
 *     color: 'primary',
 *     type: 'text'
 *   }
 * );
 *
 * // Создание кнопки для оплаты в VK
 * const payButton = new Button();
 * payButton.initBtn(
 *   'Оплатить',
 *   '',
 *   { action: 'pay', amount: 100 },
 *   {
 *     type: 'vkpay',
 *     hash: 'action=pay-to-group&amount=100&group_id=123'
 *   }
 * );
 *
 * // Создание кнопки для отправки локации в VK
 * const locationButton = new Button();
 * locationButton.initBtn(
 *   'Отправить локацию',
 *   '',
 *   { action: 'location' },
 *   { type: 'location' }
 * );
 *
 * // Создание кнопки для открытия приложения VK
 * const appButton = new Button();
 * appButton.initBtn(
 *   'Открыть приложение',
 *   '',
 *   { action: 'open_app' },
 *   {
 *     type: 'open_app',
 *     app_id: 123456,
 *     owner_id: 789012,
 *     hash: 'custom_data'
 *   }
 * );
 * ```
 */
export class Button {
    /**
     * Константа для создания кнопки в виде ссылки (сайджест).
     * @type {boolean}
     */
    public static readonly B_LINK: boolean = false;

    /**
     * Константа для создания кнопки в виде интерактивной кнопки.
     * @type {boolean}
     */
    public static readonly B_BTN: boolean = true;

    /**
     * Цвет кнопки primary в ВК.
     */
    public static readonly VK_COLOR_PRIMARY = 'primary';
    /**
     * Цвет кнопки secondary в ВК.
     */
    public static readonly VK_COLOR_SECONDARY = 'secondary';
    /**
     * Цвет кнопки negative в ВК.
     */
    public static readonly VK_COLOR_NEGATIVE = 'negative';
    /**
     * Цвет кнопки positive в ВК.
     */
    public static readonly VK_COLOR_POSITIVE = 'positive';

    /**
     * Тип кнопки текст
     */
    public static readonly VK_TYPE_TEXT = 'text';
    /**
     * Тип кнопки ссылка
     */
    public static readonly VK_TYPE_LINK = 'open_link';
    /**
     * Тип кнопки поделиться локацией
     */
    public static readonly VK_TYPE_LOCATION = 'location';
    /**
     * Тип кнопки оплатить
     */
    public static readonly VK_TYPE_PAY = 'vkpay';
    /**
     * Тип кнопки открыть приложение
     */
    public static readonly VK_TYPE_APPS = 'open_app';

    /**
     * Тип кнопки.
     * Определяет поведение и внешний вид кнопки на разных платформах.
     * @type {string | null}
     */
    public type: string | null;

    /**
     * Текст, отображаемый на кнопке.
     * @type {string | null}
     */
    public title: string | null;

    /**
     * URL для перехода при нажатии на кнопку.
     * Для кнопок-ссылок это обязательный параметр.
     * @type {string | null}
     */
    public url: string | null;

    /**
     * Произвольные данные, отправляемые при нажатии на кнопку.
     * Используются для передачи дополнительной информации в обработчике.
     * @type {TButtonPayload}
     */
    public payload: TButtonPayload;

    /**
     * Флаг, определяющий отображение кнопки как сайджеста.
     * true - интерактивная кнопка
     * false - кнопка-ссылка (сайджест)
     * @type {boolean}
     */
    public hide: boolean;

    /**
     * Дополнительные параметры кнопки.
     * Могут включать специфичные для платформы настройки.
     * @type {IButtonOptions}
     */
    public options: IButtonOptions;

    /**
     * Контекст приложения.
     */
    #appContext: AppContext | undefined;

    /**
     * Создает новый экземпляр кнопки.
     * Инициализирует все поля значениями по умолчанию.
     * @param {string} title Текст кнопки
     * @param {string} url URL для перехода
     * @param {TButtonPayload} payload Дополнительные данные
     * @param {boolean} hide Тип отображения кнопки
     * @param {IButtonOptions} options Дополнительные параметры
     */
    public constructor(
        title: string | null = null,
        url: string | null = null,
        payload: TButtonPayload = [],
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
    public setAppContext(appContext: AppContext): Button {
        this.#appContext = appContext;
        return this;
    }

    /**
     * Возвращает разделитель для GET-запросов в URL.
     * @param {string} url URL для проверки
     * @returns {string} Разделитель ('?' или '&')
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
        payload: TButtonPayload,
        hide: boolean,
        options: IButtonOptions = {},
    ): boolean {
        if (title || title === '') {
            this.title = title;
            let correctUrl = url;
            if (correctUrl && Text.isUrl(correctUrl)) {
                if (this.#appContext?.platformParams.utm_text === null) {
                    if (!correctUrl.includes('utm_source')) {
                        correctUrl += `${Button.#getUrlSeparator(correctUrl)}utm_source=umBot&utm_medium=cpc&utm_campaign=phone`;
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
     * @param {string} title Текст кнопки (до 64 символов для Алисы)
     * @param {string} [url=''] URL для перехода (должен начинаться с http:// или https://)
     * @param {TButtonPayload} [payload=null] Дополнительные данные для обработки нажатия
     * @param {IButtonOptions} [options={}] Дополнительные параметры:
     * - utm_source: источник перехода
     * - utm_medium: тип рекламного канала
     * - utm_campaign: название рекламной кампании
     * - utm_content: идентификатор объявления
     * - utm_term: ключевое слово
     *
     * @example
     * ```typescript
     * // Простая ссылка
     * const button1 = new Button();
     * button1.initLink('Перейти на сайт', 'https://example.com');
     *
     * // Ссылка с UTM-метками
     * const button2 = new Button();
     * button2.initLink('Купить', 'https://shop.com/product', null, {
     *   utm_source: 'bot',
     *   utm_medium: 'button',
     *   utm_campaign: 'spring_sale'
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
     * @returns {boolean} true если инициализация успешна
     */
    public initLink(
        title: string | null,
        url: string | null = '',
        payload: TButtonPayload = null,
        options: IButtonOptions = {},
    ): boolean {
        return this.#init(title, url, payload, Button.B_LINK, options);
    }

    /**
     * Инициализирует кнопку в виде интерактивной кнопки.
     *
     * @param {string} title Текст кнопки (до 40 символов для VK)
     * @param {string} [url=''] URL для перехода
     * @param {TButtonPayload} [payload=null] Дополнительные данные для обработки нажатия.
     *                                        Может быть строкой или объектом.
     * @param {IButtonOptions} [options={}] Дополнительные параметры:
     *
     * Общие параметры:
     * - hide: boolean - скрыть кнопку после нажатия
     *
     * Параметры для VK:
     * - type: тип кнопки
     *   - VK_TYPE_TEXT: обычная кнопка
     *   - VK_TYPE_LINK: кнопка-ссылка
     *   - VK_TYPE_LOCATION: отправка локации
     *   - VK_TYPE_PAY: оплата VK Pay
     *   - VK_TYPE_APPS: открытие приложения
     * - color: цвет кнопки
     *   - VK_COLOR_PRIMARY: синий
     *   - VK_COLOR_SECONDARY: белый
     *   - VK_COLOR_NEGATIVE: красный
     *   - VK_COLOR_POSITIVE: зеленый
     * - app_id: ID приложения VK (для type=VK_TYPE_APPS)
     * - owner_id: ID владельца приложения (для type=VK_TYPE_APPS)
     * - hash: дополнительные параметры (для type=VK_TYPE_PAY и VK_TYPE_APPS)
     *
     * @example
     * ```typescript
     * // Простая кнопка
     * const button1 = new Button();
     * button1.initBtn('Нажми меня');
     *
     * // Кнопка со строковым payload
     * const button2 = new Button();
     * button2.initBtn('Действие', '', 'action_payload');
     *
     * // Кнопка с объектным payload
     * const button3 = new Button();
     * button3.initBtn('Действие', '', {
     *   action: 'custom_action',
     *   data: { id: 123 }
     * });
     *
     * // Кнопка с цветом для VK
     * const button4 = new Button();
     * button4.initBtn('Подтвердить', '', null, {
     *   type: Button.VK_TYPE_TEXT,
     *   color: Button.VK_COLOR_POSITIVE
     * });
     *
     * // Кнопка оплаты VK Pay
     * const button5 = new Button();
     * button5.initBtn('Оплатить 100₽', '', { amount: 100 }, {
     *   type: Button.VK_TYPE_PAY,
     *   hash: 'action=pay-to-group&amount=100'
     * });
     *
     * // Кнопка для открытия приложения
     * const button6 = new Button();
     * button6.initBtn('Открыть игру', '', null, {
     *   type: Button.VK_TYPE_APPS,
     *   app_id: 123456,
     *   owner_id: 789012,
     *   hash: 'start_level=5'
     * });
     * ```
     *
     * @returns {boolean} true если инициализация успешна
     */
    public initBtn(
        title: string | null,
        url: string | null = '',
        payload: TButtonPayload = null,
        options: IButtonOptions = {},
    ): boolean {
        return this.#init(title, url, payload, Button.B_BTN, options);
    }
}
