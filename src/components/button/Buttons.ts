import {Button} from './Button';
import {IButton, IButtonOptions, TButton, TButtonPayload} from './interfaces';
import {TemplateButtonTypes} from './types/TemplateButtonTypes';
import {AlisaButton} from './types/AlisaButton';
import {TelegramButton} from './types/TelegramButton';
import {VkButton} from './types/VkButton';
import {ViberButton} from './types/ViberButton';
import {SmartAppButton} from './types/SmartAppButton';

/**
 * Класс, хранящий в себе все кнопки приложения, а также отвечающий за отображение кнопок, в зависимости от типа приложения.
 * @class Buttons
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
     * Массив с различными кнопками.
     * @see Button Смотри тут
     */
    public buttons: Button[];
    /**
     * Массив из кнопок вида кнопка.
     *  - string Текст, отображаемый на кнопке.
     *  or
     *  - object
     *      - string title    Текст, отображаемый на кнопке.
     *      - string url      Ссылка, по которой перейдет пользователь после нажатия на кнопку.
     *      - string payload  Дополнительные параметры, передаваемые при нажатие на кнопку.
     */
    public btns: TButton[];
    /**
     * Массив из кнопок вида ссылка.
     *  - string Текст, отображаемый на кнопке.
     *  or
     *  - object
     *      - string title    Текст, отображаемый на кнопке.
     *      - string url      Ссылка, по которой перейдет пользователь после нажатия на кнопку.
     *      - string payload  Дополнительные параметры, передаваемые при нажатие на кнопку.
     */
    public links: TButton[];
    /**
     * Тип кнопок(кнопка в Алисе, кнопка в карточке Алисы, кнопка в Vk, кнопка в Telegram и тд).
     */
    public type: string;

    /**
     * Buttons constructor.
     */
    public constructor() {
        this.buttons = [];
        this.btns = [];
        this.links = [];
        this.type = Buttons.T_ALISA_BUTTONS;
    }

    /**
     * Очистка массива кнопок.
     * @api
     */
    public clear(): void {
        this.buttons = [];
        this.btns = [];
        this.links = [];
    }

    /**
     * Добавление кнопки.
     *
     * @param {string} title Текст в кнопке.
     * @param {string} url Ссылка для перехода при нажатии на кнопку.
     * @param {TButtonPayload} payload Произвольные данные, отправляемые при нажатии на кнопку.
     * @param {boolean} hide Определяет отображение кнопки как сайджест.
     * @param {IButtonOptions} options Дополнительные параметры кнопки
     *
     * @return boolean
     */
    protected _add(title: string | null, url: string | null, payload: TButtonPayload, hide: boolean = false, options: IButtonOptions = {}): boolean {
        let button: Button | null = new Button();
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
            return true;
        }
        return false;
    }

    /**
     * Добавить кнопку типа `кнопка`.
     *
     * @param {string} title Текст в кнопке.
     * @param {string} url Ссылка для перехода при нажатии на кнопку.
     * @param {TButtonPayload} payload Произвольные данные, отправляемые при нажатии на кнопку.
     * @param {IButtonOptions} options Дополнительные параметры кнопки
     * @return boolean
     * @api
     */
    public addBtn(title: string | null, url: string | null = '', payload: TButtonPayload = '', options: IButtonOptions = {}): boolean {
        return this._add(title, url, payload, Button.B_BTN, options);
    }

    /**
     * Добавить кнопку типа `сайджест`.
     *
     * @param {string} title Текст в кнопке.
     * @param {string} url Ссылка для перехода при нажатии на кнопку.
     * @param {TButtonPayload} payload Произвольные данные, отправляемые при нажатии на кнопку.
     * @param {IButtonOptions} options Дополнительные параметры кнопки
     * @return boolean
     * @api
     */
    public addLink(title: string, url: string = '', payload: TButtonPayload = '', options: IButtonOptions = {}): boolean {
        return this._add(title, url, payload, Button.B_LINK, options);
    }

    /**
     * Дополнительная функция для инициализации дополнительных кнопок
     * @param buttons Массив кнопок
     * @param callback Callback нужной функции, addBtn или addLink
     * @private
     */
    protected _initProcessingBtn(buttons: TButton[], callback: Function): void {
        if (typeof buttons === 'object') {
            buttons.forEach((button) => {
                if (typeof button !== 'string') {
                    callback(button.title || null, (<IButton>button).url || '',
                        button.payload || null, button.options || {});
                } else {
                    callback(button);
                }
            });
        } else {
            callback(buttons);
        }
    }

    /**
     * Дополнительная обработка второстепенных кнопок.
     * А именно обрабатываются массивы btns и links. После чего все значения записываются в buttons.
     */
    protected _processing(): void {
        if (this.btns.length) {
            this._initProcessingBtn(this.btns, this.addBtn.bind(this));
        }
        if (this.links.length) {
            this._initProcessingBtn(this.links, this.addLink.bind(this));
        }
        this.btns = [];
        this.links = [];
    }

    /**
     * Возвращает массив кнопок для ответа пользователю.
     *
     * @param {string} type Тип кнопки.
     * @param {TemplateButtonTypes} userButton Класс с пользовательскими кнопками.
     * @return any
     * @api
     */
    public getButtons<T = any>(type: string | null = null, userButton: TemplateButtonTypes | null = null): T | null {
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

            case Buttons.T_USER_APP_BUTTONS:
                button = userButton;
                break;
        }

        if (button) {
            button.buttons = this.buttons;
            return button.getButtons();
        }
        return null;
    }

    /**
     * Возвращает json строку c кнопками.
     *
     * @param {string} type Тип приложения.
     * @param {TemplateButtonTypes} userButton Класс с пользовательскими кнопками.
     * @return string|null
     * @api
     */
    public getButtonJson(type: string | null = null, userButton: TemplateButtonTypes | null = null): string | null {
        const btn: object[] | null = this.getButtons(type, userButton);
        if (btn && btn.length) {
            return JSON.stringify(btn);
        }
        return null;
    }
}
