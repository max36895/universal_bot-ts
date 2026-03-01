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

    public action(intentName: string, isCommand: boolean, isStep: boolean): void {
        if (isCommand || isStep) {
            // Доп логика если была выполнена добавленная команда или шаг.
            // Можно использовать как шаг, чтобы писать доп логи, либо добавить доп информацию к ответу.
            return;
        }
        switch (intentName) {
            case WELCOME_INTENT_NAME:
                this.text = 'Привет';
                this.buttons.addBtn('Пример кнопки');
                this.buttons.addLink('Пример кнопки ссылки');
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
