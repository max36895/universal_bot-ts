import { BotTest } from '../../../src/test';
import skillDefaultConfig from '../../config/skillDefaultConfig';
import skillDefaultParam from '../../config/skillDefaultParam';
import { StandardController } from './controller/StandardController';

const bot = new BotTest();
bot.setAppConfig(skillDefaultConfig());
bot.setPlatformParams(skillDefaultParam());
bot.initBotController(StandardController);
bot.test();
