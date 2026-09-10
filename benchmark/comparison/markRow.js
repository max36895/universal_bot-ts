/**
 * Логика меток «лучший/паритет» для compare-стендов (benchmark/comparison/).
 * Вынесена из runner.js в отдельный модуль, чтобы тестировать юнит-тестами
 * (tests/Performance/markRow.test.ts) без запуска самих стендов — по образцу
 * umVerdict.js, где вынос логики вердиктов уже окупился поимкой двух багов.
 *
 * Правило (синхронизировано с константами WIN_REL/WIN_ABS_US в runner.js):
 *   - победа — отрыв лучшего от ВТОРОГО места, пробивающий ОБА порога:
 *     и ≥ WIN_ABS_US микросекунд, и ≥ WIN_REL по отношению;
 *   - паритет — отставание от лучшего меньше ЛЮБОГО из порогов;
 *   - «—» — отставание больше обоих порогов (участник вне борьбы).
 *
 * Почему оба порога одновременно: 0.1 мкс на базе 1.4 — это 7% «относительных»,
 * но абсолютные 0.1 мкс ниже таймерного шума прогона; верить таким «победам»
 * нельзя (замечено на MAX: 1.5 против 1.4 мкс помечалось «лучший», хотя по
 * собственным правилам стенда это паритет). И наоборот: 0.4 мкс на базе 40 мкс
 * — это 1% «незначимых», но абсолютный отрыв в 0.4 мкс больше шумового порога,
 * и лидер с ним выигрывает честно.
 */

/** Порог относительного отрыва лучшего от второго места. */
const WIN_REL = 1.05;

/** Порог абсолютного отрыва лучшего от второго места, мкс. */
const WIN_ABS_US = 0.3;

/**
 * Считает метки «лучший»/«паритет» для строки таблицы сценария.
 *
 * @param {string[]} names имена участников
 * @param {Object.<string, {p50Us: number}>} data p50 участников, мкс
 * @returns {Array.<{name: string, d: Object, winner: boolean, tie: boolean}>}
 */
function markRow(names, data) {
    const p50s = names.map((n) => data[n].p50Us);
    const sorted = [...p50s].sort((a, b) => a - b);
    const best = sorted[0];
    const second = sorted[1];
    // Победа лидера: отрыв от ВТОРОГО места пробивает оба порога сразу.
    const confidentWin =
        second !== undefined && second - best >= WIN_ABS_US && second / best >= WIN_REL;
    // Полоса паритета: отставание от лучшего меньше любого из порогов.
    const inTieBand = (d) => d.p50Us - best < WIN_ABS_US || d.p50Us / best < WIN_REL;
    return names.map((n) => {
        const d = data[n];
        const winner = confidentWin && d.p50Us === best;
        const tie = !winner && inTieBand(d);
        return { name: n, d, winner, tie };
    });
}

module.exports = { markRow, WIN_REL, WIN_ABS_US };
