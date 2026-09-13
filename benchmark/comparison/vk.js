// benchmark/comparison/vk.js — стенд сравнения umbot с vk-io (VK Bot API).
//
// Запуск (зависимости ставятся в эту же папку, не в корень репозитория):
//   npm i --prefix benchmark/comparison
//   npm run compare:vk
//
// Участники:
//   - umbot + VkAdapter (vk_load_user_info: false — иначе адаптер по умолчанию
//     ходит в VK API за именем пользователя, что в офлайн-стенде исключено);
//   - vk-io — самый популярный VK SDK в npm, матчинг через @vk-io/hear
//     (HearManager — их идиоматичный роутер текста).
//
// Честность:
//   - Один вход для ВСЕХ: одинаковый Callback API-апдейт message_new
//     (структура байт в байт; client_info обязателен — без него vk-io
//     не заполняет ctx.text).
//   - Сеть исключена у всех: umbot — skipAutoReply, vk-io — обработчики
//     без ctx.send. VkAdapter дополнительно переведён в режим без загрузки
//     профиля пользователя (это фича адаптера, а не урезание стенда).
//   - Семантика выровнена: подстрочный матч у всех (vk-io — hear(RegExp),
//     т.к. их hear(строка) матчит только точное совпадение — проверено тестом).
//   - Fallback: umbot — команда '*', vk-io — onFallback у HearManager
//     (идиоматично для каждого).
//   - Lockstep: раунды чередуют реализации; медианы из 10 раундов.
const path = require('path');
const { runBench, slotFor, asRegExp } = require('./runner');

const { VkAdapter } = require(path.join(__dirname, '..', '..', 'dist', 'plugins.js'));

// Callback API-апдейт VK: message_new. client_info обязателен для vk-io
// (без него текст сообщения ленивый и пустой), umbot его просто игнорирует.
// userId попадает в from_id/peer_id — стресс-стенд ротирует 1000 разных
// пользователей (прогревает per-user пути и кэши).
function vkUpdate(text, id, userId = 42) {
    return {
        type: 'message_new',
        group_id: 1,
        v: '5.199',
        object: {
            message: {
                id,
                date: 1700000000,
                peer_id: userId,
                from_id: userId,
                text,
                random_id: 0,
                out: 0,
                conversation_message_id: id,
            },
            client_info: {},
        },
    };
}

function competitors() {
    const { VK } = require('vk-io');
    const { HearManager } = require('@vk-io/hear');
    return [
        {
            name: 'vk-io',
            make: () => {
                const vk = new VK({ token: 't', apiMode: 'sequential', pollingGroupId: 1 });
                const hearManager = new HearManager();
                vk.updates.on('message_new', hearManager.middleware);
                return { vk, hearManager };
            },
            setup: ({ hearManager }, sc) => {
                for (let i = 0; i < sc.cmds; i++) {
                    hearManager.hear(asRegExp(slotFor(sc, i)), () => {});
                }
                if (sc.hit === 'fallback') {
                    hearManager.onFallback(() => {});
                }
            },
            run: ({ vk }, req, i) => vk.updates.handleWebhookUpdate(vkUpdate(req, 1000 + i)),
            delay: 100,
        },
    ];
}

/**
 * Описание стенда (см. telegram.js — зачем отдельный экспорт).
 */
function buildBenchOptions() {
    return {
        platform: 'VK (vk-io, @vk-io/hear)',
        makeUpdate: vkUpdate,
        umbot: { adapter: new VkAdapter('t', { vk_load_user_info: false }), botType: 'vk' },
        competitors: competitors(),
        honestyNoteExtra:
            'umbot: VkAdapter с vk_load_user_info: false (иначе адаптер ходит в VK API за именем).',
    };
}

if (require.main === module) {
    runBench(buildBenchOptions()).catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { buildBenchOptions };
