import { BotTest } from '../../src/test';
import { AlisaAdapter, T_ALISA } from '../../src/plugins';

describe('BotTest.simulate', () => {
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
});
