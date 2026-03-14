// benchmark.js
// Запуск: node --expose-gc  .\command.js

const { Bot, BotController } = require('../dist/index');
const { AlisaAdapter, T_ALISA } = require('../dist/plugins');
const { performance } = require('node:perf_hooks');
const os = require('node:os');

function gc() {
    if (global.gc) {
        global.gc();
    }
}

// --------------------------------------------------
// Вывод результатов

function memResult(value) {
    const absValue = Math.abs(value);
    if (absValue < 1024) {
        return `${value}KB`;
    } else if ((absValue < 1024) ^ 2) {
        return `${(value / 1024).toFixed(2)}MB`;
    } else {
        return `${(value / (1024 * 2)).toFixed(2)}GB`;
    }
}

function printScenarioBlock(items) {
    const byState = {};
    for (const item of items) byState[item.state] = item;

    const rep = byState.middle || byState.low || byState.high;
    if (rep) {
        console.log(`  ├─ Память до запуска: ${memResult(rep.startMemory)}`);
        console.log(`  ├─ Память после первого запуска: ${memResult(rep.afterRunMemory)}`);
        console.log(`  ├─ Прирост памяти (первый запуск): +${memResult(rep.memoryIncrease)}`);
        const memPerCmd =
            (parseFloat(rep.afterRunMemory) - parseFloat(rep.startMemory)) / rep.count;
        console.log(`  ├─ Потребление памяти на одну команду: ${memPerCmd.toFixed(4)} КБ`);
        const timePerCmd = rep.duration / rep.count;
        console.log(`  ├─ Среднее время на обработку одной команды: ${timePerCmd.toFixed(7)} мс`);
    }

    const low = byState.low;
    const middle = byState.middle;
    const high = byState.high;

    if (low) {
        const speedup =
            ((parseFloat(low.duration) - parseFloat(low.duration2)) / parseFloat(low.duration)) *
            100;
        console.log(
            `  ├─ Время первого запуска для самого лучшего исхода (команда в начале): ${low.duration} мс`,
        );
        console.log(
            `  ├─ Время повторного запуска для лучшего исхода: ${low.duration2} мс (ускорение: ${speedup >= 0 ? '+' : ''}${speedup.toFixed(1)}%)`,
        );
    }
    if (middle) {
        const speedup =
            ((parseFloat(middle.duration) - parseFloat(middle.duration2)) /
                parseFloat(middle.duration)) *
            100;
        console.log(
            `  ├─ Время первого запуска для среднего исхода (команда в середине): ${middle.duration} мс`,
        );
        console.log(
            `  ├─ Время повторного запуска для среднего исхода: ${middle.duration2} мс (ускорение: ${speedup >= 0 ? '+' : ''}${speedup.toFixed(1)}%)`,
        );
    }
    if (high) {
        const speedup =
            ((parseFloat(high.duration) - parseFloat(high.duration2)) / parseFloat(high.duration)) *
            100;
        console.log(
            `  ├─ Время первого запуска для худшего исхода (команда не найдена): ${high.duration} мс`,
        );
        console.log(
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
        console.log(`\nКоличество команд: ${count.toLocaleString('ru-RU')}`);
        console.log('────────────────────────────────────────────────────────────');

        const noRegItems = items.filter((r) => !r.useReg);
        if (noRegItems.length > 0) {
            console.log('Без регулярных выражений:');
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
                console.log(`С регулярными выражениями (сложность: ${key} — ${label}):`);
                printScenarioBlock(subset);
            }
        }
    }
}

