import { BotTest, IBotTestParams } from './core/BotTest';
import { BotController } from './controller';
import { Bot, IAppConfig, IAppParam } from './core';

/**
 * Набор методов, упрощающих запуск приложения
 */

/**
 * Режим работы приложения
 * @remarks
 * Определяет режим запуска и окружение приложения:
 * - dev: Запуск в режиме тестирования с использованием консоли в качестве тестового окружения.
 *   Удобно для локальной разработки и отладки.
 * - dev-online: Запуск в режиме тестирования с использованием webhook.
 *   Позволяет тестировать интеграции с внешними сервисами.
 * - prod: Запуск в релизном режиме для использования в продакшн среде.
 *   Все оптимизации включены, логирование минимально.
 */
export type TMode = 'dev' | 'dev-online' | 'prod';

/**
 * Настройки приложения
 */
export interface IConfig {
    /**
     * Конфигурация приложения
     */
    appConfig: IAppConfig;
    /**
     * Параметры приложения
     */
    appParam: IAppParam;
    /**
     * Контроллер, отвечающий за логику приложения
     */
    controller: BotController;
    /**
     * Параметры для тестового окружения. Стоит указывать когда mode = dev
     */
    testParams?: IBotTestParams;
}

/**
 * Инициализирует основные параметры бота
 * @param {Bot | BotTest} bot Экземпляр бота для инициализации
 * @param {IConfig} config Конфигурация приложения
 * @remarks
 * Устанавливает конфигурацию, параметры и контроллер для бота.
 * Этот метод должен вызываться перед запуском бота.
 * @private
 */
function _initParam(bot: Bot | BotTest, config: IConfig): void {
    bot.setAppConfig(config.appConfig);
    bot.setPlatformParams(config.appParam);
    bot.initBotController(config.controller);
}

/**
 * Запуск приложения
 * @param {IConfig} config Конфигурация приложения
 * @param {TMode} mode Режим работы приложения
 * @param {String} hostname Hostname на котором будет запущено приложение
 * @param {String} port Порт на котором будет запущено приложение
 * @returns {unknown} В зависимости от режима:
 * - dev: Возвращает результат выполнения тестов
 * - dev-online/prod: Возвращает модуль с обработчиком webhook запросов
 *
 * @example
 * ```typescript
 * // Запуск в режиме разработки
 * run({
 *   appConfig: { ... },
 *   appParam: { ... },
 *   controller: new MyController(),
 *   testParams: { ... }
 * }, 'dev');
 *
 * // Запуск в продакшн режиме
 * run({
 *   appConfig: { ... },
 *   appParam: { ... },
 *   controller: new MyController()
 * }, 'prod');
 * ```
 */
export function run(
    config: IConfig,
    mode: TMode = 'prod',
    hostname: string = 'localhost',
    port: number = 3000,
): unknown {
    let bot: BotTest | Bot;
    switch (mode) {
        case 'dev':
            bot = new BotTest();
            _initParam(bot, config);
            bot.setDevMode(true);
            return (bot as BotTest).test(config.testParams);
        case 'dev-online':
            bot = new Bot();
            bot.initTypeInGet();
            _initParam(bot, config);
            bot.setDevMode(true);
            return bot.start(hostname, port);
        case 'prod':
            bot = new Bot();
            bot.initTypeInGet();
            _initParam(bot, config);
            return bot.start(hostname, port);
    }
}
