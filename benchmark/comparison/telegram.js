// benchmark/comparison/telegram.js — стенд сравнения umbot с реальными
// Telegram-фреймворками (grammy, telegraf).
//
// Запуск (зависимости ставятся в эту же папку, не в корень репозитория):
//   npm i --prefix benchmark/comparison
//   npm run compare
//
// Участники:
//   - umbot + TelegramAdapter;
//   - grammy — самый популярный Telegram-фреймворк в npm;
//   - telegraf — классический Telegram-фреймворк.
//
// Честность:
//   - Один вход для ВСЕХ: одинаковый Telegram-апдейт (структура байт в байт).
//     umbot подключён TelegramAdapter'ом, команды ставят ctx.skipAutoReply =
//     true: никто не ходит в сеть (у конкурентов ctx.reply не вызывается).
//   - Семантика выровнена: подстрочный матч у всех (конкурентам — hears(RegExp),
//     т.к. их hears(строка) матчит только точное совпадение — проверено тестом).
//   - Fallback: umbot — команда '*', конкуренты — on('message') в конце
//     (идиоматично для каждого).
//   - botInfo конкурентам задаётся явно (документированная опция/свойство),
//     иначе их handleUpdate ходит за getMe в сеть.
//
// Добавление нового конкурента: добавьте пакет в dependencies
// benchmark/comparison/package.json и опишите его в competitors() ниже по
// образцу grammy/telegraf (make + setup + run через его штатный
// офлайн-путь обработки апдейта).
const path = require('path');
const { runBench, slotFor, asRegExp } = require('./runner');

const { TelegramAdapter } = require(path.join(__dirname, '..', '..', 'dist', 'plugins.js'));

// Telegram-апдейт: текстовое сообщение в личном чате.
// userId попадает в from.id/chat.id — стресс-стенд ротирует 1000 разных
// пользователей (прогревает per-user пути и кэши).
function tgUpdate(text, id, userId = 42) {
    return {
        update_id: id,
        message: {
            message_id: id,
            from: {
                id: userId,
                is_bot: false,
                first_name: 'U',
                username: 'u',
                language_code: 'ru',
            },
            chat: { id: userId, first_name: 'U', username: 'u', type: 'private' },
            date: 1700000000,
            text,
        },
    };
}

const BOT_INFO = {
    id: 1,
    is_bot: true,
    first_name: 'B',
    username: 'bench_bot',
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
};

function competitors() {
    const { Bot: Grammy } = require('grammy');
    const { Telegraf } = require('telegraf');
    return [
        {
            name: 'grammy',
            make: () => {
                const g = new Grammy('1:t', { botInfo: BOT_INFO });
                g.catch(() => {});
                return g;
            },
            setup: (g, sc) => {
                for (let i = 0; i < sc.cmds; i++) {
                    g.hears(asRegExp(slotFor(sc, i)), () => {});
                }
                if (sc.hit === 'fallback') {
                    g.on('message', () => {});
                }
            },
            run: (g, req, i) => g.handleUpdate(tgUpdate(req, 1000 + i)),
            delay: 100,
        },
        {
            name: 'telegraf',
            make: () => {
                const t = new Telegraf('1:t');
                t.botInfo = BOT_INFO;
                t.catch(() => {});
                return t;
            },
            setup: (t, sc) => {
                for (let i = 0; i < sc.cmds; i++) {
                    t.hears(asRegExp(slotFor(sc, i)), () => {});
                }
                if (sc.hit === 'fallback') {
                    t.on('message', () => {});
                }
            },
            run: (t, req, i) => t.handleUpdate(tgUpdate(req, 1000 + i)),
            delay: 100,
        },
    ];
}

/**
 * Описание стенда. Экспортируется отдельно от запуска: stress.js и его
 * воркер подключают этот файл как модуль и поднимают участников в
 * изолированных процессах, не запуская обычный стенд.
 */
function buildBenchOptions() {
    return {
        platform: 'Telegram (grammy, telegraf)',
        makeUpdate: tgUpdate,
        umbot: { adapter: new TelegramAdapter(), botType: 'telegram' },
        competitors: competitors(),
        honestyNoteExtra:
            'grammy/telegraf: botInfo задан явно — иначе их handleUpdate ходит за getMe в сеть.',
    };
}

// Запуск обычного стенда — только при прямом вызове файла, не при require.
if (require.main === module) {
    runBench(buildBenchOptions()).catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { buildBenchOptions };