function printFinalSummary(results) {
    console.log('\n\n' + '='.repeat(130));
    console.log('ИТОГОВАЯ СВОДКА ПО ПРОИЗВОДИТЕЛЬНОСТИ (первый → повторный запуск)');
    console.log('='.repeat(130));

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

        console.log(`\nИТОГОВАЯ СВОДКА (Количество команд: ${count.toLocaleString('ru-RU')})`);
        console.log('─'.repeat(123));
        const header =
            'Сценарий'.padEnd(17) +
            ' | ' +
            'Память всего'.padStart(18) +
            ' | ' +
            'Лучший + 2 запуск'.padStart(19) +
            ' | ' +
            'Средний + 2 запуск'.padStart(25) +
            ' | ' +
            'Худший + 2 запуск'.padStart(25) +
            ' | ' +
            '< 1s'.padStart(4);
        console.log(header);
        console.log('─'.repeat(123));

        // --- Эталон ---
        const memBaselineStr = `${memResult(baselineMemAvg.toFixed(2))} (+0.0%)`;

        function formatPair(stateKey, firstTime, secondTime) {
            const base = baseline[stateKey];
            if (base === undefined) return '—';
            const delta = ((firstTime - base) / base) * 100;
            const deltaStr = delta < 10000 ? delta.toFixed(0) : `${(delta / 1000).toFixed(1)}K`;
            return `${firstTime.toFixed(firstTime > 100 ? 1 : 2)}(${(delta >= 0 ? '+' : '') + deltaStr}%) → ${secondTime.toFixed(2)}`;
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

        const over1sBase =
            (bestBase && parseFloat(bestBase.duration) >= 1000) ||
            (midBase && parseFloat(midBase.duration) >= 1000) ||
            (worstBase && parseFloat(worstBase.duration) >= 1000)
                ? 'Нет'
                : 'Да';

        console.log(
            'Без regex ЭТАЛОН'.padEnd(17) +
                ' | ' +
                memBaselineStr.padStart(18) +
                ' | ' +
                bestStr.padStart(19) +
                ' | ' +
                midStr.padStart(25) +
                ' | ' +
                worstStr.padStart(25) +
                ' | ' +
                over1sBase.padStart(4),
        );

        // --- Регулярки ---
        const complexities = ['low', 'middle', 'high'];
        const labels = {
            low: 'С regex простая',
            middle: 'С regex умеренная',
            high: 'С regex сложная',
        };

        for (const complexity of complexities) {
            const regSubset = items.filter((r) => r.useReg && r.regState === complexity);
            if (regSubset.length === 0) continue;

            // Память
            const memSum = regSubset.reduce(
                (sum, r) => sum + parseFloat(r.memoryIncreaseFromStart),
                0,
            );
            const avgMem = memSum / regSubset.length;
            const memDelta = ((avgMem - baselineMemAvg) / baselineMemAvg) * 100;
            const memStr = `${memResult(avgMem.toFixed(2))} (${(memDelta >= 0 ? '+' : '') + memDelta.toFixed(1)}%)`;

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
            const over1s = anyOver1s ? 'Нет' : 'Да';

            console.log(
                labels[complexity].padEnd(17) +
                    ' | ' +
                    memStr.padStart(18) +
                    ' | ' +
                    bestReg.padStart(19) +
                    ' | ' +
                    midReg.padStart(25) +
                    ' | ' +
                    worstReg.padStart(25) +
                    ' | ' +
                    over1s.padStart(4),
            );
        }
    }
}

// --------------------------------------------------

// Контроллер для обработки
class TestBotController extends BotController {
    constructor(appContext) {
        super(appContext);
    }

