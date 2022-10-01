import skillDefaultConfig from '../../config/skillDefaultConfig';
import skillDefaultParam from '../../config/skillDefaultParam';
import {StandardController} from './controller/StandardController';
import {mmApp} from '../../../src/mmApp';
import {BotTest} from '../../../src/test';
import DbConnect from './dbConnect/DbConnect';

const bot = new BotTest();
bot.initConfig(skillDefaultConfig());
bot.initParams(skillDefaultParam());
const logic = new StandardController();
mmApp.userDbController = new DbConnect()
bot.initBotController(logic);
bot.test();

