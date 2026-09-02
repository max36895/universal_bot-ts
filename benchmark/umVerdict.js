/**
 * Логика вердикта для бенчмарка сравнения (benchmark/um.js, npm run comparison).
 * Вынесена в отдельный модуль, чтобы тестировать её юнит-тестами
 * (tests/Performance/umVerdict.test.ts) без запуска самого бенчмарка.
 *
 * Принцип (исправлен после ревизии честности): время — главный показатель,
 * память (retain после gc — утечки) — второстепенный. Память в пределах шума
 * не должна ни спасать просадку времени, ни мешать лучшему результату.
 */

/** Порог шума для retain-памяти, КБ на запрос. GC-замер плавает на ±1-2 КБ. */
const MEM_NOISE_KB = 1;

/** Допустимая просадка времени, %. */
const TIME_THRESHOLD = 10;

/** Допустимый лишний retain на запрос, КБ. */
const MEM_THRESHOLD = 30;

/**
 * Вердикт по паре метрик «umbot vs clean».
 *
 * Раньше здесь были два бага:
 * 1. Равенство по памяти (0.00 KB) не попадало ни в одну ветку и давало
 *    «-- уступаем» даже при времени −99%.
 * 2. Шумовое «улучшение» памяти (−0.002 КБ) маскировало просадку времени ×3.
 *
 * @param timeDelta Процент разницы времени (umbot vs clean): отрицательное — umbot быстрее
 * @param memDelta Разница retain-памяти, КБ/запрос: отрицательное — umbot экономнее
 * @returns Вердикт-строка для таблицы 2
 */
function getVerdict(timeDelta, memDelta) {
    // Память в пределах шума — сравниваем только время.
    const memEqual = Math.abs(memDelta) < MEM_NOISE_KB;
    const timeEqual = Math.abs(timeDelta) <= TIME_THRESHOLD;

    if (memEqual) {
        if (timeEqual) {
            return '== паритет';
        }
        if (timeDelta < 0) {
            return '++ лучше';
        }
        if (timeDelta <= 20) {
            return '+- допустимо*';
        }
        return '-- уступаем';
    }

    // Память значимо лучше (umbot экономнее).
    if (memDelta < 0) {
        if (timeDelta <= 0) {
            return '++ лучше';
        }
        if (timeDelta <= TIME_THRESHOLD) {
            return '+- допустимо*';
        }
        // Значимая просадка времени не оправдывается экономией памяти.
        return '-- уступаем';
    }

    // Память значимо хуже (umbot тратит больше retain).
    if (timeDelta < 0 && memDelta <= MEM_THRESHOLD) {
        return '+- допустимо*';
    }
    if (timeDelta <= TIME_THRESHOLD && memDelta <= MEM_THRESHOLD) {
        return '+- допустимо**';
    }
    return '-- уступаем';
}

module.exports = { getVerdict, MEM_NOISE_KB, TIME_THRESHOLD, MEM_THRESHOLD };
