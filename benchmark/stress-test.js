// stress-test.js
// Запуск: node --expose-gc stress-test.js

const { Bot, BotController, Alisa, T_ALISA, rand, unlink, Text } = require('./../dist/index');
const crypto = require('node:crypto');
const os = require('node:os');
const { eventLoopUtilization } = require('node:perf_hooks').performance;

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

function getAvailableMemoryMB() {
    const free = os.freemem();
    // Оставляем 50 МБ на систему и Node.js рантайм
    return Math.max(0, (free - 50 * 1024 * 1024) / (1024 * 1024));
}

function predictMemoryUsage(commandCount) {
    // Базовое потребление + 0.4 КБ на команду + запас
    return 15 + (commandCount * 0.4) / 1024 + 50; // в МБ
}

function setupCommands(bot, count) {
    bot.clearCommands();
    for (let i = 0; i < count; i++) {
        const phrase = `${PHRASES[i % PHRASES.length]}_${Math.floor(i / PHRASES.length)}`;
        bot.addCommand(
            `cmd_${i}`,
            [phrase],
            (cmd, ctrl) => {
                ctrl.text = 'handled cmd';
            },
            true,
        );
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
bot.setAppConfig({
    // Когда используется локальное хранилище, скорость обработки в разы выше.
    // Связанно с тем что не нужно создавать бд файл с большим количеством пользователей и очень частой записью/обращением.
    // Получается так, что слабое место библиотеки, это файловая бд.
    isLocalStorage: false,
});
bot.initBotController(StressController);
bot.setLogger({
    error: (msg) => {
        errorsBot.push(msg);
    },
    warn: () => {
        // чтобы не писался файл с предупреждениями
    },
});
const COMMAND_COUNT = 1000;
setupCommands(bot, COMMAND_COUNT);
bot.addCommand('start', ['/start'], (_, bt) => {
    bt.text = 'start';
});
bot.addCommand('help', ['/help'], (_, bt) => {
    bt.text = 'help';
});
bot.addCommand('*', ['*'], (_, bt) => {
    bt.text = 'hello my friend';
});

async function run() {
    let text;
    const pos = rand(0, 3) % 3;
    if (pos === 0) text = 'привет_0';
    else if (pos === 1) text = `помощь_12`;
    else text = `удалить_751154`;

    text += '_' + Math.random();
    return bot.run(Alisa, T_ALISA, mockRequest(text));
}

function getMemoryMB() {
    return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

function validateResult(result) {
    return result?.response?.text;
}

// ───────────────────────────────────────
// 1. Тест нормальной нагрузки (основной)
// ───────────────────────────────────────
async function normalLoadTest(iterations = 200, concurrency = 2) {
    console.log(
        `\n🧪 Нормальная нагрузка: ${iterations} раундов × ${concurrency} параллельных вызовов\n`,
    );
    const eluBefore = eventLoopUtilization();

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
            // Диапазона от 50 до 100мс должно быть достаточно для проверки нагрузки
            await new Promise((r) => setTimeout(r, 50 + Math.random() * 50));
        }
    }

    const eluAfter = eventLoopUtilization(eluBefore);
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

    console.log(`📊 Event Loop Utilization:`);
    console.log(`   Active time: ${eluAfter.active.toFixed(2)} ms`);
    console.log(`   idle:  ${eluAfter.idle.toFixed(2)} ms`);
    console.log(`   Utilization: ${(eluAfter.utilization * 100).toFixed(1)}%`);
    return {
        success: errors.length === 0,
        latencies: allLatencies,
        errors,
        avg,
        p95,
        memDelta: memEnd - memStart,
    };
}

let rps = Infinity;
let RPS = [];

// ───────────────────────────────────────
// 2. Тест кратковременного всплеска (burst)
// ───────────────────────────────────────
async function burstTest(count = 5, timeoutMs = 10_000) {
    console.log(`\n🔥 Burst-тест: ${count} параллельных вызовов\n`);
    global.gc();

    const memStart = getMemoryMB();
    const start = process.hrtime.bigint();

    const predicted = predictMemoryUsage(count * COMMAND_COUNT);
    const available = getAvailableMemoryMB();
    if (predicted > available * 0.9) {
        console.log(
            `⚠️ Недостаточно памяти для теста (${count} одновременных запросов с ${COMMAND_COUNT} командами).`,
        );
        return { status: false, outMemory: true };
    }
    let isMess = false;
    let iter = 0;
    const eluBefore = eventLoopUtilization();

    const promises = new Array(count).fill().map(() =>
        Promise.race([
            (async () => {
                iter++;
                const mem = getMemoryMB();
                const predicted = predictMemoryUsage(count * COMMAND_COUNT);
                const available = getAvailableMemoryMB();
                // Если уже занимаем много памяти, то не позволяем запускать процессы еще.
                if (mem > 3700 || predicted > available * 0.9) {
                    if (!isMess) {
                        console.log(
                            `⚠️ Недостаточно памяти для теста с итерацией ${iter} (${count} одновременных запросов с ${COMMAND_COUNT} командами).`,
                        );
                        isMess = true;
                    }
                    return {};
                }
                return await run();
            })(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Таймаут ${timeoutMs} мс`)), timeoutMs),
            ),
        ]),
    );

    try {
        const results = await Promise.all(promises);
        const eluAfter = eventLoopUtilization(eluBefore);
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

        console.log(`📊 Event Loop Utilization:`);
        console.log(`   Active time: ${eluAfter.active.toFixed(2)} ms`);
        console.log(`   idle:  ${eluAfter.idle.toFixed(2)} ms`);
        console.log(`   Utilization: ${(eluAfter.utilization * 100).toFixed(1)}%`);

        RPS.push(Math.floor(count / (totalMs / 1000)));

        global.gc();
        return { success: errorsBot.length === 0, duration: totalMs, memDelta: memEnd - memStart };
    } catch (err) {
        const memEnd = getMemoryMB();
        console.error(`💥 Ошибка:`, err.message || err);
        console.log(`💾 Память: ${memStart} → ${memEnd} MB (+${memEnd - memStart})`);
        global.gc();
        return { success: false, error: err.message || err, memDelta: memEnd - memStart };
    }
}

async function testMaxRPS(durationSeconds = 10) {
    console.log(
        `\n📊 Тест максимального RPS (${durationSeconds} секунд)\nПокажет сколько запросов смогло обработаться за ${durationSeconds} секунд`,
    );

    const startTime = Date.now();
    let totalRequests = 0;
    const results = [];

    // Запускаем непрерывный поток запросов
    while (Date.now() - startTime < durationSeconds * 1000) {
        const batchSize = 100; // Размер пачки
        const promises = [];

        for (let i = 0; i < batchSize; i++) {
            promises.push(run());
        }

        const batchStart = performance.now();
        await Promise.all(promises);
        const batchTime = performance.now() - batchStart;

        totalRequests += batchSize;
        results.push({
            batch: batchSize,
            time: batchTime,
            rps: batchSize / (batchTime / 1000),
        });
    }

    const totalTime = (Date.now() - startTime) / 1000;
    const avgRPS = totalRequests / totalTime;

    console.log(`Всего запросов: ${totalRequests}`);
    console.log(`Общее время: ${totalTime.toFixed(2)} сек`);
    console.log(`Средний RPS: ${avgRPS.toFixed(0)}`);
    console.log(`Максимальный RPS в пачке: ${Math.max(...results.map((r) => r.rps)).toFixed(0)}`);

    return avgRPS;
}

async function realisticTest() {
    console.log(
        '🧪 Реалистичный тест который эмулирует работу приложения в условиях сервера\n' +
            '(получение запроса -> привод его к корректному виду -> логика приложения -> отдача результата)',
    );

    const iterations = 10000;
    const results = [];

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        const command = Text.getText(PHRASES) + '_' + (i % 1000);
        // 1. Создаем объект запроса
        const requestObj = {
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
                user_id: `user_${i}`,
                new: true,
            },
            request: {
                command: command,
                original_utterance: command,
            },
            state: { session: {} },
            version: '1.0',
        };

        // 2. Эмулируем приход запроса на сервер
        const jsonString = JSON.stringify(requestObj);

        // 3. Эмулируем получение запроса на сервер
        const parsedRequest = JSON.parse(jsonString);

        // 4. Запускаем логику приложения
        const result = await bot.run(Alisa, T_ALISA, JSON.stringify(parsedRequest));

        // 5. Подготавливает корректный ответ на запрос
        const responseJson = JSON.stringify(result);

        // 6. Эмулируем отправку ответа пользователю
        JSON.parse(responseJson);

        const duration = performance.now() - start;
        results.push(duration);
    }

    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const rps = 1000 / avg;

    console.log(`   Итераций: ${iterations}`);
    console.log(`   Среднее время: ${avg.toFixed(2)} мс`);
    console.log(`   Реалистичный RPS: ${rps.toFixed(0)}`);

    return rps;
}

async function realCommandsTest() {
    console.log('🧪 Тест со всеми командами');

    const commandCount = bot.getAppContext().commands.size;
    const iterations = 10000;

    // Создаем 10000 запросов, равномерно распределенных по командам
    const requests = [];
    for (let i = 0; i < iterations; i++) {
        const cmdIndex = i % commandCount;
        const phrase = `${Text.getText(PHRASES)}_${cmdIndex}`;
        requests.push(mockRequest(phrase));
    }

    // Перемешиваем
    requests.sort(() => Math.random() - 0.5);

    const start = performance.now();

    // Обрабатываем пачками
    const batchSize = 100;
    for (let i = 0; i < iterations; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const promises = batch.map((req) => bot.run(Alisa, T_ALISA, req));
        await Promise.all(promises);
    }

    const totalTime = performance.now() - start;
    const avgTime = totalTime / iterations;
    const rps = 1000 / avgTime;

    console.log(`   Команд в боте: ${commandCount}`);
    console.log(`   Запросов: ${iterations}`);
    console.log(`   Общее время: ${totalTime.toFixed(0)} мс`);
    console.log(`   Среднее время: ${avgTime.toFixed(3)} мс`);
    console.log(`   RPS: ${rps.toFixed(0)}`);

    return rps;
}

// Тест с fallback (*) командой
async function fallbackTest() {
    console.log(
        '🧪 Тест с fallback командами (неизвестные запросы)\n' +
            'Проверяет сценарий, когда все запросы пользователя не удалось найти среди команд',
    );

    const results = [];
    const iterations = 5000;

    for (let i = 0; i < iterations; i++) {
        // Создаем случайный текст, которого точно нет в командах
        const randomText = crypto.randomBytes(20).toString('hex');
        const startReq = performance.now();
        await bot.run(Alisa, T_ALISA, mockRequest(randomText));
        results.push(performance.now() - startReq);
    }

    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const rps = 1000 / avg;

    console.log(`   Fallback запросов: ${iterations}`);
    console.log(`   Среднее время: ${avg.toFixed(3)} мс`);
    console.log(`   RPS: ${rps.toFixed(0)}`);

    return rps;
}

// ───────────────────────────────────────
// 3. Запуск всех тестов
// ───────────────────────────────────────
async function runAllTests() {
    const isWin = process.platform === 'win32';
    console.log('🚀 Запуск стресс-тестов для метода Bot.run()\n');
    // Тест 1: нормальная нагрузка
    const normal = await normalLoadTest(200, 2);
    if (!normal.success) {
        console.warn('⚠️  Нормальный тест завершился с ошибками');
    }
    errorsBot = [];
    // Тест 3: burst с 10 вызовами (опционально, для проверки устойчивости)
    const burst100 = await burstTest(100);
    if (!burst100.success) {
        console.warn('⚠️  Burst-тест (100) завершился с ошибками');
    }
    errorsBot = [];
    const burst500 = await burstTest(500);
    if (!burst500.success) {
        console.warn('⚠️  Burst-тест (500) завершился с ошибками');
    }
    errorsBot = [];
    if (burst500.success) {
        const startCount = 500;
        for (let i = 2; i <= 20; i++) {
            const burst = await burstTest(startCount * i);
            if (!burst.success || RPS[RPS.length - 1] < startCount * i) {
                // Вывод текста о том, что тест завершился с ошибками не корректно, так как это не соответствует действительности
                //console.warn(`⚠️ Burst-тест (${startCount * i}) завершился с ошибками`);
                break;
            }
        }
    }
    await realCommandsTest();
    await fallbackTest();
    await realisticTest();
    await testMaxRPS(10);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    unlink(__dirname + '/../json/UsersData.json');
    // на windows nodeJS работает не очень хорошо, из-за чего можем вылететь за пределы потребляемой памяти(более 4gb, хотя на unix этот показатель в районе 400мб)
    if (isWin) {
        console.log(
            '⚠️ Внимание: Node.js на Windows работает менее эффективно, чем на Unix-системах (Linux/macOS). Это может приводить к высокому потреблению памяти и замедлению обработки под нагрузкой.\n' +
                'Для корректной оценки производительности и использования в продакшене рекомендуется запускать приложение на сервере с Linux.',
        );
    }
    console.log('\n🏁 Тестирование завершено.');
    console.log('Ваше приложение с текущей конфигурацией сможет выдержать следующую нагрузку:');
    const daySeconds = 60 * 60 * 24;
    rps = Math.floor(
        RPS.reduce((acc, value) => {
            return acc + value;
        }, 0) / RPS.length,
    );
    console.log(`    - RPS из теста: ${rps}`);
    console.log(
        `    - Количество запросов в сутки: ${new Intl.NumberFormat('ru-Ru', {
            maximumSignificantDigits: 3,
            notation: 'compact',
            compactDisplay: 'short',
        }).format(rps * daySeconds)}`,
    );
    console.log('В худшем случае если есть какая-то относительно тяжелая логика в приложении');
    console.log(`    - RPS равен 70% от того что показал тест: ${Math.floor(rps * 0.7)}`);
    console.log(
        `    - Количество запросов в сутки: ${new Intl.NumberFormat('ru-Ru', {
            maximumSignificantDigits: 3,
            notation: 'compact',
            compactDisplay: 'short',
        }).format(rps * 0.7 * daySeconds)}`,
    );
}

// ───────────────────────────────────────
// Запуск при вызове напрямую
// ───────────────────────────────────────
runAllTests().catch((err) => {
    console.error('❌ Критическая ошибка при запуске тестов:', err);
    unlink(__dirname + '/../json/UsersData.json');
    process.exit(1);
});
