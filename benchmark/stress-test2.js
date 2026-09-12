// stress-test-fixed.js
// fullPlatforms и адаптеры экспортируются из dist/plugins, а не из dist/index.
const { Bot, BotController } = require('./../dist/index');
const { fullPlatforms, AlisaAdapter } = require('./../dist/plugins');
const crypto = require('node:crypto');
const os = require('node:os');

class StressController extends BotController {
    action(intentName) {
        this.text = intentName?.startsWith('cmd_') ? `OK: ${intentName}` : 'fallback';
    }
}

const PHRASES = ['привет', 'пока', 'справка' /* ... */];

// 1. ОДИН размер теста для стабильности
const FIXED_CONCURRENCY = 100; // Фиксированное количество параллельных запросов
const WARMUP_ITERATIONS = 3; // Прогрев системы
const MEASUREMENT_ITERATIONS = 10; // Замеров для статистики

// 2. Изолированный тест с полной очисткой
async function createCleanBot() {
    const bot = new Bot('alisa');
    bot.setAppConfig({ isLocalStorage: true });
    // Заглушка логгера: без неё logWarn/logError пишут файлы в дефолтные
    // json/ и logs/ в корне репозитория.
    bot.setLogger({
        error: () => {},
        warn: () => {},
        log: () => {},
    });
    bot.initBotController(StressController);
    bot.use(fullPlatforms);
    bot.use(new AlisaAdapter());

    // Добавляем фиксированное количество команд
    const COMMAND_COUNT = 500; // Фиксируем!
    for (let i = 0; i < COMMAND_COUNT; i++) {
        const phrase = `${PHRASES[i % PHRASES.length]}_${Math.floor(i / PHRASES.length)}`;
        bot.addCommand(`cmd_${i}`, [phrase], (_, ctrl) => {
            ctrl.text = 'handled cmd';
        });
    }

    bot.addCommand('*', ['*'], (_, ctrl) => {
        ctrl.text = 'fallback response';
    });

    return bot;
}

// 3. Генератор стабильной нагрузки
function* generateRequests(batchSize) {
    const commands = Array.from(
        { length: 1000 },
        (_, i) => `${PHRASES[i % PHRASES.length]}_${Math.floor(i / PHRASES.length)}`,
    );

    for (let i = 0; i < batchSize; i++) {
        const cmdIndex = i % commands.length;
        const randomSuffix = crypto.randomBytes(4).toString('hex');
        yield `${commands[cmdIndex]}_${randomSuffix}`;
    }
}

