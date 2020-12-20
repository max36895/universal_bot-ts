import {Buttons} from "../button/Buttons";
import {Image} from "../image/Image";
import {TButton} from "../button/interfaces/button";
import {TemplateCardTypes} from "./types/TemplateCardTypes";
import {mmApp, T_ALISA, T_MARUSIA, T_SMARTAPP, T_TELEGRAM, T_USER_APP, T_VIBER, T_VK} from "../../core/mmApp";
import {AlisaCard} from "./types/AlisaCard";
import {TelegramCard} from "./types/TelegramCard";
import {VkCard} from "./types/VkCard";
import {ViberCard} from "./types/ViberCard";
import {MarusiaCard} from "./types/MarusiaCard";
import {SmartAppCard} from "./types/SmartAppCard";

/**
 * Класс отвечающий за отображение определенной карточки, в зависимости от типа приложения.
 * @class Card
 */
export class Card {
    /**
     * Заголовок для элемента карточки.
     */
    public title: string;
    /**
     * Описание для элемента карточки.
     */
    public desc: string;
    /**
     * Массив с изображениями или элементами карточки.
     * @see Image Смотри тут
     */
    public images: Image[];
    /**
     * Кнопки для элемента карточки.
     * @see Buttons Смотри тут
     */
    public button: Buttons;
    /**
     * В карточке отобразить только 1 элемент/картинку.
     * True, если в любом случае отобразить только 1 изображение.
     */
    public isOne: boolean;

    /**
     * Использование галереи изображений. Передайте true, если хотите отобразить галерею из изображений.
     * @type {boolean}
     */
    public isUsedGallery: boolean = false;

    /**
     * Card constructor.
     */
    public constructor() {
        this.isOne = false;
        this.button = new Buttons();
        this.clear();
    }

    /**
     * Очистить все элементы карточки.
     * @api
     */
    public clear() {
        this.images = [];
    }

    /**
     * Вставить элемент в каточку|список.
     *
     * @param {string} image Идентификатор или расположение изображения.
     * @param {string} title Заголовок для изображения.
     * @param {string} desc Описание для изображения.
     * @param {TButton} button Кнопки, обрабатывающие команды при нажатии на элемент.
     * @api
     */
    public add(image: string, title: string, desc: string = ' ', button: TButton = null): void {
        const img = new Image();
        if (img.init(image, title, desc, button)) {
            this.images.push(img);
        }
    }

    /**
     * Получение всех элементов карточки.
     *
     * @param {TemplateCardTypes} userCard Пользовательский класс для отображения каточки.
     * @return any
     * @api
     */
    public getCards(userCard: TemplateCardTypes = null): any {
        let card = null;
        switch (mmApp.appType) {
            case T_ALISA:
                card = new AlisaCard();
                break;

            case T_VK:
                card = new VkCard();
                break;

            case T_TELEGRAM:
                card = new TelegramCard();
                break;

            case T_VIBER:
                card = new ViberCard();
                break;

            case T_MARUSIA:
                card = new MarusiaCard();
                break;

            case T_SMARTAPP:
                card = new SmartAppCard();
                break;

            case T_USER_APP:
                card = userCard;
                break;
        }
        if (card) {
            card.isUsedGallery = this.isUsedGallery;
            card.images = this.images;
            card.button = this.button;
            card.title = this.title;
            return card.getCard(this.isOne);
        }
        return [];
    }

    /**
     * Возвращаем json строку со всеми элементами карточки.
     *
     * @param {TemplateCardTypes} userCard Пользовательский класс для отображения каточки.
     * @return string
     * @api
     */
    public getCardsJson(userCard: TemplateCardTypes = null): string {
        return JSON.stringify(this.getCards(userCard));
    }
}
