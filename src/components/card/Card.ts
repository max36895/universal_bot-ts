import {Buttons, TButton} from "../button";
import {Image} from "../image/Image";
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
     * Произвольных шаблон, который отобразится вместо стандартного.
     * Рекомендуется использовать для smartApp, так как для него существует множество вариация для отображения карточек + есть списки
     * При использовании переменной, Вы сами отвечаете за корректное отображение карточки.
     */
    public template: any = null;

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
     * Вставляем элемент в каточку|список. В случае успеха вернет true.
     *
     * @param {string} image Идентификатор или расположение изображения.
     * @param {string} title Заголовок для изображения.
     * @param {string} desc Описание для изображения.
     * @param {TButton} button Кнопки, обрабатывающие команды при нажатии на элемент.
     * @return boolean
     * @api
     */
    public add(image: string, title: string, desc: string = ' ', button: TButton = null): boolean {
        const img = new Image();
        if (img.init(image, title, desc, button)) {
            this.images.push(img);
            return true;
        }
        return false;
    }

    /**
     * Получение всех элементов карточки.
     *
     * @param {TemplateCardTypes} userCard Пользовательский класс для отображения каточки.
     * @return {Promise<any>}
     * @api
     */
    public async getCards(userCard: TemplateCardTypes = null): Promise<any> {
        if (this.template) {
            return this.template;
        }
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
            return await card.getCard(this.isOne);
        }
        return [];
    }

    /**
     * Возвращаем json строку со всеми элементами карточки.
     *
     * @param {TemplateCardTypes} userCard Пользовательский класс для отображения каточки.
     * @return {Promise<string>}
     * @api
     */
    public async getCardsJson(userCard: TemplateCardTypes = null): Promise<string> {
        return JSON.stringify(await this.getCards(userCard));
    }
}
