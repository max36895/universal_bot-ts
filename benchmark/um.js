// um.js
// Запуск: node --expose-gc --no-opt benchmark.js  (для стабильности)
// Бенчмарк, который показывает разницу между umbot, и максимально простой реализацией.
// Необходим для того, чтобы понимать примерную разницу, и чем приходится жертвовать ради функционала.
const { performance } = require('perf_hooks');
const { Bot, Text, BaseBotController } = require('./../dist/index.js');
const { AlisaAdapter } = require('./../dist/plugins.js');

function createAliceReq(utterance) {
    return {
        meta: {
            locale: 'ru-RU',
            timezone: 'Europe/Moscow',
            client_id: 'bench',
            interfaces: { screen: true },
        },
        request: { command: utterance, original_utterance: utterance, type: 'SimpleUtterance' },
        session: { session_id: 's1', message_id: 10, user_id: 'u1', new: false },
        state: { session: {} },
        version: '1.0',
    };
}

const SCENARIOS_RUNS = 15;
const REQUEST_COUNT = 400;
const COMMAND_COUNT = 1500;
// Сколько полных проходов по запросам выполняется на одном инстансе до замера
// steady-state: 2 прохода прогревают JIT/inline-кэши V8, третий меряется.
const WARMUP_PASSES = 2;

const forceGC = () => {
    if (global.gc) {
        global.gc();
        global.gc();
    }
};

class CleanRouter {
    constructor() {
        this.commands = [];
        this.ctxStore = new Map();
    }

    addCommand(name, slots, handler) {
        this.commands.push({ name, slots, handler });
    }

    isMatch(slot, text) {
        const t = (text || '').trim().toLowerCase();
        if (typeof slot === 'string') {
            const tr = slot.trim().toLowerCase();
            return t.includes(tr) || tr.includes(t);
        }
        if (slot instanceof RegExp) {
            slot.lastIndex = 0;
            return slot.test(t);
        }
        return false;
    }

    async run(_, req) {
        const id = req.session?.message_id || Date.now();
        this.ctxStore.set(id, req); // Эмуляция сохранения контекста

        const text = req.request?.original_utterance || '';
        for (const cmd of this.commands) {
            for (const slot of cmd.slots) {
                if (this.isMatch(slot, text)) {
                    const controller = {
                        text: '',
                    };
                    const res = cmd.handler(req, controller);
                    if (res instanceof Promise) {
                        await res;
                    }
                    this.ctxStore.delete(id);
                    return JSON.stringify({
                        version: req.version,
                        response: { text: controller.text, end_session: false },
                    });
                }
            }
        }

        this.ctxStore.delete(id);
        return JSON.stringify({
            version: req.version,
            response: {
                text: 'Команда не найдена. Попробуйте ещё раз.',
                end_session: false,
            },
        });
    }
}

const isLogic = process.argv.at(-1) === 'logic';
function initUmbot() {
    Text.clearCache();
    const bot = new Bot('alisa'); //, BaseBotController);
    if (isLogic) {
        bot._setBotController(new BaseBotController(bot.getAppContext())); // говорим чтобы контроллер не пересоздавался. это дает 0.002
    }
    bot.setLogger({
        error: () => {},
        warn: () => {},
        log: () => {},
    });
    // bot.setCommandGroupMode('no-group');
    bot.use(new AlisaAdapter());
    bot.setAppConfig({ isLocalStorage: true });
    /* bot.setCustomCommandResolver((_, commands) => {
        return commands.get(commands.keys()[0]);
    });*/
    if (isLogic) {
        return {
            addCommand: (name, triggers, handler) => {
                bot.addCommand(name, triggers, handler);
            },
            run: async (_, req) => {
                const controller = bot.getBotController();
                controller.userCommand = req.request.command;
                if (await controller.run()) {
                    return JSON.stringify({
                        version: req.version,
                        response: { text: controller.text, end_session: false },
                    });
                }
                return JSON.stringify({
                    version: req.version,
                    response: {
                        text: 'Команда не найдена. Попробуйте ещё раз.',
                        end_session: false,
                    },
                });
            },
        };
    }
    return bot;
}
debugger;

