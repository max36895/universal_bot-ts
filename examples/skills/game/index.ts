// BotTest наследует Bot, поэтому пример работает и как HTTP-сервер,
// и в интерактивном консольном режиме (закомментированный блок в конце файла)
import { BotTest, IBotTestParams } from 'umbot/test';
import { fullPlatforms, FileAdapter } from 'umbot/plugins'; // Подключаем все необходимые адаптеры
import skillGameConfig from './config/skillGameConfig';
import skillGameParam from './config/skillGameParam';
import { GameController } from './controller/GameController'; // Подключаем контроллер с логикой приложения

const bot = new BotTest(); // Создаем класс с приложением
bot.use(fullPlatforms); // Подключаем все доступные платформы
bot.use(new FileAdapter()); // Подключаем файловую базу данных
bot.setAppConfig(skillGameConfig());
bot.setPlatformParams(skillGameParam());
bot.initBotController(GameController); // Подключаем контроллер для работы приложения
// Для запуска приложения в консоли закомментируйте bot.start() ниже
// и раскомментируйте этот блок:
// const params: IBotTestParams = {
//     isShowResult: true,
//     isShowStorage: false,
//     isShowTime: true,
// };
// bot.test(params);
bot.start('localhost', 3000); // Запускаем приложение
