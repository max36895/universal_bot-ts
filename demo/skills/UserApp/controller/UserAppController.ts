/**
 * Универсальное приложение по созданию навыков и ботов.
 * @version 1.0
 * @author Maxim-M maximco36895@yandex.ru
 */

import {BotController} from "../../../../src/MM/bot/controller/BotController";
import {HELP_INTENT_NAME, WELCOME_INTENT_NAME} from "../../../../src/MM/bot/core/mmApp";

/**
 * Пример, позволяющий сохранить данные в локальном хранилище.
 * Локальное хранилище работает только для Алисы. Во всех других ботах, будет использована база данных.
 *
 * Class LocalStorageController
 */
export class UserAppController extends BotController {
    constructor() {
        super();
    }

    public action(intentName): void {
        switch (intentName) {
            case WELCOME_INTENT_NAME:
                this.text = 'Привет';
                this.buttons.btn = ['Пример кнопки галереи'];
                this.buttons.link = ['Пример ссылки для картинки'];
                break;

            case HELP_INTENT_NAME:
                this.text = 'Помощь';
                break;

            case 'bigImage':
                this.text = '';
                this.tts = 'Большая картинка';
                this.card.add('565656/78878', 'Заголовок картинки', 'Описание картинки');
                break;

            case 'list':
                this.tts = 'Галерея из нескольких изображений';
                this.card.title = 'Галерея';
                this.card.add('565656/78878', 'Элемент с картинкой"', 'Описание картинки');
                this.card.add(null, 'Элемент без картинки', 'Описание картинки');
                this.card.button.addBtn('Текст в footer');
                break;

            case 'save':
                this.text = 'Сохранено!';
                this.userData = {
                    userId: this.userId,
                    saved: this.userCommand
                };
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
