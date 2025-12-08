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

export type customRegExp = RegExp;

type TPattern = string | RegExp;

export function isRegex(regExp: string | RegExp | unknown): regExp is RegExp {
    // @ts-ignore
    return regExp instanceof RegExp || regExp instanceof Re2;
}

/**
 * Возвращает корректный класс для обработки регулярных выражений.
 * В случае если к проекту подключен re2, будет использоваться он, в противном случае стандартный RegExp
 * @param reg - само регулярное выражение
 * @param flags - флаг для регулярного выражения
 * @returns
 */
export function getRegExp(reg: TPattern | TPattern[], flags: string = 'ium'): customRegExp {
    let pattern;
    let flag = flags;
    const getPattern = (pat: TPattern): string => {
        return isRegex(pat) ? pat.source : pat;
    };

    if (Array.isArray(reg)) {
        if (reg.length === 1) {
            pattern = getPattern(reg[0]);
            flag = isRegex(reg[0]) ? reg[0].flags : flags;
        } else {
            const aPattern: string[] = [];
            reg.forEach((r) => {
                aPattern.push(`(${getPattern(r)})`);
            });
            pattern = aPattern.join('|');
        }
    } else {
        pattern = getPattern(reg);
        flag = isRegex(reg) ? reg.flags : flags;
    }
    return new Re2(pattern, flag);
}

export { __$usedRe2 };
