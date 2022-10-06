import {mmApp, T_ALISA, T_MARUSIA, T_TELEGRAM, T_USER_APP, T_VIBER, T_VK} from '../mmApp';
import {TemplateTypeModel} from '../platforms';
import {stdin} from '../utils/standard/util';
import {alisaConfig, marusiaConfig, vkConfig, telegramConfig, viberConfig} from '../platforms/skillsTemplateConfig';
import {Bot} from './Bot';

export interface IBotTestParams {
    /**
     * Отображать полный ответ навыка.
     */
    isShowResult?: boolean;
    /**
     * Отображать данные из хранилища.
     */
    isShowStorage?: boolean;
    /**
     * Отображать время выполнения запроса.
     */
    isShowTime?: boolean;
    /**
     * Пользовательский класс для обработки команд.
     */
    userBotClass?: TemplateTypeModel | null
    /**
     * Функция, возвращающая параметры пользовательского приложения.
     * @param {string} query Пользовательский запрос.
     * @param {number} count Номер сообщения.
     * @param {object|string} state Данные из хранилища.
     */
    userBotConfig?: Function | null;
}

/**
 * Класс отвечающий за тестирование приложения.
 * В нем происходит инициализации параметров, выбор типа приложения, запуск логики и возврат корректного результата.
 * Рекомендуется использовать его, для проверки своего приложения. При выпуске в релиз, стоит заменить на Bot
 * @see bot
 * @class BotTest
 */
export class BotTest extends Bot {
    /**
     * Тестирование приложения.
     * Отображает только ответы навыка.
     * Никакой прочей информации (изображения, звуки, кнопки и тд) не отображаются!
     *
     * Для корректной работы, внутри логики навыка не должно быть пользовательских вызовов к серверу бота.
     *
     * @param {IBotTestParams} params Параметры для теста
     * @return {Promise<void>}
     * @api
     */
    public async test({
                          isShowResult = false,
                          isShowStorage = false,
                          isShowTime = true,
                          userBotClass = null,
                          userBotConfig = null
                      }: IBotTestParams = {}): Promise<void> {
        let count: number = 0;
        let state: string | object = {};
        do {
            let query = '';
            if (count === 0) {
                console.log("Для выхода введите exit\n");
                query = 'Привет';
            } else {
                query = await stdin();
                if (query === 'exit') {
                    break;
                }
            }
            if (!this._content) {
                this.setContent(JSON.stringify(this.getSkillContent(query, count, state, userBotConfig)));
            }
            const timeStart: number = Date.now();
            if (typeof this._content === 'string') {
                this.setContent(JSON.parse(this._content));
            }

            let result: any = await this.run(userBotClass);
            if (isShowResult) {
                console.log(`Результат работы: > \n${JSON.stringify(result)}\n\n`);
            }
            if (isShowStorage) {
                console.log(`Данные в хранилище > \n${JSON.stringify(this._botController.userData)}\n\n`);
            }

            switch (mmApp.appType) {
                case T_ALISA:
                    if (result.response.text) {
                        result = result.response.text;
                    } else {
                        result = result.response.tts;
                    }
                    break;

                default:
                    result = this._botController.text;
                    break;
            }

            console.log(`Бот: > ${result}\n`);
            if (isShowTime) {
                const endTime: number = Date.now() - timeStart;
                console.log(`Время выполнения: ${endTime}\n`)
            }
            if (this._botController.isEnd) {
                break;
            }
            console.log('Вы: > ');
            this._content = null;
            this._botController.text = this._botController.tts = '';
            state = this._botController.userData;
            count++;
        } while (1);
    }

    /**
     * Возвращаем корректную конфигурацию для конкретного типа приложения.
     *
     * @param {string} query Пользовательский запрос.
     * @param {number} count Номер сообщения.
     * @param {object | string} state Данные из хранилища.
     * @param {Function} userBotConfig Функция, возвращающая параметры пользовательского приложения.
     * @return any
     */
    protected getSkillContent(query: string, count: number, state: object | string, userBotConfig?: Function | null): any {
        /**
         * Все переменные используются внутри шаблонов
         */
        let content: object = {};
        const userId: string = 'user_local_test';
        switch (mmApp.appType) {
            case T_ALISA:
                content = alisaConfig(query, userId, count, state);
                break;

            case T_MARUSIA:
                content = marusiaConfig(query, userId, count, state);
                break;

            case T_VK:
                this._botController.isSend = false;
                content = vkConfig(query, userId, count);
                break;

            case T_TELEGRAM:
                this._botController.isSend = false;
                content = telegramConfig(query, userId, count);
                break;

            case T_VIBER:
                this._botController.isSend = false;
                content = viberConfig(query, userId);
                break;

            case T_USER_APP:
                this._botController.isSend = true;
                if (userBotConfig) {
                    content = userBotConfig(query, userId, count);
                }
                break;
        }
        return content;
    }
}

