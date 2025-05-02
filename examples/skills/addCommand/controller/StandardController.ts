import { HELP_INTENT_NAME, WELCOME_INTENT_NAME, BotController } from '../../../../src';

/**
 * Стандартный пример приложения.
 * Отвечает на команды:
 *  - Привет
 *  - Пока
 *  - Список
 *  - Карточка
 *
 * Class StandardController
 */
export class StandardController extends BotController {
    constructor() {
        super();
    }

    public action(intentName: string, isCommand: boolean): void {
        if (isCommand) {
            // доп логика если была выполнена добавленная команда. Можно сохранять логи например
            return;
        }
        switch (intentName) {
            case WELCOME_INTENT_NAME:
                this.text = 'Привет';
                this.buttons.btns = ['Пример кнопки галереи'];
                this.buttons.links = ['Пример ссылки для изображения'];
                break;

            case HELP_INTENT_NAME:
                this.text = 'Помощь';
                break;

            default:
                this.text = 'Команда не найдена!';
                break;
        }
    }
}
