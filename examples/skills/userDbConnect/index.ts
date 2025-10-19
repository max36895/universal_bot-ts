import skillDefaultConfig from '../../config/skillDefaultConfig';
import skillDefaultParam from '../../config/skillDefaultParam';
import { StandardController } from './controller/StandardController';
import { BotTest } from '../../../src/test';
import DbConnect from './dbConnect/DbConnect';

const bot = new BotTest();
bot.initAppConfig(skillDefaultConfig());
bot.initPlatformParams(skillDefaultParam());
const logic = new StandardController();
bot.setUserDbController(new DbConnect());
bot.initBotController(logic);
bot.test();
