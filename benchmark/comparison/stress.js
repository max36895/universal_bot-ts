// benchmark/comparison/stress.js — стресс-стенд: поведение под непрерывным
// потоком запросов (устойчивая пропускная способность, дрейф памяти, GC).
//
// Запуск:
//   npm i --prefix benchmark/comparison
//   node --expose-gc stress.js <platformFile> [durationSec] [inflight]
//   npm run stress:vk        # 30 с, VK: umbot vs vk-io
//   npm run stress:telegram  # 30 с, Telegram: umbot vs grammy vs telegraf
//
// Чем отличается от compare-стендов (это другой инструмент, не замена):
//   - compare — «микроскоп»: латентность ОДНОГО запроса в тепличных
//     условиях (серия await-ов, прогрев до плато). Отвечает на вопрос
//     «сколько стоит каркас на запрос».
//   - stress — «осциллограф»: непрерывный поток со скользящим окном
//     in-flight (по умолчанию 200), ротация 1000 user_id, трафик-микс
//     (точное/частичное/регулярка/fallback = 40/25/25/10). Отвечает на
//     вопрос «как фреймворк ведёт себя под реальной нагрузкой»: RPS
//     агрегатная, доля времени в GC, тренд пола кучи, утечка.
//
// Изоляция: каждый участник — отдельный дочерний процесс (--expose-gc).
// Причины: (1) кучи не смешиваются — утечку и GC-паузы каждого участника
// видно отдельно; (2) падение одного участника (например, по heap limit
// на безлимитном burst) роняет только его строку отчёта, а не весь стенд.
//
// Честность: микс и окно одинаковы у всех; порядок запуска чередуется
// (umbot первым, конкуренты следом — каждый в своём процессе, тепловой
// дрейф между запусками компенсируется длительностью, а не интерливингом).
// Участник, упавший по OOM/crash, получает честную строку «вылетел».
const { spawn } = require('child_process');
const path = require('path');

const DEFAULT_DURATION_SEC = 30;
const DEFAULT_INFLIGHT = 200;

const USAGE =
    'Использование: node --expose-gc stress.js <platformFile.js> [durationSec] [inflight]\n' +
    '  platformFile.js — файл стенда платформы: vk.js | telegram.js | alisa.js | viber.js | max.js';

/**
 * Список участников из файла платформы: umbot + конкуренты.
 * Требует, чтобы платформенные файлы экспортировали buildBenchOptions()
 * (все стенды экспортируют — см. telegram.js и др.).
 */
function participantsOf(platformFile) {
    const opts = require(path.resolve(platformFile)).buildBenchOptions();
    return ['umbot', ...opts.competitors.map((c) => c.name)];
}

/**
 * Запускает одного участника в отдельном процессе и собирает его отчёт.
 * Стабильный маппинг «имя участника → env STRESS_PARTICIPANT»:
 * воркер по нему выбирает, кого из участников файла поднимать.
 */
