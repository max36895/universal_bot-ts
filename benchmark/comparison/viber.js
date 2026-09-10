// benchmark/comparison/viber.js — стенд сравнения umbot с viber-bot (Viber).
//
// Запуск (зависимости ставятся в эту же папку, не в корень репозитория):
//   npm i --prefix benchmark/comparison
//   npm run compare:viber
//
// Участники:
//   - umbot + ViberAdapter;
//   - viber-bot — канонический Viber SDK в npm.
//     Оговорка честности: viber-bot заброшен (последний релиз 2022), но это
//     единственный полноценный фреймворк Viber в npm — с ним и сравниваем.
//
// Честность:
//   - Один вход для ВСЕХ: одинаковый event message (структура байт в байт).
//     Обработка через штатный внутренний путь viber-bot _handleEventReceived —
//     это ровно то, что делает их webhook-слой после проверки подписи.
//   - Сеть исключена у всех: umbot — skipAutoReply, viber-bot — обработчики
//     без response.send.
//   - Семантика выровнена: подстрочный матч у всех (viber-bot —
//     onTextMessage(RegExp): их API принимает только RegExp, точной
//     строковой семантики там нет вовсе).
//   - Fallback: umbot — команда '*'; у viber-bot идиоматичного fallback для
//     текста нет — используем его общий on('message') (событие ловит все
//     сообщения), он стоит последним и вызывается на каждом сообщении.
//   - Lockstep: раунды чередуют реализации; медианы из 10 раундов.
const path = require('path');
const { runBench, slotFor, asRegExp } = require('./runner');

const { ViberAdapter } = require(path.join(__dirname, '..', '..', 'dist', 'plugins.js'));

// Событие message от Viber: текст от пользователя в личном чате.
// userId попадает в sender.id — стресс-стенд ротирует 1000 разных
// пользователей (прогревает per-user пути и кэши).
function viberUpdate(text, id, userId = 'u1') {
    return {
        event: 'message',
        timestamp: 1700000000,
        message_token: id,
        sender: { id: `user_${userId}`, name: 'U', api_version: 8 },
        message: { type: 'text', text },
    };
}

function competitors() {
    const Viber = require('viber-bot');
    return [
        {
            name: 'viber-bot',
            make: () => new Viber.Bot({ authToken: 't', name: 'B', avatar: '' }),
            setup: (bot, sc) => {
                // onTextMessage принимает только RegExp, строковых триггеров у
                // viber-bot нет вовсе — поэтому слот-строку оборачиваем в RegExp
                // (asRegExp из runner.js — единая обёртка подстрочной семантики).
                for (let i = 0; i < sc.cmds; i++) {
                    bot.onTextMessage(asRegExp(slotFor(sc, i)), () => {});
                }
                if (sc.hit === 'fallback') {
                    bot.on('message', () => {});
                }
            },
            run: (bot, req, i) =>
                Promise.resolve(bot._handleEventReceived(viberUpdate(req, 1000 + i))),
            delay: 100,
        },
    ];
}

/**
 * Описание стенда (см. telegram.js — зачем отдельный экспорт).
 */
function buildBenchOptions() {
    return {
        platform: 'Viber (viber-bot)',
        makeUpdate: viberUpdate,
        umbot: { adapter: new ViberAdapter('t'), botType: 'viber' },
        competitors: competitors(),
        honestyNoteExtra:
            'viber-bot — единственный полноценный фреймворк Viber в npm (не обновлялся с 2022).',
    };
}

if (require.main === module) {
    runBench(buildBenchOptions()).catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { buildBenchOptions };
