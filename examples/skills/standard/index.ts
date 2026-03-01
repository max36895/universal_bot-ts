import { BotTest } from '../../../src/test';
import { fullPlatforms, FileAdapter } from '../../../src/plugins';
import skillDefaultConfig from '../../config/skillDefaultConfig';
import skillDefaultParam from '../../config/skillDefaultParam';
import { StandardController } from './controller/StandardController';

const bot = new BotTest();
bot.use(fullPlatforms); // Подключаем все платформы
bot.use(new FileAdapter()); // Подключаем файловую базу данных
bot.setAppConfig(skillDefaultConfig()); // Передаем настройки приложения
bot.setPlatformParams(skillDefaultParam()); // Передаем настройки для платформ
bot.initBotController(StandardController); // Подключаем логику приложения
bot.test(); // Запускаем приложение
