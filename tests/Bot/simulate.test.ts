import { BotTest } from '../../src/test';
import {
    AlisaAdapter,
    T_ALISA,
    T_TELEGRAM,
    TelegramAdapter,
    TelegramRequest,
} from '../../src/plugins';

describe('BotTest.simulate', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('вызывает run с корректно сгенерированным запросом', async () => {
        const bot = new BotTest();
        bot.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        bot.use(new AlisaAdapter());
        bot.addCommand('hello', ['привет'], (_, ctx) => {
            ctx.text = 'Привет!';
        });

        const res = (await bot.simulate('привет', { platform: T_ALISA })) as {
            response: { text: string };
        };
        expect(res.response.text).toBe('Привет!');
    });

    it('бросает ошибку если платформа не зарегистрирована', async () => {
        const bot = new BotTest();
        bot.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        await expect(bot.simulate('hi', { platform: 'telegram' })).rejects.toThrow(
            'не зарегистрирована',
        );
    });

    it('без явной платформы берёт первую зарегистрированную при appType=auto', async () => {
        const bot = new BotTest();
        bot.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        bot.use(new AlisaAdapter());
        bot.addCommand('hello', ['привет'], (_, ctx) => {
            ctx.text = 'Привет без платформы!';
        });

        // appType по умолчанию — 'auto', платформа не указана
        const res = (await bot.simulate('привет')) as { response: { text: string } };
        expect(res.response.text).toBe('Привет без платформы!');
    });

    it('для чат-платформ не отправляет сообщение в реальное API', async () => {
        // Без skipAutoReply адаптер Telegram внутри getContent() уходил бы
        // в реальный Telegram API прямо из локального теста.
        const call = jest.spyOn(TelegramRequest.prototype, 'call').mockResolvedValue(null);
        const bot = new BotTest();
        bot.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        bot.use(new TelegramAdapter('test-token'));
        bot.addCommand('hello', ['привет'], (_, ctx) => {
            ctx.text = 'Привет!';
        });

        const res = await bot.simulate('привет', { platform: T_TELEGRAM });

        expect(call).not.toHaveBeenCalled();
        expect(res).toBe('ok');
        // Текст ответа при пропущенной отправке остаётся в контроллере
        expect(bot.getBotController()?.text).toBe('Привет!');
        // После simulate флаг возвращается в исходное состояние
        expect(bot.getBotController()?.skipAutoReply).toBe(false);
    });
});
