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
const REQUEST_COUNT = 150;
const COMMAND_COUNT = 1500;

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
        name: 'ассихронный handler',
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

function getVerdict(timeDelta, memDelta) {
    // Пороги
    const TIME_THRESHOLD = 10;
    const MEM_THRESHOLD = 30;

    // Если лучше по обоим —++
    if (timeDelta < 0 && memDelta < 0) {
        return '++ лучше';
    }

    // Если один лучше, другой хуже —+- допустимо* (компромисс)
    const timeBetterMemWorse = timeDelta < 0 && memDelta > 0;
    const timeWorseMemBetter = timeDelta > 0 && memDelta < 0;

    if (timeBetterMemWorse || timeWorseMemBetter) {
        return '+- допустимо*';
    }

    // Если оба хуже, но оба в пределах нормы —+- допустимо**
    const timeOk = timeDelta > 0 && timeDelta <= TIME_THRESHOLD;
    const memOk = memDelta > 0 && memDelta <= MEM_THRESHOLD;

    if (timeOk && memOk) {
        return '+- допустимо**';
    }

    // Если хотя бы один за пределами нормы —--
    return '-- уступаем';
}

async function runScenario(initCb, scenario) {
    forceGC();
    await sleep(10);
    const coldTimes = [],
        coldRps = [],
        coldMemPerReq = [];
    const warmTimes = [],
        warmRps = [],
        warmMemPerReq = [];

    let router;
    const requests = scenario.getRequests();
    for (let i = 0; i < SCENARIOS_RUNS; i++) {
        router = initCb();
        scenario.setup(router);
        if (router instanceof Bot) {
            // umbot асинхронно добавляет команды.
            await sleep(150);
        }
        forceGC();
        await sleep(10);
        const memBeforeCold = process.memoryUsage().heapUsed;
        const startCold = performance.now();
        for (const reg of requests) {
            await router.run('alisa', reg);
        }
        const endCold = performance.now();
        const memAfterCold = process.memoryUsage().heapUsed;

        const totalMsCold = endCold - startCold;
        const avgTimeCold = totalMsCold / requests.length;
        const safeAvgCold = avgTimeCold <= 0 ? 0.001 : avgTimeCold;
        coldTimes.push(avgTimeCold);
        coldRps.push(Math.round(1000 / safeAvgCold));
        coldMemPerReq.push((memAfterCold - memBeforeCold) / requests.length / 1024);

        forceGC();
        await sleep(10);
        const memBeforeWarm = process.memoryUsage().heapUsed;
        const startWarm = performance.now();
        for (const reg of requests) {
            await router.run('alisa', reg);
        }
        const endWarm = performance.now();
        const memAfterWarm = process.memoryUsage().heapUsed;

        const totalMsWarm = endWarm - startWarm;
        const avgTimeWarm = totalMsWarm / requests.length;
        const safeAvgWarm = avgTimeWarm <= 0 ? 0.001 : avgTimeWarm;
        warmTimes.push(avgTimeWarm);
        warmRps.push(Math.round(1000 / safeAvgWarm));
        warmMemPerReq.push((memAfterWarm - memBeforeWarm) / requests.length / 1024);
    }

    return {
        cold: {
            time: getMedian(coldTimes),
            rps: getMedian(coldRps),
            memKB: getMedian(coldMemPerReq),
        },
        warm: {
            time: getMedian(warmTimes),
            rps: getMedian(warmRps),
            memKB: getMedian(warmMemPerReq),
        },
    };
}
function pad(s, len) {
    const str = String(s);
    return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

function printFirstTable(results) {
    console.log('\n========== ТАБЛИЦА 1: АБСОЛЮТНЫЕ МЕТРИКИ (МЕДИАНА) ==========');
    const header = `${pad('Сценарий', 30)} | ${pad('Тип', 5)} | ${pad('C Время(ms)', 8)} | ${pad('C RPS', 6)} | ${pad('C Память(KB/запр)', 10)} | ${pad('W Время(ms)', 8)} | ${pad('W RPS', 6)} | ${pad('W Память(KB/запр)', 10)}`;
    console.log(header);
    console.log('─'.repeat(header.length));

    for (const [scenarioName, cleanRes, umbotRes] of results) {
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
                    pad(warm.memKB.toFixed(3), 10),
            );
        };
        printLine('clean', clean);
        printLine('umbot', umbot);
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

    for (const [scenarioName, cleanRes, umbotRes] of results) {
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

    for (const scenario of SCENARIOS) {
        const cleanResult = await runScenario(() => new CleanRouter(), scenario);
        forceGC();
        await sleep(50);
        const umbotResult = await runScenario(initUmbot, scenario);

        tableData.push([scenario.name, cleanResult, umbotResult]);
        forceGC();
        await sleep(50);
    }

    printFirstTable(tableData);
    printDeltaTable(tableData);

    // Методология для CI
    console.log('\n📌 Методология замера:');
    console.log(`• Каждый сценарий выполняется ${SCENARIOS_RUNS} раз, берётся медиана метрик.`);
    console.log(
        '• Cold — первый проход на свежем инстансе (влияние JIT-компиляции), Warm — второй проход на том же инстансе (стабильное состояние).',
    );
    console.log(
        `• Память: (heapUsed после - heapUsed до) / ${REQUEST_COUNT} запросов → КБ на запрос. Отрицательные значения — сработал GC.`,
    );
    console.log('• RPS: 1000 / среднее время запроса. Если время <= 0, используется 0.001 мс.');
    console.log(
        '• Порог регрессии в CI: > +20% по времени выполнения (Warm) считается деградацией.',
    );

    console.log('\n* Время выполнения лучше, но потребление памяти выше');
    console.log(
        '** По всем показателям уступаем, но в пределах порогов (10% по скорости, 30 KB по памяти)',
    );
}

main().catch(console.error);
