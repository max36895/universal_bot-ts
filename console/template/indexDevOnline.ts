/**
 * Created by umbot
 * Date: {{date}}
 * Time: {{time}}
 */
import {Bot, mmApp} from 'umbot';
import {{name}}Config from './config/{{name}}Config';
import {{name}}Params from './config/{{name}}Params';
import {__className__Controller} from './controller/__className__Controller';
import {IncomingMessage, ServerResponse} from 'http';

const bot = new Bot();
bot.initTypeInGet();
bot.initConfig({{name}}Config);
bot.initParams({{name}}Params);
bot.initBotController((new __className__Controller()));
mmApp.setDevMode(true);
module.exports = async (req: IncomingMessage, res: ServerResponse) => {
    bot.start(req, res)
};
