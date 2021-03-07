/**
 * Created by u_bot
 * Date: {{date}}
 * Time: {{time}}
 */
import {Bot} from "ubot";
import {{name}}Config from "./config/{{name}}Config";
import {{name}}Params from "./config/{{name}}Params";
import {__className__Controller} from './controller/__className__Controller';

const bot = new Bot();
bot.initTypeInGet();
bot.initConfig({{name}}Config);
bot.initParams({{name}}Params);
bot.initBotController((new __className__Controller()));
module.exports = async (req, res) => {
    bot.start(req, res)
};
