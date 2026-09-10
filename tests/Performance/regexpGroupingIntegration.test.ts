/**
 * Интеграционные тесты группировки all-RegExp-слотов через полный цикл
 * Bot.run на Алисе: её ответ возвращает text из контроллера напрямую,
 * поэтому видно, КАКАЯ команда сработала.
 */
import { Bot, BotController } from '../../src';
import { AlisaAdapter } from '../../src/plugins';

class Controller extends BotController {
    action(): void {
        this.skipAutoReply = false;
    }
}

function alisaUpdate(text: string): object {
    return {
        request: {
            command: text,
            original_utterance: text,
            type: 'SimpleUtterance',
            nlu: { tokens: [], entities: [] },
        },
        session: {
            message_id: 0,
            session_id: 's',
            user_id: 'u1',
            skill_id: 'sk1',
            new: true,
        },
        state: { user: {} },
        version: '1.0',
    };
}

function makeBot(cmds: number): Bot {
    const bot = new Bot('alisa');
    bot.setLogger({ error: () => {}, warn: () => {}, log: () => {}, maskSecrets: false });
    bot.use(new AlisaAdapter());
    bot.setAppConfig({ isLocalStorage: false });
    bot.initBotController(Controller);
    for (let i = 0; i < cmds; i++) {
        bot.addCommand(`cmd_${i}`, [new RegExp(`^zz_cmd_${i}_\\d+$`)], (_text, ctrl) => {
            ctrl.text = `cmd_${i}`;
        });
    }
    return bot;
}

describe('Группировка all-RegExp: интеграция через Bot.run на Алисе (320 команд)', () => {
    it('середина списка срабатывает через группу (без линейного скана)', async () => {
        const bot = makeBot(320);
        const res = (await bot.run('alisa', alisaUpdate('zz_cmd_160_777'))) as {
            response?: { text?: string };
        };
        expect(res.response?.text).toBe('cmd_160');
    });

    it('первый и последний член группы срабатывают', async () => {
        const bot = makeBot(320);
        const first = (await bot.run('alisa', alisaUpdate('zz_cmd_0_1'))) as {
            response?: { text?: string };
        };
        expect(first.response?.text).toBe('cmd_0');
        const last = (await bot.run('alisa', alisaUpdate('zz_cmd_319_42'))) as {
            response?: { text?: string };
        };
        expect(last.response?.text).toBe('cmd_319');
    });

    it('приоритет: первая зарегистрированная совпавшая команда выигрывает', async () => {
        const bot = makeBot(320);
        // Шаблоны перекрываются: cmd_5 также матчит zz_cmd_150_1? Нет — якоря
        // ^zz_cmd_5_\d+$ исключают пересечение. Проверяем частичный перекос:
        // отдельная команда с широким шаблоном, зарегистрированная ПОСЛЕ группы,
        // не должна перехватывать точный матч члена группы (скан идёт по списку).
        bot.addCommand('wide', [/^zz_cmd_1\d\d_\d+$/], (_t, ctrl) => {
            ctrl.text = 'wide';
        });
        const mid = (await bot.run('alisa', alisaUpdate('zz_cmd_160_777'))) as {
            response?: { text?: string };
        };
        // cmd_160 зарегистрирован раньше wide — приоритет сохранён
        expect(mid.response?.text).toBe('cmd_160');
    });
});
