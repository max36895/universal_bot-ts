// benchmark.js
// Запуск: node --expose-gc  .\command.js

const { Bot, BotController, Alisa, T_ALISA } = require('./../dist/index');
const { performance } = require('perf_hooks');

// --------------------------------------------------
// Вывод результатов
function printScenarioBlock(items) {
    const byState = {};
    for (const item of items) byState[item.state] = item;

    const rep = byState.middle || byState.low || byState.high;
    if (rep) {
        log(`  ├─ Память до запуска: ${rep.startMemory} КБ`);
        log(`  ├─ Память после первого запуска: ${rep.afterRunMemory} КБ`);
        log(`  ├─ Прирост памяти (первый запуск): +${rep.memoryIncrease} КБ`);
        const memPerCmd =
            (parseFloat(rep.afterRunMemory) - parseFloat(rep.startMemory)) / rep.count;
        log(`  ├─ Потребление памяти на одну команду: ${memPerCmd.toFixed(4)} КБ`);
    }

    const low = byState.low;
    const middle = byState.middle;
    const high = byState.high;

    if (low) {
        const speedup =
            ((parseFloat(low.duration) - parseFloat(low.duration2)) / parseFloat(low.duration)) *
            100;
        log(
            `  ├─ Время первого запуска для самого лучшего исхода (команда в начале): ${low.duration} мс`,
        );
        log(
            `  ├─ Время повторного запуска для лучшего исхода: ${low.duration2} мс (ускорение: ${speedup >= 0 ? '+' : ''}${speedup.toFixed(1)}%)`,
        );
    }
    if (middle) {
        const speedup =
            ((parseFloat(middle.duration) - parseFloat(middle.duration2)) /
                parseFloat(middle.duration)) *
            100;
        log(
            `  ├─ Время первого запуска для среднего исхода (команда в середине): ${middle.duration} мс`,
        );
        log(
            `  ├─ Время повторного запуска для среднего исхода: ${middle.duration2} мс (ускорение: ${speedup >= 0 ? '+' : ''}${speedup.toFixed(1)}%)`,
        );
    }
    if (high) {
        const speedup =
            ((parseFloat(high.duration) - parseFloat(high.duration2)) / parseFloat(high.duration)) *
            100;
        log(
            `  ├─ Время первого запуска для худшего исхода (команда не найдена): ${high.duration} мс`,
        );
        log(
            `  └─ Время повторного запуска для худшего исхода: ${high.duration2} мс (ускорение: ${speedup >= 0 ? '+' : ''}${speedup.toFixed(1)}%)`,
        );
    }
}

function printSummary(results) {
    const byCount = {};
    for (const item of results) {
        if (!byCount[item.count]) byCount[item.count] = [];
        byCount[item.count].push(item);
    }

    const sortedCounts = Object.keys(byCount)
        .map(Number)
        .sort((a, b) => a - b);
    for (const count of sortedCounts) {
        const items = byCount[count];
        log(`\nКоличество команд: ${count.toLocaleString('ru-RU')}`);
        log('────────────────────────────────────────────────────────────');

        const noRegItems = items.filter((r) => !r.useReg);
        if (noRegItems.length > 0) {
            log('Без регулярных выражений:');
            printScenarioBlock(noRegItems);
        }

        const regItems = items.filter((r) => r.useReg);
        const complexities = [
            { key: 'low', label: 'простая' },
            { key: 'middle', label: 'умеренная' },
            { key: 'high', label: 'сложная, но безопасная' },
        ];

        for (const { key, label } of complexities) {
            const subset = regItems.filter((r) => r.regState === key);
            if (subset.length > 0) {
                log(`С регулярными выражениями (сложность: ${key} — ${label}):`);
                printScenarioBlock(subset);
            }
        }
    }
}

