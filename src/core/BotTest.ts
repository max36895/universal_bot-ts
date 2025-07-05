/**
 * Модуль для тестирования бота.
 * Предоставляет инструменты для отладки и тестирования функциональности бота
 *
 * @module core/BotTest
 */
import { mmApp, T_ALISA, T_MARUSIA, T_TELEGRAM, T_USER_APP, T_VIBER, T_VK } from '../mmApp';
import { TemplateTypeModel } from '../platforms';
import { stdin } from '../utils/standard/util';
import {
    alisaConfig,
    marusiaConfig,
    vkConfig,
    telegramConfig,
    viberConfig,
} from '../platforms/skillsTemplateConfig';
import { Bot } from './Bot';
import { IUserData } from './../controller/BotController';

/**
 * Функция для получения конфигурации пользовательского бота
 *
 * @callback TUserBotConfigCb
 * @param {string} query - Пользовательский запрос
 * @param {string} userId - Идентификатор пользователя
 * @param {number} count - Номер сообщения в диалоге
 * @returns {any} Конфигурация для пользовательского бота
 */
export type TUserBotConfigCb = (query: string, userId: string, count: number) => any;

/**
 * Параметры для тестирования бота.
 * Определяют поведение и отображение результатов тестирования
 */
export interface IBotTestParams {
    /**
     * Отображать полный ответ навыка
     * @defaultValue false
     */
    isShowResult?: boolean;

    /**
     * Отображать данные из хранилища
     * @defaultValue false
     */
    isShowStorage?: boolean;

    /**
     * Отображать время выполнения запроса
     * @defaultValue true
     */
    isShowTime?: boolean;

    /**
     * Пользовательский класс для обработки команд
     * Если не указан, используется стандартный обработчик
     */
    userBotClass?: TemplateTypeModel | null;

    /**
     * Функция для получения конфигурации пользовательского бота.
     * Используется только для типа приложения T_USER_APP
     *
     * @param {string} query - Пользовательский запрос
     * @param {string} userId - Идентификатор пользователя
     * @param {number} count - Номер сообщения в диалоге
     * @returns {any} Конфигурация для пользовательского бота
     */
    userBotConfig?: TUserBotConfigCb | null;
}

/**
 * Класс для тестирования бота
 * Предоставляет интерактивный режим для отладки и тестирования функциональности
 *
 * @class BotTest
 * @extends Bot
 *
 * @example
 * ```typescript
 * const botTest = new BotTest();
 * botTest.initConfig({
 *   intents: [{
 *     name: 'greeting',
 *     slots: ['привет', 'здравствуйте']
 *   }]
 * });
 * botTest.initBotController(new MyController());
 *
 * // Запуск тестирования
 * await botTest.test({
 *   isShowResult: true,
 *   isShowStorage: true
 * });
 * ```
 */
export class BotTest extends Bot {
    /**
     * Запускает интерактивное тестирование бота
     * Позволяет вводить команды и получать ответы в консоли
     *
     * @param {IBotTestParams} [params] - Параметры тестирования
     * @returns {Promise<void>}
     *
     * @example
     * ```typescript
     * // Базовое тестирование
     * await botTest.test();
     *
     * // Расширенное тестирование с отображением всех данных
     * await botTest.test({
     *   isShowResult: true,
     *   isShowStorage: true,
     *   isShowTime: true
     * });
     * ```
     */
    public async test({
        isShowResult = false,
        isShowStorage = false,
        isShowTime = true,
        userBotClass = null,
        userBotConfig = null,
    }: IBotTestParams = {}): Promise<void> {
        let count: number = 0;
        let state: string | IUserData = {};
        do {
            let query = '';
            if (count === 0) {
                console.log("Для выхода введите 'exit'\n");
                query = 'Привет';
            } else {
                query = await stdin();
                if (query === 'exit') {
                    break;
                }
            }
            if (!this._content) {
                this.setContent(
                    JSON.stringify(this.getSkillContent(query, count, state, userBotConfig)),
                );
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
                console.log(
                    `Данные в хранилище > \n${JSON.stringify(this._botController.userData)}\n\n`,
                );
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
                console.log(`Время выполнения: ${endTime}\n`);
            }
            if (this._botController.isEnd) {
                break;
            }
            console.log('Вы: > ');
            this._content = null;
            this._botController.text = this._botController.tts = '';
            state = this._botController.userData as IUserData;
            count++;
        } while (true);
    }

    /**
     * Формирует конфигурацию для тестирования конкретной платформы.
     * Создает структуру данных, соответствующую формату выбранной платформы
     *
     * @param {string} query - Пользовательский запрос
     * @param {number} count - Номер сообщения в диалоге
     * @param {object|string} state - Данные из хранилища
     * @param {TUserBotConfigCb} [userBotConfig] - Функция для пользовательской конфигурации
     * @returns {any} Конфигурация для выбранной платформы
     *
     * @protected
     */
    protected getSkillContent(
        query: string,
        count: number,
        state: object | string,
        userBotConfig?: TUserBotConfigCb | null,
    ): any {
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
