import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BotController, UsersData } from 'umbot';
import { BotTest } from 'umbot/test';
import { createCoffeeBot } from '../src/index';
import { ICoffeeUserData } from '../src/types/ICoffeeUserData';

/**
 * Тесты демо-проекта «Кофейня-бот».
 *
 * Все проверки выполняются через `BotTest.simulate()` — без сети и токенов.
 * `userData` живёт в FileAdapter (временная папка), поэтому многошаговые
 * сценарии работают одинаково на любой платформе.
 * Кроссплатформенность проверяется минимум на двух платформах: `alisa` и
 * `telegram`.
 */

/** Интересующие поля ответа Алисы. */
interface IAlisaTestResponse {
    response: {
        text: string;
        buttons?: { title: string }[];
        card?: unknown;
        end_session?: boolean;
    };
}

/** Тихий логгер, чтобы служебные сообщения фреймворка не засоряли вывод тестов. */
const silentLogger = {
    log: (): void => {},
    warn: (): void => {},
    error: (): void => {},
};

/**
 * `BotTest` переиспользует один контроллер между вызовами `simulate()`.
 * Регистрируем middleware, который запоминает контекст запроса, — так можно
 * читать текст ответа и userData без внутренних методов фреймворка.
 */
function captureController(target: BotTest): () => BotController | null {
    let captured: BotController | null = null;
    target.use((ctx, next) => {
        captured = ctx;
        return next();
    });
    return () => captured;
}