function printFinalSummary(results) {
    log('\n\n' + '='.repeat(130));
    log('ИТОГОВАЯ СВОДКА ПО ПРОИЗВОДИТЕЛЬНОСТИ (первый → повторный запуск)');
    log('='.repeat(130));

    const byCount = {};
    for (const item of results) {
        if (!byCount[item.count]) byCount[item.count] = [];
        byCount[item.count].push(item);
    }

    const sortedCounts = Object.keys(byCount)
        .map(Number)
        .sort((a, b) => a - b);
    for (const count of sortedCounts) {
        const items = byCount[count];
        const noRegItems = items.filter((r) => !r.useReg);
        if (noRegItems.length === 0) continue;

        // Эталон по каждому state (для первого запуска)
        const baseline = {};
        for (const item of noRegItems) {
            baseline[item.state] = parseFloat(item.duration);
        }

        // Средняя память эталона
        const baselineMemAvg =
            noRegItems.reduce((sum, r) => sum + parseFloat(r.memoryIncreaseFromStart), 0) /
            noRegItems.length;
        const baselineMemRunAvg =
            noRegItems.reduce((sum, r) => sum + parseFloat(r.memoryIncrease), 0) /
            noRegItems.length;

        log(`\nИТОГОВАЯ СВОДКА (Количество команд: ${count.toLocaleString('ru-RU')})`);
        log('─'.repeat(165));
        const header =
            'Сценарий'.padEnd(35) +
            ' | ' +
            'Память всего (КБ)'.padStart(18) +
            ' | ' +
            'Память при run (КБ)'.padStart(20) +
            ' | ' +
            'Лучший'.padStart(22) +
            ' | ' +
            'Средний'.padStart(22) +
            ' | ' +
            'Худший'.padStart(22) +
            ' | ' +
            '< 1 сек?'.padStart(8);
        log(header);
        log('─'.repeat(165));

        // --- Эталон ---
        const memBaselineStr = `${baselineMemAvg.toFixed(2)} (+0.0%)`;
        const memBaselineStrRun = `${baselineMemRunAvg.toFixed(2)} (+0.0%)`;

        function formatPair(stateKey, firstTime, secondTime) {
            const base = baseline[stateKey];
            if (base === undefined) return '—';
            const delta = ((firstTime - base) / base) * 100;
            return `${firstTime.toFixed(2)} (${(delta >= 0 ? '+' : '') + delta.toFixed(1)}%) → ${secondTime.toFixed(2)}`;
        }

        const bestBase = noRegItems.find((r) => r.state === 'low');
        const midBase = noRegItems.find((r) => r.state === 'middle');
        const worstBase = noRegItems.find((r) => r.state === 'high');

        const bestStr = bestBase
            ? formatPair('low', parseFloat(bestBase.duration), parseFloat(bestBase.duration2))
            : '—';
        const midStr = midBase
            ? formatPair('middle', parseFloat(midBase.duration), parseFloat(midBase.duration2))
            : '—';
        const worstStr = worstBase
            ? formatPair('high', parseFloat(worstBase.duration), parseFloat(worstBase.duration2))
            : '—';

        const over1sBase = !(
            (bestBase && parseFloat(bestBase.duration) >= 1000) ||
            (midBase && parseFloat(midBase.duration) >= 1000) ||
            (worstBase && parseFloat(worstBase.duration) >= 1000)
        )
            ? 'Да'
            : 'Нет';

        log(
            'Без регулярок — ЭТАЛОН'.padEnd(35) +
                ' | ' +
                memBaselineStr.padStart(18) +
                ' | ' +
                memBaselineStrRun.padStart(20) +
                ' | ' +
                bestStr.padStart(22) +
                ' | ' +
                midStr.padStart(22) +
                ' | ' +
                worstStr.padStart(22) +
                ' | ' +
                over1sBase.padStart(8),
        );

        // --- Регулярки ---
        const complexities = ['low', 'middle', 'high'];
        const labels = {
            low: 'С регулярками (low — простая)',
            middle: 'С регулярками (middle — умеренная)',
            high: 'С регулярками (high — сложная)',
        };

        for (const complexity of complexities) {
            const regSubset = items.filter((r) => r.useReg && r.regState === complexity);
            if (regSubset.length === 0) continue;

            // Память
            const memSum = regSubset.reduce(
                (sum, r) => sum + parseFloat(r.memoryIncreaseFromStart),
                0,
            );
            const memSumRun = regSubset.reduce((sum, r) => sum + parseFloat(r.memoryIncrease), 0);
            const avgMem = memSum / regSubset.length;
            const memDelta = ((avgMem - baselineMemAvg) / baselineMemAvg) * 100;
            const memStr = `${avgMem.toFixed(2)} (${(memDelta >= 0 ? '+' : '') + memDelta.toFixed(1)}%)`;

            const avgMemRun = memSumRun / regSubset.length;
            const memDeltaRun = ((avgMemRun - baselineMemRunAvg) / baselineMemRunAvg) * 100;
            const memStrRun = `${avgMemRun.toFixed(2)} (${(avgMemRun >= 0 ? '+' : '') + memDeltaRun.toFixed(1)}%)`;

            // Время
            const bestItem = regSubset.find((r) => r.state === 'low');
            const midItem = regSubset.find((r) => r.state === 'middle');
            const worstItem = regSubset.find((r) => r.state === 'high');

            const bestReg = bestItem
                ? formatPair('low', parseFloat(bestItem.duration), parseFloat(bestItem.duration2))
                : '—';
            const midReg = midItem
                ? formatPair('middle', parseFloat(midItem.duration), parseFloat(midItem.duration2))
                : '—';
            const worstReg = worstItem
                ? formatPair(
                      'high',
                      parseFloat(worstItem.duration),
                      parseFloat(worstItem.duration2),
                  )
                : '—';

            const anyOver1s = regSubset.some((r) => parseFloat(r.duration) >= 1000);
            const over1s = !anyOver1s ? 'Да' : 'Нет';

            log(
                labels[complexity].padEnd(35) +
                    ' | ' +
                    memStr.padStart(18) +
                    ' | ' +
                    memStrRun.padStart(20) +
                    ' | ' +
                    bestReg.padStart(22) +
                    ' | ' +
                    midReg.padStart(22) +
                    ' | ' +
                    worstReg.padStart(22) +
                    ' | ' +
                    over1s.padStart(8),
            );
        }
    }
}

