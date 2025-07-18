import { BotTest, IBotTestParams } from '../../../src/test';
import skillStorageConfig from '../../config/skillStorageConfig';
import skillAuthParam from '../../config/skillAuthParam';
import { AuthController } from './controller/AuthController';

const bot = new BotTest();
bot.initConfig(skillStorageConfig());
bot.initParams(skillAuthParam());
const logic = new AuthController();
bot.initBotController(logic);
/**
 * Отображаем ответ навыка и хранилище в консоли.
 */
const params: IBotTestParams = {
    isShowResult: true,
    isShowStorage: true,
    isShowTime: true,
};
bot.test(params);
