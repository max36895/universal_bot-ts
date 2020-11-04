/**
 * Отвечает за отображение определенных кнопок, в зависимости от типа приложения.
 * Class Buttons
 * @package bot\components\button
 */
import {Button} from "./Button";
import {IButton, TButton, TButtonPayload} from "./interfaces/button";
import {TemplateButtonTypes} from "./types/TemplateButtonTypes";
import {AlisaButton} from "./types/AlisaButton";
import {TelegramButton} from "./types/TelegramButton";
import {VkButton} from "./types/VkButton";
import {ViberButton} from "./types/ViberButton";

export class Buttons {
    public static readonly T_ALISA_BUTTONS = 'alisa_btn';
    public static readonly T_ALISA_CARD_BUTTON = 'alisa_card_btn';
    public static readonly T_VK_BUTTONS = 'vk_btn';
    public static readonly T_TELEGRAM_BUTTONS = 'telegram_btn';
    public static readonly T_VIBER_BUTTONS = 'viber_btn';
    public static readonly T_USER_APP_BUTTONS = 'user_app_btn';

    /**
     * Массив с различными кнопками.
     * @var buttons Массив с различными кнопками.
     * @see Button Смотри тут
     */
    public buttons: Button[];
    /**
     * Массив из кнопок вида кнопка.
     * @var btn
     *  - string Текст, отображаемый на кнопке.
     *  or
     *  - array
     *      - string title    Текст, отображаемый на кнопке.
     *      - string url      Ссылка, по которой перейдет пользователь после нажатия на кнопку.
     *      - string payload  Дополнительные параметры, передаваемые при нажатие на кнопку.
     */
    public btn: TButton[];
    /**
     * Массив из кнопок вида ссылка.
     * @var link
     *  - string Текст, отображаемый на кнопке.
     *  or
     *  - array
     *      - string title    Текст, отображаемый на кнопке.
     *      - string url      Ссылка, по которой перейдет пользователь после нажатия на кнопку.
     *      - string payload  Дополнительные параметры, передаваемые при нажатие на кнопку.
     */
    public link: TButton[];
    /**
     * @var type Тип кнопок(кнопка в Алисе, кнопка в карточке Алисы, кнопка в Vk, кнопка в Telegram).
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
        this.btn = [];
        this.link = [];
    }

    /**
     * Вставить кнопку.
     *
     * @param title Текст на кнопке.
     * @param url Ссылка для перехода при нажатии на кнопку.
     * @param payload Произвольные данные, отправляемые при нажатии кнопки.
     * @param hide True, если отображать кнопку как сайджест.
     *
     * @return boolean
     */
    protected _add(title: string, url: string, payload: TButtonPayload, hide: boolean = false): boolean {
        let button = new Button();
        if (hide === Button.B_LINK) {
            if (!button.initLink(title, url, payload)) {
                button = null;
            }
        } else {
            if (!button.initBtn(title, url, payload)) {
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
     * @param title Текст на кнопке.
     * @param url Ссылка для перехода при нажатии на кнопку.
     * @param payload Произвольные данные, отправляемые при нажатии кнопки.
     * @return boolean
     * @api
     */
    public addBtn(title: string, url: string = '', payload: TButtonPayload = ''): boolean {
        return this._add(title, url, payload, Button.B_BTN);
    }

    /**
     * Добавить кнопку типа сайджест.
     *
     * @param title Текст на кнопке.
     * @param url Ссылка для перехода при нажатии на кнопку.
     * @param payload Произвольные данные, отправляемые при нажатии кнопки.
     * @return boolean
     * @api
     */
    public addLink(title: string, url: string = '', payload: TButtonPayload = ''): boolean {
        return this._add(title, url, payload, Button.B_LINK);
    }

    /**
     * Дополнительная обработка второстепенных кнопок.
     * А именно обрабатываются массивы btn и link. После чего все значения вносятся в массив buttons.
     */
    protected _processing(): void {
        if (this.btn.length) {
            if (typeof this.btn === 'object') {
                this.btn.forEach((btn) => {
                    if (typeof btn !== 'string') {
                        this.addBtn(btn.title || null, (<IButton>btn).url || '', btn.payload || null);
                    } else {
                        this.addBtn(btn);
                    }
                });
            } else {
                this.addBtn(this.btn);
            }
        }
        if (this.link.length) {
            if (typeof this.link === 'object') {
                this.link.forEach((btn) => {
                    if (typeof btn !== 'string') {
                        this.addLink(btn.title || null, (<IButton>btn).url || '', btn.payload || null);
                    } else {
                        this.addLink(btn);
                    }
                })
            } else {
                this.addLink(this.link);
            }
        }
    }

    /**
     * Возвращает массив с кнопками для ответа пользователю.
     *
     * @param type Тип приложения.
     * @param userButton Класс с пользовательскими кнопками.
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
     * Возвращает строку из json объекта кнопок.
     *
     * @param type Тип приложения.
     * @return string|null
     * @api
     */
    public getButtonJson(type: string = null): string {
        const btn: object[] = this.getButtons(type);
        if (btn.length) {
            return JSON.stringify(btn);
        }
        return null;
    }
}
