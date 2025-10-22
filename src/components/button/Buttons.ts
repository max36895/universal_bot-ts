import { Button } from './Button';
import { IButton, IButtonOptions, TButton, TButtonPayload } from './interfaces';
import { TemplateButtonTypes } from './types/TemplateButtonTypes';
import { AlisaButton } from './types/AlisaButton';
import { TelegramButton } from './types/TelegramButton';
import { VkButton } from './types/VkButton';
import { ViberButton } from './types/ViberButton';
import { SmartAppButton } from './types/SmartAppButton';
import { MaxButton } from './types/MaxButton';
import { AppContext } from '../../core/AppContext';

/**
 * Тип функции обратного вызова для обработки кнопок.
 * @callback TButtonCb
 * @param {string | null} button - Текст кнопки
 * @param {string} [url] - URL для перехода
 * @param {string} [TButtonPayload] - Дополнительные данные
 * @param {IButtonOptions} [options] - Дополнительные параметры
 */
type TButtonCb = (
    button: string | null,
    url?: string,
    TButtonPayload?: string,
    options?: IButtonOptions,
) => void;

/**
 * @class Buttons
 * Класс для управления коллекцией кнопок и их отображением на различных платформах.
 *
 * Класс предоставляет функциональность для:
 * - Создания и управления коллекцией кнопок
 * - Адаптации кнопок под различные платформы (Алиса, VK, Telegram, Viber, SmartApp)
 * - Поддержки различных типов кнопок (интерактивные, ссылки)
 *
 * @example
 * ```typescript
 * // Создание коллекции кнопок
 * const buttons = new Buttons();
 *
 * // Добавление интерактивной кнопки
 * buttons.addBtn('Нажми меня', '', { action: 'custom_action' });
 *
 * // Добавление кнопки-ссылки с полным набором параметров
 * buttons.addLink('Перейти на сайт', 'https://example.com', { source: 'button' }, { hide: true });
 *
 * // Получение кнопок для конкретной платформы
 * const alisaButtons = buttons.getButtons(Buttons.T_ALISA_BUTTONS);
 * ```
 */
export class Buttons {
    /**
     * Кнопки для Алисы.
     * @type {string}
     */
    public static readonly T_ALISA_BUTTONS = 'alisa_btn';
    /**
     * Кнопки для карточки Алисе.
     * @type {string}
     */
    public static readonly T_ALISA_CARD_BUTTON = 'alisa_card_btn';
    /**
     * Кнопки для vk.
     * @type {string}
     */
    public static readonly T_VK_BUTTONS = 'vk_btn';
    /**
     * Кнопки для Max.
     * @type {string}
     */
    public static readonly T_MAX_BUTTONS = 'max_btn';
    /**
     * Кнопки для Telegram.
     * @type {string}
     */
    public static readonly T_TELEGRAM_BUTTONS = 'telegram_btn';
    /**
     * Кнопки для viber.
     * @type {string}
     */
    public static readonly T_VIBER_BUTTONS = 'viber_btn';
    /**
     * Кнопки для Сбер SmartApp.
     * @type {string}
     */
    public static readonly T_SMARTAPP_BUTTONS = 'smart-app_btn';
    /**
     * Кнопки для карточки Сбер SmartApp.
     * @type {string}
     */
    public static readonly T_SMARTAPP_BUTTON_CARD = 'smart-app_card_btn';
    /**
     * Кнопки для пользовательского типа приложения.
     * @type {string}
     */
    public static readonly T_USER_APP_BUTTONS = 'user_app_btn';

    /**
     * Массив объектов Button, представляющих все кнопки в коллекции.
     * @type {Button[]}
     * @see Button
     */
    public buttons: Button[];

    /**
     * Массив интерактивных кнопок.
     * Может содержать строки или объекты с параметрами кнопки.
     * @type {TButton[]}
     */
    public btns: TButton[];

    /**
     * Массив кнопок-ссылок.
     * Может содержать строки или объекты с параметрами кнопки.
     * @type {TButton[]}
     */
    public links: TButton[];

    /**
     * Тип кнопок для текущей платформы.
     * Определяет, как будут отображаться кнопки.
     * @type {string}
     */
    public type: string;

    /**
     * Контекст приложения.
     */
    protected appContext: AppContext;

    /**
     * Создает новый экземпляр коллекции кнопок.
     * Инициализирует все массивы и устанавливает тип кнопок по умолчанию для Алисы.
     */
    public constructor(appContext: AppContext) {
        this.buttons = [];
        this.btns = [];
        this.links = [];
        this.type = Buttons.T_ALISA_BUTTONS;
        this.appContext = appContext;
    }

    /**
     * Устанавливает контекст приложения.
     * @param appContext
     */
    public setAppContext(appContext: AppContext): Buttons {
        this.appContext = appContext;
        return this;
    }

