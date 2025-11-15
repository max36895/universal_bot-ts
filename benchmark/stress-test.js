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
            user_id: `u_${Math.random().toString(36)}`,
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

function generateRequests(total, commandCount) {
    const requests = [];
    for (let i = 0; i < total; i++) {
        let text;
        const pos = i % 3;
        if (pos === 0) text = 'привет_0';
        else if (pos === 1) text = `помощь_${Math.floor(commandCount / 2)}`;
        else text = `удалить_${commandCount - 1}`;
        requests.push(mockRequest(text));
    }
    return requests;
}

let errors = [];

async function runScenario(bot, commandCount, requestCount, simultaneous = false) {
    setupCommands(bot, commandCount);
    errors.length = 0;
    errors = [];
    global.gc();

    await new Promise((r) => setTimeout(r, 1)); // Ждём, пока все команды загрузятся
    const requests = generateRequests(requestCount, commandCount);

    const startMem = process.memoryUsage().heapUsed;
    const startTime = Date.now();

    if (!simultaneous) {
        // Стресс-тест: ВСЁ СРАЗУ
        const promises = requests.map((req) => {
            if (simultaneous) {
                return bot.run(Alisa, T_ALISA, req);
            } else {
                return Promise.race([
                    bot.run(Alisa, T_ALISA, req),
                    new Promise((_, reject) => {
                        setTimeout(() => {
                            reject(new Error('Timeout'));
                        }, 4000);
                    }),
                ]);
            }
        });
        await Promise.all(promises);
        promises.length = 0; // Очистка массива, чтобы GC смог удалить объекты
    } else {
        // Реалистичная нагрузка: запросы распределены во времени
        const step = Math.round(requestCount / 10); // 10 мс между запросами для крупного бота
        const promises = [];
        for (let i = 0; i < requestCount; i++) {
            if (i % step === 0 && requestCount > 200) {
                await new Promise((r) => setTimeout(r, step));
            }
            const reg = requests[i];
            promises.push(bot.run(Alisa, T_ALISA, reg));
        }
        await Promise.allSettled(promises);
        promises.length = 0; // Очистка массива, чтобы GC смог удалить объекты
    }
    requests.length = 0; // Очистка массива, чтобы GC смог удалить объекты

    const endTime = Date.now();
    const endMem = process.memoryUsage().heapUsed;
    global.gc(); // Вызов GC для очистки мусора

    return {
        ok: requestCount - errors.length,
        failed: errors.length,
        errors,
        time: endTime - startTime,
        memory: endMem - startMem,
    };
}

async function main() {
    console.log('🚀 Реалистичный стресс-тест (честный, без обмана)\n');

    const bot = new Bot(T_ALISA);
    bot.initBotControllerClass(StressController);
    bot.setLogger({
        error: (msg) => errors.push(msg),
        warn: () => {},
        log: () => {},
    });

    // 1. Мелкий бот: 10 команд, 10 запросов за 1 сек (100 RPS мгновенно)
    const res1 = await runScenario(bot, 10, 10, true);
    bot.clearCommands();
    global.gc();
    console.log(`1. Мелкий бот (10 команд, 10 запросов за ~1 сек)`);
    console.log(`   ✅ Успешно: ${res1.ok}, ❌ Упало: ${res1.failed}`);
    console.log(
        `   ⏱️ Время: ${res1.time} мс, 📈 Память: ${(res1.memory / 1024 / 1024).toFixed(2)} MB`,
    );
    if (res1.errors.length > 0) {
        console.log('Ошибки:' + res1.errors.slice(0, 3));
    }

    // 2. Средний бот: 1000 команд, 1000 запросов за 10 сек (100 RPS)
    const res2 = await runScenario(bot, 200, 100, false);
    bot.clearCommands();
    global.gc();
    console.log(`\n2. Средний бот (200 команд, 100 запросов за ~10 сек)`);
    console.log(`   ✅ Успешно: ${res2.ok}, ❌ Упало: ${res2.failed}`);
    console.log(
        `   ⏱️ Время: ${res2.time} мс, 📈 Память: ${(res2.memory / 1024 / 1024).toFixed(2)} MB`,
    );
    if (res2.errors.length > 0) {
        console.log('Ошибки:' + res2.errors.slice(0, 3));
    }

    // 3. Крупный бот: 10 000 команд, 5000 запросов за 10 сек (500 RPS)
    const res3 = await runScenario(bot, 2000, 5000, false);
    bot.clearCommands();
    global.gc();
    console.log(`\n3. Крупный бот (2000 команд, 5000 запросов за ~10 сек)`);
    console.log(`   ✅ Успешно: ${res3.ok}, ❌ Упало: ${res3.failed}`);
    console.log(
        `   ⏱️ Время: ${res3.time} мс, 📈 Память: ${(res3.memory / 1024 / 1024).toFixed(2)} MB`,
    );

    if (res3.errors.length > 0) {
        console.log('Ошибки:' + res3.errors.slice(0, 3));
    }
    return;

    // 4. Стресс-тест: 1000 команд, 1000 запросов СРАЗУ
    const res4 = await runScenario(bot, 1000, 1000, true);
    console.log(`\n4. Стресс-тест (1000 команд, 1000 запросов одномоментно)`);
    console.log(`   ✅ Успешно: ${res4.ok}, ❌ Упало: ${res4.failed}`);
    console.log(
        `   ⏱️ Время: ${res4.time} мс, 📈 Память: ${(res4.memory / 1024 / 1024).toFixed(2)} MB`,
    );
    if (res4.errors.length > 0) {
        console.log(
            `   💡 Примечание: ошибки вызваны превышением лимита Алисы (3 сек) из-за искусственной перегрузки.`,
        );
        console.log('Ошибки:' + res4.errors.slice(0, 3));
    }

    console.log(`\n📋 ЗАКЛЮЧЕНИЕ:`);
    if (res1.failed === 0 && res2.failed === 0 && res3.failed === 0) {
        console.log(`🟢 Библиотека стабильна в реальных сценариях.`);
        console.log(`✅ Рекомендуется к использованию в enterprise.`);
    } else {
        console.log(`⚠️ Обнаружены ошибки в реальных сценариях.`);
        console.log(`❌ Требуется доработка.`);
    }
}

// main().catch(console.error);
let errorsBot = [];
const bot = new Bot(T_ALISA);
bot.initBotControllerClass(StressController);
bot.setLogger({
    error: (msg) => errorsBot.push(msg),
    warn: () => {},
    log: () => {},
});
setupCommands(bot, 10);

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
    console.log(`❌ Ошибок: ${errors.slice(0, 3)}`);
    console.log(`❌ Ошибок Bot: ${errorsBot.length}`);
    console.log(errorsBot);
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

    const promises = Array(count)
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
        console.log(errorsBot);
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
    console.log('🚀 Запуск стресс-тестов для метода run()\n');

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
    console.log('\n🏁 Тестирование завершено.');
}

// ───────────────────────────────────────
// Запуск при вызове напрямую
// ───────────────────────────────────────
runAllTests().catch((err) => {
    console.error('❌ Критическая ошибка при запуске тестов:', err);
    process.exit(1);
});
