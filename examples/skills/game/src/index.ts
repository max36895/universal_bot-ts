import { Bot } from 'umbot';
import skillGameConfig from './config/skillGameConfig';
import skillGameParam from './config/skillGameParam';
import { GameController } from './controller/GameController';

const bot = new Bot();
bot.initAppConfig(skillGameConfig());
bot.initPlatformParams(skillGameParam());
const logic = new GameController();
bot.initBotController(logic);
// console.test
// const params: IBotTestParams = {
//     isShowResult: true,
//     isShowStorage: false,
//     isShowTime: true,
// }
// bot.test(params);
bot.start('localhost', 3000);
