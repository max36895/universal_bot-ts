// stress-test.js
// Запуск: node --expose-gc stress-test.js

const { Bot, BotController, rand, unlink, Text } = require('../dist/index');

const { fullPlatforms, FileAdapter, T_ALISA } = require('../dist/plugins');

const FileDBAdapter = FileAdapter;
const crypto = require('node:crypto');
const os = require('node:os');
const { join } = require('node:path');
const { eventLoopUtilization } = require('node:perf_hooks').performance;

const COMMAND_COUNT = 1000;

class StressController extends BotController {
    action(intentName) {
        if (intentName?.startsWith('cmd_')) {
            this.text = `OK: ${intentName}`;
        } else {
            this.text = 'fallback';
        }
    }
}

const PHRASES = [
    'привет',
    'пока',
    'справка',
    'отмена',
    'помощь',
    'старт',
    'найти',
    'сохранить',
    'показать',
    'удалить',
    'запустить игру',
    'остановить',
    'настройки',
    'обновить',
];

function getAvailableMemoryMB() {
    const free = os.freemem();
    // Оставляем 50 МБ на систему и Node.js рантайм
    return Math.max(0, (free - 50 * 1024 * 1024) / (1024 * 1024));
}

function predictMemoryUsage(commandCount) {
    // Базовое потребление + 0.4 КБ на команду + запас
    return 15 + (commandCount * 0.4) / 1024 + 50; // в МБ
}

function setupCommands(bot, count) {
    bot.clearCommands();
    for (let i = 0; i < count; i++) {
        const phrase = `${PHRASES[i % PHRASES.length]}_${Math.floor(i / PHRASES.length)}`;
        bot.addCommand(`cmd_${i}`, [phrase], (cmd, ctrl) => {
            ctrl.text = 'handled cmd';
        });
    }
}

function mockRequest(text) {
    return JSON.stringify({
        meta: {
            locale: 'ru-Ru',
            timezone: 'UTC',
            client_id: 'local',
            interfaces: { screen: true },
        },
        session: {
            message_id: 1,
            session_id: `s_${Date.now()}`,
            skill_id: 'stress',
            user_id: `u_${crypto.randomBytes(8).toString('hex')}`,
            new: Math.random() > 0.9,
        },
        request: { command: text, original_utterance: text, type: 'SimpleUtterance', nlu: {} },
        state: { session: {} },
        version: '1.0',
    });
}

let errorsBot = [];
const bot = new Bot(T_ALISA);
bot.setAppConfig({
    // Когда используется локальное хранилище, скорость обработки выше.
    // Связанно с тем что не нужно создавать бд файл с большим количеством пользователей и очень частой записью/обращением.
    // Получается так, что подключение к бд может снизить показатель RPS, но даже несмотря на данный факт, скорость работы остается на довольно высоком уровне.
    // Данное значение можно поменять на false и убедиться в этом. Также важно учитывать что при 1 запуске база будет пустой, но по мере теста может заполниться до 70_000+ записей
    isLocalStorage: true,
});
bot.initBotController(StressController);
const metric = {};
bot.setLogger({
    error: (msg) => {
        errorsBot.push(msg);
        console.error(msg);
    },
    warn: (msg) => {
        // чтобы не писался файл с предупреждениями
        errorsBot.push(msg);
        console.warn(msg);
    },
    /*metric: (name, time) => {         if (!metric[name]) {             metric[name] = {                 name: name,                 count: 0,                 time: 0,             };         }         if (typeof time === 'number') {             metric[name].count++;             metric[name].time += time;         }     },*/
});
bot.use(fullPlatforms);
// Не будем подключать адаптер бд если храним данные внутри самой платформы
if (!bot.getAppContext().appConfig.isLocalStorage) {
    bot.use(new FileDBAdapter());
}
setupCommands(bot, COMMAND_COUNT);
bot.addCommand('start', ['/start'], (_, bt) => {
    bt.text = 'start';
});
bot.addCommand('help', ['/help'], (_, bt) => {
    bt.text = 'help';
});
bot.addCommand('*', ['*'], (_, bt) => {
    bt.text = 'hello my friend';
});

async function run() {
    let text;
    const pos = rand(0, 3) % 3;
    if (pos === 0) {
        text = 'привет_0';
    } else if (pos === 1) {
        text = `помощь_2`;
    } else {
        text = `удалить_3`;
    }

    text += ' ' + crypto.randomBytes(20).toString('hex');
    return bot.run(T_ALISA, mockRequest(text));
}

function getMemoryMB() {
    return Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
}

function validateResult(result) {
    return result?.response?.text;
}

// Тест с fallback (*) командой
async function fallbackTest() {
    console.log(
        '🧪 Тест с fallback командами (неизвестные запросы)\n' +
            'Проверяет сценарий, когда все запросы пользователя не удалось найти среди команд',
    );

    const results = [];
    const iterations = 50000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        // Создаем случайный текст, которого точно нет в командах
        const randomText = crypto.randomBytes(20).toString('hex');
        const startReq = performance.now();
        await bot.run('alisa', mockRequest(randomText));
        results.push(performance.now() - startReq);
    }

    const totalTime = performance.now() - start;
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const rps = (iterations / totalTime) * 1000;

    console.log(`   Fallback запросов: ${iterations}`);
    console.log(`   Общее время: ${totalTime.toFixed(2)} мс`);
    console.log(`   Среднее время: ${avg.toFixed(6)} мс`);
    console.log(`   RPS: ${rps.toFixed(0)}`);

    return rps;
}

// ───────────────────────────────────────
// 3. Запуск всех тестов
// ───────────────────────────────────────
async function runAllTests() {
    await fallbackTest();
    // Позволяем сохранить данные в файловую бд
    await new Promise((resolve) => setTimeout(resolve, 1000));
    unlink(join(__dirname, '..', 'json', 'UsersData.json'));
}

// ───────────────────────────────────────
// Запуск при вызове напрямую
// ───────────────────────────────────────
runAllTests().catch((err) => {
    console.error('❌ Критическая ошибка при запуске тестов:', err);
    unlink(join(__dirname, '..', 'json', 'UsersData.json'));
    process.exit(1);
});
