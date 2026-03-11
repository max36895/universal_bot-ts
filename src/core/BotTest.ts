/**
 * Модуль для тестирования бота.
 * Предоставляет инструменты для отладки и тестирования функциональности бота
 */
import { TAppType } from './interfaces/IAppContext';

import { BotController, IUserData, BaseBotController } from '../controller';
import { Bot, TBotControllerClass, TRunResult } from './Bot';
import { stdin } from '../utils/';
import { performance } from 'node:perf_hooks';

/**
 * Функция для получения конфигурации пользовательского бота
 *
 * @callback TUserBotConfigCb
 * @param {string} query - Пользовательский запрос
 * @param {string} userId - Идентификатор пользователя
 * @param {number} count - Номер сообщения в диалоге
 * @returns {any} Конфигурация для пользовательского бота
 */
export type TUserBotConfigCb = (query: string, userId: string, count: number) => unknown;

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
}

interface IResponse {
    response: {
        text: string;
        tts: string;
    };
}

/**
 * Класс для тестирования бота.
 * Предоставляет интерактивный режим для отладки и тестирования функциональности.
 * Для того чтобы протестировать необходимую платформу, необходимо указать `appType`, в случае если значение не указано или установлено в auto, то для тестирования будет использоваться первая платформа.
 *
 * @extends Bot
 *
 * @example
 * ```ts
 * const botTest = new BotTest();
 * botTest.setPlatformParams({
 *   intents: [{
 *     name: 'greeting',
 *     slots: ['привет', 'здравствуйте']
 *   }]
 * });
 * botTest.initBotController(MyController);
 *
 * // Запуск тестирования
 * await botTest.test({
 *   isShowResult: true,
 *   isShowStorage: true
 * });
 * ```
 */
export class BotTest extends Bot {
    protected _botController: BotController;

    constructor(type?: TAppType, botController?: TBotControllerClass) {
        super(type, botController);
        if (botController) {
            this._botController = new botController(this.getAppContext());
        } else {
            this._botController = new BaseBotController(this.getAppContext());
        }
        this._setBotController(this._botController);
    }

    initBotController(fn: TBotControllerClass): this {
        this._botController = new fn(this.getAppContext());
        this._setBotController(this._botController);
        return super.initBotController(fn);
    }

    /**
     * Запускает интерактивное тестирование бота
     * Позволяет вводить команды и получать ответы в консоли
     *
     * @param {IBotTestParams} [params] - Параметры тестирования
     * @returns {Promise<void>}
     *
     * @example
     * ```ts
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
    }: IBotTestParams = {}): Promise<void> {
        let count: number = 0;
        let state: string | IUserData = {};
        let isEnd = false;
        do {
            let query;
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
                this.setContent(JSON.stringify(this.getSkillContent(query, count, state)));
            }
            const timeStart: number = performance.now();
            if (typeof this._content === 'string') {
                this.setContent(JSON.parse(this._content));
            }
            this._setBotController(this._botController);

            const result: IResponse = (await this.run(this.appType)) as IResponse;
            const platformAdapter = this.getAppContext().platforms;

            let strRes;
            if (
                this._botController.appType &&
                platformAdapter?.[this._botController.appType]?.isVoice
            ) {
                if (result.response?.text) {
                    strRes = result.response.text;
                } else {
                    strRes = result.response?.tts || 'пусто';
                }
            } else {
                strRes = this._botController.text;
            }

            if (isShowResult) {
                console.log(`Ответ для платформы: > ${JSON.stringify(result)}`);
            }
            if (isShowStorage) {
                console.log(`Данные в базе > ${JSON.stringify(this._botController.userData)}`);
                console.log(`Данные в хранилище > ${JSON.stringify(this._botController.state)}`);
            }
            if (isShowTime) {
                const endTime: number = performance.now() - timeStart;
                console.log(`Время выполнения: ${endTime.toFixed(3)}мс`);
            }
            console.log(`\nОтвет бота: > ${strRes}`);

            if (this._botController.isEnd) {
                isEnd = true;
            } else {
                console.log('Ваш запрос: > ');
                this.setContent(null);
                this._botController.text = this._botController.tts = '';
                state = this._botController.userData;
                count++;
                this._botController.clearStoreData();
            }
        } while (!isEnd);
    }

    protected _clearState(): void {
        return;
    }

    /**
     * Формирует конфигурацию для тестирования конкретной платформы.
     * Создает структуру данных, соответствующую формату выбранной платформы
     *
     * @param {string} query - Пользовательский запрос
     * @param {number} count - Номер сообщения в диалоге
     * @param {object|string} state - Данные из хранилища
     * @returns {any} Конфигурация для выбранной платформы
     *
     * @protected
     */
    protected getSkillContent(
        query: string,
        count: number,
        state: Record<string, unknown> | string,
    ): unknown {
        /**
         * Все переменные используются внутри шаблонов
         */
        const userId: string = 'user_local_test';
        let appType = this.appType;
        if (appType === 'auto') {
            appType = Object.keys(this.getAppContext().platforms)[0];
            this.appType = appType;
        }
        if (!this.getAppContext().platforms[appType].isVoice) {
            this._botController.skipAutoReply = false;
        }
        return this.getAppContext().platforms[appType].getQueryExample(query, userId, count, state);
    }

    /**
     * Запуск обработку запроса
     * Не рекомендуется вызывать самостоятельно, ответственность за вызов метода лежит за классом.
     * @param appType
     * @param content
     */
    public run(appType?: TAppType | null, content?: string | null): Promise<TRunResult> {
        this.appType = appType || 'alisa';
        this._botController.appType = appType || 'alisa';
        return super.run(appType, content);
    }
}
