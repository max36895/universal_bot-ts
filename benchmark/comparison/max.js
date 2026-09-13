// benchmark/comparison/max.js — стенд сравнения umbot с @maxhub/max-bot-api (MAX).
//
// Запуск (зависимости ставятся в эту же папку, не в корень репозитория):
//   npm i --prefix benchmark/comparison
//   npm run compare:max
//
// Участники:
//   - umbot + MaxAdapter;
//   - @maxhub/max-bot-api — официальный фреймворк MAX Bot API.
//
// Честность:
//   - Один вход для ВСЕХ: одинаковый апдейт message_created (структура байт
//     в байт). Обработка через штатный handleUpdate конкурента (приватное
//     поле, но это ровно путь, которым его polling/webhook слои скармливают
//     апдейты middleware-цепочке).
//   - Сеть исключена у всех: umbot — skipAutoReply, max-bot-api —
//     обработчики без ctx.reply, ошибки перехвачены catch().
//   - Семантика выровнена: подстрочный матч у всех (max-bot-api —
//     hears(RegExp), т.к. их hears(строка) матчит только точное совпадение —
//     проверено тестом).
//   - Fallback: umbot — команда '*', max-bot-api — on('message_created')
//     в конце (идиоматично для каждого).
//   - Lockstep: раунды чередуют реализации; медианы из 10 раундов.
const path = require('path');
const { runBench, slotFor, asRegExp } = require('./runner');

const { MaxAdapter } = require(path.join(__dirname, '..', '..', 'dist', 'plugins.js'));

// Апдейт MAX: message_created (новое текстовое сообщение в личном чате).
// userId попадает в sender.user_id — стресс-стенд ротирует 1000 разных
// пользователей (прогревает per-user пути и кэши).
function maxUpdate(text, id, userId = 42) {
    return {
        update_type: 'message_created',
        timestamp: id,
        message: {
            body: { text },
            sender: { user_id: userId },
            recipient: { chat_id: 1, chat_type: 'private' },
            message_id: id,
        },
    };
}

function competitors() {
    const { Bot } = require('@maxhub/max-bot-api');
    return [
        {
            name: 'max-bot-api',
            make: () => {
                const bot = new Bot('t');
                bot.catch(() => {});
                return bot;
            },
            setup: (bot, sc) => {
                for (let i = 0; i < sc.cmds; i++) {
                    bot.hears(asRegExp(slotFor(sc, i)), () => {});
                }
                if (sc.hit === 'fallback') {
                    bot.on('message_created', () => {});
                }
            },
            run: (bot, req, i) => bot.handleUpdate(maxUpdate(req, 1000 + i)),
            delay: 100,
        },
    ];
}

/**
 * Описание стенда (см. telegram.js — зачем отдельный экспорт).
 */
function buildBenchOptions() {
    return {
        platform: 'MAX (max-bot-api)',
        makeUpdate: maxUpdate,
        umbot: { adapter: new MaxAdapter('t'), botType: 'max_app' },
        competitors: competitors(),
        honestyNoteExtra:
            'max-bot-api — официальный фреймворк MAX (обработка через его штатный handleUpdate).',
    };
}

if (require.main === module) {
    runBench(buildBenchOptions()).catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { buildBenchOptions };
