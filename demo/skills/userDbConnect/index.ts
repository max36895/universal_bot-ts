import skillDefaultConfig from "../../config/skillDefaultConfig";
import skillDefaultParam from "../../config/skillDefaultParam";
import {StandardController} from "./controller/StandardController";
import {Bot, mmApp} from "../../../src/core";
import DbConnect from "./dbConnect/DbConnect";

const bot = new Bot();
bot.initConfig(skillDefaultConfig());
bot.initParams(skillDefaultParam());
const logic = new StandardController();
mmApp.userDbController = new DbConnect()
bot.initBotController(logic);
bot.test();

