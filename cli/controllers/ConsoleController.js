'use strict';
const path = require('node:path');
const CreateController = require(path.join(__dirname, 'CreateController.js')).create;
const utils = require(path.join(__dirname, '..', 'utils.js')).utils;
const flowGenerator = require(path.join(__dirname, '..', 'flowGenerator.js'));
const fs = require('node:fs');

const VERSION = '3.1.0';

function getFlags(argv) {
    const flags = [];
    argv.forEach((arg) => {
        if (arg.startsWith('--')) {
            flags.push(arg);
        }
    });
    return flags;
}

function generateEnv(force = false, fileName = '.env') {
    if (utils.isFile(fileName) && !force) {
        throw new Error(
            `Файл ${fileName} уже существует. Укажите --force, чтобы перезаписать его.`,
        );
    }
    utils.fwrite(
        fileName,
        `TELEGRAM_TOKEN=your-telegram-token
VK_TOKEN=your-vk-token
VK_CONFIRMATION_TOKEN=your-vk-confirmation-token
VK_SECRET_KEY=your-vk-secret-key
VIBER_TOKEN=your-viber-token
ALISA_TOKEN=your-alisa-token
MARUSIA_TOKEN=your-marusia-token
MAX_TOKEN=your-max-token

DB_HOST=localhost
DB_USER=user
DB_PASSWORD=password
DB_NAME=bot_db`,
    );
    console.log('.env файл успешно создан');
    console.warn(
        'ВНИМАНИЕ: файл .env содержит placeholder-значения. Замените их на реальные токены ' +
            'и убедитесь, что .env добавлен в ваш .gitignore — токены нельзя коммитить в git.',
    );
}

/**
 * Консольный скрипт, позволяющий создать пустой проект.
 * @param param
 * @param argv
 */
