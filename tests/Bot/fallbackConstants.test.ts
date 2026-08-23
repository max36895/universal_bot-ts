/**
 * Регресс-тест на баг циклической зависимости core ↔ controller.
 *
 * Суть бага: баррель `core/index.ts` реэкспортирует `Bot` раньше, чем константы
 * (`FALLBACK_COMMAND`, `WELCOME_INTENT_NAME`, `HELP_INTENT_NAME`). При загрузке
 * `Bot.ts` → `controller/BotController.ts` → `import from '../core'` баррель ещё
 * не доинициализирован, и константы оказывались `undefined`. `BotController`
 * захватывал их в модуль-левел `const`, из-за чего fallback, welcome и help
 * молча не работали при стандартном импорте `from 'umbot'`.
 *
 * ВАЖНО: этот файл намеренно импортирует из корневого `'../../src'` ПЕРВЫМ —
 * именно такой порядок загрузки у реального пользователя. Если снова появится
 * захват `undefined` из недоинициализированного барреля, тест упадёт.
 */
import { Bot, FALLBACK_COMMAND, BaseBotController } from '../../src';
import { AlisaAdapter, T_ALISA, IAlisaWebhookResponse } from '../../src/plugins';

function getContent(query: string, count = 0): string {
    return JSON.stringify({
        meta: {
            locale: 'ru-Ru',
            timezone: 'UTC',
            client_id: 'test',
            interfaces: { screen: true },
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
        state: { session: {} },
        version: '1.0',
    });
}

describe('Константы fallback/welcome/help при импорте из корня', () => {
    let bot: Bot;

    beforeEach(() => {
        bot = new Bot();
        bot.setLogger({ error: () => {}, warn: () => {} });
        bot.use(new AlisaAdapter());
        bot.initBotController(BaseBotController);
    });

    afterEach(() => {
        bot.close();
        bot.clearCommands();
    });

    it('FALLBACK_COMMAND равен "*" (не undefined из-за цикла)', () => {
        expect(FALLBACK_COMMAND).toBe('*');
    });

    it('fallback-команда срабатывает на нераспознанный ввод', async () => {
        bot.addCommand('hello', ['привет'], (_, ctx) => {
            ctx.text = 'HI';
        });
        bot.addCommand(FALLBACK_COMMAND, [], (_, ctx) => {
            ctx.text = 'MY_FALLBACK_HANDLER';
        });

        // count=5 → не новая сессия, пустая команда → должен сработать fallback
        const res = (await bot.run(T_ALISA, getContent('абракадабра', 5))) as IAlisaWebhookResponse;
        expect(res.response?.text).toBe('MY_FALLBACK_HANDLER');
    });

    it('welcome_text из platformParams срабатывает на новой сессии', async () => {
        bot.setPlatformParams({ welcome_text: 'MY_WELCOME' });
        // НЕ регистрируем fallback — проверяем чистый welcome из конфига

        // count=0 → новая сессия → должен сработать welcome
        const res = (await bot.run(T_ALISA, getContent('', 0))) as IAlisaWebhookResponse;
        expect(res.response?.text).toBe('MY_WELCOME');
    });

    it('help_text из platformParams срабатывает на команде "помощь"', async () => {
        bot.setPlatformParams({ help_text: 'MY_HELP' });

        const res = (await bot.run(T_ALISA, getContent('помощь', 5))) as IAlisaWebhookResponse;
        expect(res.response?.text).toBe('MY_HELP');
    });

    it('обычная команда продолжает работать', async () => {
        bot.addCommand('hello', ['привет'], (_, ctx) => {
            ctx.text = 'HI';
        });

        const res = (await bot.run(T_ALISA, getContent('привет', 5))) as IAlisaWebhookResponse;
        expect(res.response?.text).toBe('HI');
    });
});
