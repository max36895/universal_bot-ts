/**
 * Универсальное приложение по созданию навыков и ботов.
 * @version 1.0
 * @author Maxim-M maximco36895@yandex.ru
 */

import {HELP_INTENT_NAME, WELCOME_INTENT_NAME} from "../../../../src/MM/bot/core/mmApp";
import {BotController} from "../../../../src/MM/bot/controller/BotController";

/**
 * Пример с авторизацией в навыке.
 * Корректная авторизация работает в Алисе, при правильно заполненной конфигурации в кабинете разработчика навыка.
 *
 * Class AuthController
 */
export class AuthController extends BotController {
    constructor() {
        super();
    }

    public action(intentName): void {
        switch (intentName) {
            case WELCOME_INTENT_NAME:
                this.text = 'Привет';
                this.buttons.btns = ['Пример кнопки галереи'];
                this.buttons.links = ['Пример ссылки для картинки'];
                break;

            case HELP_INTENT_NAME:
                this.text = 'Помощь';
                break;

            case 'auth':
                this.isAuth = true;
                this.text = 'Авторизация происходит для Алисы!';
                break;

            case 'by':
                this.text = 'Пока пока!';
                this.isEnd = true;
                break;

            default:
                this.text = 'Команда не найдена!';
                break;
        }
    }
}
