import { BotTest, IBotTestParams } from '../../../src/test';
import { fullPlatforms } from '../../../src/plugins';
import skillStorageConfig from '../../config/skillStorageConfig';
import skillDefaultParam from '../../config/skillDefaultParam';
import { LocalStorageController } from './controller/LocalStorageController';

const bot = new BotTest();
bot.use(fullPlatforms);
bot.setAppConfig(skillStorageConfig());
bot.setPlatformParams(skillDefaultParam());
bot.initBotController(LocalStorageController);
/**
 * Отображаем ответ навыка и хранилище в консоли.
 */
const params: IBotTestParams = {
    isShowResult: true,
    isShowStorage: true,
    isShowTime: true,
};
bot.test(params);
