import {Button} from "./Button";
import {IButton, IButtonOptions, TButton, TButtonPayload} from "./interfaces/IButton";
import {TemplateButtonTypes} from "./types/TemplateButtonTypes";
import {AlisaButton} from "./types/AlisaButton";
import {TelegramButton} from "./types/TelegramButton";
import {VkButton} from "./types/VkButton";
import {ViberButton} from "./types/ViberButton";
import {SmartAppButton} from "./types/SmartAppButton";

/**
 * Класс отвечающий за отображение определенных кнопок, в зависимости от типа приложения.
 * @class Buttons
 */
export class Buttons {
    /**
     * Кнопки в Алисе.
     * @type {string}
     */
    public static readonly T_ALISA_BUTTONS = 'alisa_btn';
    /**
     * Кнопки в карточке Алисы.
     * @type {string}
     */
    public static readonly T_ALISA_CARD_BUTTON = 'alisa_card_btn';
    /**
     * Кнопки в vk.
     * @type {string}
     */
    public static readonly T_VK_BUTTONS = 'vk_btn';
    /**
     * Кнопки в Telegram.
     * @type {string}
     */
    public static readonly T_TELEGRAM_BUTTONS = 'telegram_btn';
    /**
     * Кнопки в viber.
     * @type {string}
     */
    public static readonly T_VIBER_BUTTONS = 'viber_btn';
    /**
     * Кнопки в Сбер SmartApp.
     * @type {string}
     */
    public static readonly T_SMARTAPP_BUTTONS = 'smart-app_btn';
    /**
     * Кнопки в карточке Сбер SmartApp.
     * @type {string}
     */
    public static readonly T_SMARTAPP_BUTTON_CARD = 'smart-app_card_btn';
    /**
     * Кнопки в пользовательском типе приложения.
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
     *  - array
     *      - string title    Текст, отображаемый на кнопке.
     *      - string url      Ссылка, по которой перейдет пользователь после нажатия на кнопку.
     *      - string payload  Дополнительные параметры, передаваемые при нажатие на кнопку.
     */
    public btns: TButton[];
    /**
     * Массив из кнопок вида ссылка.
     *  - string Текст, отображаемый на кнопке.
     *  or
     *  - array
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
        this.clear();
        this.type = Buttons.T_ALISA_BUTTONS;
    }

    /**
     * Очистка всех кнопок.
     * @api
     */
    public clear(): void {
        this.buttons = [];
        this.btns = [];
        this.links = [];
    }

    /**
     * Добавить кнопку.
     *
     * @param {string} title Текст на кнопке.
     * @param {string} url Ссылка для перехода при нажатии на кнопку.
     * @param {TButtonPayload} payload Произвольные данные, отправляемые при нажатии кнопки.
     * @param {boolean} hide True, если отображать кнопку как сайджест.
     * @param {IButtonOptions} options Дополнительные параметры для кнопки
     *
     * @return boolean
     */
    protected _add(title: string, url: string, payload: TButtonPayload, hide: boolean = false, options: IButtonOptions = {}): boolean {
        let button = new Button();
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
     * Добавить кнопку типа кнопка.
     *
     * @param {string} title Текст на кнопке.
     * @param {string} url Ссылка для перехода при нажатии на кнопку.
     * @param {TButtonPayload} payload Произвольные данные, отправляемые при нажатии кнопки.
     * @param {IButtonOptions} options Дополнительные параметры для кнопки
     * @return boolean
     * @api
     */
    public addBtn(title: string, url: string = '', payload: TButtonPayload = '', options: IButtonOptions = {}): boolean {
        return this._add(title, url, payload, Button.B_BTN, options);
    }

    /**
     * Добавить кнопку типа сайджест.
     *
     * @param {string} title Текст на кнопке.
     * @param {string} url Ссылка для перехода при нажатии на кнопку.
     * @param {TButtonPayload} payload Произвольные данные, отправляемые при нажатии кнопки.
     * @param {IButtonOptions} options Дополнительные параметры для кнопки
     * @return boolean
     * @api
     */
    public addLink(title: string, url: string = '', payload: TButtonPayload = '', options: IButtonOptions = {}): boolean {
        return this._add(title, url, payload, Button.B_LINK, options);
    }

    /**
     * Дополнительная обработка второстепенных кнопок.
     * А именно обрабатываются массивы btns и links. После чего все значения вносятся в массив buttons.
     */
    protected _processing(): void {
        if (this.btns.length) {
            if (typeof this.btns === 'object') {
                this.btns.forEach((btn) => {
                    if (typeof btn !== 'string') {
                        this.addBtn(btn.title || null, (<IButton>btn).url || '',
                            btn.payload || null, btn.options || {});
                    } else {
                        this.addBtn(btn);
                    }
                });
            } else {
                this.addBtn(this.btns);
            }
        }
        if (this.links.length) {
            if (typeof this.links === 'object') {
                this.links.forEach((link) => {
                    if (typeof link !== 'string') {
                        this.addLink(link.title || null, (<IButton>link).url || '',
                            link.payload || null, link.options || {});
                    } else {
                        this.addLink(link);
                    }
                })
            } else {
                this.addLink(this.links);
            }
        }
        this.btns = [];
        this.links = [];
    }

    /**
     * Возвращаем массив с кнопками для ответа пользователю.
     *
     * @param {string} type Тип кнопки.
     * @param {TemplateButtonTypes} userButton Класс с пользовательскими кнопками.
     * @return any
     * @api
     */
    public getButtons(type: string = null, userButton: TemplateButtonTypes = null): any {
        this._processing();
        if (type === null) {
            type = this.type;
        }
        let button: TemplateButtonTypes = null;
        switch (type) {
            case Buttons.T_ALISA_BUTTONS:
                button = new AlisaButton();
                (<AlisaButton>button).isCard = false;
                break;

            case Buttons.T_ALISA_CARD_BUTTON:
                button = new AlisaButton();
                (<AlisaButton>button).isCard = true;
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
                (<SmartAppButton>button).isCard = false;
                break;

            case Buttons.T_SMARTAPP_BUTTON_CARD:
                button = new SmartAppButton();
                (<SmartAppButton>button).isCard = true;
                break;

            case Buttons.T_USER_APP_BUTTONS:
                button = userButton;
                break;
        }

        if (button) {
            button.buttons = this.buttons;
            return button.getButtons();
        }
        return [];
    }

    /**
     * Возвращаем json строку c кнопками.
     *
     * @param {string} type Тип приложения.
     * @param {TemplateButtonTypes} userButton Класс с пользовательскими кнопками.
     * @return string|null
     * @api
     */
    public getButtonJson(type: string = null, userButton: TemplateButtonTypes = null): string {
        const btn: object[] = this.getButtons(type, userButton);
        if (btn.length) {
            return JSON.stringify(btn);
        }
        return null;
    }
}
