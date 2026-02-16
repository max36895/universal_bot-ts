/**
 * Набор методов, упрощающих запуск приложения.
 * @packageDocumentation
 * @module build
 */
import { Bot, IAppConfig, IAppParam, TBotControllerClass, TPlugin } from './index';
import { FileAdapter, MongoAdapter, fullPlatforms } from './plugins';
import { BotTest, IBotTestParams } from './test';
import { Server } from 'node:http';

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
 * Настройки для приложения.
 */
export interface IConfig {
    /**
     * Конфигурация приложения.
     */
    appConfig?: IAppConfig;
    /**
     * Параметры приложения.
     */
    appParam?: IAppParam;
    /**
     * Контроллер, отвечающий за логику приложения.
     * В случае если контроллер не указан, то будет использоваться контроллер по умолчанию.
     */
    controller?: TBotControllerClass;
    /**
     * Параметры для тестового окружения. Стоит указывать когда mode = dev
     */
    testParams?: IBotTestParams;
    /**
     * Дополнительная логика для приложения, позволяющая дополнительно подключить различные плагин/адаптеры, добавить действие/шаг или выполнить любое другое действие по настройке приложения.
     * Стоит указывать когда нужно задать дополнительные настройки бота.
     *
     * @example
     * ```ts
     * logic: (bot: Bot) => {
     *      bot.addCommand('my_command', ['my_slot'], cb); // Добавляем команду
     * }
     * ```
     * @param bot
     */
    logic?: (bot: Bot) => void;
    /**
     * Список плагинов, которые будут подключены к приложению.
     * Стоит использовать, когда необходимо подключить различные платформы, адаптеры для работы с базой данных и тд.
     * По умолчанию включает все доступные платформы, и для работы с базой данных, будет использоваться либо `FileAdapter`(для работы с файловой базой), либо `MongoAdapter`(для MongoDb базы).
     * Необходимый адаптер будет подключен в зависимости от настроек приложения. Если были указаны настройки для подключения к базе данных, то будет использоваться `MongoAdapter`, в противном случае `FileAdapter`
     */
    plugins?: TPlugin[];
}

/**
 * Инициализирует основные параметры бота
 * @param {Bot | BotTest} bot Экземпляр бота для инициализации
 * @param {IConfig} config Конфигурация приложения
 * @remarks
 * Устанавливает конфигурацию, параметры и контроллер для бота.
 * Этот метод должен вызываться перед запуском бота.
 */
function _initParam(bot: Bot | BotTest, config: IConfig): void {
    bot.setAppConfig(config.appConfig || {});
    if (config.appParam) {
        bot.setPlatformParams(config.appParam);
    }
    if (config.controller) {
        bot.initBotController(config.controller);
    }
    if (config.logic) {
        config.logic(bot);
    }
    if (config.plugins) {
        config.plugins.forEach((plugin) => {
            bot.use(plugin);
        });
    } else {
        const appContext = bot.getAppContext();
        if (!Object.keys(appContext.platforms).length) {
            bot.use(fullPlatforms);
        }
        if (!appContext.database.adapter) {
            if (appContext.appConfig.db) {
                bot.use(new MongoAdapter(appContext.appConfig.db));
            } else {
                bot.use(new FileAdapter());
            }
        }
    }
}

/**
 * Единая точка входа для запуска бота — «из коробки» без boilerplate-кода.
 *
 * ЗАЧЕМ ЭТО НУЖНО?
 * Вместо ручной инициализации (5-7 строк):
 * ```ts
 * const bot = new Bot();
 * bot.setAppConfig(config.appConfig || {});
 * bot.setPlatformParams(config.appParam);
 * bot.initBotController(config.controller);
 * bot.setAppMode('strict_prod');
 * bot.start(hostname, port);
 * ```
 *
 * Достаточно одного вызова:
 * ```ts
 * run(config, 'prod', '0.0.0.0', 8080);
 * ```
 *
 * КОГДА ИСПОЛЬЗОВАТЬ:
 * - Стандартные сценарии запуска (локальная разработка, тестирование, продакшн)
 * - Когда используется встроенный HTTP-сервер фреймворка(`node:http.Server`)
 *
 * КОГДА НЕ ИСПОЛЬЗОВАТЬ:
 * - Нужен кастомный HTTP-сервер (Express, Fastify)
 * - Требуется сложная логика инициализации (асинхронная загрузка конфига и т.п.)
 *
 * @param config — конфигурация бота (контроллер, параметры, плагины)
 * @param mode — режим работы ('dev' для консольных тестов, 'dev-online' для webhook-тестов, 'prod' для продакшна)
 * @param hostname — хост (по умолчанию 'localhost')
 * @param port — порт (по умолчанию 3000)
 * @returns В зависимости от режима: результат тестов (dev) или промис запуска сервера (dev-online/prod)
 *
 * @example
 * ```ts
 * // Запуск в режиме разработки
 * run({
 *   appConfig: { ... },
 *   appParam: { ... },
 *   controller: MyController,
 *   testParams: { ... }
 * }, 'dev');
 *
 * // Запуск в продакшн режиме
 * run({
 *   appConfig: { ... },
 *   appParam: { ... },
 *   controller: MyController
 * }, 'prod');
 * ```
 */
export function run(
    config: IConfig,
    mode: TMode = 'prod',
    hostname: string = 'localhost',
    port: number = 3000,
): Server | Promise<void> {
    let bot: BotTest | Bot;
    switch (mode) {
        case 'dev':
            bot = new BotTest();
            _initParam(bot, config);
            bot.setAppMode('dev');
            return (bot as BotTest).test(config.testParams);
        case 'dev-online':
            bot = new Bot();
            _initParam(bot, config);
            bot.setAppMode('dev');
            return bot.start(hostname, port);
        case 'prod':
            bot = new Bot();
            _initParam(bot, config);
            bot.setAppMode('strict_prod');
            return bot.start(hostname, port);
    }
}
