// benchmark/comparison/alisa.js — стенд сравнения umbot с yandex-dialogs-sdk (Алиса).
//
// Запуск (зависимости ставятся в эту же папку, не в корень репозитория):
//   npm i --prefix benchmark/comparison
//   npm run compare:alisa
//
// Участники:
//   - umbot + AlisaAdapter;
//   - yandex-dialogs-sdk — самый популярный SDK для навыков Алисы в npm
//     (~2.3.0, 2022; «не аффилирован с Яндексом»). У него нет команд-шагов
//     уровня фреймворка umbot — сравниваем его дисциплину: роутинг команды.
//     Сцен со Stage/Scene (аналог шагов) у SDK есть, но в стенд не входит —
//     он опционален и по умолчанию выключен.
//
// Честность:
//   - Один вход для ВСЕХ: одинаковый JSON-запрос навыка (структура байт
//     в байт). Обработка через штатный handleRequest SDK — ровно тот путь,
//     которым его webhook-слой скармливает запросы middleware-цепочке.
//   - Сеть исключена у всех: umbot — skipAutoReply, SDK — обработчики
//     возвращают Reply без ctx.send/imagesApi.
//   - Семантика выровнена: подстрочный матч у всех. SDK command(строка)
//     матчит только точное совпадение (проверено тестом: «ну привет тебе»
//     на command('привет') падает с «No response for request»), поэтому
//     конкурентам слоты задаются RegExp'ами — их честная цена той же
//     семантики, что у umbot-слота.
//   - Fallback: umbot — команда '*', SDK — any() (идиоматично для каждого).
//   - ping-запросы (health-check) yandex-dialogs-sdk не перехватывает:
//     оба участника обрабатывают их полным пайплайном.
const path = require('path');
const { runBench, slotFor, asRegExp } = require('./runner');

const { AlisaAdapter } = require(path.join(__dirname, '..', '..', 'dist', 'plugins.js'));

// Запрос навыка Алисы: голосовая/текстовая команда пользователя.
// userId попадает в session.user_id — стресс-стенд ротирует 1000 разных
// пользователей (прогревает per-user пути и кэши).
function alisaUpdate(text, id, userId = 'u1') {
    return {
        meta: {
            locale: 'ru-RU',
            timezone: 'Europe/Moscow',
            client_id: 'bench',
            interfaces: {},
        },
        request: { command: text, original_utterance: text, type: 'SimpleUtterance' },
        session: { session_id: 's1', message_id: id, user_id: `user_${userId}`, new: false },
        version: '1.0',
    };
}

function competitors() {
    const { Alice, Reply } = require('yandex-dialogs-sdk');
    return [
        {
            name: 'dialogs-sdk',
            make: () => new Alice(),
            setup: (alice, sc) => {
                for (let i = 0; i < sc.cmds; i++) {
                    alice.command(asRegExp(slotFor(sc, i)), () => Reply.text('ok'));
                }
                if (sc.hit === 'fallback') {
                    alice.any(() => Reply.text('fallback'));
                }
            },
            run: (alice, req, i) =>
                // catch: при отсутствии обработчика SDK бросает ошибку —
                // в сценариях стенда обработчик есть всегда, страховка
                // для кривых правок стенда.
                alice.handleRequest(alisaUpdate(req, 1000 + i)).catch(() => null),
            delay: 100,
        },
    ];
}

/**
 * Описание стенда (см. telegram.js — зачем отдельный экспорт).
 */
function buildBenchOptions() {
    return {
        platform: 'Alisa (yandex-dialogs-sdk)',
        makeUpdate: alisaUpdate,
        umbot: { adapter: new AlisaAdapter(), botType: 'alisa' },
        competitors: competitors(),
        honestyNoteExtra:
            'yandex-dialogs-sdk — сторонний SDK (2022, без аффилиации с Яндексом); ' +
            'сравнивается его роутинг команд (Stage/Scene-шаги в стенд не входят).',
    };
}

if (require.main === module) {
    runBench(buildBenchOptions()).catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { buildBenchOptions };