// 4. Единый стабильный тест
async function stableRpsTest(options = {}) {
    const { durationSeconds = 30, concurrency = FIXED_CONCURRENCY, gcBetweenRuns = true } = options;

    console.log(`\n📊 Стабильный тест: ${durationSeconds}сек, concurrency=${concurrency}`);

    // Создаем ЧИСТЫЙ бот для каждого теста
    const bot = await createCleanBot();

    // Функция для одного запроса
    const makeRequest = async (text) => {
        const request = {
            meta: {
                locale: 'ru-Ru',
                timezone: 'UTC',
                client_id: 'local',
                interfaces: { screen: true },
            },
            session: {
                message_id: 1,
                session_id: `s_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                skill_id: 'stress',
                user_id: `u_${crypto.randomBytes(8).toString('hex')}`,
                new: true,
            },
            request: { command: text, original_utterance: text, type: 'SimpleUtterance' },
            state: { session: {} },
            version: '1.0',
        };

        return bot.run('alisa', JSON.stringify(request));
    };

    // Массив для сбора метрик
    const metrics = {
        requestsCompleted: 0,
        latencies: [],
        errors: 0,
        startTime: 0,
        endTime: 0,
    };

    // Прогрев (не учитываем в результатах)
    console.log('🔥 Прогрев системы...');
    const warmupRequests = Array.from(generateRequests(concurrency * 2));
    for (const text of warmupRequests) {
        await makeRequest(text).catch(() => {});
    }

    if (gcBetweenRuns) {
        if (global.gc) global.gc();
        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Основной тест
    console.log('⏱️  Запуск основного теста...');
    metrics.startTime = Date.now();

    let isRunning = true;
    console.log(durationSeconds * 1000);
    setTimeout(() => {
        isRunning = false;
        console.log('ok');
    }, durationSeconds * 1000);

    // Worker-функция для параллельных запросов
    const worker = async (workerId) => {
        const requestGenerator = generateRequests(Infinity);
        while (isRunning && metrics.requestsCompleted <= 5e5) {
            const text = requestGenerator.next().value;
            const start = process.hrtime.bigint();

            try {
                await makeRequest(text);
                const latency = Number(process.hrtime.bigint() - start) / 1e6;

                // Безопасное добавление в массив
                metrics.latencies.push(latency);
                metrics.requestsCompleted++;
            } catch (error) {
                metrics.errors++;
                console.log('Ошибка запроса:', error);
            }
        }
    };

    // Запускаем workers
    const workers = [];
    for (let i = 0; i < concurrency; i++) {
        workers.push(worker(i));
    }

    await Promise.all(workers);
    metrics.endTime = Date.now();

    // Вычисляем результаты
    const totalSeconds = (metrics.endTime - metrics.startTime) / 1000;
    const rps = metrics.requestsCompleted / totalSeconds;

    // Статистика по latency
    const latencies = metrics.latencies.sort((a, b) => a - b);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p90 = latencies[Math.floor(latencies.length * 0.9)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    console.log('\n📈 Результаты:');
    console.log(`   Длительность: ${totalSeconds.toFixed(1)} сек`);
    console.log(`   Всего запросов: ${metrics.requestsCompleted}`);
    console.log(`   RPS: ${rps.toFixed(0)}`);
    console.log(`   Ошибки: ${metrics.errors}`);
    console.log(`   Latency avg: ${avgLatency.toFixed(2)} мс`);
    console.log(`   Latency p50: ${p50.toFixed(2)} мс`);
    console.log(`   Latency p90: ${p90.toFixed(2)} мс`);
    console.log(`   Latency p95: ${p95.toFixed(2)} мс`);
    console.log(`   Latency p99: ${p99.toFixed(2)} мс`);

    // Чистим
    bot.cleanup?.();

    return {
        rps,
        avgLatency,
        p95,
        p99,
        requestsCompleted: metrics.requestsCompleted,
        errors: metrics.errors,
        duration: totalSeconds,
    };
}

// 5. Запуск многократно для статистики
async function runStabilitySuite() {
    console.log('🔬 Запуск набора стабильных тестов\n');

    const results = [];

    for (let i = 0; i < MEASUREMENT_ITERATIONS; i++) {
        console.log(`\n🌀 Итерация ${i + 1}/${MEASUREMENT_ITERATIONS}`);

        // Между итерациями даем системе "остыть"
        if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            if (global.gc) global.gc();
        }

        const result = await stableRpsTest({
            durationSeconds: 15, // Достаточно для стабильности
            concurrency: FIXED_CONCURRENCY,
            gcBetweenRuns: true,
        });

        results.push(result);

        console.log(`   RPS в этой итерации: ${result.rps.toFixed(0)}`);
    }

    // Статистический анализ
    const rpsValues = results.map((r) => r.rps);
    const avgRps = rpsValues.reduce((a, b) => a + b, 0) / rpsValues.length;
    const variance = rpsValues.reduce((a, b) => a + Math.pow(b - avgRps, 2), 0) / rpsValues.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / avgRps) * 100; // Коэффициент вариации

    console.log('\n🎯 Финальная статистика:');
    console.log(`   Средний RPS: ${avgRps.toFixed(0)}`);
    console.log(`   Стандартное отклонение: ${stdDev.toFixed(0)}`);
    console.log(`   Коэффициент вариации: ${cv.toFixed(1)}%`);
    console.log(`   Min RPS: ${Math.min(...rpsValues).toFixed(0)}`);
    console.log(`   Max RPS: ${Math.max(...rpsValues).toFixed(0)}`);
    console.log(
        `   Разброс: ${(((Math.max(...rpsValues) - Math.min(...rpsValues)) / avgRps) * 100).toFixed(1)}%`,
    );

    // Проверка на деградацию
    const sortedRps = [...rpsValues].sort((a, b) => a - b);
    const medianRps = sortedRps[Math.floor(sortedRps.length / 2)];
    const firstQuartile = sortedRps[Math.floor(sortedRps.length * 0.25)];
    const thirdQuartile = sortedRps[Math.floor(sortedRps.length * 0.75)];

    console.log('\n📊 Квартили:');
    console.log(`   Q1 (25%): ${firstQuartile.toFixed(0)}`);
    console.log(`   Медиана: ${medianRps.toFixed(0)}`);
    console.log(`   Q3 (75%): ${thirdQuartile.toFixed(0)}`);

    // Порог деградации
    const degradationThreshold = firstQuartile * 0.9; // Падение ниже 10% от Q1
    const hasDegradation = rpsValues.some((rps) => rps < degradationThreshold);

    if (hasDegradation) {
        console.log('\n⚠️  ВНИМАНИЕ: Обнаружена возможная деградация производительности!');
    } else {
        console.log('\n✅ Производительность стабильна');
    }

    return {
        average: avgRps,
        stdDev,
        coefficientOfVariation: cv,
        min: Math.min(...rpsValues),
        max: Math.max(...rpsValues),
        hasDegradation,
    };
}

// Для CI/CD проверки деградации
async function checkForRegression(baselineRps, thresholdPercent = 10) {
    const currentResult = await stableRpsTest({
        durationSeconds: 30,
        concurrency: FIXED_CONCURRENCY,
    });

    const degradation = ((baselineRps - currentResult.rps) / baselineRps) * 100;
    const hasRegression = degradation > thresholdPercent;

    console.log(`\n🔍 Проверка регрессии:`);
    console.log(`   Baseline: ${baselineRps.toFixed(0)} RPS`);
    console.log(`   Current: ${currentResult.rps.toFixed(0)} RPS`);
    console.log(`   Изменение: ${degradation.toFixed(1)}%`);

    if (hasRegression) {
        console.log(`❌ ОБНАРУЖЕНА РЕГРЕССИЯ (>${thresholdPercent}%)`);
        process.exit(1); // Фейлим сборку
    } else {
        console.log(`✅ Регрессии не обнаружено`);
    }
}

// Запуск
if (require.main === module) {
    runStabilitySuite().catch(console.error);
}

module.exports = { stableRpsTest, checkForRegression };
