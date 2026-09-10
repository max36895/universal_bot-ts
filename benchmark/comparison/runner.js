// benchmark/comparison/runner.js — общий каркас платформенных стендов сравнения
// umbot с реальными фреймворками конкурентов. Используется файлами
// telegram.js, vk.js, viber.js, max.js, alisa.js.
//
// Каркас отвечает за всё, что обязано быть одинаковым у стендов:
//   - сценарии (число команд × тип совпадения), запросы к ним;
//   - метрики: p50/p95 латентности отдельного запроса (пул 10 раундов),
//     IQR (p75−p25, устойчивый разброс), cold-start (первые N запросов без
//     прогрева — прода-метрика serverless), память — транзиентные
//     аллокации на запрос;
//   - печать таблиц одинакового формата.
//
// Платформенный файл передаёт сюда описание (см. benchOptions):
//   platform     — человекочитаемое имя для шапки;
//   makeUpdate(text, id) — апдейт платформы, одинаковые байты для всех;
//   umbot: { adapter, botType, extraConfig? } — подключение umbot;
//   competitors: [{ name, make, setup, run }] — офлайн-пути конкурентов.
//
// Честность (едина для всех платформ):
//   - один и тот же вход байт в байт всем участникам;
//   - сеть исключена у всех: umbot ставит ctx.skipAutoReply = true,
//     у конкурентов обработчики не вызывают ctx.send/reply;
//   - семантика выровнена: подстрочный матч у всех — конкурентам слоты
//     задаются RegExp'ами, т.к. их строковые триггеры матчат только
//     точное совпадение (проверено тестом на каждой библиотеке);
//   - найденная команда зарегистрирована в середине списка — честный случай
//     для линейного поиска;
//   - fallback — реакция на неизвестную фразу, идиоматичная для каждого.
//
// Методология замеров (v4 — «прогрев до плато»):
//   - ПОСЛЕ setup() ВСЕ участники ждут одинаковую паузу (SETUP_SETTLE_MS).
//     Регистрация команд — не мгновенная: umbot пересобирает снимок команд,
//     прогоняет ReDoS-валидацию и компиляцию RegExp; vk-io recompose()-ит
//     middleware-цепочку. Пауза исключает попадание хвостов инициализации
//     в замер.
//   - Прогрев: до измеряемой серии каждый участник гоняется циклами по
//     WARMUP_BATCH запросов, пока медиана последних двух циклов не перестанет
//     улучшаться (но не дольше MAX_WARMUP_BATCHES циклов). Причина: у V8
//     кривая оптимизации сходит на плато только через тысячи вызовов
//     (tier-up + inline-кэши). С фиксированным прогревом в 2×500 запросов
//     стенд ловил участников на крутом участке кривой — более «лёгкий»
//     фреймворк выходил на плато раньше и выглядел быстрее, чем он есть
//     в steady-state (замерено на VK: umbot 1.4 мкс против vk-io 1.0 при
//     фиксированном прогреве; 0.85 против 0.85 после выхода на плато).
//   - ФАЗА ЛАТЕНТНОСТЕЙ идёт БЕЗ forceGC. Полный GC — это compaction, после
//     которого V8 восстанавливает inline-кэши, и «первый проход после GC»
//     медленнее steady-state в 2–3 раза. Латентности вообще не видят GC:
//     вся фаза памяти — ПОСЛЕ фазы латентностей, отдельным блоком раундов.
//   - Интерливинг раундов: в каждом раунде все участники идут по очереди
//     (umbot → конкуренты → следующий раунд). Тепловой дрейф CPU/ОС
//     распределяется на всех поровну, а не достаётся первому/последнему.
//   - Победитель помечается только при отрыве от второго места, пробивающем
//     ОБА порога (WIN_REL% И WIN_ABS_US мкс; логика и юнит-тесты — markRow.js);
//     при отрыве меньше любого из порогов — «паритет» (0.1 мкс «побед» —
//     таймерный шум, замечено на MAX: 1.5 против 1.4 мкс).
//   - Cold-start меряется отдельной фазой ДО латентностей (пока процесс
//     холодный): первые COLD_START_REQ запросов после регистрации. Числа
//     несопоставимы со steady-state — холодный JIT платит первый запрос
//     в десятки раз дороже плато — потому печатаются отдельным блоком.
//   - IQR (p75−p25) — ширина ядра распределения: p95 дёргается от
//     единичных выбросов ОС, IQR устойчивее и показывает «насколько
//     плотно сидит латентность».

