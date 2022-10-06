/**
 * Created by umbot
 * Date: {{date}}
 * Time: {{time}}
 */
import {mmApp} from 'umbot';
import {BotTest} from 'umbot/test';
import {{name}}Config from './config/{{name}}Config';
import {{name}}Params from './config/{{name}}Params';
import {__className__Controller} from './controller/__className__Controller';

const bot = new BotTest();
bot.initConfig({{name}}Config);
bot.initParams({{name}}Params);
bot.initBotController((new __className__Controller()));
mmApp.setDevMode(true);
bot.test();
