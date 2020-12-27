import {TemplateTypeModel} from "../../../../../src/core/types/TemplateTypeModel";
import {BotController} from "../../../../../src/controller/BotController";
import {mmApp} from "../../../../../src/core/mmApp";
import {UserButton} from "../Components/UserButton";
import {Buttons} from "../../../../../src/components/button/Buttons";
import {UserCard} from "../Components/UserCard";
import {UserSound} from "../Components/UserSound";

interface IUserApp {
    userId?: string;
    data?: {
        text: string
    };
}

export class UserApp extends TemplateTypeModel {
    /**
     * Инициализация параметров
     *
     * @param query
     * @param controller
     * @return bool
     * @see TemplateTypeModel::init() Смотри тут
     */
    public init(query: string | IUserApp, controller: BotController): boolean {
        if (query) {
            let content: IUserApp = null;
            if (typeof query === 'string') {
                content = <IUserApp>JSON.parse(query);
            } else {
                content = {...query}
            }
            this.controller = controller;
            this.controller.requestObject = content;
            /**
             * Инициализация основных параметров приложения
             */
            this.controller.userCommand = content.data.text;
            this.controller.originalUserCommand = content.data.text;

            this.controller.userId = 'Идентификатор пользователя. Берется из content';
            mmApp.params.user_id = this.controller.userId;
            return true;
        } else {
            this.error = 'UserApp:init(): Отправлен пустой запрос!';
        }
        return false;
    }

    /**
     * Отправка ответа пользователю
     *
     * @return string
     * @see TemplateTypeModel::getContext() Смотри тут
     */
    public getContext(): string {
        // Проверяем отправлять ответ пользователю или нет
        if (this.controller.isSend) {
            /**
             * Отправляем ответ в нужном формате
             */
            const buttonClass = new UserButton();// Класс отвечающий за отображение кнопок. Должен быть унаследован от TemplateButtonTypes
            /*
             * Получение кнопок
             */
            const buttons = this.controller.buttons.getButtons(Buttons.T_USER_APP_BUTTONS, buttonClass);

            const cardClass = new UserCard();// Класс отвечающий за отображение карточек. Должен быть унаследован от TemplateCardTypes
            /*
             * Получить информацию о карточке
             */
            const cards = this.controller.card.getCards(cardClass);

            const soundClass = new UserSound();// Класс отвечающий за отображение звуков. Должен быть унаследован от TemplateSoundTypes
            /*
             * Получить все звуки
             */
            const sounds = this.controller.sound.getSounds('', soundClass);
        }
        return 'ok';
    }
}
