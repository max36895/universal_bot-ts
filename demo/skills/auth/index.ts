/**
 * Универсальное приложение по созданию навыков и ботов.
 * @version 1.0
 * @author Maxim-M maximco36895@yandex.ru
 */


import {Bot, IBotTestParams} from "../../../src/core/Bot";
import skillStorageConfig from "../../config/skillStorageConfig";
import skillAuthParam from "../../config/skillAuthParam";
import {AuthController} from "./controller/AuthController";

const bot = new Bot();
bot.initConfig(skillStorageConfig());
bot.initParams(skillAuthParam());
const logic = new AuthController();
bot.initBotController(logic);
/**
 * Отображаем ответ навыка и хранилище в консоли.
 */
const params: IBotTestParams = {
    isShowResult: true,
    isShowStorage: true,
    isShowTime: true,
};
bot.test(params);