describe('Кофейня-бот (демо umbot)', () => {
    let bot: BotTest;
    let dataDir: string;
    let getCtx: () => BotController | null;

    beforeEach(() => {
        // FileAdapter в тестах пишет в одноразовую временную папку.
        dataDir = mkdtempSync(join(tmpdir(), 'umbot-demo-'));
        bot = new BotTest();
        bot.setLogger(silentLogger);
        createCoffeeBot(bot, { config: { json: dataDir, error_log: dataDir } });
        getCtx = captureController(bot);
    });

    afterEach(() => {
        rmSync(dataDir, { recursive: true, force: true });
    });

    /**
     * Сбрасывает контроллер между ходами. `bot.test()` делает то же самое
     * в консольном цикле: без сброса `oldIntentName` предыдущего шага утечёт
     * в следующий запрос, и форма вернётся на шаг назад.
     */
    function resetController(): void {
        getCtx()?.clearStoreData();
    }

    /** Один ход диалога с Алисой. */
    async function alisaTurn(query: string, count = 0): Promise<IAlisaTestResponse> {
        resetController();
        return (await bot.simulate(query, {
            platform: 'alisa',
            userId: 'user_demo',
            count,
        })) as IAlisaTestResponse;
    }

    /** Один ход диалога с Telegram. */
    async function telegramTurn(query: string, count = 0): Promise<unknown> {
        resetController();
        return bot.simulate(query, { platform: 'telegram', userId: '777', count });
    }

    /** Заполняет userData в файловой БД — эмулирует пользователя с историей. */
    async function seedUserData(
        userId: string,
        platform: string,
        data: ICoffeeUserData,
    ): Promise<void> {
        const model = new UsersData(bot.getAppContext());
        model.userId = userId;
        model.platform = platform;
        model.data = data;
        await model.save(true);
    }

    describe('welcome', () => {
        it('приветствует пользователя и показывает кнопки', async () => {
            const res = await alisaTurn('привет');
            expect(res.response.text).toContain('Добро пожаловать');
            const titles = (res.response.buttons || []).map((button) => button.title);
            expect(titles).toEqual(expect.arrayContaining(['Меню', 'Заказать', 'Помощь']));
        });

        it('первое сообщение диалога всегда приводит к приветствию', async () => {
            // Нераспознанный запрос на messageId === 0 → fallback здоровается.
            const res = await alisaTurn('кхм');
            expect(res.response.text).toContain('Добро пожаловать');
        });
    });

    describe('menu', () => {
        it('показывает карточку-галерею напитков с ценами', async () => {
            const res = await alisaTurn('меню');
            expect(res.response.text).toContain('Наше меню');
            expect(res.response.card).toBeTruthy();
        });
    });

    describe('help', () => {
        it('показывает справку и упоминает программу лояльности', async () => {
            const res = await alisaTurn('помощь');
            expect(res.response.text).toContain('Вот что я умею');
            expect(res.response.text).toContain('каждый 5-й кофе');
        });
    });

    describe('форма заказа', () => {
        it('проходит все шаги и сохраняет заказ с итогом в userData', async () => {
            let res = await alisaTurn('заказать');
            expect(res.response.text).toContain('Что будете пить');

            res = await alisaTurn('кофе', 1);
            expect(res.response.text).toContain('Какой объём');

            res = await alisaTurn('средний', 2);
            expect(res.response.text).toContain('На чьё имя');

            res = await alisaTurn('Иван', 3);
            // кофе (150) + средний (+30) = 180 ₽, первый заказ → №1.
            expect(res.response.text).toContain('Заказ №1 принят: средний кофе для Иван');
            expect(res.response.text).toContain('Итого: 180 ₽');

            const userData = getCtx()?.userData as ICoffeeUserData;
            expect(userData.favorite).toBe('кофе');
            expect(userData.history).toHaveLength(1);
            expect(userData.history?.[0]).toMatchObject({
                drink: 'кофе',
                size: 'средний',
                name: 'Иван',
                total: 180,
            });
        });

        it('валидация отклоняет напиток не из меню', async () => {
            let res = await alisaTurn('заказать');
            expect(res.response.text).toContain('Что будете пить');

            res = await alisaTurn('компот', 1);
            expect(res.response.text).toContain('У нас есть кофе, чай и какао');

            // Остались на том же шаге: корректный ответ переводит к объёму.
            res = await alisaTurn('чай', 2);
            expect(res.response.text).toContain('Какой объём');
        });

        it('команда «отмена» прерывает форму', async () => {
            let res = await alisaTurn('заказать');
            expect(res.response.text).toContain('Что будете пить');

            res = await alisaTurn('отмена', 1);
            expect(res.response.text).toContain('заказ отменён');
        });

        it('извлекает количество порций из фразы «закажу два кофе»', async () => {
            const res = await alisaTurn('закажу два кофе');
            expect(res.response.text).toContain('2 порции');
            expect(res.response.text).toContain('Что будете пить');
        });
    });

    describe('favorite', () => {
        it('читает любимый напиток из userData', async () => {
            await seedUserData('user_demo', 'alisa', { favorite: 'какао' });
            const res = await alisaTurn('любимый');
            expect(res.response.text).toContain('какао');
        });

        it('без истории заказов предлагает сделать заказ', async () => {
            const res = await alisaTurn('любимый');
            expect(res.response.text).toContain('ещё ничего не заказывали');
        });
    });

    describe('подтверждение любимого напитка', () => {
        it('повторяет последний заказ по ответу «да»', async () => {
            await seedUserData('user_demo', 'alisa', {
                favorite: 'кофе',
                history: [{ drink: 'кофе', size: 'большой', name: 'Иван', total: 210, ts: 1 }],
            });
            let res = await alisaTurn('заказать');
            expect(res.response.text).toContain('как обычно');

            res = await alisaTurn('да', 1);
            // кофе (150) + большой (+60) = 210 ₽, второй заказ → №2.
            expect(res.response.text).toContain('Заказ №2 принят: большой кофе для Иван');
            expect(res.response.text).toContain('Итого: 210 ₽');
            expect((getCtx()?.userData as ICoffeeUserData).history).toHaveLength(2);
        });

        it('каждый 5-й заказ отдаёт в подарок (лояльность)', async () => {
            const history = [1, 2, 3, 4].map((i) => ({
                drink: 'кофе',
                size: 'средний',
                name: 'Иван',
                total: 180,
                ts: i,
            }));
            await seedUserData('user_demo', 'alisa', { favorite: 'кофе', history });
            let res = await alisaTurn('заказать');
            expect(res.response.text).toContain('как обычно');

            res = await alisaTurn('да', 1);
            // 5-й заказ → бесплатный: итог 0, в тексте — подарок.
            expect(res.response.text).toContain('в подарок');
            expect(res.response.text).toContain('каждый 5-й кофе');
            const userData = getCtx()?.userData as ICoffeeUserData;
            expect(userData.history).toHaveLength(5);
            expect(userData.history?.[4]?.total).toBe(0);
        });

        it('по ответу «нет» запускает обычную форму', async () => {
            await seedUserData('user_demo', 'alisa', { favorite: 'чай' });
            let res = await alisaTurn('заказать');
            expect(res.response.text).toContain('как обычно');

            res = await alisaTurn('нет', 1);
            expect(res.response.text).toContain('Что будете пить');
        });
    });

    describe('fallback', () => {
        it('дружелюбно отвечает на нераспознанный ввод', async () => {
            const res = await alisaTurn('abrakadabra', 5);
            expect(res.response.text).toContain('не понимаю');
            expect(res.response.text).toContain('помощь');
        });
    });

    describe('кроссплатформенность (telegram)', () => {
        it('welcome работает и на чат-платформе', async () => {
            resetController();
            // skipAutoReply отключает реальную отправку в Telegram API,
            // поэтому результат — 'ok', а текст остаётся в контроллере.
            const res = await bot.simulate('привет', { platform: 'telegram', userId: '42' });
            expect(res).toBe('ok');
            expect(getCtx()?.text).toContain('Добро пожаловать');
        });

        it('форма заказа сохраняется в файловую БД между ходами', async () => {
            await telegramTurn('заказать');
            expect(getCtx()?.text).toContain('Что будете пить');

            await telegramTurn('какао', 1);
            expect(getCtx()?.text).toContain('Какой объём');

            await telegramTurn('большой', 2);
            expect(getCtx()?.text).toContain('На чьё имя');

            await telegramTurn('Мария', 3);
            // какао (120) + большой (+60) = 180 ₽.
            expect(getCtx()?.text).toContain('Заказ №1 принят');
            expect(getCtx()?.text).toContain('Итого: 180 ₽');

            const userData = getCtx()?.userData as ICoffeeUserData;
            expect(userData.favorite).toBe('какао');
            expect(userData.history).toHaveLength(1);
            expect(userData.history?.[0]?.total).toBe(180);
        });
    });
});
