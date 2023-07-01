import {Bot} from '../../../src';
import skillGameConfig from '../../config/skillGameConfig';
import skillGameParam from '../../config/skillGameParam';
import {GameController} from './controller/GameController';
import {IncomingMessage, ServerResponse} from 'http';

const bot = new Bot();
bot.initConfig(skillGameConfig());
bot.initParams(skillGameParam());
const logic = new GameController();
bot.initBotController(logic);
// console.test
// const params: IBotTestParams = {
//     isShowResult: true,
//     isShowStorage: false,
//     isShowTime: true,
// }
// bot.test(params);
module.exports = async (req: IncomingMessage, res: ServerResponse) => {
    bot.startOld(req, res)
};
