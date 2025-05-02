import { BotTest, IBotTestParams } from '../../../src/test';
import skillStorageConfig from '../../config/skillStorageConfig';
import skillDefaultParam from '../../config/skillDefaultParam';
import { LocalStorageController } from './controller/LocalStorageController';

const bot = new BotTest();
bot.initConfig(skillStorageConfig());
bot.initParams(skillDefaultParam());
const logic = new LocalStorageController();
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
