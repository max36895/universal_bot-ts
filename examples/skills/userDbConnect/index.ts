import skillDefaultConfig from '../../config/skillDefaultConfig';
import skillDefaultParam from '../../config/skillDefaultParam';
import { StandardController } from './controller/StandardController';
import { BotTest } from 'umbot/test';
import DBAdapter from './dbConnect/DBAdapter';
import { AlisaAdapter } from 'umbot/plugins';

const bot = new BotTest();
bot.use(new AlisaAdapter());
bot.use(new DBAdapter());
bot.setAppConfig(skillDefaultConfig());
bot.setPlatformParams(skillDefaultParam());
bot.initBotController(StandardController);
bot.test();
