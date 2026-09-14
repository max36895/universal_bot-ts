/**
 * Поведение RegExp-конвейера при подключённом re2: компиляция слотов и групп
 * обязана идти через безопасный движок, а шаблоны, которые re2 не умеет
 * (lookaround), — откатываться на штатный RegExp, не ломая регистрацию команд.
 *
 * re2 в devDependencies нет, поэтому в обычном окружении модуль подменяется
 * виртуальным моком — конструктор-наследник RegExp, который, как и настоящий
 * re2, отказывается компилировать lookaround-синтаксис.
 *
 * Если на машине стоит настоящий re2, мок поверх нативного модуля
 * недетерминирован (jest.doMock поверх реального .node-модуля в полном
 * прогоне срабатывал через раз) — мок-блоки пропускаются, и те же контракты
 * проверяются напрямую против настоящего движка.
 */
import { isRegex } from '../../src/utils/standard/RegExp';

class FakeRe2 extends RegExp {
    constructor(pattern: string | RegExp, flags?: string) {
        if (typeof pattern === 'string' && /\(\?(?:<[=!]|[=!])/.test(pattern)) {
            // re2 не поддерживает lookaround — эмулируем его отказ.
            throw new SyntaxError('re2: unsupported lookaround');
        }
        super(pattern, flags);
    }
}

type TRegExpModule = typeof import('../../src/utils/standard/RegExp');

function loadWithRe2(): TRegExpModule {
    let mod: TRegExpModule | undefined;
    jest.isolateModules(() => {
        jest.doMock('re2', () => FakeRe2, { virtual: true });
        mod = require('../../src/utils/standard/RegExp') as TRegExpModule;
    });
    return mod as TRegExpModule;
}

// Установлен ли настоящий re2 (не мок): от этого зависит, какие блоки активны.
const { __$usedRe2: realRe2Installed } =
    require('../../src/utils/standard/RegExp') as TRegExpModule;

// Мок поверх настоящего нативного модуля недетерминирован, поэтому при реально
// установленном re2 эти блоки пропускаются — контракты проверяет блок ниже.
const mockedRe2Suite = realRe2Installed ? describe.skip : describe;
const realRe2Suite = realRe2Installed ? describe : describe.skip;

mockedRe2Suite('getRegExpOrSelf с установленным re2 (виртуальный мок)', () => {
    afterEach(() => {
        jest.dontMock('re2');
    });

    it('пересобирает нативный RegExp через re2 с сохранением флагов', () => {
        const { getRegExpOrSelf, __$usedRe2 } = loadWithRe2();
        expect(__$usedRe2).toBe(true);
        // eslint-disable-next-line security/detect-unsafe-regex -- уязвимый шаблон нужен как вход: именно его re2 и должен перехватить
        const source = /(a+)+$/i;
        const re = getRegExpOrSelf(source);
        expect(re).toBeInstanceOf(FakeRe2);
        expect(re).not.toBe(source);
        expect(re.flags).toBe('i');
    });

    it('возвращает исходный объект, если re2 не поддерживает синтаксис', () => {
        const { getRegExpOrSelf } = loadWithRe2();
        const source = /(?<=a)b/;
        expect(getRegExpOrSelf(source)).toBe(source);
    });
});

mockedRe2Suite('getRegExp с установленным re2 (виртуальный мок): откат на нативный RegExp', () => {
    afterEach(() => {
        jest.dontMock('re2');
    });

    it('lookaround-шаблон компилируется штатным движком, а не валит регистрацию', () => {
        const { getRegExp } = loadWithRe2();
        // Раньше конвейер команд (склейка слотов, группы, isPattern-строки)
        // падал SyntaxError уже при addCommand: getRegExp, в отличие от
        // getRegExpOrSelf, не имел запасного пути.
        const re = getRegExp(['(?<![0-9])(\\d{2})(?![0-9])'], 'ium');
        expect(isRegex(re)).toBe(true);
        expect(re.test('код 42 готово')).toBe(true);
    });

    it('некомпилируемый шаблон по-прежнему бросает SyntaxError', () => {
        const { getRegExp } = loadWithRe2();
        expect(() => getRegExp(['([unclosed'], 'ium')).toThrow(SyntaxError);
    });
});

realRe2Suite('тот же контракт на настоящем re2', () => {
    it('пересобирает stateless RegExp через re2', () => {
        const { getRegExpOrSelf } = require('../../src/utils/standard/RegExp') as TRegExpModule;
        // eslint-disable-next-line security/detect-unsafe-regex -- уязвимый шаблон нужен как вход: именно его re2 и должен перехватить
        const source = /(a+)+$/i;
        const re = getRegExpOrSelf(source);
        expect(re).not.toBe(source);
        // Объект RE2 не наследует RegExp — верный признак компиляции безопасным движком.
        expect(re instanceof RegExp).toBe(false);
        expect(isRegex(re)).toBe(true);
        expect(re.test('AaA')).toBe(true);
    });

    it('возвращает исходный объект, если re2 не поддерживает синтаксис', () => {
        const { getRegExpOrSelf } = require('../../src/utils/standard/RegExp') as TRegExpModule;
        const source = /(?<=a)b/;
        expect(getRegExpOrSelf(source)).toBe(source);
    });

    it('lookaround-шаблон компилируется штатным движком, а не валит регистрацию', () => {
        const { getRegExp } = require('../../src/utils/standard/RegExp') as TRegExpModule;
        const re = getRegExp(['(?<![0-9])(\\d{2})(?![0-9])'], 'ium');
        // Настоящий RE2 не наследует RegExp: instanceof доказывает, что сработал
        // откат на нативный движок, а не проброс ошибки.
        expect(re).toBeInstanceOf(RegExp);
        expect(re.test('код 42 готово')).toBe(true);
    });
});

mockedRe2Suite('getRegExpOrSelf без re2', () => {
    it('возвращает исходный stateless-объект без перекомпиляции', () => {
        const { getRegExpOrSelf, __$usedRe2 } =
            require('../../src/utils/standard/RegExp') as TRegExpModule;
        expect(__$usedRe2).toBe(false);
        const source = /^да$/i;
        expect(getRegExpOrSelf(source)).toBe(source);
    });
});
