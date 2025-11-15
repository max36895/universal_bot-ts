// stress-test.js
// Запуск: node --expose-gc stress-test.js

const { Bot, BotController, Alisa, T_ALISA, rand } = require('./../dist/index');

class StressController extends BotController {
    action(intentName) {
        if (intentName?.startsWith('cmd_')) {
            this.text = `OK: ${intentName}`;
        } else {
            this.text = 'fallback';
        }
    }
}

const PHRASES = [
    'привет',
    'пока',
    'справка',
    'отмена',
    'помощь',
    'старт',
    'найти',
    'сохранить',
    'показать',
    'удалить',
    'запустить игру',
    'остановить',
    'настройки',
    'обновить',
];

function setupCommands(bot, count) {
    bot.clearCommands();
    for (let i = 0; i < count; i++) {
        const phrase = `${PHRASES[i % PHRASES.length]}_${Math.floor(i / PHRASES.length)}`;
        bot.addCommand(`cmd_${i}`, [phrase], (cmd, ctrl) => {
            ctrl.text = 'handled cmd';
        });
    }
}

function mockRequest(text) {
    return JSON.stringify({
        meta: {
            locale: 'ru-Ru',
            timezone: 'UTC',
            client_id: 'local',
            interfaces: { screen: true },
        },
        session: {
            message_id: 1,
            session_id: `s_${Date.now()}`,
            skill_id: 'stress',
            user_id: `u_${crypto.randomBytes(8).toString('hex')}`,
            new: Math.random() > 0.9,
        },
        request: {
            command: text,
            original_utterance: text,
            type: 'SimpleUtterance',
            nlu: {},
        },
        state: { session: {} },
        version: '1.0',
    });
}

let errorsBot = [];
const bot = new Bot(T_ALISA);
bot.initBotController(StressController);
bot.setLogger({
    error: (msg) => errorsBot.push(msg),
    warn: () => {},
    log: () => {},
});
setupCommands(bot, 1000);

async function run() {
    let text;
    const pos = rand(0, 3) % 3;
    if (pos === 0) text = 'привет_0';
    else if (pos === 1) text = `помощь_12`;
    else text = `удалить_751154`;
    return bot.run(Alisa, T_ALISA, mockRequest(text));
}

