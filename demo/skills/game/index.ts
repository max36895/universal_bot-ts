/**
 * Универсальное приложение по созданию навыков и ботов.
 * @version 1.0
 * @author Maxim-M maximco36895@yandex.ru
 */
import {Bot} from "../../../src";
import skillGameConfig from "../../config/skillGameConfig";
import skillGameParam from "../../config/skillGameParam";
import {GameController} from "./controller/GameController";

const bot = new Bot();
bot.initConfig(skillGameConfig());
bot.initParams(skillGameParam());
const logic = new GameController();
bot.initBotController(logic);
// console.test
// const params: IBotTestParams = {
//     isShowResult: true,
//     isShowStorage: false,
//     isShowTime: true,
// }
// bot.test(params);
module.exports = async (req, res) => {
    bot.start(req, res)
};