function setEmptyCommand(router, count = 25) {
    for (let i = 0; i < count; i++) {
        router.addCommand(
            `${Math.random()} empty_${i}`,
            [`${Math.random()} emp ${i}`],
            (cmd, ctrl) => {
                ctrl.text = `&% ${i} _!`;
            },
        );
    }
}

const SCENARIOS = [
    {
        name: `${COMMAND_COUNT} команд - ping запрос`,
        setup: (router) => {
            for (let i = 0; i < COMMAND_COUNT; i++) {
                const handler = (cmd, ctrl) => {
                    ctrl.text = `handled_${i}`;
                };
                router.addCommand(`cmd_${i}`, [`${i}cmd_${i}_$`], handler);
            }
        },
        getRequests: () =>
            Array.from({ length: REQUEST_COUNT }, () => ({
                meta: {
                    locale: 'ru-RU',
                    timezone: 'Europe/Moscow',
                    client_id: 'bench',
                    interfaces: { screen: true },
                },
                request: { original_utterance: 'ping', type: 'SimpleUtterance' },
                session: { session_id: 's1', message_id: 10, user_id: 'u1', new: false },
                state: { session: {} },
                version: '1.0',
            })),
    },
    {
        name: `${COMMAND_COUNT} RegEx | Не найдена`,
        setup: (router) => {
            for (let i = 0; i < COMMAND_COUNT; i++) {
                const handler = (cmd, ctrl) => {
                    ctrl.text = `handled_${i}`;
                };
                router.addCommand(`cmd_${i}`, [new RegExp(`^${i * 100}_cmd_${i}_\\d+$`)], handler);
            }
        },
        getRequests: () =>
            Array.from({ length: REQUEST_COUNT }, (_, i) =>
                createAliceReq(`${i}_unknown_cmd_${i}`),
            ),
    },
    {
        name: `${COMMAND_COUNT} RegEx | Все отработаны`,
        setup: (router) => {
            for (let i = 0; i < COMMAND_COUNT; i++) {
                const handler = (cmd, ctrl) => {
                    ctrl.text = `handled_${i}`;
                };
                router.addCommand(`cmd_${i}`, [new RegExp(`^${i * 100}_cmd_${i}_\\d+$`)], handler);
            }
        },
        getRequests: () =>
            Array.from({ length: REQUEST_COUNT + 1 }, (_, i) =>
                createAliceReq(`${i * 100}_cmd_${i}_${i}`),
            ),
    },
    {
        name: `${COMMAND_COUNT} | Не найдена`,
        setup: (router) => {
            for (let i = 0; i < COMMAND_COUNT; i++) {
                const handler = (cmd, ctrl) => {
                    ctrl.text = `handled_${i}`;
                };
                router.addCommand(`cmd_${i}`, [`cmd_${i}_`], handler);
            }
        },
        getRequests: () =>
            Array.from({ length: REQUEST_COUNT }, (_, i) =>
                createAliceReq(`${i}_unknown_cmd_${i}`),
            ),
    },
    {
        name: `${COMMAND_COUNT} | Все отработаны`,
        setup: (router) => {
            for (let i = 0; i < COMMAND_COUNT; i++) {
                const handler = (cmd, ctrl) => {
                    ctrl.text = `handled_${i}`;
                };
                router.addCommand(`cmd_${i}`, [`${i * 100}_cmd_${i}_`], handler);
            }
        },
        getRequests: () =>
            Array.from({ length: REQUEST_COUNT + 1 }, (_, i) =>
                createAliceReq(`${i * 100}_cmd_${i}_`),
            ),
    },
    {
        name: 'Найдена на 2 позиции',
        setup: (router) => {
            const cmds = [
                { t: 'стоп', r: 'stop' },
                { t: '2 привет 2', r: 'hello' },
                { t: 'отбой', r: 'bye' },
            ];
            for (const c of cmds) {
                const handler = (cmd, ctrl) => {
                    ctrl.text = c.r;
                };
                router.addCommand(c.r, [c.t], handler);
            }
        },
        getRequests: () =>
            Array.from({ length: REQUEST_COUNT }, (_, i) => createAliceReq(`привет`)),
    },
    {
        name: 'Точно совпадение',
        setup: (router) => {
            const cmds = [
                { t: 'стоп', r: 'stop' },
                { t: '2 привет 2', r: 'hello' },
                { t: 'отбой', r: 'bye' },
            ];
            for (const c of cmds) {
                const handler = (cmd, ctrl) => {
                    ctrl.text = c.r;
                };
                router.addCommand(c.r, [c.t], handler);
            }
        },
        getRequests: () =>
            Array.from({ length: REQUEST_COUNT }, (_, i) => createAliceReq(`2 привет 2`)),
    },
    {
        name: 'Найдена на 30 позиции',
        setup: (router) => {
            setEmptyCommand(router, 28);
            const cmds = [
                { t: 'стоп', r: 'stop' },
                { t: '30 привет 30', r: 'hello' },
                { t: 'отбой', r: 'bye' },
            ];
            for (const c of cmds) {
                const handler = (cmd, ctrl) => {
                    ctrl.text = c.r;
                };
                router.addCommand(c.r, [c.t], handler);
            }
        },
        getRequests: () =>
            Array.from({ length: REQUEST_COUNT }, (_, i) => createAliceReq(`привет`)),
    },
    {
        name: 'асинхронный handler',
        setup: (router) => {
            const cmds = [
                { t: 'стоп', r: 'stop' },
                { t: '30 привет 30', r: 'hello' },
                { t: 'отбой', r: 'bye' },
            ];
            for (const c of cmds) {
                const handler = async (cmd, ctrl) => {
                    ctrl.text = c.r;
                };
                router.addCommand(c.t, [c.t], handler);
            }
        },
        getRequests: () =>
            Array.from({ length: REQUEST_COUNT }, (_, i) => createAliceReq(`30 привет 30`)),
    },
    {
        name: 'Запрос длиннее триггера',
        setup: (router) => {
            setEmptyCommand(router);
            const handler = (cmd, ctrl) => {
                ctrl.text = 'hello';
            };
            router.addCommand('hello', ['привет'], handler);
            setEmptyCommand(router);
        },
        getRequests: () =>
            Array.from({ length: REQUEST_COUNT }, (_, i) =>
                createAliceReq(`_${i}_ привет, как дела?`),
            ),
    },
    {
        name: 'Триггер длиннее запроса',
        setup: (router) => {
            setEmptyCommand(router);
            const handler = (cmd, ctrl) => {
                ctrl.text = 'light';
            };
            router.addCommand('light', ['включи свет на кухне'], handler);
            setEmptyCommand(router);
        },
        getRequests: () =>
            Array.from({ length: REQUEST_COUNT }, (_, i) => createAliceReq(`включи свет ${i}_`)),
    },
];

