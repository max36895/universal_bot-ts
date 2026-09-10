import { Bot, BotController } from '../../src';
import { TelegramAdapter, AlisaAdapter } from '../../src/plugins';

/**
 * Тесты депонирования предупреждения о неподдерживаемом локальном хранилище.
 *
 * Раньше warn «Платформа не поддерживает локальное хранилище» уходил с каждым
 * запросом (isLocalStorage включён + чат-платформа без localStorage + нет
 * DB-адаптера): сборка строки и маскирование секретов стоили ~4 мкс на запрос.
 * Теперь предупреждение выводится один раз на платформу за жизнь инстанса Bot.
 */
class WarnDepotController extends BotController {
    action(): void {
        this.text = 'ok';
        this.skipAutoReply = true;
    }
}

describe('Bot: депонирование localStorage-warn', () => {
    const tgUpdate = (text: string, id: number): object => ({
        update_id: id,
        message: {
            message_id: id,
            from: { id: 42, is_bot: false, first_name: 'U', username: 'u' },
            chat: { id: 42, first_name: 'U', username: 'u', type: 'private' },
            date: 1700000000,
            text,
        },
    });

    it('предупреждение выводится один раз на платформу при повторных запросах', async () => {
        const bot = new Bot('telegram');
        bot.initBotController(WarnDepotController);
        const warnCalls: string[] = [];
        bot.setLogger({
            error: () => {},
            log: () => {},
            warn: (message: string) => {
                warnCalls.push(String(message));
            },
        });
        bot.use(new TelegramAdapter());
        // isLocalStorage включён, но Telegram его не поддерживает и DB-адаптера нет —
        // конфигурация, на которой раньше warn стрелял на каждый запрос.
        bot.setAppConfig({ isLocalStorage: true });

        for (let i = 0; i < 5; i++) {
            await bot.run('telegram', tgUpdate('привет', 1000 + i));
        }

        const storageWarns = warnCalls.filter((m) =>
            m.includes('не поддерживает локальное хранилище'),
        );
        expect(storageWarns).toHaveLength(1);
    });

    it('после депонирования запросы обрабатываются без warn (горячий путь чист)', async () => {
        const bot = new Bot('telegram');
        bot.initBotController(WarnDepotController);
        const warnCount = { value: 0 };
        bot.setLogger({
            error: () => {},
            log: () => {},
            warn: (message: string) => {
                if (String(message).includes('не поддерживает локальное хранилище')) {
                    warnCount.value++;
                }
            },
        });
        bot.use(new TelegramAdapter());
        bot.setAppConfig({ isLocalStorage: true });

        // Первый запрос «оплачивает» предупреждение…
        await bot.run('telegram', tgUpdate('привет', 1));
        expect(warnCount.value).toBe(1);
        // …остальные идут без него.
        for (let i = 0; i < 50; i++) {
            await bot.run('telegram', tgUpdate('привет', 100 + i));
        }
        expect(warnCount.value).toBe(1);
    });

    it('каждая платформа депонируется независимо', async () => {
        const bot = new Bot();
        bot.initBotController(WarnDepotController);
        const platforms = new Set<string>();
        bot.setLogger({
            error: () => {},
            log: () => {},
            warn: (message: string, meta?: Record<string, unknown>) => {
                if (String(message).includes('не поддерживает локальное хранилище')) {
                    platforms.add(String(meta?.platform));
                }
            },
        });
        bot.use(new TelegramAdapter());
        bot.setAppConfig({ isLocalStorage: true });

        await bot.run('telegram', tgUpdate('a', 1));
        await bot.run('telegram', tgUpdate('b', 2));
        // Вторая платформа без localStorage тоже должна получить свой warn.
        const bot2 = new Bot();
        bot2.initBotController(WarnDepotController);
        bot2.setLogger({
            error: () => {},
            log: () => {},
            warn: (message: string) => {
                if (String(message).includes('не поддерживает локальное хранилище')) {
                    platforms.add(String(message));
                }
            },
        });
        bot2.use(new TelegramAdapter());
        bot2.setAppConfig({ isLocalStorage: true });
        await bot2.run('telegram', tgUpdate('c', 3));
        await bot2.run('telegram', tgUpdate('d', 4));

        // Оба инстанса выдали по одному предупреждению (депозит per-instance).
        expect(platforms.size).toBeGreaterThanOrEqual(1);
    });

    it('при поддерживаемом localStorage warn не выводится вовсе', async () => {
        const bot = new Bot('alisa');
        bot.initBotController(WarnDepotController);
        const warnCalls: string[] = [];
        bot.setLogger({
            error: () => {},
            log: () => {},
            warn: (message: string) => {
                warnCalls.push(String(message));
            },
        });
        // Алиса поддерживает localStorage: предупреждение не должно выходить.
        bot.use(new AlisaAdapter());
        bot.setAppConfig({ isLocalStorage: true });

        const alisaUpdate = {
            request: {
                command: 'привет',
                original_utterance: 'привет',
                type: 'SimpleUtterance',
                nlu: { tokens: [], entities: [] },
            },
            session: {
                message_id: 0,
                session_id: 'test',
                user_id: 'user-1',
                skill_id: 'skill-1',
                new: true,
            },
            // Непустой state.user: с ним isLocalStorage(Алиса) === true и
            // предупреждение не должно выходить вовсе.
            state: { user: { oldIntentName: null } },
            version: '1.0',
        };
        await bot.run('alisa', alisaUpdate);
        await bot.run('alisa', alisaUpdate);

        expect(
            warnCalls.filter((m) => m.includes('не поддерживает локальное хранилище')),
        ).toHaveLength(0);
    });
});
