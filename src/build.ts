import { BotTest, IBotTestParams } from "./core/BotTest";
import { IAppConfig, IAppParam, mmApp } from "./mmApp";
import { BotController } from "./controller";
import { Bot } from "./core";
import { IncomingMessage, ServerResponse } from "http";

/**
 * Набор методов, упрощающих запуск приложения
 * @module build
 */

/**
 * Режим работы приложения. Принимает одно из 2 значений
 * - dev Запуск в режиме тестирования, с использованием консоли, в качестве тестового окружения.
 * - dev-online Запуск в режиме тестирования, с использованием webhook, в качестве тестового окружения.
 * - prod Запуск в релизном режиме
 * - dev-online-old Запуск в режиме тестирования, с использованием webhook, в качестве тестового окружения в старом режиме.
 * - prod-old Запуск в релизном режиме в старом режиме
 */
export type TMode = 'dev' | 'dev-online' | 'prod' | 'dev-online-old' | 'prod-old';

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

function _initParam(bot: Bot | BotTest, config: IConfig): void {
    bot.initConfig(config.appConfig);
    bot.initParams(config.appParam);
    bot.initBotController(config.controller);
}

/**
 * Запуск приложения
 * @param {IConfig} config Конфигурация приложения
 * @param {TMode} mode Режим работы приложения
 */
export function run(config: IConfig, mode: TMode = 'prod', hostname: string = 'localhost', port: number = 3000): unknown {
    let bot: BotTest | Bot;
    switch (mode) {
        case "dev":
            bot = new BotTest();
            _initParam(bot, config);
            mmApp.setDevMode(true);
            return (bot as BotTest).test(config.testParams);
        case "dev-online":
            bot = new Bot();
            bot.initTypeInGet();
            _initParam(bot, config);
            mmApp.setDevMode(true);
            return bot.start(hostname, port);
        case "prod":
            bot = new Bot();
            bot.initTypeInGet();
            _initParam(bot, config);
            return bot.start(hostname, port);
        case "dev-online-old":
            bot = new Bot();
            bot.initTypeInGet();
            _initParam(bot, config);
            mmApp.setDevMode(true);
            module.exports = async (req: IncomingMessage, res: ServerResponse) => {
                bot.startOld(req, res)
            };
            return module;
        case "prod-old":
            bot = new Bot();
            bot.initTypeInGet();
            _initParam(bot, config);
            module.exports = async (req: IncomingMessage, res: ServerResponse) => {
                bot.startOld(req, res)
            };
            return module;
    }
}
