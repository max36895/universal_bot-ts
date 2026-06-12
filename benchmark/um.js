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

    addCommand(name, triggers, handler) {
        this.commands.push({ name, triggers, handler });
    }

    isMatch(trigger, text) {
        const t = (text || '').trim().toLowerCase();
        if (typeof trigger === 'string') {
            const tr = trigger.trim().toLowerCase();
            return t.includes(tr) || tr.includes(t);
        }
        if (trigger instanceof RegExp) {
            trigger.lastIndex = 0;
            return trigger.test(t);
        }
        return false;
    }

    async run(_, req) {
        const id = req.session?.message_id || Date.now();
        this.ctxStore.set(id, req); // Эмуляция сохранения контекста

        const text = req.request?.original_utterance || '';
        for (const cmd of this.commands) {
            for (const tr of cmd.triggers) {
                if (this.isMatch(tr, text)) {
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
            response: { text: 'Команда не найдена. Попробуйте ещё раз.', end_session: false },
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
                router.addCommand(`cmd_${i}`, [new RegExp(`^/cmd_${i}_\\d+$`)], handler);
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
                createAliceReq(`${i * 100}_cmd_${i}_123`),
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
            Array.from({ length: REQUEST_COUNT }, (_, i) => createAliceReq(`${i} привет ${i}`)),
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
            Array.from({ length: REQUEST_COUNT }, (_, i) => createAliceReq(`${i} привет ${i}`)),
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
            Array.from({ length: REQUEST_COUNT }, (_, i) => createAliceReq(`${i} привет ${i}`)),
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
                createAliceReq(`${i} привет, как дела?`),
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
            Array.from({ length: REQUEST_COUNT }, (_, i) => createAliceReq(`включи свет ${i}`)),
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
    const header = `${pad('Сценарий', 35)} | ${pad('Тип', 6)} | ${pad('Cold Время(ms)', 14)} | ${pad('Cold RPS', 9)} | ${pad('Cold Память(KB/запр)', 18)} | ${pad('Warm Время(ms)', 14)} | ${pad('Warm RPS', 9)} | ${pad('Warm Память(KB/запр)', 18)}`;
    console.log(header);
    console.log('─'.repeat(header.length));

    for (const [scenarioName, cleanRes, umbotRes] of results) {
        const clean = cleanRes;
        const umbot = umbotRes;
        const printLine = (type, metrics) => {
            const { cold, warm } = metrics;
            console.log(
                pad(scenarioName, 35) +
                    ' | ' +
                    pad(type, 6) +
                    ' | ' +
                    pad(cold.time.toFixed(5), 14) +
                    ' | ' +
                    pad(cold.rps.toString(), 9) +
                    ' | ' +
                    pad(cold.memKB.toFixed(3), 18) +
                    ' | ' +
                    pad(warm.time.toFixed(5), 14) +
                    ' | ' +
                    pad(warm.rps.toString(), 9) +
                    ' | ' +
                    pad(warm.memKB.toFixed(3), 18),
            );
        };
        printLine('clean', clean);
        printLine('umbot', umbot);
        console.log('─'.repeat(header.length)); // разделитель между сценариями
    }
}

function printDeltaTable(results) {
    console.log('\n========== ТАБЛИЦА 2: РАЗНИЦА (UMBOT ОТНОСИТЕЛЬНО CLEAN) ==========');
    const header = `${pad('Сценарий', 35)} | ${pad('Режим', 6)} | ${pad('Δ Время(%)', 12)} | ${pad('Δ RPS(%)', 10)} | ${pad('Δ Память(KB/запр)', 16)} | Вердикт`;
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
        const coldVerdict =
            coldTimeDelta < 0 && coldMemDelta < 0
                ? '++ лучше'
                : coldTimeDelta < 0 || coldMemDelta < 0
                  ? '+ смешано'
                  : '-- хуже';

        console.log(
            pad(scenarioName, 35) +
                ' | ' +
                pad('Cold', 6) +
                ' | ' +
                pad(formatDelta(coldTimeDelta, '%'), 12) +
                ' | ' +
                pad(formatDelta(coldRpsDelta, '%'), 10) +
                ' | ' +
                pad(formatDelta(coldMemDelta, ' KB'), 16) +
                ' | ' +
                coldVerdict,
        );

        // Warm
        const warmTimeDelta = safePercent(umbotRes.warm.time, cleanRes.warm.time);
        const warmRpsDelta = safePercent(umbotRes.warm.rps, cleanRes.warm.rps);
        const warmMemDelta = umbotRes.warm.memKB - cleanRes.warm.memKB;
        const warmVerdict =
            warmTimeDelta < 0 && warmMemDelta < 0
                ? '++ лучше'
                : warmTimeDelta < 0 || warmMemDelta < 0
                  ? '+ смешано'
                  : '-- хуже';

        console.log(
            pad('', 35) +
                ' | ' +
                pad('Warm', 6) +
                ' | ' +
                pad(formatDelta(warmTimeDelta, '%'), 12) +
                ' | ' +
                pad(formatDelta(warmRpsDelta, '%'), 10) +
                ' | ' +
                pad(formatDelta(warmMemDelta, ' KB'), 16) +
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
        pad('ИТОГО (среднее/сумма)', 35) +
            ' | ' +
            pad('Cold', 6) +
            ' | ' +
            pad(formatDelta(coldTimeDeltaTotal, '%'), 12) +
            ' | ' +
            pad(formatDelta(coldRpsDeltaTotal, '%'), 10) +
            ' | ' +
            pad(formatDelta(coldMemDeltaTotal, ' KB'), 16) +
            ' | ' +
            (coldTimeDeltaTotal < 0 && coldMemDeltaTotal < 0
                ? '++ лучше'
                : coldTimeDeltaTotal < 0 || coldMemDeltaTotal < 0
                  ? '+ смешано'
                  : '-- хуже'),
    );
    console.log(
        pad('', 35) +
            ' | ' +
            pad('Warm', 6) +
            ' | ' +
            pad(formatDelta(warmTimeDeltaTotal, '%'), 12) +
            ' | ' +
            pad(formatDelta(warmRpsDeltaTotal, '%'), 10) +
            ' | ' +
            pad(formatDelta(warmMemDeltaTotal, ' KB'), 16) +
            ' | ' +
            (warmTimeDeltaTotal < 0 && warmMemDeltaTotal < 0
                ? '++ лучше'
                : warmTimeDeltaTotal < 0 || warmMemDeltaTotal < 0
                  ? '+ смешано'
                  : '-- хуже'),
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
}

main().catch(console.error);