async function main(
    param = { appName: null, command: null, mode: 'prod', hostname: '0.0.0.0', port: 3000 },
    argv,
) {
    const infoText =
        'Доступные параметры:\n' +
        '\n - create <project-name> [--minimal] [--prod] - Создать новый голосовой навык/чат-бот. В качестве параметра передается название проекта(На Английском языке) или json файл с параметрами.' +
        '\n\t --minimal   Создать минимальную рабочую версию без класса-контроллера (логика в index.ts). Работает только для стандартного шаблона.' +
        '\n\t --prod      Создать production-готовый проект (Docker, CI/CD)' +
        '\n - create from-flow <flow.json> [--output ./path] [--usecloud] - Создать проект из flow.json (визуальный редактор)' +
        '\n\t --usecloud  Сгенерировать конфигурацию для Yandex Cloud Functions' +
        '\n - validate <flow.json> - Проверить корректность flow.json перед генерацией' +
        '\n - stats --log <path> - Агрегировать метрики из лога (число строк/ошибок/предупреждений, топ команд, p50/p95/p99 latency)' +
        '\n - generateEnv - Сгенерировать файл .env' +
        '\n - add <feature> - Добавляет данные в проект. Доступные типы: ' +
        '\n\t docker  Добавляет Dockerfile и .dockerignore' +
        '\n\t deploy  Добавляет файл для деплоя на сервер' +
        '\n\t env     Добавляет файл .env';
    if (param && param.command) {
        const create = new CreateController();
        create.flags = getFlags(argv);
        switch (param.command) {
            case 'create': {
                // Проверяем, не является ли второй аргумент "from-flow"
                if (argv[3] === 'from-flow') {
                    // Путь к flow.json — первый позиционный аргумент после from-flow.
                    // Флаги можно ставить как до, так и после пути:
                    // работают и `create from-flow flow.json --output ./x`,
                    // и `create from-flow --output ./x flow.json`.
                    let flowJsonPath = null;
                    for (let i = 4; i < argv.length; i++) {
                        if (argv[i] === '--output') {
                            i++; // пропускаем значение флага
                            continue;
                        }
                        if (argv[i].startsWith('--')) {
                            continue;
                        }
                        flowJsonPath = argv[i];
                        break;
                    }
                    if (!flowJsonPath) {
                        console.log('Укажите путь к flow.json файлу.');
                        console.log(
                            'Использование: npx umbot create from-flow flow.json --output ./my-bot',
                        );
                        break;
                    }
                    // Ищем флаги
                    const outputIdx = argv.indexOf('--output');
                    let outputPath =
                        './' + (require('path').basename(flowJsonPath, '.json') || 'my-bot');
                    if (outputIdx !== -1 && argv[outputIdx + 1]) {
                        outputPath = argv[outputIdx + 1];
                    }
                    const useCloud = argv.includes('--usecloud');
                    const force = argv.includes('--force');
                    try {
                        flowGenerator.generateFromFlow(flowJsonPath, outputPath, {
                            useCloud,
                            force,
                        });
                    } catch (e) {
                        console.error('Ошибка:', e.message);
                        process.exitCode = 1;
                    }
                    break;
                }
                create.flags = getFlags(argv);
                create.params = param.params ?? param;
                let type = CreateController.T_DEFAULT;
                if (param.params && param.params.type) {
                    let paramType = param.params.type.toLowerCase();
                    paramType = paramType.substring(0, 1).toUpperCase() + paramType.substring(1);
                    if ([CreateController.T_DEFAULT, CreateController.T_QUIZ].includes(paramType)) {
                        type = paramType;
                    } else {
                        throw new Error(
                            'Указан не поддерживаемый тип для создания шаблона приложения',
                        );
                    }
                }
                let envContent = '';
                if (param.params?.isEnv) {
                    // Собираем только те переменные, для которых реально передано значение.
                    // Иначе в .env попадали бы строки вида TELEGRAM_TOKEN=undefined.
                    const envPairs = [
                        ['TELEGRAM_TOKEN', create.params?.params?.telegram_token],
                        ['VK_TOKEN', create.params?.params?.vk_token],
                        ['VK_CONFIRMATION_TOKEN', create.params?.params?.vk_confirmation_token],
                        ['VIBER_TOKEN', create.params?.params?.viber_token],
                        [
                            'ALISA_TOKEN',
                            create.params?.params?.alisa_token ||
                                create.params?.params?.yandex_token,
                        ],
                        ['MARUSIA_TOKEN', create.params?.params?.marusia_token],
                        ['MAX_TOKEN', create.params?.params?.max_token],
                        ['DB_HOST', create.params?.config?.db?.host],
                        ['DB_USER', create.params?.config?.db?.user],
                        ['DB_PASSWORD', create.params?.config?.db?.pass],
                        ['DB_NAME', create.params?.config?.db?.database],
                    ];
                    envContent = envPairs
                        .filter(
                            ([, value]) => value !== undefined && value !== null && value !== '',
                        )
                        .map(([key, value]) => `${key}=${value}`)
                        .join('\n');

                    delete create.params?.config?.db;
                    delete create.params?.params?.telegram_token;
                    delete create.params?.params?.vk_token;
                    delete create.params?.params?.vk_confirmation_token;
                    delete create.params?.params?.viber_token;
                    delete create.params?.params?.alisa_token;
                    delete create.params?.params?.yandex_token;
                    delete create.params?.params?.marusia_token;
                    delete create.params?.params?.max_token;
                }
                await create.init(param.appName, type);
                if (envContent) {
                    create.generateFile('.env', envContent);
                }
                create.format();

                break;
            }

            case '-v':
            case 'version':
                console.log(`version: ${VERSION}\n`);
                break;

            case 'validate': {
                const flowJsonPath = argv[3];
                if (!flowJsonPath) {
                    console.log('Укажите путь к flow.json файлу.');
                    console.log('Использование: npx umbot validate flow.json');
                    break;
                }
                const errors = flowGenerator.validateFlowSchema(flowJsonPath);
                if (errors.length === 0) {
                    console.log(`✓ ${flowJsonPath} валиден — можно генерировать проект.`);
                } else {
                    console.error(`✗ Найдены ошибки в ${flowJsonPath}:`);
                    errors.forEach((err) => {
                        console.error(`  - ${err}`);
                    });
                    process.exitCode = 1;
                }
                break;
            }

            case 'generateenv':
                generateEnv(argv.includes('--force'));
                break;

            case 'stats': {
                // umbot stats --log <path-to-log>
                // Агрегирует счётчики из log-файла фреймворка:
                //   total-строк, ошибок, топ команд по вхождениям, форматирует в консоль.
                const logIdx = argv.indexOf('--log');
                const logPath = logIdx !== -1 ? argv[logIdx + 1] : argv[3];
                if (!logPath) {
                    console.log('Укажите путь к log-файлу: umbot stats --log ./logs/app.log');
                    break;
                }
                try {
                    const stats = computeLogStats(logPath);
                    printStats(logPath, stats);
                } catch (e) {
                    console.error(`Не удалось прочитать лог: ${e.message}`);
                    process.exitCode = 1;
                }
                break;
            }

            case 'add':
                switch (argv[3]) {
                    case 'docker':
                        create.createDockerFile(process.cwd());
                        break;
                    case 'deploy':
                        create.createDeployFile(process.cwd());
                        break;
                    case 'env':
                        generateEnv(argv.includes('--force'));
                        break;
                    default:
                        console.log(infoText);
                }
                break;

            default:
                console.log(infoText);
                break;
        }
    } else {
        console.log(infoText);
    }
}