    action(intentName, _) {
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

// сам тест
async function runTest(count = 1000, useReg = false, state = 'middle', regState = 'middle') {
    const res = { state, regState: useReg ? regState : '', useReg, count };
    gc();
    await new Promise((resolve) => {
        setTimeout(resolve, 1);
    });
    const startedMemory = process.memoryUsage().heapUsed;
    res.startMemory = (startedMemory / 1024).toFixed(2);

    const bot = new Bot();
    bot.initBotController(TestBotController);
    bot.appType = T_ALISA;
    bot.use(new AlisaAdapter());
    bot.setAppConfig({ isLocalStorage: true });
    bot.setLogger({
        error: () => {
            // чтобы не писать файл с ошибками
            // пишется когда время обработки команд превышает допустимое
        },
        warn: () => {
            // чтобы не писался файл с предупреждениями
            // пишется когда количество команд больше 10_000
        },
    });

    for (let j = 0; j < count; j++) {
        let command;
        if (useReg) {
            switch (regState) {
                case 'low':
                    command = `${j} страниц`;
                    break;
                case 'middle':
                    command = `(\\d\\d-\\d\\d-\\d\\d_ref_${j}_)`;
                    break;
                case 'high':
                    command = `напомни для user_${j} ([^\\d]+) в (\\d{1,2}:\\d{2})`;
                    break;
                default:
                    command = `команда_${j}_`;
            }
        } else {
            command = `команда_${j}_`;
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
                testCommand = `команда_1_`;
                break;
            case 'middle':
                testCommand = `команда_${mid}_`;
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
                          ? `00-00-00_ref_1_`
                          : regState === 'high'
                            ? `напомни для user_1 позвонить маме в 18:30`
                            : `cmd_1`;
                break;
            case 'middle':
                testCommand =
                    regState === 'low'
                        ? `${mid} страниц`
                        : regState === 'middle'
                          ? `00-00-00_ref_${mid}_`
                          : regState === 'high'
                            ? `напомни для user_${mid} позвонить маме в 18:30`
                            : `cmd_${mid}`;
                break;
            case 'high':
                testCommand = `несуществующая команда ${Date.now()}`;
                break;
        }
    }

    gc();
    const content = getContent(testCommand);
    await new Promise((resolve) => {
        setTimeout(resolve, 1);
    });
    gc();
    await new Promise((resolve) => {
        setTimeout(resolve, 1);
    });
    const beforeMemory = process.memoryUsage().heapUsed;
    res.beforeRunMemory = (beforeMemory / 1024).toFixed(2);

    const start = performance.now();
    try {
        await bot.run(T_ALISA, content);
    } catch (e) {
        /* ignore */
    }
    const duration = performance.now() - start;

    const start2 = performance.now();
    try {
        await bot.run(T_ALISA, getContent(testCommand));
    } catch (e) {
        /* ignore */
    }
    const duration2 = performance.now() - start2;
    gc();
    const afterMemory = process.memoryUsage().heapUsed;
    res.afterRunMemory = (afterMemory / 1024).toFixed(2);
    res.memoryIncrease = ((afterMemory - beforeMemory) / 1024).toFixed(2);
    res.memoryIncreaseFromStart = ((afterMemory - startedMemory) / 1024).toFixed(2);

    bot.clearCommands();
    gc();
    const finalMemory = process.memoryUsage().heapUsed;
    res.finalMemory = (finalMemory / 1024).toFixed(2);
    res.memoryDifference = ((finalMemory - startedMemory) / 1024).toFixed(2);
    res.duration = duration.toFixed(2);
    res.duration2 = duration2.toFixed(2);

    status.push(res);
}

function getAvailableMemoryMB() {
    const free = os.freemem();
    // Оставляем 50 МБ на систему и Node.js рантайм
    return Math.max(0, (free - 50 * 1024 * 1024) / (1024 * 1024));
}

function predictMemoryUsage(commandCount) {
    // Максимальное потребление примерно 1.3 КБ на команду(округляем до 2) + запас под nodejs и логику
    return 15 + (commandCount * 2) / 1024 + 50; // в МБ
}

// --- Запуск ---
async function start() {
    try {
        // Количество команд
        const counts = [50, 250, 500, 1000, 2e3, 2e4, 5e4, 2e5, 1e6];
        // Исход поиска(требуемая команда в начале списка, требуемая команда в середине списка, требуемая команда не найдена)
        const states = ['low', 'middle', 'high'];
        // Сложность регулярных выражений (low — простая, middle — умеренная, high — сложная(субъективно))
        const regStates = ['low', 'middle', 'high'];

        console.log(
            '⚠️ Этот benchmark тестирует ЭКСТРЕМАЛЬНЫЕ сценарии (до 1 млн команд).\n' +
                '   В реальных проектах редко используется более 1000 команд.\n' +
                '   Результаты при >20 000 команд НЕ означают, что фреймворк "медленный" —\n' +
                '   это означает, что такую логику нужно архитектурно декомпозировать.',
        );
        // для чистоты запускаем gc
        gc();
        let cCountFErr = 0;

        const printResult = () => {
            console.log('Подготовка отчета...');
            printSummary(status);
            printFinalSummary(status);
            console.log('');
            console.log('🔍 АНАЛИЗ РЕЗУЛЬТАТОВ');
            console.log('💡 Типичные production-проекты содержат:');
            console.log('   • до 50 команд — простые навыки');
            console.log('   • до 500 команд — сложные корпоративные боты');
            console.log('   • до 10 000 команд — крайне редко (требует архитектурного пересмотра)');
            console.log('');

            const time50 = Math.max(
                ...status
                    .filter((item) => {
                        return item.count === 50;
                    })
                    .map((item) => {
                        return +item.duration;
                    }),
            );

            const time500 = Math.max(
                ...status
                    .filter((item) => {
                        return item.count === 500;
                    })
                    .map((item) => {
                        return +item.duration;
                    }),
            );

            const time20k = Math.max(
                ...status
                    .filter((item) => {
                        return item.count === 2e4;
                    })
                    .map((item) => {
                        return +item.duration;
                    }),
            );

            console.log(
                '✅ Анализ производительности:\n' +
                    `   • При 50 команд (типичный средний навык):\n` +
                    `     — Худший сценарий: ${time50} мс\n` +
                    `     — ${time50 <= 20 ? '🟢 Отлично: фреймворк не будет узким местом' : time50 <= 150 ? '🟡 Хорошо: укладывается в гарантии платформы' : '⚠️ Внимание: время близко к лимиту. Проверьте, не связано ли это с нагрузкой на сервер (CPU, RAM, GC).'}\n` +
                    `   • При 500 команд (типичный крупный навык):\n` +
                    `     — Худший сценарий: ${time500} мс\n` +
                    `     — ${time500 <= 50 ? '🟢 Отлично: фреймворк не будет узким местом' : time500 <= 200 ? '🟡 Хорошо: укладывается в гарантии платформы' : '⚠️ Внимание: время близко к лимиту. Проверьте, не связано ли это с нагрузкой на сервер (CPU, RAM, GC).'}\n` +
                    `   • При 20 000 команд (экстремальный сценарий):\n` +
                    `     — Худший сценарий: ${time20k} мс\n` +
                    `     — ${time20k <= 75 ? '🟢 Отлично: производительность в норме' : time20k <= 300 ? '🟡 Приемлемо: фреймворк укладывается в 1 сек' : '⚠️ Внимание: время обработки велико, возможно стоит использовать re2 или задуматься о более производительной конфигурации сервера.'}\n` +
                    '💡 Примечание:\n' +
                    '   — Платформы (Алиса, Сбер и др.) дают до 3 секунд на ответ.\n' +
                    '   — В типичных сценариях (до 1 000 команд) внутренняя обработка umbot занимает менее 1 с при количестве команд до 10 000 (оставляя 2+ сек на ваш код).\n' +
                    '   — Всплески времени (например, 100–200 мс) могут быть вызваны сборкой мусора (GC) в Node.js — это нормально.\n' +
                    '   — Если сервер слабый (1 ядро, 1 ГБ RAM), даже отличный фреймворк/библиотека не сможет компенсировать нехватку ресурсов.',
            );
            console.log('');
            console.log('⚠️ Рекомендация:');
            console.log('   Если вы планируете использовать >10 000 команд:');
            console.log('   • Разбейте логику на под навыки');
            console.log('   • Используйте параметризованные интенты вместо статических команд');
            console.log('   • Избегайте простых регулярных выражений в большом количестве');
            console.log(
                '💡 Вместо 10 000 статических команд:\n' +
                    "   — Используйте `addCommand('search', [/^найти (.+)$/], ...)`  \n" +
                    '   — Храните данные в БД, а не в коде\n' +
                    '   — Делегируйте логику в `action()` через NLU или внешний API',
            );
        };

        try {
            for (let count of counts) {
                const predicted = predictMemoryUsage(count);
                const available = getAvailableMemoryMB();
                if (predicted > available * 0.9) {
                    console.log(`⚠️ Недостаточно памяти для теста (${count} команд).`);
                    break;
                }

                cCountFErr = count;
                console.log(`Запуск тестов для ${count} команд...`);
                for (let state of states) {
                    gc();
                    await new Promise((resolve) => {
                        setTimeout(resolve, 1);
                    });
                    await runTest(count, false, state);
                    for (let regState of regStates) {
                        gc();
                        await new Promise((resolve) => {
                            setTimeout(resolve, 1);
                        });
                        await runTest(count, true, state, regState);
                    }
                }
            }
        } catch (e) {
            console.log(`Упал при выполнении тестов для ${cCountFErr} команд. Ошибка: ${e}`);
        }
        gc();
        printResult();
        if (process.platform === 'win32') {
            console.log(
                '⚠️ Внимание: Node.js на Windows работает менее эффективно, чем на Unix-системах (Linux/macOS). Это может приводить к высокому потреблению памяти и замедлению обработки под нагрузкой.\n' +
                    'Для корректной оценки производительности и использования в продакшене рекомендуется запускать приложение на сервере с Linux.',
            );
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

start();