// --------------------------------------------------

// Максимальное количество регулярных выражений для теста регулярок. При выходе за пределы лимита, будет использовано регулярное выражение заглушка.
const MAX_REG_COUNT = 5000;

// Контроллер для обработки
class TestBotController extends BotController {
    constructor(appContext) {
        super(appContext);
    }

    action(intentName, isCommand) {
        if (intentName && intentName.startsWith('cmd_')) {
            this.text = `Обработана команда: ${intentName}`;
            this.userData[`data_for_${intentName}`] = `value_for_${intentName}`;
        } else {
            this.text = 'Команда не найдена';
        }
        return this.text;
    }
}

// Эмулируем запрос от Алисы
function getContent(query, count = 0) {
    return JSON.stringify({
        meta: {
            locale: 'ru-Ru',
            timezone: 'UTC',
            client_id: 'local',
            interfaces: { screen: true },
        },
        session: {
            message_id: count,
            session_id: 'local_test_session_12345',
            skill_id: 'local_test_skill_67890',
            user_id: 'test_user_abc',
            new: count === 0,
        },
        request: {
            command: query.toLowerCase(),
            original_utterance: query,
            nlu: {},
            type: 'SimpleUtterance',
        },
        state: { session: {} },
        version: '1.0',
    });
}

const status = [];

function log(str) {
    console.log(str);
}

let maxRegCount = 0;

// Отдаем корректную регулярку для теста
function getRegex(regex, state, count, step) {
    const mid = Math.round(count / 2);
    if (
        (state === 'low' && step === 1) ||
        (state === 'middle' && step === mid) ||
        (maxRegCount >= 2 && maxRegCount < MAX_REG_COUNT)
    ) {
        maxRegCount++;
        return regex;
    } else {
        // Не совсем честный способ задания регулярных выражений, как поступить иначе не понятно.
        // Будет много очень похожих регулярных выражений, из-за чего обработка будет медленной по понятной причине.
        // Тут либо как-то рандомно генерировать регулярные выражение, либо использовать заглушку.
        // Также при использовании регулярок с завязкой на step, будем выходить за пределы лимита при 200_000 команд.
        // Сценарий когда может быть более 10_000 команд сложно представить, тем более чтобы все регулярные выражения были уникальны.
        // При 20_000 командах мы все еще укладываемся в ограничение.
        // Предварительный лимит на количество уникальных регулярных выражений составляет примерно 40_000 - 50_000 команд.
        return `((\d+)_ref_${step % 1e3})`;
    }
}