/**
 * Читает log-файл и считает базовые метрики.
 * Эвристика: error.log + warn.log + access.log унифицированы по паттернам
 *
 * @param {string} logPath путь к файлу лога
 * @returns {{total: number, errors: number, warnings: number, topCommands: Array<[string, number]>, p50: number|null, p95: number|null, p99: number|null}}
 */
function computeLogStats(logPath) {
    const resolved = path.resolve(logPath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`файл не найден: ${resolved}`);
    }
    const raw = fs.readFileSync(resolved, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);

    const result = {
        total: lines.length,
        errors: 0,
        warnings: 0,
        topCommands: [],
        p50: null,
        p95: null,
        p99: null,
    };

    const cmdCount = new Map();
    const durations = [];

    // Общие паттерны umbot: "[time]: message", платформа + команда
    const reError = /error|exception|traceback/i;
    const reWarn = /warn/i;
    // Паттерн для вызова команды: "Command 'start' matched", "user: 'spawn' command", и т.п.
    const reCommand = /command\s+'?([a-zа-яё_][\w-]*)'?/gi;
    // Паттерн для метрик времени выполнения: "Duration: 45ms", "took 12ms", "[Metric] REQUEST 45ms"
    // eslint-disable-next-line security/detect-unsafe-regex -- число разбирается без вложенных повторителей.
    const reDuration = /(\d+(?:\.\d+)?)\s*ms\b/i;

    for (const line of lines) {
        if (reError.test(line)) result.errors++;
        else if (reWarn.test(line)) result.warnings++;

        reCommand.lastIndex = 0;
        const cmdMatch = reCommand.exec(line);
        if (cmdMatch && cmdMatch[1]) {
            const name = cmdMatch[1].toLowerCase();
            cmdCount.set(name, (cmdCount.get(name) || 0) + 1);
        }

        const dMatch = reDuration.exec(line);
        if (dMatch && dMatch[1]) {
            durations.push(parseFloat(dMatch[1]));
        }
    }

    result.topCommands = [...cmdCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

    if (durations.length) {
        durations.sort((a, b) => a - b);
        const at = (q) =>
            durations[Math.min(durations.length - 1, Math.floor(durations.length * q))];
        result.p50 = at(0.5);
        result.p95 = at(0.95);
        result.p99 = at(0.99);
    }

    return result;
}

function printStats(logPath, stats) {
    console.log(`\n=== Анализ лога: ${logPath} ===`);
    console.log(`Строк всего:        ${stats.total}`);
    console.log(`Ошибок:             ${stats.errors}`);
    console.log(`Предупреждений:     ${stats.warnings}`);
    if (stats.p50 !== null) {
        console.log(`Latency (мс):       p50=${stats.p50}, p95=${stats.p95}, p99=${stats.p99}`);
    }
    if (stats.topCommands.length) {
        console.log('\nТоп команд:');
        for (const [name, count] of stats.topCommands) {
            console.log(`  ${name.padEnd(30)} ${count}`);
        }
    }
    console.log('');
}

exports.main = main;
exports.computeLogStats = computeLogStats;
exports.generateEnv = generateEnv;
