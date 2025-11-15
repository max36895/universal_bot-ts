import { Bot } from 'umbot';
import skillGameConfig from './config/skillGameConfig';
import skillGameParam from './config/skillGameParam';
import { GameController } from './controller/GameController';

const bot = new Bot();
bot.setAppConfig(skillGameConfig());
bot.setPlatformParams(skillGameParam());
bot.initBotControllerClass(GameController);
// console.test
// const params: IBotTestParams = {
//     isShowResult: true,
//     isShowStorage: false,
//     isShowTime: true,
// }
// bot.test(params);
bot.start('localhost', 3000);
