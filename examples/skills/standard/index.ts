import { BotTest } from '../../../src/test';
import skillDefaultConfig from '../../config/skillDefaultConfig';
import skillDefaultParam from '../../config/skillDefaultParam';
import { StandardController } from './controller/StandardController';

const bot = new BotTest();
bot.initAppConfig(skillDefaultConfig());
bot.initPlatformParams(skillDefaultParam());
const logic = new StandardController();
bot.initBotController(logic);
bot.test();
