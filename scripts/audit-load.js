/*
 * Нагрузочный стенд для аудита. Не является CI-тестом: результаты зависят от
 * процессора, версии Node.js и фоновой нагрузки на машину.
 *
 * Запуск: node --expose-gc scripts/audit-load.js
 * Настройки: AUDIT_REQUESTS=20000 AUDIT_RUNS=3 node --expose-gc scripts/audit-load.js
 */
const { performance } = require('node:perf_hooks');
const { Bot } = require('../dist/index.js');
const { AlisaAdapter } = require('../dist/plugins.js');

const REQUESTS = Number.parseInt(process.env.AUDIT_REQUESTS || '20000', 10);
const RUNS = Number.parseInt(process.env.AUDIT_RUNS || '3', 10);
const CONCURRENCY_LEVELS = [1, 32, 128];
const COMMAND_COUNT = 1500;

function forceGC() {
    if (!global.gc) {
        throw new Error('Нужен запуск Node.js с --expose-gc');
    }
    global.gc();
    global.gc();
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(sorted, ratio) {
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function makeRequest(command, id) {
    return {
        meta: {
            locale: 'ru-RU',
            timezone: 'Europe/Moscow',
            client_id: 'audit-load',
            interfaces: { screen: true },
        },
        request: { command, original_utterance: command, type: 'SimpleUtterance' },
        session: {
            session_id: `audit-${id}`,
            message_id: id,
            user_id: `user-${id}`,
            new: false,
        },
        state: { session: {} },
        version: '1.0',
    };
}

function createBot({ pattern = false, middlewareCount = 0 } = {}) {
    const bot = new Bot('alisa');
    bot.setLogger({ error: () => {}, warn: () => {}, log: () => {} });
    bot.setAppConfig({ isLocalStorage: true });
    bot.use(new AlisaAdapter());

    for (let i = 0; i < middlewareCount; i++) {
        bot.use(async (_ctx, next) => next());
    }
    for (let i = 0; i < COMMAND_COUNT; i++) {
        const trigger = pattern ? new RegExp(`^command-${i}$`) : `command-${i}`;
        bot.addCommand(
            `command_${i}`,
            [trigger],
            (input, ctx) => {
                ctx.text = input;
            },
            pattern,
        );
    }
    return bot;
}

async function execute(bot, requests, concurrency) {
    const latency = [];
    let cursor = 0;
    let errors = 0;
    const startedAt = performance.now();

    const worker = async () => {
        for (;;) {
            const index = cursor++;
            if (index >= requests.length) return;
            const requestStartedAt = performance.now();
            try {
                await bot.run('alisa', requests[index]);
            } catch {
                errors++;
            }
            latency.push(performance.now() - requestStartedAt);
        }
    };

    await Promise.all(Array.from({ length: concurrency }, worker));
    const durationMs = performance.now() - startedAt;
    latency.sort((a, b) => a - b);
    return {
        durationMs,
        rps: (requests.length * 1000) / durationMs,
        errors,
        p50: percentile(latency, 0.5),
        p95: percentile(latency, 0.95),
        p99: percentile(latency, 0.99),
    };
}

async function measureScenario(name, options, command) {
    const byConcurrency = new Map();
    for (const concurrency of CONCURRENCY_LEVELS) {
        const resultRuns = [];
        for (let run = 0; run < RUNS; run++) {
            const bot = createBot(options);
            // Для RegExp-групп CommandReg использует отложенную компиляцию.
            await new Promise((resolve) => setTimeout(resolve, 50));
            const warmup = Array.from({ length: 1000 }, (_, i) => makeRequest(command, -i - 1));
            await execute(bot, warmup, concurrency);
            forceGC();
            const heapBefore = process.memoryUsage().heapUsed;
            const requests = Array.from({ length: REQUESTS }, (_, i) => makeRequest(command, i));
            const result = await execute(bot, requests, concurrency);
            forceGC();
            const heapAfter = process.memoryUsage().heapUsed;
            result.heapRetainedBytes = heapAfter - heapBefore;
            resultRuns.push(result);
        }
        byConcurrency.set(concurrency, {
            rps: median(resultRuns.map((result) => result.rps)),
            p50: median(resultRuns.map((result) => result.p50)),
            p95: median(resultRuns.map((result) => result.p95)),
            p99: median(resultRuns.map((result) => result.p99)),
            heapRetainedBytes: median(resultRuns.map((result) => result.heapRetainedBytes)),
            errors: resultRuns.reduce((total, result) => total + result.errors, 0),
        });
    }

    console.log(`\n${name}`);
    console.log('concurrency | RPS median | p50 ms | p95 ms | p99 ms | retained heap | errors');
    for (const [concurrency, result] of byConcurrency) {
        console.log(
            `${String(concurrency).padStart(11)} | ${result.rps.toFixed(0).padStart(10)} | ` +
                `${result.p50.toFixed(3).padStart(6)} | ${result.p95.toFixed(3).padStart(6)} | ` +
                `${result.p99.toFixed(3).padStart(6)} | ${(result.heapRetainedBytes / 1024).toFixed(1).padStart(13)} KB | ${result.errors}`,
        );
    }
}

async function main() {
    if (!Number.isInteger(REQUESTS) || REQUESTS < 1000 || !Number.isInteger(RUNS) || RUNS < 1) {
        throw new Error('AUDIT_REQUESTS должен быть >= 1000, AUDIT_RUNS — целым числом >= 1');
    }
    console.log(
        `Node ${process.version}; requests=${REQUESTS}; runs=${RUNS}; commands=${COMMAND_COUNT}`,
    );
    console.log(
        'Параллельность здесь измеряет re-entrancy одного процесса Node.js, а не многопоточную CPU-параллельность.',
    );

    await measureScenario(
        '1500 строковых команд: команда в конце линейного поиска',
        {},
        'command-1499-extra',
    );
    await measureScenario(
        '1500 RegExp-команд: совпадение в конце',
        { pattern: true },
        'command-1499',
    );
    await measureScenario(
        '1500 строковых команд + 10 middleware',
        { middlewareCount: 10 },
        'command-1499-extra',
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
