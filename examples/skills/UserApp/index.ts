import { BotTest, IBotTestParams } from 'umbot/test';
import skillStorageConfig from '../../config/skillStorageConfig';
import skillDefaultParam from '../../config/skillDefaultParam';
import { UserAppController } from './controller/UserAppController';
import { UserAdapter } from './UserTemplate/Adapter/UserAdapter';

const bot = new BotTest();
bot.use(new UserAdapter()); // Подключаем пользовательский адаптер для платформы
bot.setAppConfig(skillStorageConfig());
bot.setPlatformParams(skillDefaultParam());
bot.initBotController(UserAppController);

// bot.run();
/**
 * Отображаем ответ навыка и хранилище в консоли.
 */
const params: IBotTestParams = {
    isShowResult: true,
    isShowStorage: false,
    isShowTime: true,
};
bot.test(params);