// сам тест
async function runTest(count = 1000, useReg = false, state = 'middle', regState = 'middle') {
    const res = { state, regState: useReg ? regState : '', useReg, count };
    global.gc();
    const startedMemory = process.memoryUsage().heapUsed;
    res.startMemory = (startedMemory / 1024).toFixed(2);

    const bot = new Bot();
    const botController = new TestBotController(bot._appContext);
    bot.initBotController(botController);
    bot.appType = T_ALISA;
    const botClass = new Alisa(bot._appContext);
    bot.setAppConfig({ isLocalStorage: true });

    maxRegCount = 0;
    for (let j = 0; j < count; j++) {
        let command;
        if (useReg) {
            switch (regState) {
                case 'low':
                    command = getRegex('(\\d страни)', state, count, j);
                    break;
                case 'middle':
                    command = getRegex(
                        new RegExp(
                            `((([\\d\\-() ]{4,}\\d)|((?:\\+|\\d)[\\d\\-() ]{9,}\\d))_ref_${j})`,
                            'i',
                        ),
                        state,
                        count,
                        j,
                    );
                    break;
                case 'high':
                    command = getRegex(
                        `напомни для user_${j} ([^\\d]+) в (\\d{1,2}:\\d{2})`,
                        state,
                        count,
                        j,
                    );
                    break;
                default:
                    command = `команда_${j}`;
            }
        } else {
            command = `команда_${j}`;
        }
        bot.addCommand(
            `cmd_${j}`,
            [command],
            (userCommand, controller) => {
                if (controller) {
                    controller.text = `cmd_${j} выполнена. Введено: ${userCommand}`;
                    controller.userData[`executed_cmd_${j}`] = true;
                }
            },
            useReg,
        );
    }
    let testCommand = '';
    const mid = Math.round(count / 2);
    if (!useReg) {
        switch (state) {
            case 'low':
                testCommand = `команда_1`;
                break;
            case 'middle':
                testCommand = `команда_${mid}`;
                break;
            case 'high':
                testCommand = `несуществующая команда ${Date.now()}`;
                break;
        }
    } else {
        switch (state) {
            case 'low':
                testCommand =
                    regState === 'low'
                        ? `1 страниц`
                        : regState === 'middle'
                          ? `88003553535_ref_1`
                          : regState === 'high'
                            ? `напомни для user_1 позвонить маме в 18:30`
                            : `cmd_1`;
                break;
            case 'middle':
                testCommand =
                    regState === 'low'
                        ? `5 станица`
                        : regState === 'middle'
                          ? `88003553535_ref_${mid}`
                          : regState === 'high'
                            ? `напомни для user_${mid} позвонить маме в 18:30`
                            : `cmd_${mid}`;
                break;
            case 'high':
                testCommand = `несуществующая команда ${Date.now()}`;
                break;
        }
    }

    global.gc();
    bot.setContent(getContent(testCommand));
    const beforeMemory = process.memoryUsage().heapUsed;
    res.beforeRunMemory = (beforeMemory / 1024).toFixed(2);

    const start = performance.now();
    try {
        await bot.run(botClass);
    } catch (e) {
        /* ignore */
    }
    const duration = performance.now() - start;

    bot.setContent(getContent(testCommand));
    const start2 = performance.now();
    try {
        await bot.run(botClass);
    } catch (e) {
        /* ignore */
    }
    const duration2 = performance.now() - start2;
    global.gc();
    const afterMemory = process.memoryUsage().heapUsed;
    res.afterRunMemory = (afterMemory / 1024).toFixed(2);
    res.memoryIncrease = ((afterMemory - beforeMemory) / 1024).toFixed(2);
    res.memoryIncreaseFromStart = ((afterMemory - startedMemory) / 1024).toFixed(2);

    botController.clearStoreData();
    bot.clearCommands();
    global.gc();
    const finalMemory = process.memoryUsage().heapUsed;
    res.finalMemory = (finalMemory / 1024).toFixed(2);
    res.memoryDifference = ((finalMemory - startedMemory) / 1024).toFixed(2);
    res.duration = duration.toFixed(2);
    res.duration2 = duration2.toFixed(2);

    status.push(res);
}

// --- Запуск ---
async function start() {
    try {
        // Количество команд
        const counts = [50, 250, 500, 1000, 2e3, 2e4, 2e5, 1e6, 2e6];
        // Исход поиска(требуемая команда в начале списка, требуемая команда в середине списка, требуемая команда не найдена))
        const states = ['low', 'middle', 'high'];
        // Сложность регулярных выражений (low — простая, middle — умеренная, high — сложная(субъективно))
        const regStates = ['low', 'middle', 'high'];
        // для чистоты запускаем gc
        global.gc();
        for (let count of counts) {
            console.log(`Запуск тестов для ${count} команд...`);
            for (let state of states) {
                global.gc();
                await runTest(count, false, state);
                for (let regState of regStates) {
                    global.gc();
                    await runTest(count, true, state, regState);
                }
            }
        }
        global.gc();
        console.log('Подготовка отчета...');
        printSummary(status);
        printFinalSummary(status);
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

start();