function getMemoryMB() {
    return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

function validateResult(result) {
    // ЗАМЕНИТЕ НА ВАШУ ЛОГИКУ ВАЛИДАЦИИ
    return result;
}

// ───────────────────────────────────────
// 1. Тест нормальной нагрузки (основной)
// ───────────────────────────────────────
async function normalLoadTest(iterations = 200, concurrency = 2) {
    console.log(
        `\n🧪 Нормальная нагрузка: ${iterations} раундов × ${concurrency} параллельных вызовов\n`,
    );

    const allLatencies = [];
    const errors = [];
    const memStart = getMemoryMB();

    for (let round = 0; round < iterations; round++) {
        const promises = [];
        for (let i = 0; i < concurrency; i++) {
            promises.push(
                (async () => {
                    const start = process.hrtime.bigint();
                    try {
                        const result = await run();
                        const latencyMs = Number(process.hrtime.bigint() - start) / 1e6;
                        if (!validateResult(result)) {
                            throw new Error('Некорректный результат');
                        }
                        allLatencies.push(latencyMs);
                        return { ok: true, latencyMs };
                    } catch (err) {
                        errors.push(err.message || err);
                        return { ok: false };
                    }
                })(),
            );
        }
        await Promise.all(promises);

        // Небольшая пауза между раундами (реалистичный интервал между сообщениями)
        if (round < iterations - 1) {
            await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
        }
    }

    const memEnd = getMemoryMB();
    const avg = allLatencies.length
        ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
        : 0;
    const p95Index = Math.floor(allLatencies.length * 0.95);
    const p95 = allLatencies.length ? [...allLatencies].sort((a, b) => a - b)[p95Index] : 0;

    console.log(`✅ Успешно: ${allLatencies.length}`);
    console.log(`❌ Ошибок: ${errors.length}`);
    if (errors.length) {
        console.log(`❌ Ошибки: ${errors.slice(0, 3)}`);
    }
    console.log(`❌ Ошибок Bot: ${errorsBot.length}`);
    if (errorsBot.length) {
        console.log('Ошибки:');
        console.log(errorsBot.slice(0, 3));
    }
    console.log(`🕒 Среднее время: ${avg.toFixed(2)} мс`);
    console.log(`📈 p95 latency: ${p95.toFixed(2)} мс`);
    console.log(`💾 Память: ${memStart} → ${memEnd} MB (+${memEnd - memStart})`);

    return {
        success: errors.length === 0,
        latencies: allLatencies,
        errors,
        avg,
        p95,
        memDelta: memEnd - memStart,
    };
}

// ───────────────────────────────────────
// 2. Тест кратковременного всплеска (burst)
// ───────────────────────────────────────
async function burstTest(count = 5, timeoutMs = 10_000) {
    console.log(`\n🔥 Burst-тест: ${count} параллельных вызовов\n`);

    const memStart = getMemoryMB();
    const start = process.hrtime.bigint();

    const promises = new Array(count)
        .fill()
        .map(() =>
            Promise.race([
                run(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Таймаут ${timeoutMs} мс`)), timeoutMs),
                ),
            ]),
        );

    try {
        const results = await Promise.all(promises);
        const invalid = results.filter((r) => !validateResult(r));
        if (invalid.length > 0) {
            throw new Error(`Получено ${invalid.length} некорректных результатов`);
        }

        const totalMs = Number(process.hrtime.bigint() - start) / 1e6;
        const memEnd = getMemoryMB();

        console.log(`✅ Успешно: ${results.length}`);
        console.log(`❌ Ошибок Bot: ${errorsBot.length}`);
        if (errorsBot.length) {
            console.log(errorsBot.slice(0, 3));
        }
        console.log(`🕒 Общее время: ${totalMs.toFixed(1)} мс`);
        console.log(`💾 Память: ${memStart} → ${memEnd} MB (+${memEnd - memStart})`);

        return { success: true, duration: totalMs, memDelta: memEnd - memStart };
    } catch (err) {
        const memEnd = getMemoryMB();
        console.error(`💥 Ошибка:`, err.message || err);
        console.log(`💾 Память: ${memStart} → ${memEnd} MB (+${memEnd - memStart})`);
        return { success: false, error: err.message || err, memDelta: memEnd - memStart };
    }
}

// ───────────────────────────────────────
// 3. Запуск всех тестов
// ───────────────────────────────────────
async function runAllTests() {
    console.log('🚀 Запуск стресс-тестов для метода Bot.run()\n');

    // Тест 1: нормальная нагрузка
    const normal = await normalLoadTest(200, 2);
    if (!normal.success) {
        console.warn('⚠️  Нормальный тест завершился с ошибками');
    }
    errorsBot = [];
    // Тест 2: burst с 5 вызовами
    const burst5 = await burstTest(5);
    if (!burst5.success) {
        console.warn('⚠️  Burst-тест (5) завершился с ошибками');
    }
    errorsBot = [];
    // Тест 3: burst с 10 вызовами (опционально, для проверки устойчивости)
    const burst10 = await burstTest(10);
    if (!burst10.success) {
        console.warn('⚠️  Burst-тест (10) завершился с ошибками');
    }
    errorsBot = [];
    // Тест 3: burst с 10 вызовами (опционально, для проверки устойчивости)
    const burst50 = await burstTest(50);
    if (!burst50.success) {
        console.warn('⚠️  Burst-тест (50) завершился с ошибками');
    }
    errorsBot = [];

    // Тест 3: burst с 10 вызовами (опционально, для проверки устойчивости)
    const burst100 = await burstTest(100);
    if (!burst100.success) {
        console.warn('⚠️  Burst-тест (100) завершился с ошибками');
    }

    const burst500 = await burstTest(500);
    if (!burst500.success) {
        console.warn('⚠️  Burst-тест (500) завершился с ошибками');
    }

    const burst1000 = await burstTest(1000);
    if (!burst1000.success) {
        console.warn('⚠️  Burst-тест (1000) завершился с ошибками');
    }
    console.log('\n🏁 Тестирование завершено.');
}

// ───────────────────────────────────────
// Запуск при вызове напрямую
// ───────────────────────────────────────
try {
    await runAllTests();
} catch (err) {
    console.error('❌ Критическая ошибка при запуске тестов:', err);
    process.exit(1);
}
