import skillDefaultConfig from '../../config/skillDefaultConfig';
import skillDefaultParam from '../../config/skillDefaultParam';
import { StandardController } from './controller/StandardController';
import { BotTest } from '../../../src/test';
import DbConnect from './dbConnect/DbConnect';

const bot = new BotTest();
bot.setAppConfig(skillDefaultConfig());
bot.setPlatformParams(skillDefaultParam());
bot.setUserDbController(new DbConnect());
bot.initBotControllerClass(StandardController);
bot.test();
