import { Bot } from '../../src';
import { BotController } from '../../src/controller';
import { T_ALISA, AlisaAdapter, FileAdapter } from '../../src/plugins';
import { IAlisaWebhookResponse } from '../../src/plugins/platforms/Alisa/interfaces/IAlisaPlatform';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function getContent(query: string, count = 0): string {
    return JSON.stringify({
        meta: {
            locale: 'ru-Ru',
            timezone: 'UTC',
            client_id: 'yandex.searchplugin_local',
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

    beforeAll(() => {
        bot = new Bot();
        // Дефолтные пути записи (json/, logs/) указывают в cwd — в корень
        // репозитория. Перенаправляем во временную папку, чтобы прогон тестов
        // не оставлял артефактов в репо (UsersData.json и пр.).
        bot.setAppConfig({
            json: mkdtempSync(join(tmpdir(), 'umbot-test-middleware-')),
        });
        bot.setLogger({
            error: () => {},
            warn: () => {},
        });
        bot.use(new AlisaAdapter());
        bot.use(new FileAdapter());
    });
    beforeEach(() => {
        bot.use(new AlisaAdapter());
    });
    afterEach(() => {
        bot.clearSteps();
        bot.clearCommands();
        bot.clearUse();
    });
    afterAll(async () => {
        // close() флашит таблицы FileAdapter в json/: без await rmSync удалит
        // папку раньше, чем асинхронная запись пересоздаст её с файлами.
        await bot.close();
        rmSync(bot.getAppContext().appConfig.json, { recursive: true, force: true });
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
        const actionSpy = jest.fn();
        bot.initBotController(
            class extends BotController {
                action(): void {
                    actionSpy();
                }
            },
        );
        bot.use((ctx, _) => {
            ctx.text = 'Прервано middleware';
            ctx.isEnd = true;
            // next() не вызывается
        });

        bot.setContent(getContent('test'));
        const result = (await bot.run()) as IAlisaWebhookResponse;

        // action() не выполняется — middleware прервал цепочку
        expect(actionSpy).not.toHaveBeenCalled();
        // Текст, выставленный middleware, доставляется пользователю через адаптер платформы
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
        expect(order).toEqual([1, 4, 2, 3]);
    });
});
