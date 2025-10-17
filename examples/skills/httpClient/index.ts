import { BotTest } from '../../../src/test';
import skillDefaultConfig from '../../config/skillDefaultConfig';
import { StandardController } from './controller/StandardController';

const bot = new BotTest();
bot.initAppConfig(skillDefaultConfig());
const logic = new StandardController();
bot.initBotController(logic);

// Добавляем команду для обработки сохранения
bot.addCommand('save', ['сохрани', 'save'], () => {
    return 'Сохранил!';
});

const appContext = bot.getAppContext();
/**
 * Логируем каждый запрос к API
 */
appContext.httpClient = async (input, init) => {
    try {
        const res = await fetch(input, { ...init });
        console.log('Поступил запрос на: ', input);
        return res;
    } catch (e) {
        console.error(e);
        throw e;
    }
};

bot.test();
