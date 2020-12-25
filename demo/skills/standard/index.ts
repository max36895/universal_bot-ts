/**
 * Универсальное приложение по созданию навыков и ботов.
 * @version 1.0
 * @author Maxim-M maximco36895@yandex.ru
 */
import {Bot} from "../../../src/core/Bot";
import skillDefaultConfig from "../../config/skillDefaultConfig";
import skillDefaultParam from "../../config/skillDefaultParam";
import {StandardController} from "./controller/StandardController";

const bot = new Bot();
bot.initConfig(skillDefaultConfig());
bot.initParams(skillDefaultParam());
const logic = new StandardController();
bot.initBotController(logic);
bot.test();

