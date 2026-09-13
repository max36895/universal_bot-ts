import { BotTest } from 'umbot/test';
import { createCoffeeBot } from './index';

/**
 * Консольный режим разработки: не нужны ни токены, ни сеть.
 * После запуска вводите команды прямо в терминале, выход — «exit».
 *
 * Запуск: `npm run dev`.
 */
const bot = createCoffeeBot(new BotTest());

void bot.test({
    isShowResult: true, // Полный JSON-ответ платформы (кнопки, карточки)
    isShowStorage: true, // userData и state после каждого хода
    isShowTime: true, // Время обработки запроса
});
