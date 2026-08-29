const REG_INTERVAL_QUANTIFIED = /}\s*[+*{?]/;
const REG_PIPE = /\([^)]*\|[^)]*\)/;
const REG_EV1 = /\([^)]*(\w)\1+[^)]*\|/;
const REG_EV2 = /\([^)]*[+*{][^)]*\|/;
const REG_REPEAT = /\([^)]*[+*{][^)]*\)\s*\{/;

/**
 * Проверяет, является ли символ после `)` началом квантификатора,
 * включая интервальную форму `{n,m}` (разбирается посимвольно,
 * чтобы не усложнять эвристику вложенными квантификаторами в самом шаблоне).
 */
function isQuantifierAfterGroup(pattern: string, from: number): boolean {
    let j = from;
    while (j < pattern.length && /\s/.test(pattern[j])) j++;
    if (j >= pattern.length) return false;
    const next = pattern[j];
    if (next === '+' || next === '*' || next === '?') return true;
    if (next !== '{') return false;
    // Разбираем {n} или {n,} или {n,m}
    let k = j + 1;
    while (k < pattern.length && pattern[k] >= '0' && pattern[k] <= '9') k++;
    if (k === j + 1) return false;
    if (pattern[k] === ',') {
        k++;
        while (k < pattern.length && pattern[k] >= '0' && pattern[k] <= '9') k++;
    }
    return pattern[k] === '}';
}

/**
 * Идёт от закрывающей скобки назад к парной открывающей с учётом
 * вложенности и экранирования. Возвращает индекс `(` или -1.
 */
function findGroupStart(pattern: string, closeIndex: number): number {
    let depth = 0;
    for (let k = closeIndex; k >= 0; k--) {
        // Текущий символ экранирован нечётным числом бэкслешей — пропускаем пару
        let backslashes = 0;
        let t = k - 1;
        while (t >= 0 && pattern[t] === '\\') {
            backslashes++;
            t--;
        }
        if (backslashes % 2 === 1) {
            k = t + 1;
            continue;
        }
        const ch = pattern[k];
        if (ch === ')' && k !== closeIndex) depth++;
        else if (ch === '(') {
            if (depth === 0) {
                return k;
            }
            depth--;
        }
    }
    return -1;
}

/**
 * Проверяет тело группы на источники катастрофического бэктрекинга:
 * квантификатор, альтернативу `|` или «любой символ» `.` вне символьных классов.
 */
function isExplosiveGroupBody(body: string): boolean {
    // Пропускаем префикс конструкции группы: (?:, (?=, (?!, (?<=, (?<!, (?<name>.
    // Иначе '?' из '(?:' ложно принимался за квантификатор внутри группы.
    let start = 0;
    if (body[0] === '?') {
        if (body[1] === '<') {
            const close = body.indexOf('>', 2);
            start = close === -1 ? body.length : close + 1;
        } else {
            start = 2;
        }
    }
    let inClass = false;
    for (let k = start; k < body.length; k++) {
        const ch = body[k];
        if (ch === '\\') {
            k++;
            continue;
        }
        if (ch === '[') inClass = true;
        else if (ch === ']') inClass = false;
        else if (
            !inClass &&
            (ch === '+' || ch === '*' || ch === '?' || ch === '{' || ch === '|' || ch === '.')
        ) {
            return true;
        }
    }
    return false;
}

/**
 * Ищет квантифицированные группы с внутренними источниками катастрофического
 * бэктрекинга: квантификатор, альтернативу `|` или «любой символ» `.` внутри
 * группы, которая сама квантифицирована — классика вида `(a+)+`, `(a|aa)+`,
 * `(\w+\.)+`. Простые `(abc)+` и `(.{2})` с фиксированным интервалом безопасны.
 */
function hasDangerousQuantifiedGroup(pattern: string): boolean {
    for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] === '\\') {
            i++;
            continue;
        }
        if (pattern[i] !== ')') {
            continue;
        }
        if (!isQuantifierAfterGroup(pattern, i + 1)) {
            continue;
        }
        const start = findGroupStart(pattern, i);
        if (start === -1) continue;
        if (isExplosiveGroupBody(pattern.slice(start + 1, i))) {
            return true;
        }
    }
    return false;
}

/**
 * Проверяет регулярное выражение на потенциальные ReDoS-уязвимости.
 *
 * Использует эвристический анализ для выявления опасных паттернов:
 * - Вложенные квантификаторы: (a+)+, (a*)*, (a|aa)+
 * - Квантифицированные группы с квантификатором/альтернативой/точкой внутри
 * - Альтернативы с пересекающимися паттернами: (a|aa)
 * - Повторяющиеся квантифицируемые группы: (a+){10,100}
 * - Интервалы под квантификатором: (?:a{2,3})+
 * - Слишком глубокая вложенность скобок (>5 уровней)
 * - Слишком длинные шаблоны (>1000 символов)
 *
 * @param {string} pattern - Регулярное выражение для проверки
 * @param {boolean} isRegex - Если true, pattern уже является скомпилированным RegExp (пропуск проверки компиляции)
 * @returns {boolean} true если выражение вероятно безопасно, false если обнаружена потенциальная уязвимость
 */
export function isRegexLikelySafe(pattern: string, isRegex: boolean): boolean {
    try {
        if (!isRegex) {
            new RegExp(pattern);
        }
        // 1. Защита от слишком длинных шаблонов (DoS через размер)
        if (pattern.length > 1000) {
            return false;
        }

        // 2. Основные ReDoS-эвристики

        // Квантифицированная группа с «взрывным» содержимым: (a+)+, (a|aa)+, (.*x)+
        if (hasDangerousQuantifiedGroup(pattern)) {
            return false;
        }

        // Интервал под квантификатором: (?:a{2,3})+
        if (REG_INTERVAL_QUANTIFIED.test(pattern)) {
            return false;
        }

        // Альтернативы с пересекающимися паттернами: (a|aa), (a|a+)
        // Простой признак: один терм — префикс другого
        // Точное определение сложно без AST, но часто такие паттерны содержат:
        // - `|` внутри группы + повторяющиеся символы
        const hasPipeInGroup = REG_PIPE.test(pattern);
        if (hasPipeInGroup) {
            // Дополнительная эвристика: есть ли повторяющиеся символы или квантификаторы?
            if (REG_EV1.test(pattern)) {
                return false;
            }
            if (REG_EV2.test(pattern)) {
                return false;
            }
        }

        // Повторяющиеся квантифицируемые группы: (a+){10,100}
        if (REG_REPEAT.test(pattern)) {
            return false;
        }

        // Слишком глубокая вложенность скобок — признак сложности
        let depth = 0;
        let maxDepth = 0;
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === '\\' && i + 1 < pattern.length) {
                i++; // пропускаем экранированный символ
                continue;
            }
            if (pattern[i] === '(') depth++;
            else if (pattern[i] === ')') depth--;
            if (depth < 0) {
                return false; // некорректная скобочная структура
            }
            if (depth > maxDepth) {
                maxDepth = depth;
            }
        }
        return maxDepth <= 5;
    } catch {
        return false;
    }
}
