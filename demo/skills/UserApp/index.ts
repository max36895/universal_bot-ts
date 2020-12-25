/**
 * Универсальное приложение по созданию навыков и ботов.
 * @version 1.0
 * @author Maxim-M maximco36895@yandex.ru
 */

import {Bot, IBotTestParams} from "../../../src/core/Bot";
import skillStorageConfig from "../../config/skillStorageConfig";
import skillDefaultParam from "../../config/skillDefaultParam";
import {UserAppController} from "./controller/UserAppController";
import {UserApp} from "./UserTemplate/Controller/UserApp";
import userDataConfig from "./UserTemplate/userDataConfig";

const bot = new Bot();
bot.initConfig(skillStorageConfig());
bot.initParams(skillDefaultParam());
const logic = new UserAppController();
bot.initBotController(logic);

const userApp = new UserApp();
//bot.run(userApp);
/**
 * Отображаем ответ навыка и хранилище в консоли.
 */
const params: IBotTestParams = {
    isShowResult: true,
    isShowStorage: false,
    isShowTime: true,
    userBotClass: userApp,
    userBotConfig: userDataConfig
};
bot.test(params);
