/**
 * При установленном re2 RegExp-объекты из слотов команд обязаны
 * пересобираться через него: иначе уязвимое к ReDoS выражение выполнялось
 * штатным движком Node в обход безопасного движка.
 *
 * re2 в devDependencies нет, поэтому подменяем модуль виртуальным моком —
 * конструктор-наследник RegExp, по которому видно, что компиляция прошла через него.
 */
class FakeRe2 extends RegExp {
    constructor(pattern: string | RegExp, flags?: string) {
        if (typeof pattern === 'string' && pattern.includes('(?<=')) {
            // re2 не поддерживает lookbehind — эмулируем его отказ.
            throw new SyntaxError('re2: unsupported lookbehind');
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

describe('getRegExpOrSelf с установленным re2', () => {
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

describe('getRegExpOrSelf без re2', () => {
    it('возвращает исходный stateless-объект без перекомпиляции', () => {
        const { getRegExpOrSelf, __$usedRe2 } =
            require('../../src/utils/standard/RegExp') as TRegExpModule;
        if (__$usedRe2) {
            // В окружении с настоящим re2 этот сценарий неприменим.
            return;
        }
        const source = /^да$/i;
        expect(getRegExpOrSelf(source)).toBe(source);
    });
});
