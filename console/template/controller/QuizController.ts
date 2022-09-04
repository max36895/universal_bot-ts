/**
 * Created by umbot
 * Date: {{date}}
 * Time: {{time}}
 */

import {AlisaSound, BotController, mmApp, Text, WELCOME_INTENT_NAME,} from "umbot";

interface IQuestion {
    text: string;
    variants: string[];
    success: string;
}

/**
 * Шаблон для викторины
 * Class __className__Controller
 */
export class __className__Controller extends BotController {
    public question: IQuestion[];
    protected readonly START_QUESTION = 'start';
    protected readonly GAME_QUESTION = 'game';

    public constructor() {
        super();
        this.question = [
            {
                text: '', // Вопрос
                variants: [''], // Возможные варианты ответа
                success: '' // Правильный ответ
            }
        ];
    }

    /**
     * Получаем вопрос и отображаем его пользователю
     *
     * @param {number} id Идентификатор записи
     */
    protected _setQuestionText(id: number) {
        if (typeof this.question[id] === 'undefined') {
            id = 0;
        }
        this.userData.question_id = id;
        this.text = this.question[id].text;
        this.buttons.btns = this.question[id].variants;
    }

    /**
     * Проверяем правильно ответил пользователь или нет
     *
     * @param {string} text пользовательский ответ
     * @param {number} questionId номер вопроса
     */
    protected _isSuccess(text: string | null, questionId: number) {
        if (Text.isSayText(this.question[questionId].success, text || '')) {
            const successTexts = [
                "Совершенно верно!\n"
            ];
            this.text = Text.getText(successTexts);
            this.tts = this.text + AlisaSound.S_AUDIO_GAME_WIN;
            questionId++;
        } else {
            const failTexts = [
                "Ты ошибся... Попробуй ещё раз!\n"
            ];
            this.text = Text.getText(failTexts);
            this.tts = this.text + AlisaSound.S_AUDIO_GAME_LOSS;
        }
        this._setQuestionText(questionId);
    }

    /**
     * Начат квест
     */
    protected _quiz() {
        if (typeof this.userData.question_id !== 'undefined') {
            this._isSuccess(this.userCommand, this.userData.question_id);
        } else {
            this._setQuestionText(0);
        }
    }

    /**
     * Отображаем пользователю текст помощи.
     */
    protected _help() {
        this.text = Text.getText(mmApp.params.help_text || '');
    }

    /**
     * Обработка пользовательских команд.
     *
     * Если intentName === null, значит не удалось найти обрабатываемых команд в тексте.
     * В таком случе стоит смотреть либо на предыдущую команду пользователя(которая сохранена в бд).
     * Либо вернуть текст помощи.
     *
     * Обрабатываем приветствие и команду повтори.
     *
     * @param {string} intentName Название действия.
     */
    public action(intentName: string): void {
        switch (intentName) {
            case WELCOME_INTENT_NAME:
                this.userData.prevCommand = this.START_QUESTION;
                this.buttons.btns = ['Да', 'Нет'];
                break;

            case 'replay':
                this.text = "Повторяю ещё раз:\n";
                this._setQuestionText(this.userData.question_id);
                break;

            default:
                switch (this.userData.prevCommand) {
                    case this.START_QUESTION:
                        if (Text.isSayTrue(this.userCommand || '')) {
                            this.text = "Отлично!\nТогда начинаем игу!\n";
                            this._quiz();
                            this.userData.prevCommand = this.GAME_QUESTION;
                        } else if (Text.isSayFalse(this.userCommand || '')) {
                            this.text = "Хорошо...\nПоиграем в другой раз!";
                            this.isEnd = true;
                        } else {
                            this.text = 'Скажи, ты готов начать игру?';
                            this.buttons.btns = ['Да', 'Нет'];
                        }
                        break;

                    case this.GAME_QUESTION:
                        this._quiz();
                        break;

                    default:
                        this._help();
                        break;
                }
                break;
        }
    }
}
