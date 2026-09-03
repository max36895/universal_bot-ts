const REG_INTERVAL_QUANTIFIED = /}\s*[+*{?]/;
const REG_PIPE = /\([^)]*\|[^)]*\)/;
const REG_EV1 = /\([^)]*(\w)\1+[^)]*\|/;
const REG_EV2 = /\([^)]*[+*{][^)]*\|/;
const REG_REPEAT = /\([^)]*[+*{][^)]*\)\s*\{/;

/**
 * Атом регулярного выражения для анализа пересечений.
 * `neg` — «почти всё»: `.`, `\W`/`\D`/`\S`, `[^...]` — консервативно считаем
 * пересекающимся с любым атомом (лучше ложная тревога на экзотике,
 * чем пропуск классики).
 *
 * `innerBody` — тело группы `(...)`: парсится для рекурсивного анализа
 * квантификаторных лестниц внутри (группа как единый атом их не видит).
 */
type TPatternAtom =
    { t: 'neg' } | { t: 'class'; ranges: [number, number][] } | { t: 'group'; body: string };

/** Результат разбора атома: сам атом, позиция следующего символа и признаки. */
type TParsedAtom = {
    atom: TPatternAtom;
    next: number;
    /** Тело группы `(...)`: для рекурсивного анализа лестниц внутри. */
    innerBody?: string;
    /** Backreference `\1`–`\9`: повтор группы амбивалентной длины. */
    isBackreference?: boolean;
};

const ATOM_DIGIT: [number, number][] = [[48, 57]];
const ATOM_WORD: [number, number][] = [
    [48, 57],
    [65, 90],
    [95, 95],
    [97, 122],
];
const ATOM_SPACE: [number, number][] = [
    [9, 13],
    [32, 32],
];

/** Проверяет пересечение двух наборов диапазонов кодпоинтов (группы — «пересекаются со всем»). */
function atomsOverlap(a: TPatternAtom, b: TPatternAtom): boolean {
    const ra = a.t === 'group' ? null : a;
    const rb = b.t === 'group' ? null : b;
    if (ra === null || rb === null || ra.t === 'neg' || rb.t === 'neg') {
        return true;
    }
    for (const r1 of ra.ranges) {
        for (const r2 of rb.ranges) {
            if (r1[0] <= r2[1] && r2[0] <= r1[1]) {
                return true;
            }
        }
    }
    return false;
}

/** Якорные escape-последовательности: совпадают с пустой строкой, не потребляют символы. */
const ZERO_WIDTH_ESCAPES = new Set(['b', 'B', 'A', 'Z', 'z', 'G', 'k']);

/**
 * Разбирает escape-последовательность в позиции i (`\` — pattern[i]).
 * Возвращает атом и индекс следующего символа, либо null для якорей/backreferences.
 */
function parseEscapeAtom(pattern: string, i: number): TParsedAtom | null {
    const esc = pattern[i + 1];
    if (/[1-9]/.test(esc ?? '')) {
        // Backreference \1..\9 — повтор ранее захваченной группы: амбивалентная
        // длина, источник катастрофического бэктрекинга в лестницах
        // ((a+)[^]*\1z). Как атом с консервативным классом «всё».
        return {
            atom: { t: 'group', body: '' },
            next: i + 2,
            isBackreference: true,
        };
    }
    switch (esc) {
        case 'w':
            return { atom: { t: 'class', ranges: ATOM_WORD }, next: i + 2 };
        case 'd':
            return { atom: { t: 'class', ranges: ATOM_DIGIT }, next: i + 2 };
        case 's':
            return { atom: { t: 'class', ranges: ATOM_SPACE }, next: i + 2 };
        case 'W':
        case 'D':
        case 'S':
            return { atom: { t: 'neg' }, next: i + 2 };
        case undefined:
            return null;
        case 'p':
        case 'P':
            // \p{L} — класс юникодных свойств; консервативно «почти всё»
            return { atom: { t: 'neg' }, next: skipUnicodeProperty(pattern, i + 2) };
        default: {
            if (ZERO_WIDTH_ESCAPES.has(esc)) {
                // \b, \B, \A, \Z, \G, \k — якоря/backreferences: ширины не имеют
                return null;
            }
            // Экранированный литерал: \. \! \\ \n \u1234 — диапазон из одного символа
            const code = esc.codePointAt(0) as number;
            return { atom: { t: 'class', ranges: [[code, code]] }, next: i + 2 };
        }
    }
}

/**
 * Разбирает атом, начиная с позиции i. Возвращает атом и индекс следующего
 * символа, либо null, если в позиции i не атом (квантификатор, якорь и т.п.).
 * Для группы `(...)` дополнительно возвращается её тело (innerBody) —
 * для рекурсивного анализа лестниц квантификаторов внутри.
 */
function parseAtom(pattern: string, i: number): TParsedAtom | null {
    // charAt за пределами строки даёт '', все проверки ниже устойчивы к этому
    // (noUncheckedIndexedAccess: индексный доступ к строке даёт undefined).
    const ch = pattern.charAt(i);
    if (ch === '\\') {
        return parseEscapeAtom(pattern, i);
    }
    if (ch === '[') {
        return parseCharClass(pattern, i);
    }
    if (ch === '(') {
        // Группа — потребляющий «атом» с непрозрачным телом: консервативно
        // пересекается со всем. Тело анализируется отдельно: рекурсией в
        // hasSequentialQuantifierChain (лестница внутри `(?:a*a*)` невидима
        // иначе) и hasDangerousQuantifiedGroup (квантифицированная группа).
        const close = skipGroup(pattern, i);
        return {
            atom: { t: 'group', body: pattern.slice(i, close) },
            next: close,
            innerBody: pattern.slice(i + 1, close - 1),
        };
    }
    if (
        ch === ')' ||
        ch === '|' ||
        ch === '{' ||
        ch === '*' ||
        ch === '+' ||
        ch === '?' ||
        ch === '^' ||
        ch === '$' ||
        /\s/.test(ch)
    ) {
        return null;
    }
    const code = ch.codePointAt(0) ?? 0;
    return { atom: { t: 'class', ranges: [[code, code]] }, next: i + 1 };
}

/** Пропускает `\p{...}` / `\P{...}` от позиции i (сразу после буквы p/P). */
function skipUnicodeProperty(pattern: string, i: number): number {
    if (pattern[i] !== '{') {
        return i;
    }
    const close = pattern.indexOf('}', i);
    return close === -1 ? pattern.length : close + 1;
}

/** Пропускает группу от `(` до парной `)` с учётом вложенности и экранирования. */
function skipGroup(pattern: string, start: number): number {
    let depth = 0;
    for (let k = start; k < pattern.length; k++) {
        if (pattern[k] === '\\') {
            k++;
            continue;
        }
        if (pattern[k] === '(') depth++;
        else if (pattern[k] === ')') {
            depth--;
            if (depth === 0) return k + 1;
        }
    }
    return pattern.length;
}

/** Кодпоинт символа; '' (за пределами строки) сворачивается к 0. */
function charCode(ch: string): number {
    return ch.codePointAt(0) ?? 0;
}

/** Добавляет в ranges атом-диапазон для экранированного символа класса (`\n`, `\.` и т.п.). */
function pushEscapeRange(ranges: [number, number][], esc: string): void {
    ranges.push([charCode(esc), charCode(esc)]);
}

/** Разбирает символьный класс `[a-z\d]` (включая `[^...]`) в набор диапазонов. */
function parseCharClass(
    pattern: string,
    start: number,
): { atom: TPatternAtom; next: number } | null {
    let i = start + 1;
    let negated = false;
    if (pattern[i] === '^') {
        negated = true;
        i++;
    }
    const ranges: [number, number][] = [];
    let first = true;
    while (i < pattern.length && (pattern.charAt(i) !== ']' || first)) {
        first = false;
        const ch = pattern.charAt(i);
        if (ch === '\\') {
            const esc = pattern.charAt(i + 1);
            if (esc === 'w') {
                ranges.push(...ATOM_WORD);
            } else if (esc === 'd') {
                ranges.push(...ATOM_DIGIT);
            } else if (esc === 's') {
                ranges.push(...ATOM_SPACE);
            } else if (esc === 'W' || esc === 'D' || esc === 'S') {
                return { atom: { t: 'neg' }, next: endOfClass(pattern, i) };
            } else if (esc !== '') {
                pushEscapeRange(ranges, esc);
            }
            i += 2;
            continue;
        }
        // Диапазон a-z (кодпоинты соседних символов)
        if (
            pattern.charAt(i + 1) === '-' &&
            pattern.charAt(i + 2) !== ']' &&
            pattern.charAt(i + 2) !== '' &&
            pattern.charAt(i + 2) !== '\\'
        ) {
            ranges.push([charCode(ch), charCode(pattern.charAt(i + 2))]);
            i += 3;
            continue;
        }
        ranges.push([charCode(ch), charCode(ch)]);
        i++;
    }
    if (pattern[i] !== ']') {
        return null; // некорректный класс — ранний new RegExp всё равно выбросит ошибку
    }
    if (negated) {
        return { atom: { t: 'neg' }, next: i + 1 };
    }
    return { atom: { t: 'class', ranges }, next: i + 1 };
}

/** Находит закрывающую `]` класса (для negated-эскейпов внутри). */
function endOfClass(pattern: string, from: number): number {
    let i = from;
    while (i < pattern.length) {
        if (pattern[i] === '\\') {
            i += 2;
            continue;
        }
        if (pattern[i] === ']') return i + 1;
        i++;
    }
    return pattern.length;
}

/**
 * Детектит «лестницу» из квантифицированных атомов с пересекающимися классами:
 * `.*.*.*!`, `x+x+y`, `\w*\w*\w*!`, `[a-z]*[a-z]*[a-z]*!`.
 *
/**
 * Результат анализа фрагмента паттерна на квантификаторные лестницы.
 *
 * `dangerous` — лестница найдена где-то внутри фрагмента.
 * `tailRun` — длина цепочки неограниченно квантифицированных атомов в самом
 * КОНЦЕ фрагмента: она «склеивается» с атомами после фрагмента. Для тела
 * группы `(?:a*a*)` tailRun=2, и внешний хвост `c` превращает пару в опасную
 * цепочку — без этого связывания `(?:a*a*)c` проходил проверку.
 */
interface IChainScan {
    dangerous: boolean;
    tailRun: number;
    tailAtom: TPatternAtom | null;
}

/**
 * Детектит «лестницу» из квантифицированных атомов с пересекающимися классами:
 * `.*.*.*!`, `x+x+y`, `\w*\w*\w*!`, в том числе замаскированную обёрткой в
 * группу: `(?:a*a*)c`, `.*(?:.*.*)!`, `(?:.*)(?:.*)(?:.*)x`, и backref-хвосты
 * `([a-z]+)[^]*\1z` (backreference повторяет группу с амбивалентной длиной
 * и после неограниченного квантификатора принуждает перебор разбиений).
 *
 * Соседние квантификаторы по пересекающимся классам без разделителя между ними
 * дают перебор всех разбиений строки: на неудачном входе это n²–n³ шагов.
 * Замеры на Node 24: `.*.*.*!` на 1024 символах — ~75 секунд блокировки event loop,
 * `(?:a*a*)c` на 7000 — ~2.7 минуты. При этом:
 * - цепочка из 2 + потребляющий хвост опасна всегда (`.*.*!`, `x+x+y`);
 * - цепочка из 3+ БЕЗ хвоста опасна только с последующим якорем `$`/`\Z`/`\z`
 *   (`\w+\w+\w+$` — таймаут на 7000), а без якоря V8 завершает early-exit
 *   (`.*.*.*` — 0 мс) и блокировать её незачем: цепочка «запоминается»
 *   (chain3) и детонирует только встретив конец-строчный якорь;
 * - цепочка с непересекающимися классами (`[a-z]+[0-9]+x`) безопасна — точки
 *   разбиения принуждены литералами;
 * - ограниченные интервалы (`{n}`, `{n,m}`, `?`) не порождают перебора и цепочку рвут.
 */
/** Признак прочитанного после атома квантификатора. */
interface IQuantifierInfo {
    /** Квантификатор присутствует (включая `?` и `{n,m}`). */
    isQuantified: boolean;
    /** Квантификатор без верхней границы: `+`, `*`, `{n,}`. */
    isUnbounded: boolean;
    /** Индекс первого символа ПОСЛЕ квантификатора. */
    next: number;
}

/**
 * Читает квантификатор после атома в позиции i: `+`, `*`, `?` (в т.ч. ленивые
 * `+?`/`*?`/`??`) и интервальный `{n}`/`{n,}`/`{n,m}`. Если квантификатора нет —
 * isQuantified=false, next=i.
 */
function readQuantifier(pattern: string, i: number): IQuantifierInfo {
    if (i >= pattern.length) {
        return { isQuantified: false, isUnbounded: false, next: i };
    }
    const q = pattern[i];
    if (q === '+' || q === '*') {
        const lazy = pattern[i + 1] === '?' ? 1 : 0;
        return { isQuantified: true, isUnbounded: true, next: i + 1 + lazy };
    }
    if (q === '?') {
        const lazy = pattern[i + 1] === '?' ? 1 : 0;
        return { isQuantified: true, isUnbounded: false, next: i + 1 + lazy };
    }
    if (q === '{') {
        const close = skipInterval(pattern, i);
        if (close === i) {
            return { isQuantified: false, isUnbounded: false, next: i };
        }
        // {n,} без верхней границы — неограниченный; {n}/{n,m} — ограниченные.
        // Единственная форма, где перед закрывающей `}` стоит запятая — {n,}
        const isUnbounded = pattern[close - 2] === ',' && pattern[close - 1] === '}';
        return { isQuantified: true, isUnbounded, next: close };
    }
    return { isQuantified: false, isUnbounded: false, next: i };
}

/** Проверяет, что позиция i — якорь конца строки `$` или `\Z`/`\z`. */
function isEndTextAnchor(pattern: string, i: number): boolean {
    if (pattern[i] === '$') {
        return true;
    }
    return pattern[i] === '\\' && (pattern[i + 1] === 'Z' || pattern[i + 1] === 'z');
}

function scanQuantifierChain(pattern: string, depth: number): IChainScan {
    if (depth > 5) {
        // Защита от паранойи на вложенных группах: глубже 5 уровней вложенности
        // паттерны реальных команд не заходят (отдельный лимит вложенности
        // есть в isRegexLikelySafe).
        return { dangerous: false, tailRun: 0, tailAtom: null };
    }
    let run = 0;
    let prevAtom: TPatternAtom | null = null;
    let chain3 = false; // цепочка 3+ без хвоста — опасна только с последующим $
    let i = 0;
    while (i < pattern.length) {
        const parsed = parseAtom(pattern, i);
        if (!parsed) {
            // Якорь конца строки детонирует отложенную цепочку 3+:
            // `\w+\w+\w+$` перебирает все разбиения до конца текста.
            if (chain3 && isEndTextAnchor(pattern, i)) {
                return { dangerous: true, tailRun: 0, tailAtom: null };
            }
            // Не атом: квантификатор без атома, якорь, `|`, `)`, пробел-разделитель.
            // Пробел и альтернатива принуждают точку разбиения — цепочка рвётся.
            i++;
            run = 0;
            prevAtom = null;
            chain3 = false;
            continue;
        }
        i = parsed.next;
        // Backreference после неограниченного квантификатора: \1 повторяет
        // группу амбивалентной длины и завершает перебор разбиений —
        // классика `([a-z]+)[^]*\1z` (минуты на 7000).
        if (parsed.isBackreference && run >= 1) {
            return { dangerous: true, tailRun: 0, tailAtom: null };
        }
        // Тело группы анализируем рекурсивно: лестница внутри `(?:a*a*)`
        // невидима, если парсить группу как один непрозрачный атом. Хвост
        // цепочки (tailRun) склеивается с внешними атомами — именно так
        // ловится `(?:a*a*)c`: пара внутри группы + хвост снаружи.
        let groupTailRun = 0;
        let groupTailAtom: TPatternAtom | null = null;
        if (parsed.innerBody !== undefined) {
            const inner = scanQuantifierChain(parsed.innerBody, depth + 1);
            if (inner.dangerous) {
                return { dangerous: true, tailRun: 0, tailAtom: null };
            }
            groupTailRun = inner.tailRun;
            groupTailAtom = inner.tailAtom;
        }
        const quant = readQuantifier(pattern, i);
        i = quant.next;
        if (quant.isQuantified) {
            if (!quant.isUnbounded) {
                // Ограниченный интервал не порождает перебора — цепочка рвётся
                run = 0;
                prevAtom = null;
                chain3 = false;
                continue;
            }
            if (prevAtom && atomsOverlap(prevAtom, parsed.atom)) {
                run++;
            } else {
                run = 1;
            }
            // Незаквантифицированная группа несёт хвост цепочки изнутри;
            // для квантифицированной группы внутренняя цепочка умножается
            // внешним повтором — складываем один раз.
            if (groupTailRun > 0) {
                run += groupTailRun;
            }
            prevAtom = parsed.atom;
            if (run >= 3) {
                chain3 = true;
            }
        } else if (run + groupTailRun >= 2) {
            // Атом без квантификатора — «хвост», который может несовпасть и
            // запустить перебор разбиений. Цепочка может быть набрана и из
            // внешних атомов, и из хвоста внутри незаквантифицированной группы:
            // `(?:.*)(?:.*)x` — по одному `.*` в каждой группе + внешний хвост.
            return { dangerous: true, tailRun: 0, tailAtom: null };
        } else {
            chain3 = false;
            if (groupTailRun > 0) {
                // Группа с одиночной цепочкой внутри + внешний атом без
                // квантификатора: хвост группы «перезапускает» внешнюю цепочку
                run = groupTailRun;
                prevAtom = groupTailAtom ?? parsed.atom;
            } else {
                run = 0;
                prevAtom = null;
            }
        }
    }
    return { dangerous: false, tailRun: run, tailAtom: prevAtom };
}

/** Публичная обёртка: опасен ли паттерн по правилам квантификаторных лестниц. */
function hasSequentialQuantifierChain(pattern: string): boolean {
    return scanQuantifierChain(pattern, 0).dangerous;
}

/** Пропускает интервальный квантификатор `{n}`/`{n,}`/`{n,m}`. Возвращает i, если это не интервал. */
function skipInterval(pattern: string, i: number): number {
    let k = i + 1;
    while (k < pattern.length && /\d/.test(pattern.charAt(k))) k++;
    if (k === i + 1) return i;
    if (pattern.charAt(k) === ',') {
        k++;
        while (k < pattern.length && /\d/.test(pattern.charAt(k))) k++;
    }
    return pattern.charAt(k) === '}' ? k + 1 : i;
}

/**
 * Проверяет, является ли символ после `)` началом квантификатора,
 * включая интервальную форму `{n,m}` (разбирается посимвольно,
 * чтобы не усложнять эвристику вложенными квантификаторами в самом шаблоне).
 */
function isQuantifierAfterGroup(pattern: string, from: number): boolean {
    let j = from;
    while (j < pattern.length && /\s/.test(pattern.charAt(j))) j++;
    if (j >= pattern.length) return false;
    const next = pattern.charAt(j);
    if (next === '+' || next === '*' || next === '?') return true;
    if (next !== '{') return false;
    // Разбираем {n} или {n,} или {n,m}
    let k = j + 1;
    while (k < pattern.length && pattern.charAt(k) >= '0' && pattern.charAt(k) <= '9') k++;
    if (k === j + 1) return false;
    if (pattern.charAt(k) === ',') {
        k++;
        while (k < pattern.length && pattern.charAt(k) >= '0' && pattern.charAt(k) <= '9') k++;
    }
    return pattern.charAt(k) === '}';
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
        const ch = body.charAt(k);
        if (ch === '\\') {
            // Backreference/escape после бэкслеша: \1, \k<name> — повтор группы
            // с амбивалентной длиной. Квантифицированный backreference — источник
            // катастрофического бэктрекинга: (a+)(?:\1)+x на 7000 — минуты.
            if (k + 1 < body.length && /[1-9]/.test(body.charAt(k + 1))) {
                return true;
            }
            k++;
            continue;
        }
        if (ch === '[') {
            inClass = true;
            // `[^]` — «любой символ», включая перевод строки: эквивалент `.` с s-флагом.
            // Классический строительный блок лестниц: ([a-z]+)[^]*\1z.
            if (body[k + 1] === '^' && body[k + 2] === ']') {
                return true;
            }
            continue;
        }
        if (ch === ']') {
            inClass = false;
            continue;
        }
        if (
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

        // Лестница квантифицированных атомов с пересекающимися классами:
        // .*.*.*x, x+x+y, \w*\w*\w*! — источник n²–n³ бэктрекинга без групп
        if (hasSequentialQuantifierChain(pattern)) {
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
