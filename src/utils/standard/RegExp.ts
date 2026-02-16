type TRe2 = RegExpConstructor;
let Re2: TRe2;
/**
 * Флаг говорящий о том используется ли re2 для обработки регулярок или нет.
 * Нужен для того, чтобы можно было задать различные ограничения в зависимости от наличия библиотеки.
 * @private
 */
let __$usedRe2: boolean;
try {
    // На чистой винде, чтобы установить re2, нужно пострадать.
    // Чтобы сильно не париться, и не использовать относительно старую версию (актуальная версия работает на node 20 и выше),
    // даем возможность разработчикам самим подключить re2 по необходимости.

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Re2 = require('re2');
    __$usedRe2 = true;
} catch {
    Re2 = RegExp;
    __$usedRe2 = false;
}

type customRegExp = RegExp;

/**
 * Тип для регулярного выражения
 */
export type TPatternRegExp = string | RegExp;

/**
 * Проверяет передано ли регулярное выражение или нет
 * @param regExp Регулярное выражение
 * @param customReg Кастомный обработчик для регулярных выражений
 */
export function isRegex(
    regExp: TPatternRegExp | unknown,
    customReg?: RegExpConstructor,
): regExp is RegExp {
    if (customReg) {
        return regExp instanceof customReg || regExp instanceof RegExp;
    }
    // @ts-ignore
    return regExp instanceof RegExp || regExp instanceof Re2;
}

/**
 * Возвращает скомпилированное регулярное выражение.
 * Если к проекту подключен re2, будет использоваться он, в противном случае стандартный RegExp.
 * В случае, если передан customReg, регулярное выражение будет собранно через него
 * @param reg - само регулярное выражение
 * @param flags - флаг для регулярного выражения
 * @param customReg - Произвольная реализация для обработки регулярных выражений
 * @returns
 */
export function getRegExp(
    reg: TPatternRegExp | TPatternRegExp[],
    flags: string = 'ium',
    customReg?: RegExpConstructor,
): customRegExp {
    let pattern;
    let flag = flags;
    const getPattern = (pat: TPatternRegExp): string => {
        return isRegex(pat, customReg) ? pat.source : pat;
    };

    if (Array.isArray(reg)) {
        if (reg.length === 1) {
            pattern = getPattern(reg[0]);
            flag = isRegex(reg[0], customReg) ? reg[0].flags : flags;
        } else {
            const aPattern: string[] = [];
            reg.forEach((r) => {
                aPattern.push(`(${getPattern(r)})`);
            });
            pattern = aPattern.join('|');
        }
    } else {
        pattern = getPattern(reg);
        flag = isRegex(reg, customReg) ? reg.flags : flags;
    }
    if (customReg) {
        return new customReg(pattern, flag);
    }
    return new Re2(pattern, flag);
}

export { __$usedRe2 };
