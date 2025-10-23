import { BotTest, IBotTestParams } from '../../../src/test';
import skillStorageConfig from '../../config/skillStorageConfig';
import skillDefaultParam from '../../config/skillDefaultParam';
import { UserAppController } from './controller/UserAppController';
import { UserApp } from './UserTemplate/Controller/UserApp';
import userDataConfig from './UserTemplate/userDataConfig';

const bot = new BotTest();
bot.setAppConfig(skillStorageConfig());
bot.setPlatformParams(skillDefaultParam());
const logic = new UserAppController();
bot.initBotController(logic);

const userApp = new UserApp(bot.getAppContext());
//bot.run(userApp);
/**
 * Отображаем ответ навыка и хранилище в консоли.
 */
const params: IBotTestParams = {
    isShowResult: true,
    isShowStorage: false,
    isShowTime: true,
    userBotClass: userApp,
    userBotConfig: userDataConfig,
};
bot.test(params);