function runParticipant(platformFile, participant, durationSec, inflight, reportEverySec) {
    return new Promise((resolve) => {
        const args = [
            '--expose-gc',
            path.join(__dirname, 'stress-worker.js'),
            path.resolve(platformFile),
            String(durationSec),
            String(inflight),
            String(reportEverySec),
        ];
        const child = spawn(process.execPath, args, {
            cwd: __dirname,
            env: { ...process.env, STRESS_PARTICIPANT: participant },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        let exited = false;
        const finish = (result) => {
            if (exited) return;
            exited = true;
            resolve(result);
        };
        child.stdout.on('data', (d) => (stdout += d));
        child.stderr.on('data', (d) => (stderr += d));
        // Основной таймаут: durationSec + 60 с запаса на хвост и GC.
        const guardMs = (durationSec + 60) * 1000;
        const guard = setTimeout(() => {
            if (!exited) {
                child.kill('SIGKILL');
                finish({
                    participant,
                    crashed: true,
                    crashReason: `таймаут ${durationSec + 60} с (процесс не завершился)`,
                });
            }
        }, guardMs);
        guard.unref?.();
        child.on('error', (e) => {
            clearTimeout(guard);
            finish({ participant, crashed: true, crashReason: e.message });
        });
        child.on('close', (code, signal) => {
            clearTimeout(guard);
            const line = stdout
                .split('\n')
                .map((l) => l.trim())
                .filter((l) => l.startsWith('STRESS_REPORT:'))
                .pop();
            if (line) {
                try {
                    finish({
                        participant,
                        crashed: false,
                        ...JSON.parse(line.slice('STRESS_REPORT:'.length)),
                    });
                    return;
                } catch {
                    // fallthrough в crashed
                }
            }
            finish({
                participant,
                crashed: true,
                crashReason:
                    signal === 'SIGKILL'
                        ? 'убит по heap limit / таймауту (SIGKILL)'
                        : `код выхода ${code ?? '?'}${stderr ? ': ' + stderr.slice(-400) : ''}`,
            });
        });
    });
}

async function main() {
    const [platformFileArg, durationArg, inflightArg] = process.argv.slice(2);
    if (!platformFileArg) {
        console.error(USAGE);
        process.exit(1);
    }
    const platformFile =
        platformFileArg.startsWith(path.sep) || /^[A-Za-z]:/.test(platformFileArg)
            ? platformFileArg
            : path.join(__dirname, platformFileArg);

    const durationSec = parseInt(durationArg, 10) || DEFAULT_DURATION_SEC;
    const inflight = parseInt(inflightArg, 10) || DEFAULT_INFLIGHT;
    // Сэмпл памяти каждые 1 с: 30-секундный тест даёт 30 точек тренда —
    // пилу видно, и не тратится CPU на лишние memoryUsage().
    const reportEverySec = 1;

    let names;
    try {
        names = participantsOf(platformFile);
    } catch (e) {
        console.error(`Не удалось прочитать участников из ${platformFile}: ${e.message}`);
        process.exit(1);
    }

    console.log(`Стресс-стенд: ${path.basename(platformFile)}`);
    console.log(
        `Участники: ${names.join(', ')} | длительность ${durationSec} с | окно ${inflight} запросов in-flight`,
    );
    console.log(
        'Микс: точное 40% / частичное 25% / регулярка 25% / fallback 10%, 1000 разных user_id, 1000 команд.',
    );
    console.log('');

    const results = [];
    for (const name of names) {
        process.stdout.write(`  … ${name} (${durationSec} с)\n`);
        const res = await runParticipant(platformFile, name, durationSec, inflight, reportEverySec);
        results.push(res);
        if (res.crashed) {
            console.log(`  ✗ ${name}: вылетел — ${res.crashReason}`);
        } else {
            console.log(
                `  ✓ ${name}: ${res.rps.toLocaleString('ru-RU')} RPS, p50 ${res.p50Us.toFixed(1)} мкс, ` +
                    `утечка ${(res.leakKB || 0).toFixed(1)} КБ/1000 запр`,
            );
        }
    }

    // ── Сводная таблица ─────────────────────────────────────────────────────
    // Формат числа с разрядами (ru-RU): 1 234 567.
    const fmtNum = (n) => Math.round(n).toLocaleString('ru-RU');
    const fmtUs = (us) => (us >= 10000 ? fmtNum(us / 1000) + ' мс' : us.toFixed(0));
    // Ширины колонок под самые длинные значения (имена до 18, RPS до 9 знаков).
    const C = { name: 20, reqs: 11, rps: 10, p50: 10, p95: 10, p99: 10, gc: 6, heap: 9, leak: 16 };
    const line = '─'.repeat(
        C.name + C.reqs + C.rps + C.p50 + C.p95 + C.p99 + C.gc + C.heap + C.leak,
    );

    console.log('');
    console.log(line);
    console.log(
        'Участник'.padEnd(C.name) +
            'Запросов   '.padStart(C.reqs) +
            'RPS'.padStart(C.rps) +
            'p50'.padStart(C.p50) +
            'p95'.padStart(C.p95) +
            'p99'.padStart(C.p99) +
            'GC,%'.padStart(C.gc) +
            'Куча, МБ'.padStart(C.heap) +
            'Утечка'.padStart(C.leak),
    );
    console.log(line);

    for (const r of results) {
        if (r.crashed) {
            console.log(
                `✗ ${r.participant}`.padEnd(C.name) +
                    `вылетел: ${r.crashReason?.slice(0, line.length - C.name - 9) ?? 'неизвестно'}`,
            );
            continue;
        }
        console.log(
            `  ${r.participant}`.padEnd(C.name) +
                fmtNum(r.totalSent).padStart(C.reqs - 1) +
                ' ' +
                fmtNum(r.rps).padStart(C.rps - 1) +
                ' ' +
                fmtUs(r.p50Us).padStart(C.p50 - 1) +
                ' ' +
                fmtUs(r.p95Us).padStart(C.p95 - 1) +
                ' ' +
                fmtUs(r.p99Us).padStart(C.p99 - 1) +
                ' ' +
                r.gcSharePct.toFixed(1).padStart(C.gc - 1) +
                ' ' +
                `${r.heapFirstMB.toFixed(0)}→${r.heapLastMB.toFixed(0)}`.padStart(C.heap - 1) +
                ' ' +
                (r.leakTotalKB <= 0
                    ? 'нет (GC-шум)'.padStart(C.leak - 1)
                    : `${r.leakKB.toFixed(2)} КБ/1000з`.padStart(C.leak - 1)),
        );
    }
    console.log(line);
    console.log('');
    console.log('Запросов — выполнено за всё время теста (успешные).');
    console.log(`RPS — устойчивая пропускная способность: окно ${inflight} запросов`);
    console.log('in-flight, НЕ 1000/p50 тепличного стенда — другой режим работы.');
    console.log('p50/p95/p99 — латентность одного запроса под этим потоком;');
    console.log('у всех растёт против тепличных цифр — очередь задач.');
    console.log('GC,% — доля времени теста в сборках мусора.');
    console.log('Куча — «первый сэмпл → последний»: пол пилы не должен расти.');
    console.log('Утечка — retained-дельта после финального GC (роста пола нет,');
    console.log('пила транзиентного мусора — норма и не утечка).');
    console.log(
        `Воспроизведение: node --expose-gc stress.js ${path.basename(platformFile)} ${durationSec} ${inflight}`,
    );
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
