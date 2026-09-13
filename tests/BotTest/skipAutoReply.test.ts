import { BotController } from '../../src';
import { BotTest } from '../../src/core/BotTest';
import { T_TELEGRAM, TelegramAdapter, TelegramRequest } from '../../src/plugins';
import { stdin } from '../../src/utils/standard/util';

jest.mock('../../src/utils/standard/util', () => ({
    ...jest.requireActual('../../src/utils/standard/util'),
    stdin: jest.fn(),
}));

class TestController extends BotController {
    action(): void {
        this.text = 'Ответ';
    }
}

describe('BotTest: консольное тестирование не ходит в API платформы', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('держит skipAutoReply включённым на всех ходах диалога', async () => {
        // clearStoreData() в конце каждой итерации сбрасывает skipAutoReply в false,
        // поэтому со второго ввода адаптер уходил в реальный Telegram API прямо
        // из локального теста. Флаг должен переустанавливаться на каждом ходе.
        const call = jest.spyOn(TelegramRequest.prototype, 'call').mockResolvedValue(null);

        // Фиксируем состояние флага на момент формирования ответа каждого хода.
        const flagPerTurn: boolean[] = [];
        const originalGetContent = TelegramAdapter.prototype.getContent;
        jest.spyOn(TelegramAdapter.prototype, 'getContent').mockImplementation(function (
            this: TelegramAdapter,
            controller,
        ) {
            flagPerTurn.push(controller.skipAutoReply);
            return originalGetContent.call(this, controller);
        });

        const answers = ['второй запрос', 'третий запрос', 'exit'];
        (stdin as jest.Mock).mockImplementation(() => Promise.resolve(answers.shift() as string));
        jest.spyOn(console, 'log').mockImplementation(() => {});

        const bot = new BotTest(T_TELEGRAM);
        bot.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        bot.initBotController(TestController);
        bot.use(new TelegramAdapter('test-token'));

        await bot.test({ isShowTime: false });

        expect(call).not.toHaveBeenCalled();
        expect(flagPerTurn).toEqual([true, true, true]);
        await bot.close();
    });
});
