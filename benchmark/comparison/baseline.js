// benchmark/comparison/baseline.js — регрессионный контроль латентности
// для CI night-job: гоняет ОДИН маркерный сценарий на каждом стенде
// (steady-state, тот же путь, что и основной стенд) и сверяет p50 umbot
// с baseline из baseline.json. Отвечает на вопрос «не занёс ли кто-то
// в горячий путь регрессию» — автоматикой, а не ручным прогоном.
//
// Запуск:
//   node --expose-gc baseline.js update   # записать/обновить baseline
//   node --expose-gc baseline.js check    # свериться с baseline (exit 1 при регрессии)
//
// Допуск: p50 не должен превышать baseline больше чем на BASELINE_TOLERANCE
// (JIT-шум между машинами/прогонами — обычно <10%; 15% — граница сигнала).
// Basline хранится в git (baseline.json) — машины CI разные, поэтому
// baseline создаётся на машине CI (update в setup-job), а check гоняется
// на той же машине ночным джобом.
//
// Почему один маркерный сценарий: полный прогон 5 стендов × 13 сценариев
// занимает ~40 минут; регрессия горячего пути видна на любом сценарии
// со сканом (50/точное — середина списка, скан 25 команд до совпадения).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MODE = process.argv[2];
if (MODE !== 'update' && MODE !== 'check') {
    console.error('Использование: node --expose-gc baseline.js update|check');
    process.exit(1);
}

const STANDS = ['telegram.js', 'alisa.js', 'vk.js', 'viber.js', 'max.js'];
// Маркерный сценарий для всех стендов: средний по стоимости, со сканом.
const MARKER_SCENARIO = '50 команд, точное совпадение';
const BASELINE_TOLERANCE = 1.15;
const BASELINE_FILE = path.join(__dirname, 'baseline.json');
// Замер: 3 раунда × 1000 запросов после выхода на плато (медиана раундов).
const ROUNDS = 3;
const REQ = 1000;

const median = (a) => {
    const s = [...a].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
};

/**
 * Замер p50 umbot на маркерном сценарии одного стенда — тем же кодом,
// что и основной стенд (make/setup/run + прогрев до плато), но в отдельном
 * процессе с фиксированными раундами: результат стабилен между запускками.
 */
function measureStand(standFile) {
    const code = `
        const { performance } = require('perf_hooks');
        const runner = require(${JSON.stringify(path.join(__dirname, 'runner.js'))});
        const opts = require(${JSON.stringify(path.join(__dirname, standFile))}).buildBenchOptions();
        const fws = [runner.umbotParticipant(opts)];
        const fw = fws[0];
        const sc = { name: ${JSON.stringify(MARKER_SCENARIO)}, cmds: 50, kind: 'text', hit: 'exact' };
        const requests = [];
        for (let i = 0; i < ${REQ}; i++) requests.push('cmd_25_');
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        (async () => {
            const roundP50s = [];
            for (let round = 0; round < ${ROUNDS}; round++) {
                const inst = fw.make();
                fw.setup(inst, sc);
                await sleep(50);
                // Прогрев до плато — как в runner.js v4.
                const median = (a) => { const s=[...a].sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };
                let prev = Infinity;
                for (let b = 0; b < 20; b++) {
                    const out = [];
                    for (let i = 0; i < 500; i++) {
                        const s = performance.now();
                        await fw.run(inst, requests[i], i);
                        out.push(performance.now() - s);
                    }
                    const cur = median(out);
                    if (cur > prev / 1.03) break;
                    prev = cur;
                }
                const out = [];
                for (let i = 0; i < requests.length; i++) {
                    const s = performance.now();
                    await fw.run(inst, requests[i], i);
                    out.push(performance.now() - s);
                }
                roundP50s.push(median(out) * 1000);
            }
            console.log('P50_US:' + JSON.stringify(roundP50s));
            process.exit(0);
        })().catch((e) => { console.error(e); process.exit(1); });
    `;
    const res = spawnSync(process.execPath, ['--expose-gc', '-e', code], {
        cwd: __dirname,
        encoding: 'utf8',
        timeout: 5 * 60 * 1000,
    });
    if (res.status !== 0) {
        return { error: (res.stderr || res.stdout || `exit ${res.status}`).slice(-300) };
    }
    const line = res.stdout
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.startsWith('P50_US:'));
    if (!line) {
        return { error: 'воркер не вернул P50_US' };
    }
    const roundP50s = JSON.parse(line.slice('P50_US:'.length));
    return { p50Us: median(roundP50s), roundP50s };
}

async function main() {
    const baseline =
        MODE === 'check' && fs.existsSync(BASELINE_FILE)
            ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))
            : {};

    const current = {};
    const failures = [];
    console.log(
        `baseline.js: режим ${MODE}, маркер «${MARKER_SCENARIO}», p50 umbot (медиана ${ROUNDS} раундов):`,
    );
    for (const stand of STANDS) {
        process.stdout.write(`  … ${stand}: `);
        const r = measureStand(stand);
        if (r.error) {
            console.log(`ошибка — ${r.error}`);
            failures.push(`${stand}: замер не удался (${r.error})`);
            continue;
        }
        current[stand] = r.p50Us;
        if (MODE === 'check') {
            const base = baseline[stand];
            if (base === undefined) {
                console.log(`${r.p50Us.toFixed(1)} мкс — baseline нет (пропускаю)`);
            } else if (r.p50Us > base * BASELINE_TOLERANCE) {
                console.log(
                    `${r.p50Us.toFixed(1)} мкс — РЕГРЕССИЯ (baseline ${base.toFixed(1)}, ` +
                        `допуск +${Math.round((BASELINE_TOLERANCE - 1) * 100)}%)`,
                );
                failures.push(
                    `${stand}: p50 ${r.p50Us.toFixed(1)} мкс > baseline ${base.toFixed(1)} × ${BASELINE_TOLERANCE}`,
                );
            } else {
                console.log(
                    `${r.p50Us.toFixed(1)} мкс — ок (baseline ${base.toFixed(1)}, ` +
                        `${r.p50Us <= base ? 'быстрее' : 'в допуске'})`,
                );
            }
        } else {
            console.log(`${r.p50Us.toFixed(1)} мкс`);
        }
    }

    if (MODE === 'update') {
        fs.writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 4) + '\n');
        console.log(`\nBaseline записан: ${BASELINE_FILE}`);
        return;
    }

    if (failures.length) {
        console.error(`\n${failures.length} регрессий/ошибок:`);
        for (const f of failures) console.error('  ✗ ' + f);
        process.exit(1);
    }
    console.log('\nРегрессий нет.');
}

main();
