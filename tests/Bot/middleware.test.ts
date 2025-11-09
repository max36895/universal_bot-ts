import { Bot, IAlisaWebhookResponse, T_ALISA } from '../../src';

function getContent(query: string, count = 0): string {
    return JSON.stringify({
        meta: {
            locale: 'ru-Ru',
            timezone: 'UTC',
            client_id: 'local',
            interfaces: {
                payments: null,
                account_linking: null,
                screen: true,
            },
        },
        session: {
            message_id: count,
            session_id: 'local',
            skill_id: 'local_test',
            user_id: 'test',
            new: count === 0,
        },
        request: {
            command: query.toLowerCase(),
            original_utterance: query,
            nlu: {},
            type: 'SimpleUtterance',
        },
        state: {
            session: {},
        },
        version: '1.0',
    });
}

describe('Middleware', () => {
    let bot: Bot;

    beforeEach(() => {
        bot = new Bot();
    });

    it('should call global middleware', async () => {
        const spy = jest.fn();
        bot.use(async (_, next) => {
            spy();
            await next();
        });

        bot.setContent(getContent('test'));
        await bot.run();

        expect(spy).toHaveBeenCalled();
    });

    it('should call platform-specific middleware', async () => {
        const spy = jest.fn();
        bot.use(T_ALISA, async (_, next) => {
            spy();
            await next();
        });

        bot.setContent(getContent('test'));
        await bot.run();

        expect(spy).toHaveBeenCalled();
    });

    it('should not call middleware for other platforms', async () => {
        const spy = jest.fn();
        bot.use('telegram', spy);

        bot.setContent(getContent('test'));
        await bot.run();

        expect(spy).not.toHaveBeenCalled();
    });

    it('should skip BotController.action() if next() is not called', async () => {
        bot.use((ctx, _) => {
            ctx.text = 'Прервано middleware';
            ctx.isEnd = true;
            // next() не вызывается
        });

        bot.setContent(getContent('test'));
        const result = (await bot.run()) as IAlisaWebhookResponse;

        expect(result.response?.text).toBe('Прервано middleware');
    });

    it('should execute middlewares in order', async () => {
        const order: number[] = [];
        bot.use(async (_, next) => {
            order.push(1);
            await next();
            order.push(4);
        });
        bot.use(T_ALISA, async (_, next) => {
            order.push(2);
            await next();
            order.push(3);
        });

        bot.setContent(getContent('test'));
        await bot.run();

        expect(order).toEqual([1, 2, 3, 4]);
    });
});
