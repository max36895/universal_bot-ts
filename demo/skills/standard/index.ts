import {BotTest} from "../../../src/test";
import skillDefaultConfig from "../../config/skillDefaultConfig";
import skillDefaultParam from "../../config/skillDefaultParam";
import {StandardController} from "./controller/StandardController";

const bot = new BotTest();
bot.initConfig(skillDefaultConfig());
bot.initParams(skillDefaultParam());
const logic = new StandardController();
bot.initBotController(logic);
bot.test();

