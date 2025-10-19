/**
 * Основной класс приложения для создания мультиплатформенных чат-ботов
 * @packageDocumentation
 * @module mmApp
 *
 * Основной класс приложения для создания мультиплатформенных чат-ботов
 *
 * Предоставляет функциональность для:
 * - Управления конфигурацией приложения
 * - Работы с базой данных
 * - Обработки команд и интентов
 * - Логирования и сохранения данных
 *
 * Основные возможности:
 * - Поддержка множества платформ (Алиса, Маруся, Telegram, Viber, VK)
 * - Гибкая система конфигурации
 * - Управление командами и интентами
 * - Работа с базой данных
 * - Логирование и отладка
 *
 * @example
 * ```typescript
 * import { mmApp } from './mmApp';
 *
 * // Настройка конфигурации
 * mmApp.setConfig({
 *   error_log: './logs',
 *   json: './data',
 *   isLocalStorage: true,
 *   // База данных опциональна
 *   db: {
 *     host: 'localhost',
 *     database: 'bot_db',
 *     user: 'admin',
 *     pass: 'password'
 *   }
 * });
 *
 * // Настройка параметров
 * mmApp.setParams({
 *   telegram_token: 'your-token',
 *   vk_token: 'your-token',
 *   welcome_text: 'Привет! Чем могу помочь?',
 *   help_text: 'Список доступных команд: ...',
 *   intents: [
 *     {
 *       name: 'greeting',
 *       slots: ['привет', 'здравствуй'],
 *       is_pattern: false
 *     },
 *     {
 *       name: 'numbers',
 *       slots: ['\\b\\d{3}\\b'],
 *       is_pattern: true // Явно указываем, что используем регулярное выражение
 *     }
 *   ]
 * });
 *
 * // Добавление команды
 * mmApp.addCommand('greeting', ['привет', 'здравствуй'], (text, controller) => {
 *   controller.text = 'Привет! Рад вас видеть!';
 * });
 *
 * // Добавление команды с регулярным выражением
 * mmApp.addCommand('numbers', ['\\b\\d{3}\\b'], (text, controller) => {
 *   controller.text = `Вы ввели число: ${text}`;
 * }, true); // Явно указываем, что используем регулярное выражение
 * ```
 */
import { arrayMerge, saveData } from './utils/standard/util';

import { IDir, AppContext, IAppConfig, IAppParam } from './core/AppContext';

/**
 * @class mmApp
 * Основной класс приложения
 *
 * Предоставляет статические методы и свойства для управления
 * конфигурацией, командами и состоянием приложения.
 *
 * @example
 * ```typescript
 * // Настройка режима разработки
 * mmApp.setDevMode(true);
 *
 * // Добавление команды
 * mmApp.addCommand('greeting', ['привет'], (text, controller) => {
 *   controller.text = 'Привет!';
 * });
 *
 * // Сохранение данных
 * mmApp.saveData({
 *   path: './data',
 *   fileName: 'config.json'
 * }, JSON.stringify(config));
 * ```
 * @deprecated
 */
export class MmApp extends AppContext {
    /**
     * Настройка приложения
     */
    public get config(): IAppConfig {
        return this.appConfig;
    }

    /**
     * Параметры приложения
     */
    public get params(): IAppParam {
        return this.platformParams;
    }

    /**
     * Установка параметров приложения
     * @param params
     */
    public setParams(params: IAppParam): void {
        this.setPlatformParams(params);
    }

    /**
     * Установка конфигурации приложения
     * @param config
     */
    public setConfig(config: IAppConfig): void {
        this.setAppConfig(config);
    }

    /**
     * Объединяет два массива объектов
     * @param {object[]} array1 - Основной массив
     * @param {object[]} array2 - Массив для объединения
     * @returns {object} Объединенный массив
     */
    public arrayMerge(array1: object[], array2?: object[]): object {
        return arrayMerge(array1, array2);
    }

    /**
     * Сохраняет данные в файл
     * @param {IDir} dir - Объект с путем и названием файла
     * @param {string} data - Сохраняемые данные
     * @param {string} mode - Режим записи
     * @returns {boolean} true в случае успешного сохранения
     */
    public saveData(dir: IDir, data: string, mode?: string): boolean {
        return saveData(dir, data, mode);
    }
}

/**
 * Глобальный контекст приложения. Не рекомендуется использовать.
 */
const mmApp = new MmApp();
export { mmApp };
