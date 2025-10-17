import { TemplateTypeModel, BotController, Buttons } from '../../../../../src';
import { UserButton } from '../Components/UserButton';
import { UserCard } from '../Components/UserCard';
import { UserSound } from '../Components/UserSound';

interface IUserApp {
    userId: string;
    data: {
        text: string;
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
    public async init(query: string | IUserApp, controller: BotController): Promise<boolean> {
        if (query) {
            let content: IUserApp;
            if (typeof query === 'string') {
                content = <IUserApp>JSON.parse(query);
            } else {
                content = { ...query };
            }
            this.controller = controller;
            this.controller.requestObject = content;
            /**
             * Инициализация основных параметров приложения
             */
            this.controller.userCommand = content.data.text;
            this.controller.originalUserCommand = content.data.text;

            this.controller.userId = 'Идентификатор пользователя. Берется из content';
            this.appContext.platformParams.user_id = this.controller.userId;
            return true;
        } else {
            this.error = 'UserApp:init(): Отправлен пустой запрос!';
        }
        return false;
    }

    /**
     * Отправка ответа пользователю
     *
     * @return {Promise<string>}
     * @see TemplateTypeModel::getContext() Смотри тут
     */
    public async getContext(): Promise<string> {
        // Проверяем отправлять ответ пользователю или нет
        if (this.controller.isSend) {
            /**
             * Отправляем ответ в нужном формате
             */
            const buttonClass = new UserButton(); // Класс отвечающий за отображение кнопок. Должен быть унаследован от TemplateButtonTypes
            /*
             * Получение кнопок
             */
            const buttons = this.controller.buttons.getButtons(
                Buttons.T_USER_APP_BUTTONS,
                buttonClass,
            );

            const cardClass = new UserCard(this.appContext); // Класс отвечающий за отображение карточек. Должен быть унаследован от TemplateCardTypes
            /*
             * Получить информацию о карточке
             */
            const cards = await this.controller.card.getCards(cardClass);

            const soundClass = new UserSound(this.appContext); // Класс отвечающий за отображение звуков. Должен быть унаследован от TemplateSoundTypes
            /*
             * Получить все звуки
             */
            const sounds = await this.controller.sound.getSounds('', soundClass);
            fetch('https://localhost:8080', {
                method: 'POST',
                body: JSON.stringify({
                    cards,
                    sounds,
                    buttons,
                }),
            });
        }
        return 'ok';
    }
}