    /**
     * Очищает все массивы кнопок.
     * @returns {void}
     */
    public clear(): void {
        this.buttons = [];
        this.btns = [];
        this.links = [];
    }

    /**
     * Добавляет кнопку в коллекцию.
     *
     * @param {string} title - Текст кнопки
     * @param {string} url - URL для перехода
     * @param {TButtonPayload} payload - Дополнительные данные
     * @param {boolean} hide - Тип отображения кнопки
     * @param {IButtonOptions} options - Дополнительные параметры
     * @returns {Buttons} this для цепочки вызовов
     * @protected
     */
    protected _add(
        title: string | null,
        url: string | null,
        payload: TButtonPayload,
        hide: boolean = false,
        options: IButtonOptions = {},
    ): Buttons {
        let button: Button | null = new Button();
        button.setAppContext(this.appContext);
        if (hide === Button.B_LINK) {
            if (!button.initLink(title, url, payload, options)) {
                button = null;
            }
        } else {
            if (!button.initBtn(title, url, payload, options)) {
                button = null;
            }
        }
        if (button) {
            this.buttons.push(button);
        }
        return this;
    }

    /**
     * Добавляет интерактивную кнопку в коллекцию.
     *
     * @param {string} title - Текст кнопки
     * @param {string} [url=''] - URL для перехода
     * @param {TButtonPayload} [payload=''] - Дополнительные данные
     * @param {IButtonOptions} [options={}] - Дополнительные параметры
     * @returns {Buttons} this для цепочки вызовов
     *
     * @example
     * ```typescript
     * // Простая кнопка
     * buttons.addBtn('Нажми меня');
     *
     * // Кнопка с URL и payload
     * buttons.addBtn('Перейти', 'https://example.com', { action: 'navigate' });
     *
     * // Кнопка с дополнительными опциями
     * buttons.addBtn('Скрытая кнопка', '', '', { hide: true });
     * ```
     */
    public addBtn(
        title: string | null,
        url: string | null = '',
        payload: TButtonPayload = '',
        options: IButtonOptions = {},
    ): Buttons {
        return this._add(title, url, payload, Button.B_BTN, options);
    }

    /**
     * Добавляет кнопку-ссылку в коллекцию.
     *
     * @param {string} title - Текст кнопки
     * @param {string} [url=''] - URL для перехода
     * @param {TButtonPayload} [payload=''] - Дополнительные данные
     * @param {IButtonOptions} [options={}] - Дополнительные параметры
     * @returns {Buttons} this для цепочки вызовов
     *
     * @example
     * ```typescript
     * // Простая ссылка
     * buttons.addLink('Перейти на сайт', 'https://example.com');
     *
     * // Ссылка с payload
     * buttons.addLink('Документация', 'https://docs.example.com', { section: 'api' });
     *
     * // Ссылка с опциями
     * buttons.addLink('Скрытая ссылка', 'https://example.com', '', { hide: true });
     * ```
     */
    public addLink(
        title: string | null,
        url: string = '',
        payload: TButtonPayload = '',
        options: IButtonOptions = {},
    ): Buttons {
        return this._add(title, url, payload, Button.B_LINK, options);
    }

    /**
     * Обрабатывает массив кнопок и добавляет их в коллекцию через callback.
     *
     * @param {TButton[]} button - Массив кнопок для обработки
     * @param {TButtonCb} callback - Функция для добавления кнопок
     * @private
     */
    protected _initProcessingBtn(button: TButton, callback: TButtonCb): void {
        if (typeof button !== 'string') {
            callback(
                button.title || null,
                (<IButton>button).url || '',
                button.payload || null,
                button.options || {},
            );
        } else {
            callback(button);
        }
    }

    /**
     * Обрабатывает массивы btns и links, добавляя их в основной массив buttons.
     * После обработки очищает массивы btns и links.
     * @protected
     */
    protected _processing(): void {
        const allButtons = [...this.btns, ...this.links];
        allButtons.forEach((button) => {
            if (this.links.includes(button)) {
                this._initProcessingBtn(button, this.addLink.bind(this));
            } else {
                this._initProcessingBtn(button, this.addBtn.bind(this));
            }
        });
        this.btns.length = 0;
        this.links.length = 0;
    }