// 🔌 Подключи СВОЙ роутер и сравись с umbot лично:
//   UM_COMPARISON_ROUTER=./my-router.js node --expose-gc ./benchmark/um.js
// Модуль должен экспортировать класс (module.exports = class MyRouter {...})
// с тем же контрактом, что CleanRouter ниже:
//   addCommand(name, slots, handler) — slots: массив строк | RegExp
//   async run(appType, req) — вернуть объект-ответ Алисы {response: {text}}
// Пример my-router.js:
//   module.exports = class MyRouter {
//     constructor() { this.commands = []; }
//     addCommand(name, slots, handler) { this.commands.push({name, slots, handler}); }
//     async run(_, req) {
//       const text = req.request.original_utterance || '';
//       for (const c of this.commands)
//         for (const s of c.slots)
//           if (s instanceof RegExp ? s.test(text) : text.includes(s)) {
//             const ctrl = { text: '' };
//             await c.handler(text, ctrl);
//             return { version: req.version, response: { text: ctrl.text } };
//           }
//       return { version: req.version, response: { text: 'не найдено' } };
//     }
//   };
// Тогда в таблицах появится третья колонка «yours» — сравнение честное:
// те же сценарии, тот же lockstep-порядок, те же метрики.
let CustomRouter = null;
if (process.env.UM_COMPARISON_ROUTER) {
    // Резолвим от CWD (как в примере запуска UM_COMPARISON_ROUTER=./my.js),
    // при неудаче — пробуем относительно benchmark/ (запуск из другой папки).
    const path = require('node:path');
    const userPath = process.env.UM_COMPARISON_ROUTER;
    const candidates = [
        userPath,
        path.resolve(__dirname, userPath),
        path.resolve(process.cwd(), userPath),
    ].filter(Boolean);
    let loaded = null;
    let lastErr = null;
    for (const candidate of candidates) {
        try {
            loaded = require(candidate);
            break;
        } catch (e) {
            lastErr = e;
        }
    }
    if (!loaded) {
        console.error(
            'UM_COMPARISON_ROUTER: не удалось загрузить ' +
                userPath +
                '. ' +
                (lastErr && lastErr.message),
        );
        process.exit(1);
    }
    CustomRouter = loaded;
    if (typeof CustomRouter !== 'function') {
        console.error(
            'UM_COMPARISON_ROUTER: модуль должен экспортировать класс (module.exports = class ...)',
        );
        process.exit(1);
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMedian(arr) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function safePercent(val, base) {
    if (!isFinite(val) || !isFinite(base) || base === 0) return 0;
    return ((val - base) / base) * 100;
}

function formatDelta(val, unit = '') {
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}${unit}`;
}

// Порог шума для памяти: |retain| меньше этой величины считаем «на равных».
// Retain-метрика после gc() содержит GC-шум ±1-2 КБ на проход; без этого порога
// ноль или −0.002 КБ формально попадал в ветку «хуже»/«лучше» и ломал вердикт.
// Логика вердикта вынесена в benchmark/umVerdict.js — тестируется юнит-тестами.
const { getVerdict } = require('./umVerdict');
function pad(s, len) {
    const str = String(s);
    return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

function printFirstTable(results) {
    console.log('\n========== ТАБЛИЦА 1: АБСОЛЮТНЫЕ МЕТРИКИ (МЕДИАНА) ==========');
    const header = `${pad('Сценарий', 30)} | ${pad('Тип', 5)} | ${pad('C Время(ms)', 8)} | ${pad('C RPS', 6)} | ${pad('C Retain(KB/з)', 10)} | ${pad('W Время(ms)', 8)} | ${pad('W RPS', 6)} | ${pad('W Retain(KB/з)', 10)} | ${pad('W Мусор(KB/з)', 8)}`;
    console.log(header);
    console.log('─'.repeat(header.length));

    for (const [scenarioName, cleanRes, umbotRes, yoursRes] of results) {
        const clean = cleanRes;
        const umbot = umbotRes;
        const printLine = (type, metrics) => {
            const { cold, warm } = metrics;
            console.log(
                pad(scenarioName, 30) +
                    ' | ' +
                    pad(type, 5) +
                    ' | ' +
                    pad(cold.time.toFixed(5), 8) +
                    ' | ' +
                    pad(cold.rps.toString(), 6) +
                    ' | ' +
                    pad(cold.memKB.toFixed(3), 10) +
                    ' | ' +
                    pad(warm.time.toFixed(5), 8) +
                    ' | ' +
                    pad(warm.rps.toString(), 6) +
                    ' | ' +
                    pad(warm.memKB.toFixed(3), 10) +
                    ' | ' +
                    pad((warm.transientKB ?? 0).toFixed(3), 8),
            );
        };
        printLine('clean', clean);
        printLine('umbot', umbot);
        if (yoursRes) {
            printLine('yours', yoursRes);
        }
        console.log('─'.repeat(header.length)); // разделитель между сценариями
    }
}

function printDeltaTable(results) {
    console.log('\n========== ТАБЛИЦА 2: РАЗНИЦА (UMBOT ОТНОСИТЕЛЬНО CLEAN) ==========');
    const header = `${pad('Сценарий', 30)} | ${pad('Режим', 5)} | ${pad('Δ Время(%)', 10)} | ${pad('Δ RPS(%)', 10)} | ${pad('Δ Память(KB/запр)', 10)} | Вердикт`;
    console.log(header);
    console.log('─'.repeat(header.length));

    // суммы для итогов (отдельно cold, warm)
    let sumCleanColdTime = 0,
        sumCleanColdRps = 0,
        sumCleanColdMem = 0;
    let sumUmbotColdTime = 0,
        sumUmbotColdRps = 0,
        sumUmbotColdMem = 0;
    let sumCleanWarmTime = 0,
        sumCleanWarmRps = 0,
        sumCleanWarmMem = 0;
    let sumUmbotWarmTime = 0,
        sumUmbotWarmRps = 0,
        sumUmbotWarmMem = 0;
    const N = results.length;

    for (const [scenarioName, cleanRes, umbotRes, yoursRes] of results) {
        // Cold
        const coldTimeDelta = safePercent(umbotRes.cold.time, cleanRes.cold.time);
        const coldRpsDelta = safePercent(umbotRes.cold.rps, cleanRes.cold.rps);
        const coldMemDelta = umbotRes.cold.memKB - cleanRes.cold.memKB;
        const coldVerdict = getVerdict(coldTimeDelta, coldMemDelta);

        console.log(
            pad(scenarioName, 30) +
                ' | ' +
                pad('Cold', 5) +
                ' | ' +
                pad(formatDelta(coldTimeDelta, '%'), 10) +
                ' | ' +
                pad(formatDelta(coldRpsDelta, '%'), 10) +
                ' | ' +
                pad(formatDelta(coldMemDelta, ' KB'), 10) +
                ' | ' +
                coldVerdict,
        );

        // Warm
        const warmTimeDelta = safePercent(umbotRes.warm.time, cleanRes.warm.time);
        const warmRpsDelta = safePercent(umbotRes.warm.rps, cleanRes.warm.rps);
        const warmMemDelta = umbotRes.warm.memKB - cleanRes.warm.memKB;
        const warmVerdict = getVerdict(warmTimeDelta, warmMemDelta);

        console.log(
            pad('', 30) +
                ' | ' +
                pad('Warm', 5) +
                ' | ' +
                pad(formatDelta(warmTimeDelta, '%'), 10) +
                ' | ' +
                pad(formatDelta(warmRpsDelta, '%'), 10) +
                ' | ' +
                pad(formatDelta(warmMemDelta, ' KB'), 10) +
                ' | ' +
                warmVerdict,
        );

        // накапливаем суммы для итогов
        sumCleanColdTime += cleanRes.cold.time;
        sumCleanColdRps += cleanRes.cold.rps;
        sumCleanColdMem += cleanRes.cold.memKB;
        sumUmbotColdTime += umbotRes.cold.time;
        sumUmbotColdRps += umbotRes.cold.rps;
        sumUmbotColdMem += umbotRes.cold.memKB;

        sumCleanWarmTime += cleanRes.warm.time;
        sumCleanWarmRps += cleanRes.warm.rps;
        sumCleanWarmMem += cleanRes.warm.memKB;
        sumUmbotWarmTime += umbotRes.warm.time;
        sumUmbotWarmRps += umbotRes.warm.rps;
        sumUmbotWarmMem += umbotRes.warm.memKB;

        console.log('─'.repeat(header.length));
    }

    // Итоговая строка (среднее/сумма)
    const avgCleanColdTime = sumCleanColdTime / N;
    const avgUmbotColdTime = sumUmbotColdTime / N;
    const totalCleanColdRps = sumCleanColdRps;
    const totalUmbotColdRps = sumUmbotColdRps;
    const avgCleanColdMem = sumCleanColdMem / N;
    const avgUmbotColdMem = sumUmbotColdMem / N;

    const avgCleanWarmTime = sumCleanWarmTime / N;
    const avgUmbotWarmTime = sumUmbotWarmTime / N;
    const totalCleanWarmRps = sumCleanWarmRps;
    const totalUmbotWarmRps = sumUmbotWarmRps;
    const avgCleanWarmMem = sumCleanWarmMem / N;
    const avgUmbotWarmMem = sumUmbotWarmMem / N;

    const coldTimeDeltaTotal = safePercent(avgUmbotColdTime, avgCleanColdTime);
    const coldRpsDeltaTotal = safePercent(totalUmbotColdRps, totalCleanColdRps);
    const coldMemDeltaTotal = avgUmbotColdMem - avgCleanColdMem;

    const warmTimeDeltaTotal = safePercent(avgUmbotWarmTime, avgCleanWarmTime);
    const warmRpsDeltaTotal = safePercent(totalUmbotWarmRps, totalCleanWarmRps);
    const warmMemDeltaTotal = avgUmbotWarmMem - avgCleanWarmMem;

    console.log(
        pad('ИТОГО (среднее/сумма)', 30) +
            ' | ' +
            pad('Cold', 5) +
            ' | ' +
            pad(formatDelta(coldTimeDeltaTotal, '%'), 10) +
            ' | ' +
            pad(formatDelta(coldRpsDeltaTotal, '%'), 10) +
            ' | ' +
            pad(formatDelta(coldMemDeltaTotal, ' KB'), 10) +
            ' | ' +
            getVerdict(coldTimeDeltaTotal, coldMemDeltaTotal),
    );
    console.log(
        pad('', 30) +
            ' | ' +
            pad('Warm', 5) +
            ' | ' +
            pad(formatDelta(warmTimeDeltaTotal, '%'), 10) +
            ' | ' +
            pad(formatDelta(warmRpsDeltaTotal, '%'), 10) +
            ' | ' +
            pad(formatDelta(warmMemDeltaTotal, ' KB'), 10) +
            ' | ' +
            getVerdict(warmTimeDeltaTotal, warmMemDeltaTotal),
    );
}
async function main() {
    const tableData = [];

    // Свой роутер (UM_COMPARISON_ROUTER=...) участвует в тех же lockstep-прогонах:
    // три реализации в одном цикле => одинаковые тепловой режим CPU и порядок.
    const impls = [
        ['clean', () => new CleanRouter()],
        ['umbot', initUmbot],
    ];
    if (CustomRouter) {
        impls.push(['yours', () => new CustomRouter()]);
        console.log(
            '🔌 Подключен внешний роутер: ' +
                process.env.UM_COMPARISON_ROUTER +
                ' — колонка «yours».',
        );
    }

    for (const scenario of SCENARIOS) {
        // Lockstep: прогоны всех реализаций чередуются внутри одного цикла —
        // все измеряются в одинаковом тепловом/частотном режиме CPU.
        const [cleanResult, umbotResult, yoursResult] = await runScenarioMulti(impls, scenario);
        tableData.push([scenario.name, cleanResult, umbotResult, yoursResult]);
        forceGC();
        await sleep(50);
    }

    printFirstTable(tableData);
    printDeltaTable(tableData);
    if (CustomRouter) {
        console.log(
            '\n🔌 Колонка «yours» — ваш роутер (' +
                process.env.UM_COMPARISON_ROUTER +
                '). Это те же сценарии, тот же lockstep-порядок и те же метрики, ' +
                'что у clean и umbot: сравнивайте строки честно. Хотите лучше — ' +
                'оптимизируйте свой роутер и перезапустите.',
        );
    }

    // Методология для CI
    console.log('\n📌 Методология замера:');
    console.log(`• Каждый сценарий выполняется ${SCENARIOS_RUNS} раз, берётся медиана метрик.`);
    console.log('• Cold — первый проход на свежем инстансе (влияние JIT-компиляции).');
    console.log(
        `• Warm/steady — проход №${WARMUP_PASSES + 1} на том же инстансе, БЕЗ forceGC между проходами ` +
            '(замер сразу после полного GC полухолодный: GC переносит объекты и сбивает inline-кэши V8).',
    );
    console.log(
        `• Память: retain = рост heapUsed с gc() до прохода и gc() после (утечки); ` +
            `транзиентный мусор замеряется отдельно и в вердикте не участвует.`,
    );
    console.log(`• Lockstep: прогоны clean и umbot чередуются — одинаковое состояние CPU.`);
    console.log('• RPS: 1000 / среднее время запроса. Если время <= 0, используется 0.001 мс.');
    console.log(
        '• Порог регрессии в CI: > +20% по времени выполнения (Warm) считается деградацией.',
    );

    console.log('\n* Время выполнения лучше, но потребление памяти выше');
    console.log(
        '** По всем показателям уступаем, но в пределах порогов (10% по скорости, 30 KB по памяти)',
    );

    // Легенда вердиктов: каждая строка таблицы читается без сносок.
    console.log('\nЛегенда вердиктов:');
    console.log('  ++ лучше     — umbot быстрее и экономичнее по памяти');
    console.log('  == паритет   — разница в пределах шума (время ±10%)');
    console.log('  +- допустимо — приемлемый компромисс (в порогах: 10% скорости / 30 КБ памяти)');
    console.log('  -- уступаем  — значимая просадка, не оправданная экономией памяти');
}

/**
 * Lockstep-прогон сценария: чередует прогоны всех реализаций (2 или 3).
 * Каждая итерация внешнего цикла создаёт СВЕЖИЙ инстанс очередной реализации
 * (round-robin), что даёт всем одинаковое тепловое/частотное состояние CPU
 * и одинаковое число «холодных» стартов.
 * Возвращает массив результатов в порядке impls.
 *
 * @param impls Массив пар [label, initFn]
 * @param scenario Сценарий {setup, getRequests}
 */
async function runScenarioMulti(impls, scenario) {
    const results = impls.map(() => []);
    const requests = scenario.getRequests();
    const forceGC2 = forceGC;

    for (let i = 0; i < SCENARIOS_RUNS; i++) {
        // Round-robin: прогон i достаётся реализации (i % impls.length).
        const implIndex = i % impls.length;
        const router = impls[implIndex][1]();
        scenario.setup(router);
        if (router instanceof Bot) {
            await sleep(150);
        }
        forceGC2();
        await sleep(10);

        const memBeforeCold = process.memoryUsage().heapUsed;
        const startCold = performance.now();
        for (const reg of requests) {
            await router.run('alisa', reg);
        }
        const endCold = performance.now();
        const memAfterCold = process.memoryUsage().heapUsed;

        const avgCold = (endCold - startCold) / requests.length;
        const safeAvgCold = avgCold <= 0 ? 0.001 : avgCold;
        const coldRec = {
            time: avgCold,
            rps: Math.round(1000 / safeAvgCold),
            memKB: (memAfterCold - memBeforeCold) / requests.length / 1024,
        };

        for (let p = 0; p < WARMUP_PASSES; p++) {
            for (const reg of requests) {
                await router.run('alisa', reg);
            }
        }

        const memBeforeWarm = process.memoryUsage().heapUsed;
        const startWarm = performance.now();
        for (const reg of requests) {
            await router.run('alisa', reg);
        }
        const endWarm = performance.now();
        const memAfterWarm = process.memoryUsage().heapUsed;

        const avgWarm = (endWarm - startWarm) / requests.length;
        const safeAvgWarm = avgWarm <= 0 ? 0.001 : avgWarm;
        const transientKB = (memAfterWarm - memBeforeWarm) / requests.length / 1024;

        // Retain: gc до и gc после прохода.
        forceGC2();
        const memBeforeRetain = process.memoryUsage().heapUsed;
        for (const reg of requests) {
            await router.run('alisa', reg);
        }
        forceGC2();
        const memAfterRetain = process.memoryUsage().heapUsed;

        results[implIndex].push({
            cold: coldRec,
            warm: {
                time: avgWarm,
                rps: Math.round(1000 / safeAvgWarm),
                memKB: (memAfterRetain - memBeforeRetain) / requests.length / 1024,
                transientKB: transientKB,
            },
        });
    }

    const medianOf = (arr, fn) => {
        const vals = arr.map(fn).sort((a, b) => a - b);
        return vals[Math.floor(vals.length / 2)];
    };
    const buildResult = (list) => ({
        cold: {
            time: medianOf(list, (r) => r.cold.time),
            rps: medianOf(list, (r) => r.cold.rps),
            memKB: medianOf(list, (r) => r.cold.memKB),
        },
        warm: {
            time: medianOf(list, (r) => r.warm.time),
            rps: medianOf(list, (r) => r.warm.rps),
            memKB: medianOf(list, (r) => r.warm.memKB),
            transientKB: medianOf(list, (r) => r.warm.transientKB),
        },
    });
    return results.map((list) => buildResult(list));
}

main().catch(console.error);
