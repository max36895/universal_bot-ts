import Re2 from 're2';

export type myRegExp = Re2 | RegExp;

export function getRegExp(reg: string | RegExp): myRegExp {
    if (reg instanceof RegExp) {
        return new Re2(reg.source, reg.flags);
    }
    return new Re2(reg, 'ium');
}