    /**
     * Возвращает массив кнопок, адаптированный для указанной платформы.
     *
     * @param {string} [type=null] - Тип кнопок (платформа). Если не указан, используется текущий тип.
     * Доступные типы:
     * - T_ALISA_BUTTONS: кнопки для Алисы
     * - T_ALISA_CARD_BUTTON: кнопки для карточки Алисы
     * - T_VK_BUTTONS: кнопки для VK
     * - T_TELEGRAM_BUTTONS: кнопки для Telegram
     * - T_VIBER_BUTTONS: кнопки для Viber
     * - T_SMARTAPP_BUTTONS: кнопки для Сбер SmartApp
     * - T_SMARTAPP_BUTTON_CARD: кнопки для карточки SmartApp
     * - T_USER_APP_BUTTONS: кнопки для пользовательского приложения
     * @param {TemplateButtonTypes} [userButton=null] - Пользовательский класс кнопок для T_USER_APP_BUTTONS
     * @returns {T | null} Адаптированные кнопки для платформы или null, если тип не поддерживается
     *
     * @example
     * ```typescript
     * const buttons = new Buttons();
     *
     * // Добавление кнопок
     * buttons.addBtn('Нажми меня', '', { action: 'test' });
     * buttons.addLink('Сайт', 'https://example.com');
     *
     * // Получение кнопок для разных платформ
     *
     * // Алиса
     * const alisaButtons = buttons.getButtons(Buttons.T_ALISA_BUTTONS);
     * // alisaButtons: [
     * //   { title: 'Нажми меня', payload: { action: 'test' }, hide: true },
     * //   { title: 'Сайт', url: 'https://example.com', hide: false }
     * // ]
     *
     * // VK
     * const vkButtons = buttons.getButtons(Buttons.T_VK_BUTTONS);
     * // vkButtons: {
     * //   one_time: true,
     * //   buttons: [
     * //     { action: { type: 'text', label: 'Нажми меня', payload: { action: 'test' } } },
     * //     { action: { type: 'link', label: 'Сайт', link: 'https://example.com' } }
     * //   ]
     * // }
     *
     * // Telegram
     * const telegramButtons = buttons.getButtons(Buttons.T_TELEGRAM_BUTTONS);
     * // telegramButtons: {
     * //   inline_keyboard: [
     * //     [{ text: 'Нажми меня', callback_data: { action: 'test' } }],
     * //     [{ text: 'Сайт', url: 'https://example.com' }]
     * //   ]
     * // }
     *
     * // Viber
     * const viberButtons = buttons.getButtons(Buttons.T_VIBER_BUTTONS);
     * // viberButtons: {
     * //   DefaultHeight: true,
     * //   BgColor: '#FFFFFF',
     * //   Buttons: [
     * //     { Text: 'Нажми меня', ActionType: 'reply', ActionBody: { action: 'test' } },
     * //     { Text: 'Сайт', ActionType: 'open-url', ActionBody: 'https://example.com' }
     * //   ]
     * // }
     * ```
     */
    public getButtons<T = any>(
        type: string | null = null,
        userButton: TemplateButtonTypes | null = null,
    ): T | null {
        this._processing();
        if (type === null) {
            type = this.type;
        }
        let button: TemplateButtonTypes | null = null;
        switch (type) {
            case Buttons.T_ALISA_BUTTONS:
                button = new AlisaButton();
                (button as AlisaButton).isCard = false;
                break;

            case Buttons.T_ALISA_CARD_BUTTON:
                button = new AlisaButton();
                (button as AlisaButton).isCard = true;
                break;

            case Buttons.T_VK_BUTTONS:
                button = new VkButton();
                break;

            case Buttons.T_TELEGRAM_BUTTONS:
                button = new TelegramButton();
                break;

            case Buttons.T_VIBER_BUTTONS:
                button = new ViberButton();
                break;

            case Buttons.T_SMARTAPP_BUTTONS:
                button = new SmartAppButton();
                (button as SmartAppButton).isCard = false;
                break;

            case Buttons.T_SMARTAPP_BUTTON_CARD:
                button = new SmartAppButton();
                (button as SmartAppButton).isCard = true;
                break;
            case Buttons.T_MAX_BUTTONS:
                button = new MaxButton();
                break;

            case Buttons.T_USER_APP_BUTTONS:
                if (userButton) {
                    button = userButton;
                }
                break;
        }
        if (button) {
            button.buttons = this.buttons;
            return button.getButtons();
        }
        return null;
    }

    /**
     * Возвращает JSON-представление кнопок для указанной платформы.
     *
     * @param {string} [type=null] - Тип кнопок (платформа)
     * @param {TemplateButtonTypes} [userButton=null] - Пользовательский класс кнопок
     * @returns {string | null} JSON-строка с кнопками
     *
     * @example
     * ```typescript
     * // Получение JSON для кнопок Алисы
     * const alisaButtonsJson = buttons.getButtonJson(Buttons.T_ALISA_BUTTONS);
     * ```
     */
    public getButtonJson(
        type: string | null = null,
        userButton: TemplateButtonTypes | null = null,
    ): string | null {
        const btn: object[] | null = this.getButtons(type, userButton);
        if (btn && btn.length) {
            return JSON.stringify(btn);
        }
        return null;
    }
}
