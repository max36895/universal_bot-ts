const crypto = require('node:crypto');

const COMMAND_COUNT = 1000;
const commands = new Map();

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

function addCommand(commandName, intents, cb) {
    commands.set(commandName, { intents, cb, intentsStr: intents[0] });
}

for (let i = 0; i < COMMAND_COUNT; i++) {
    const phrase = `${PHRASES[i % PHRASES.length]}_${Math.floor(i / PHRASES.length)}`;
    addCommand(`cmd_${i}`, [phrase], (cmd, ctrl) => {
        ctrl.text = 'handled cmd';
    });
}
const bt = {};

addCommand('start', ['/start'], (_) => {
    bt.text = 'start';
});
addCommand('help', ['/help'], (_) => {
    bt.text = 'help';
});
addCommand('*', ['*'], (_) => {
    bt.text = 'hello my friend';
});

async function getCommand(data) {
    const text = JSON.parse(data).request.command;
    let resultCommand;
    for (let [commandName, command] of commands) {
        if (commandName !== '*') {
            if (!command.intentsStr) {
                if (text.includes(command.intents)) {
                    resultCommand = command;
                    break;
                }
            } else {
                for (let i = 0; i < command.intents.length; ++i) {
                    if (command.intents[i] === text || text.includes(command.intents[i])) {
                        resultCommand = command;
                        break;
                    }
                }
            }
        }
        if (resultCommand) {
            command.cb();
            break;
        }
    }
    if (!resultCommand) {
        if (commands.get('*')) {
            commands.get('*').cb();
        }
    }
    return JSON.stringify({ resultCommand });
}

function run() {
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
    return getCommand(text);
}

console.log(
    '🧪 Тест с fallback командами (неизвестные запросы)\n' +
        'Проверяет сценарий, когда все запросы пользователя не удалось найти среди команд',
);

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
        request: {
            command: text,
            original_utterance: text,
            type: 'SimpleUtterance',
            nlu: {},
        },
        state: { session: {} },
        version: '1.0',
    });
}

async function test() {
    const results = [];
    const iterations = 50000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        // Создаем случайный текст, которого точно нет в командах
        const randomText = crypto.randomBytes(20).toString('hex');
        const startReq = performance.now();
        await getCommand(mockRequest(randomText));
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

test();
