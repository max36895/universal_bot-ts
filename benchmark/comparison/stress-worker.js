// benchmark/comparison/stress-worker.js — воркер стресс-стенда. Запускается
// ТОЛЬКО как дочерний процесс из stress.js: по одному процессу на участника
// (изоляция куч — падение одного по heap limit не роняет стенд и не
// загрязняет чужие метрики GC).
//
// Контракт запуска:
//   node --expose-gc stress-worker.js <platformFile> <durationSec> <inflight> <sampleSec>
//   env STRESS_PARTICIPANT — имя участника ('umbot' | имя конкурента).
//
// Что делает:
//   - поднимает участника по описанию из файла платформы (тот же make/
//     setup/run, что в обычном стенде) — стресс меряет то же самое, но
//     под потоком;
//   - гоняет запросы скользящим окном in-flight (устойчивая нагрузка,
//     а не безлимитный burst);
//   - трафик-микс: точное/частичное/регулярка/fallback = 40/25/25/10,
//     1000 команд, ротация 1000 разных user_id (прогревает per-user пути
//     и кэши, а не одну ветку одного слота);
//   - раз в sampleSec сэмплит heapUsed/rss (тренд пола пилы кучи);
//   - суммирует паузы GC (perf_hooks observer) — доля времени в GC;
//   - в конце forceGC → retained-дельта против старта = утечка.
//
// Отчёт: одна строка 'STRESS_REPORT: {json}' в stdout (последняя такая
// строка читается родителем; console.log вне отчёта запрещён).
const { performance, PerformanceObserver } = require('perf_hooks');
const path = require('path');

const [, , platformFile, durationSecArg, inflightArg, sampleSecArg] = process.argv;
const DURATION_MS = Math.max(5, parseInt(durationSecArg, 10) || 30) * 1000;
const INFLIGHT = Math.max(1, parseInt(inflightArg, 10) || 200);
const SAMPLE_MS = Math.max(1, parseInt(sampleSecArg, 10) || 1) * 1000;
const PARTICIPANT = process.env.STRESS_PARTICIPANT;

// ── Трафик-микс (детерминированный, один и тот же у всех участников) ────────
// bucket = i % 20: 0..7 точное, 8..12 частичное, 13..17 регулярка, 18..19 fallback.
const CMDS = 1000;
const MID = Math.floor(CMDS / 2);

function buildRequest(i) {
    const bucket = i % 20;
    if (bucket < 8) {
        return `cmd_${MID}_`;
    }
    if (bucket < 13) {
        return `подскажите cmd_${MID}_ пожалуйста номер ${i % 10}`;
    }
    if (bucket < 18) {
        return `zz_cmd_${MID}_${100 + (i % 50)}`;
    }
    return `совсем_неизвестная_фраза_${i % 100}`;
}

async function main() {
    if (!global.gc) {
        console.error('stress-worker требует --expose-gc (retained-замер утечки)');
        process.exit(1);
    }

    // Участники файла платформы инстанцируются stressParticipants(): make + setup
    // под стресс-сценарий (1000 команд, все типы слотов — микс гоняет всё).
    const { stressParticipants } = require('./runner');
    const opts = require(path.resolve(platformFile)).buildBenchOptions();
    const participants = stressParticipants(opts);
    const fw = participants.find((p) => p.name === PARTICIPANT);
    if (!fw) {
        console.error(
            `Участник "${PARTICIPANT}" не найден в ${platformFile}. ` +
                `Доступны: ${participants.map((p) => p.name).join(', ')}`,
        );
        process.exit(1);
    }

    // GC-наблюдатель: каждая пауза сборщика суммируется в gcPauseMs.
    let gcPauseMs = 0;
    const gcObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            gcPauseMs += entry.duration;
        }
    });
    gcObserver.observe({ entryTypes: ['gc'] });

    // Retained-база: после settle и GC — то, что процесс реально держит
    // до начала нагрузки.
    global.gc();
    await new Promise((r) => setTimeout(r, 200));
    const retainedBase = process.memoryUsage().heapUsed;

    const samples = [];
    const sampler = setInterval(() => {
        const mu = process.memoryUsage();
        samples.push({ t: performance.now(), heapUsed: mu.heapUsed, rss: mu.rss });
    }, SAMPLE_MS);

    const latencies = [];
    let totalSent = 0;
    let totalFailed = 0;

    // Прогрев отсутствует намеренно: стресс отвечает на вопрос «как фреймворк
    // ведёт себя под потоком с самого начала», включая JIT-прогрев.
    const startMs = performance.now();
    const deadline = startMs + DURATION_MS;

    let inflight = 0;
    let nextId = 0;

    const launchOne = async () => {
        const i = nextId++;
        const req = buildRequest(i);
        // Ротация 1000 разных user_id: прогревает per-user пути и кэши
        // (сессии, кэши имён), а не одну ветку одного пользователя.
        const userId = 1000 + (i % 1000);
        const t0 = performance.now();
        try {
            await fw.run(fw.currentInst, req, i, userId);
            totalSent++;
        } catch {
            totalFailed++;
        }
        latencies.push(performance.now() - t0);
    };

    // Скользящее окно: держим до INFLIGHT задач; завершение одной
    // немедленно запускает следующую, пока не наступит дедлайн.
    const pump = () => {
        while (inflight < INFLIGHT && performance.now() < deadline) {
            inflight++;
            launchOne().then(() => {
                inflight--;
                if (performance.now() < deadline) {
                    pump();
                }
            });
        }
    };
    pump();

    // Дожидаемся хвоста: без этого последние запросы выпадают из статистики.
    while (performance.now() < deadline || inflight > 0 || nextId === 0) {
        await new Promise((r) => setTimeout(r, 20));
        pump();
    }

    clearInterval(sampler);
    gcObserver.disconnect();

    const wallMs = performance.now() - startMs;
    // Квантили считаем ДО замера retained и затем освобождаем массив задержек:
    // он растёт на 8 байт на запрос и, оставаясь живым к финальному GC, попал бы
    // в «утечку» участника пропорционально числу запросов.
    latencies.sort((a, b) => a - b);
    const q = (p) =>
        latencies.length
            ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))]
            : 0;
    const quantiles = {
        p50Us: q(0.5) * 1000,
        p95Us: q(0.95) * 1000,
        p99Us: q(0.99) * 1000,
        maxUs: (latencies[latencies.length - 1] || 0) * 1000,
    };
    latencies.length = 0;

    // Retained-финал: весь транзиентный мусор собран; разница с базой — утечка.
    global.gc();
    await new Promise((r) => setTimeout(r, 200));
    const retainedFinal = process.memoryUsage().heapUsed;
    const leakTotalKB = Math.max(0, (retainedFinal - retainedBase) / 1024);

    const firstSample = samples[0] || { heapUsed: retainedBase, rss: 0 };
    const lastSample = samples[samples.length - 1] || firstSample;

    const report = {
        participant: fw.name,
        durationMs: Math.round(wallMs),
        totalSent,
        totalFailed,
        rps: Math.round(totalSent / (wallMs / 1000)),
        ...quantiles,
        gcSharePct: (gcPauseMs / wallMs) * 100,
        heapFirstMB: firstSample.heapUsed / 1024 / 1024,
        heapLastMB: lastSample.heapUsed / 1024 / 1024,
        rssLastMB: lastSample.rss / 1024 / 1024,
        leakTotalKB,
        leakKB: totalSent > 0 ? leakTotalKB / (totalSent / 1000) : 0,
    };
    console.log('STRESS_REPORT: ' + JSON.stringify(report));
    setTimeout(() => process.exit(0), 50).unref();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
