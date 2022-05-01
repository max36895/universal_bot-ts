import {BotController, rand, HELP_INTENT_NAME, WELCOME_INTENT_NAME} from "../../../../src";

interface IGameControllerExample {
    example: string;
    result: number;
}

/**
 * Пример с игрой в математику.
 *
 * Class GameController
 */
export class GameController extends BotController {
    constructor() {
        super();
    }

    protected _getExample(): IGameControllerExample {
        const value1 = rand(0, 20);
        const value2 = rand(0, 20);
        if (rand(0, 1)) {
            return {
                example: `${value1} + ${value2} = ?`,
                result: value1 + value2
            };
        } else {
            if (value1 < value2) {
                return {
                    example: `${value2} - ${value1} = ?`,
                    result: value2 - value1
                };
            } else {
                return {
                    example: `${value1} - ${value2} = ?`,
                    result: value1 - value2
                };
            }
        }
    }

    protected game(): void {
        if (this.userData.example) {
            if (this.userData.result == this.userCommand) {
                this.text = "Молодец! Это правильный ответ! Сколько будет: \n";
                this.userData = this._getExample();
            } else {
                this.text = "Не совсем... Давай ещё раз!\n";
            }
        } else {
            this.text = "Сколько будет: \n";
            this.userData = this._getExample();
        }
        this.userData['isGame'] = true;
        this.text += this.userData['example'];
    }

    public action(intentName: string): void {
        switch (intentName) {
            case WELCOME_INTENT_NAME:
                this.text = 'Привет! Давай поиграем в математику!' +
                    'Чтобы начать игру скажи играть.';
                this.buttons.addBtn('Играть');
                break;

            case HELP_INTENT_NAME:
                this.text = 'Это простая игра в математику!';
                break;

            case 'replay':
                if (this.userData['example']) {
                    this.text = `Повторяю твой пример:\n${this.userData.example}`;
                } else {
                    this.text = 'Начни игру!';

                    this.buttons.addBtn('Начать игру');
                }
                break;

            case 'game':
                this.game();
                break;

            case 'by':
                this.text = 'Пока пока!';
                this.isEnd = true;
                break;

            default:
                if (!(this.userData['isGame'])) {
                    this.text = 'Извини, я тебя не понимаю...' +
                        'Если хочешь поиграть, скажи играть';
                    this.buttons.addBtn('Играть');
                } else {
                    this.game();
                }
                break;
        }
    }
}