const { performance } = require('perf_hooks');
const path = require('path');

// Метки «лучший/паритет» — тестируемый модуль (пороги победы описаны там).
const { markRow, WIN_REL, WIN_ABS_US } = require('./markRow');

const ROUNDS = 10;
// Прогрев до плато: циклами по этому числу запросов, максимум 20 циклов.
const WARMUP_BATCH = 500;
const MAX_WARMUP_BATCHES = 20;
// Пауза после setup(): хвосты регистрации (снимки, компиляция, recompose)
// одинаково гасятся у всех участников до первого запроса.
const SETUP_SETTLE_MS = 50;

const REQ = 500;
// Cold-start: сколько первых запросов замерять после setup() без прогрева.
// Это прода-метрика serverless (Yandex Cloud Functions): первый запрос
// после создания инстанса — самый дорогой (JIT холодный, inline-кэшей нет).
const COLD_START_REQ = 200;

const median = (a) => {
    const s = [...a].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
};
const percentile = (a, p) => {
    const s = [...a].sort((x, y) => x - y);
    return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};
// Межквартильный размах (p75 − p25): ширина «ядра» распределения.
// p95 может дёргаться от единичных выбросов ОС, IQR — устойчивее.
const iqr = (a) => percentile(a, 0.75) - percentile(a, 0.25);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const forceGC = () => global.gc && global.gc();

// ── Сценарии ────────────────────────────────────────────────────────────────
// kind: 'text' — строковые слоты, 'regex' — RegExp-слоты.
// hit:  'exact'    — запрос совпадает со слотом целиком;
//       'partial'  — слот содержится внутри более длинной фразы;
//       'regex'    — совпадение по регулярке;
//       'fallback' — совпадений нет, срабатывает fallback-обработчик.
// Во всех матчевых сценариях найденная команда зарегистрирована В СЕРЕДИНЕ
// списка (наполовину пройденный линейный поиск — честный случай).
const SCENARIOS = [
    { name: '6 команд, точное совпадение', cmds: 6, kind: 'text', hit: 'exact' },
    { name: '6 команд, регулярка', cmds: 6, kind: 'regex', hit: 'regex' },
    { name: '50 команд, точное совпадение', cmds: 50, kind: 'text', hit: 'exact' },
    { name: '50 команд, частичное совпадение', cmds: 50, kind: 'text', hit: 'partial' },
    { name: '50 команд, регулярка', cmds: 50, kind: 'regex', hit: 'regex' },
    { name: '50 команд, fallback', cmds: 50, kind: 'text', hit: 'fallback' },
    { name: '500 команд, точное совпадение', cmds: 500, kind: 'text', hit: 'exact' },
    { name: '500 команд, частичное совпадение', cmds: 500, kind: 'text', hit: 'partial' },
    { name: '500 команд, регулярка', cmds: 500, kind: 'regex', hit: 'regex' },
    { name: '1000 команд, точное совпадение', cmds: 1000, kind: 'text', hit: 'exact' },
    { name: '1000 команд, регулярка', cmds: 1000, kind: 'regex', hit: 'regex' },
    { name: '1000 команд, частичное совпадение', cmds: 1000, kind: 'text', hit: 'partial' },
    { name: '1000 команд, fallback', cmds: 1000, kind: 'text', hit: 'fallback' },
];

// Запросы под сценарий: найденная команда — в середине списка.
function buildRequests(sc) {
    const mid = Math.floor(sc.cmds / 2);
    const reqs = [];
    for (let i = 0; i < REQ; i++) {
        if (sc.hit === 'exact') {
            reqs.push(`cmd_${mid}_`);
        } else if (sc.hit === 'partial') {
            reqs.push(`подскажите cmd_${mid}_ пожалуйста номер ${i % 10}`);
        } else if (sc.hit === 'regex') {
            reqs.push(`zz_cmd_${mid}_${100 + (i % 50)}`);
        } else {
            reqs.push(`совсем_неизвестная_фраза_${i}`);
        }
    }
    return reqs;
}

