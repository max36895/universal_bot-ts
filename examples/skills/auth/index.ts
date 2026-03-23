import { BotTest, IBotTestParams } from 'umbot/test';
import { fullPlatforms, FileAdapter } from 'umbot/plugins';
import skillStorageConfig from '../../config/skillStorageConfig';
import skillAuthParam from '../../config/skillAuthParam';
import { AuthController } from './controller/AuthController';

const bot = new BotTest();
bot.use(fullPlatforms);
bot.use(new FileAdapter());
bot.setAppConfig(skillStorageConfig());
bot.setPlatformParams(skillAuthParam());
bot.initBotController(AuthController);
/**
 * Отображаем ответ навыка и хранилище в консоли.
 */
const params: IBotTestParams = {
    isShowResult: true,
    isShowStorage: true,
    isShowTime: true,
};
bot.test(params);
