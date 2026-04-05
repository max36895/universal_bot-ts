// fallback.js
// Запуск: node --expose-gc fb.js

const { Bot, unlink } = require('../dist/index');
const { fullPlatforms, FileAdapter, T_ALISA } = require('../dist/plugins');

const FileDBAdapter = FileAdapter;
const crypto = require('node:crypto');
const { join } = require('node:path');

const COMMAND_COUNT = 1000;

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

const bot = new Bot(T_ALISA);
bot.setAppConfig({
    isLocalStorage: true,
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