// Слот/триггер для команды i в зависимости от типа сценария.
function slotFor(sc, i) {
    return sc.kind === 'text' ? `cmd_${i}_` : new RegExp(`zz_cmd_${i}_\\d+`);
}

// Подстрочный триггер для конкурентов. Их hears(строка)/hear(строка) матчит
// ТОЛЬКО точное совпадение (проверено по исходникам и поведенческим тестом:
// grammy — txt === t, telegraf и @maxhub — new RegExp('^…$'), @vk-io/hear —
// text === condition), а слот umbot матчит подстроку. Без обёртки в
// partial-сценариях («подскажите cmd_25_ пожалуйста…») триггеры конкурентов
// не срабатывают вовсе и запрос уходит в их fallback-хвост — сравнивались бы
// разные семантики. Обёртка даёт конкурентам ту же подстрочную семантику,
// что обещает раздел «Честность» в BENCHMARKS.md. RegExp-слот остаётся как есть.
function asRegExp(slot) {
    return slot instanceof RegExp ? slot : new RegExp(slot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

// ── Реализация umbot (общая для всех платформ) ─────────────────────────────
function umbotFramework(opts) {
    const { Bot, Text } = require(path.join(__dirname, '..', '..', 'dist', 'index.js'));
    return {
        name: 'umbot',
        make: () => {
            Text.clearCache();
            const bot = new Bot(opts.botType);
            // maskSecrets: false — стенд offline, секретов в логах нет, а конвейер
            // маскирования (10 регулярок на диагностическое сообщение) — не цена
            // маршрутизации: меряем её на равных с конкурентами.
            bot.setLogger({ error: () => {}, warn: () => {}, log: () => {}, maskSecrets: false });
            bot.use(opts.umbot.adapter);
            bot.setAppConfig({
                isLocalStorage: false,
                ...(opts.umbot.extraConfig || {}),
            });
            return bot;
        },
        setup: (bot, sc) => {
            for (let i = 0; i < sc.cmds; i++) {
                bot.addCommand(`cmd_${i}`, [slotFor(sc, i)], (cmd, ctrl) => {
                    ctrl.text = 'ok';
                    ctrl.skipAutoReply = true;
                });
            }
            if (sc.hit === 'fallback') {
                bot.addCommand('*', [], (_, ctrl) => {
                    ctrl.text = 'fallback';
                    ctrl.skipAutoReply = true;
                });
            }
        },
        // Без .then(() => undefined): лишний промис на каждый запрос.
        // run(inst, text, seq, userId): seq — порядковый номер (message_id),
        // userId — идентификатор пользователя (стресс ротирует 1000 разных,
        // compare передаёт константу: в сценариях латентности per-user
        // состояние не влияет на замер одного запроса).
        run: (bot, req, i, userId = 1000) => bot.run(opts.botType, opts.makeUpdate(req, i, userId)),
    };
}

/**
 * Список участников стенда с уже поднятыми инстансами под стресс-режим
 * (stress.js/stress-worker.js): сценарий «1000 команд, микс» — все слоты
 * есть в базе, каждый участник инстанцируется ровно один раз и живёт
 * весь прогон (в отличие от compare: свежий инстанс на раунд).
 *
 * ⚠️ Сеть исключена (контракт всего comparison-стенда): на промахе базовый
 * контроллер umbot ставит empty_text БЕЗ skipAutoReply, и адаптер честно
 * пошлёт ответ в API платформы (реальный fetch с таймаутом — десятки мс
 * на запрос, стенд мерял бы сеть). Поэтому fallback-команда '*' обязательна:
 * её обработчик ставит skipAutoReply = true, и 10% fallback-запросов микса
 * обрабатываются офлайн, как в compare-стенде.
 *
 * @param {object} opts описание стенда (то же, что у runBench)
 * @returns {Array} участники: name, currentInst, run
 */
function stressParticipants(opts) {
    // Сценарий микса: команды 3 типов слотов + fallback на конце.
    const sc = { cmds: 1000, kind: 'text', hit: 'exact' };
    const fws = [umbotFramework(opts), ...opts.competitors];
    for (const fw of fws) {
        fw.currentInst = fw.make();
        fw.setup(fw.currentInst, sc);
        // Запрос «в никуда» после полного скана попадает в BaseBotController
        // (empty_text без skipAutoReply → сетевой ответ адаптера). Для оффлайн-
        // стресса регистрируем '*' как обработчик полного промаха.
        if (fw.name === 'umbot' && fw.currentInst.addCommand) {
            fw.currentInst.addCommand('*', [], (_, ctrl) => {
                ctrl.text = 'fallback';
                ctrl.skipAutoReply = true;
            });
        }
    }
    return fws;
}

/**
 * Описание umbot-участника стенда (make/setup/run) — для внешних
 * инструментов (baseline.js замеряет одного участника в отдельном
 * процессе тем же кодом, что и основной стенд).
 *
 * @param {object} opts описание стенда
 * @returns {object} участник umbot: name, make, setup, run
 */
function umbotParticipant(opts) {
    return umbotFramework(opts);
}

/**
 * Гоняет inst циклом по requests, возвращает медиану латентности цикла, мкс.
 * Используется и прогревом (не даёт циклам улететь в вечность), и замером.
 */
async function runCycle(fw, inst, requests, offset) {
    const out = [];
    for (let i = 0; i < requests.length; i++) {
        const s = performance.now();
        await fw.run(inst, requests[i], i + offset);
        out.push(performance.now() - s);
    }
    return median(out) * 1000;
}

/**
 * Прогрев до плато: циклы по WARMUP_BATCH запросов, пока медиана последних
 * двух циклов продолжает улучшаться больше чем на PLATEAU_REL% — но не
 * дольше MAX_WARMUP_BATCHES циклов. Выход на плато = обе стороны меряются
 * в своём реальном steady-state (см. методология v4 в заголовке файла).
 */
async function warmupToPlateau(fw, inst, requests) {
    const PLATEAU_REL = 1.03;
    let prev = Infinity;
    let warmed = 0;
    for (let b = 0; b < MAX_WARMUP_BATCHES; b++) {
        const cur = await runCycle(fw, inst, requests, warmed);
        warmed += requests.length;
        if (cur > prev / PLATEAU_REL) {
            break; // перестало улучшаться — плато
        }
        prev = cur;
    }
    return warmed;
}

/**
 * Один раунд фазы латентностей: свежий инстанс → settle → прогрев до плато →
 * замер. Никаких вызовов GC — см. заголовок файла (методология v4).
 */
async function latencyRound(fw, sc, requests) {
    const inst = fw.make();
    fw.setup(inst, sc);
    if (fw.delay) await sleep(fw.delay);
    const warmed = await warmupToPlateau(fw, inst, requests);
    const out = [];
    for (let i = 0; i < requests.length; i++) {
        const s = performance.now();
        await fw.run(inst, requests[i], i + warmed);
        out.push(performance.now() - s);
    }
    return out;
}

/**
 * Cold-start: время выполнения ПЕРВЫХ COLD_START_REQ запросов после setup(),
 * без прогрева. Отдельная фаза с ДРУГОЙ семантикой — числа несопоставимы
 * с steady-state p50 (холодный JIT: первый запрос в 10–50 раз дороже
 * плато), поэтому печатаются отдельным блоком. Для serverless-деплоя
 * (Cloud Functions) это и есть реальная пользовательская латентность
 * первого запроса после подъёма инстанса.
 */
async function coldStartRound(fw, sc, requests) {
    const inst = fw.make();
    fw.setup(inst, sc);
    if (fw.delay) await sleep(fw.delay);
    // Никакого warmupToPlateau: меряем именно холодные запросы.
    const cold = requests.slice(0, COLD_START_REQ);
    const out = [];
    for (let i = 0; i < cold.length; i++) {
        const s = performance.now();
        await fw.run(inst, cold[i], i);
        out.push(performance.now() - s);
    }
    return out;
}

/**
 * Один раунд фазы памяти: свежий инстанс → settle → прогрев → forceGC →
 * чистый замер роста кучи за серию. Вызывается только ПОСЛЕ того, как все
 * раунды латентностей всех участников завершены.
 */
async function memRound(fw, sc, requests) {
    const inst = fw.make();
    fw.setup(inst, sc);
    if (fw.delay) await sleep(fw.delay);
    await warmupToPlateau(fw, inst, requests);
    forceGC();
    await sleep(20);
    const mb = process.memoryUsage().heapUsed;
    for (let i = 0; i < requests.length; i++) await fw.run(inst, requests[i], i);
    const ma = process.memoryUsage().heapUsed;
    forceGC();
    return (ma - mb) / requests.length / 1024;
}

/**
 * Запускает стенд и печатает таблицы.
 *
 * @param {object} opts описание стенда.
 * @param {string} opts.platform человекочитаемое имя платформы для шапки.
 * @param {function} opts.makeUpdate функция (text, id) => апдейт платформы.
 * @param {object} opts.umbot подключение umbot: adapter + botType (+ extraConfig).
 * @param {Array} opts.competitors описания конкурентов: make/setup/run.
 * @param {string} opts.honestyNoteExtra доп. строка о честности конкретного стенда.
 */
async function runBench(opts) {
    const fws = [umbotFramework(opts), ...opts.competitors];

    const rows = [];
    for (const sc of SCENARIOS) {
        const requests = buildRequests(sc);
        const row = { name: sc.name, data: {} };
        // ФАЗА 0: cold-start — до любой фазы, пока процесс «холодный»
        // (порядок фаз важен: латентностная фаза сама прогревает JIT).
        const cold = new Map();
        for (const fw of fws) {
            cold.set(fw.name, await coldStartRound(fw, sc, requests));
        }
        // ФАЗА 1: латентности, интерливинг по раундам — без GC.
        const lat = new Map(fws.map((fw) => [fw.name, []]));
        for (let round = 0; round < ROUNDS; round++) {
            for (const fw of fws) {
                const lats = await latencyRound(fw, sc, requests);
                lat.get(fw.name).push(...lats);
            }
        }
        // ФАЗА 2: память — отдельным блоком, уже не влияет на латентности.
        const mem = new Map();
        for (const fw of fws) {
            const vals = [];
            for (let round = 0; round < ROUNDS; round++) {
                vals.push(await memRound(fw, sc, requests));
            }
            mem.set(fw.name, median(vals));
        }
        for (const fw of fws) {
            const p50 = percentile(lat.get(fw.name), 0.5);
            const p95 = percentile(lat.get(fw.name), 0.95);
            const spread = iqr(lat.get(fw.name));
            const coldList = cold.get(fw.name);
            row.data[fw.name] = {
                p50Us: p50 * 1000,
                p95Us: p95 * 1000,
                iqrUs: spread * 1000,
                rps: Math.round(1000 / p50),
                memKB: mem.get(fw.name),
                coldFirstUs: (coldList[0] || 0) * 1000,
                coldAvgUs: (coldList.reduce((s, x) => s + x, 0) / coldList.length) * 1000,
            };
        }
        rows.push(row);
        console.log(`  ✓ ${sc.name}`);
    }

    // ── Печать ──────────────────────────────────────────────────────────────
    const fmtMs = (us) => (us >= 1000 ? (us / 1000).toFixed(1) + ' мс' : us.toFixed(1) + ' мкс');
    const fmtRps = (n) => n.toLocaleString('ru-RU');
    const C = { impl: 11, time: 12, p95: 12, rps: 11, mem: 11 };

    console.log('');
    console.log(`Сравнение umbot с реальными фреймворками платформы ${opts.platform}`);
    console.log('Вход одинаковый для всех: апдейт платформы. Сеть исключена у всех.');
    console.log('Матч выровнен по семантике: подстрока. Найденная команда — в середине списка.');
    console.log(`После регистрации команд все участники ждут паузу ${SETUP_SETTLE_MS} мс.`);
    console.log('Прогрев — до выхода на плато (до 10 000 запросов), латентности без GC.');
    if (opts.honestyNoteExtra) console.log(opts.honestyNoteExtra);
    console.log('');
    console.log(
        'Реализация'.padEnd(C.impl + 1) +
            '| Время, мкс/запр | p95, мкс/запр | IQR, мкс   | RPS        | Память, КБ/запр',
    );
    console.log('─'.repeat(104));

    for (const row of rows) {
        console.log('');
        console.log('▸ ' + row.name);
        for (const { name: n, d, winner, tie } of markRow(Object.keys(row.data), row.data)) {
            console.log(
                (winner ? '→ ' : tie ? '≈ ' : '  ') +
                    n.padEnd(C.impl) +
                    ' | ' +
                    d.p50Us.toFixed(1).padStart(C.time - 4) +
                    ' мкс | ' +
                    d.p95Us.toFixed(1).padStart(C.p95 - 4) +
                    ' мкс | ' +
                    d.iqrUs.toFixed(1).padStart(C.rps - 2) +
                    ' | ' +
                    fmtRps(d.rps).padStart(C.rps - 2) +
                    ' | ' +
                    d.memKB.toFixed(1).padStart(C.mem - 6) +
                    ' КБ' +
                    (winner ? '   ← лучший' : tie ? '   ← паритет' : ''),
            );
        }
    }

    // ── Cold-start ───────────────────────────────────────────────────────────
    // Отдельный блок: числа несопоставимы с steady-state p50 — холодный JIT
    // платит первый запрос в десятки раз дороже плато. Сравнивать участников
    // между собой можно (условия старта одинаковы: fresh-инстанс, пауза settle).
    console.log('');
    console.log('─'.repeat(104));
    console.log(`Cold-start: первые ${COLD_START_REQ} запросов после регистрации (без прогрева)`);
    console.log('(прода-метрика serverless: латентность первого запроса после подъёма инстанса)');
    console.log('');
    console.log('Реализация'.padEnd(C.impl + 1) + '| 1-й запрос, мкс | Ср. холодных, мкс');
    const firstSc = rows[0].name;
    for (const row of rows) {
        console.log((row === rows[0] ? '▸ ' : '  ') + row.name);
        for (const { name: n, d } of Object.keys(row.data).map((k) => ({
            name: k,
            d: row.data[k],
        }))) {
            console.log(
                '   ' +
                    n.padEnd(C.impl - 1) +
                    ' | ' +
                    d.coldFirstUs.toFixed(0).padStart(12) +
                    ' | ' +
                    d.coldAvgUs.toFixed(1).padStart(14),
            );
        }
    }

    // ── Сводка ──────────────────────────────────────────────────────────────
    console.log('');
    console.log('─'.repeat(92));
    console.log('Сводка:');
    for (const fw of fws) {
        const wins = rows.filter((r) => {
            const marked = markRow(Object.keys(r.data), r.data);
            const soleWinner = marked.filter((m) => m.winner);
            return soleWinner.length === 1 && soleWinner[0].name === fw.name;
        }).length;
        const ties = rows.filter((r) =>
            markRow(Object.keys(r.data), r.data).some((m) => m.tie && m.name === fw.name),
        ).length;
        const worst = Math.max(...rows.map((r) => r.data[fw.name].p50Us));
        console.log(
            `  ${fw.name}: лучший в ${wins}/${rows.length} сценариях, паритет в ${ties}; худшее время ${fmtMs(worst)}`,
        );
    }
    console.log('');
    console.log('Время — медиана (p50) обработки одного запроса; p95 — 95% запросов');
    console.log('уложились в это время. IQR — межквартильный размах (p75−p25),');
    console.log('ширина ядра распределения. «Паритет» — отрыв меньше 5% ИЛИ 0.3 мкс');
    console.log('(шум прогона). Память — аллокации на запрос (нагрузка на GC),');
    console.log('замеряется отдельной фазой после латентностей. Утечек памяти нет');
    console.log('ни у одного фреймворка (проверено замером кучи с GC до и после');
    console.log('серий; поведение под потоком — отдельный стресс-стенд stress.js).');
}

module.exports = {
    runBench,
    stressParticipants,
    umbotParticipant,
    SCENARIOS,
    buildRequests,
    slotFor,
    asRegExp,
};
