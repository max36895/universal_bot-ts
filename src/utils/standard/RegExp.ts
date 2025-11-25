type TRe2 = RegExpConstructor;
let Re2: TRe2;
try {
    // На чистой винде, чтобы установить re2, нужно пострадать.
    // Чтобы сильно не париться, и не использовать относительно старую версию (актуальная версия работает на node 20 и выше),
    // даем возможность разработчикам самим подключить re2 по необходимости.
    Re2 = require('re2');
} catch {
    Re2 = RegExp;
}

export type customRegExp = RegExp;

type TPattern = string | RegExp;

export function getRegExp(reg: TPattern | TPattern[], flags: string = 'ium'): customRegExp {
    let pattern = '';
    let flag = flags;
    const getPattern = (pat: TPattern): string => {
        return pat instanceof RegExp ? pat.source : pat;
    };

    if (Array.isArray(reg)) {
        if (reg.length === 1) {
            pattern = getPattern(reg[0]);
            flag = reg[0] instanceof RegExp ? reg[0].flags : flags;
        } else {
            const aPattern: string[] = [];
            reg.forEach((r) => {
                aPattern.push(`(${getPattern(r)})`);
            });
            pattern = aPattern.join('|');
        }
    } else {
        pattern = getPattern(reg);
        flag = reg instanceof RegExp ? reg.flags : flags;
    }
    return new Re2(pattern, flag);
}
