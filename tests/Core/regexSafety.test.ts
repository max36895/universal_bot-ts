/**
 * Тесты эвристики ReDoS (isRegexLikelySafe) и кэша групповых регулярок.
 *
 * Эвристика должна отсеивать катастрофический бэктрекинг ((a+)+, (a|aa)+, (.*x)+),
 * но не отбраковывать безопасные паттерны команд: (abc)+, (?:a{2,3}) без квантификатора
 * сверху, .* как независимая единица.
 */
import { isRegexLikelySafe } from '../../src/core/utils/utils';
import { getGroupRegExpCompiled } from '../../src/core/utils/CommandReg';
import type { IGroupData } from '../../src/core/utils/CommandReg';

describe('isRegexLikelySafe', () => {
    describe('безопасные паттерны (не отбраковываются)', () => {
        const safe = [
            'привет',
            'привет|пока',
            '(abc)+', // фиксированная группа под квантификатором
            '(abc)?',
            '(?:abc)+', // не-захватывающая группа: '?' из префикса не квантификатор
            '(?<word>abc)+', // именованная группа
            '.*', // одиночный any-quantifier линеен
            'а.*б', // жадный any между якорями
            '.*.*', // квадратичный, не экспоненциальный
            '(?:a{2,3})', // интервал без внешнего квантификатора
            '\\b([1-9]|[1-9][0-9])\\b', // альтернатива без пересечений
            '[a-z]+', // символьный класс под квантификатором
        ];

        it.each(safe)('%s — безопасен', (pattern) => {
            expect(isRegexLikelySafe(pattern, false)).toBe(true);
        });
    });

    describe('опасные паттерны (отбраковываются)', () => {
        const dangerous = [
            '(a+)+', // классический экспоненциальный
            '(a*)*',
            '(a|aa)+', // альтернатива с пересечением под квантификатором
            '(?:\\w+\\.)+', // точка + квантификатор внутри квантифицированной группы
            '(.*x)+', // any-символ внутри квантифицированной группы
            '(?:a{2,3})+', // интервал под квантификатором
            '(a+){10,100}', // повтор квантифицированной группы
            '(?:x|y)+', // альтернатива внутри квантифицированной группы
        ];

        it.each(dangerous)('%s — опасен', (pattern) => {
            expect(isRegexLikelySafe(pattern, false)).toBe(false);
        });
    });

    it('шаблон длиннее 1000 символов отбраковывается', () => {
        expect(isRegexLikelySafe('a'.repeat(1001), false)).toBe(false);
    });

    it('некомпилируемый шаблон отбраковывается', () => {
        expect(isRegexLikelySafe('([unclosed', false)).toBe(false);
    });
});

describe('getGroupRegExpCompiled: кэш компиляции групп', () => {
    it('возвращает null для пустой группы', () => {
        const group: IGroupData = { commands: [], regExp: null };
        expect(getGroupRegExpCompiled(group)).toBeNull();
    });

    it('возвращает готовый RegExp как есть', () => {
        const regExp = /test/i;
        const group: IGroupData = { commands: ['cmd'], regExp };
        expect(getGroupRegExpCompiled(group)).toBe(regExp);
    });

    it('строковый паттерн компилируется и кэшируется (тот же инстанс)', () => {
        const group: IGroupData = { commands: ['cmd'], regExp: '(?<_0>привет)' };
        const first = getGroupRegExpCompiled(group);
        const second = getGroupRegExpCompiled(group);
        expect(first).toBeInstanceOf(RegExp);
        expect(first).toBe(second);
    });

    it('пересобирает RegExp после изменения строкового паттерна группы', () => {
        const group: IGroupData = { commands: ['cmd'], regExp: '(?<_0>привет)' };
        const first = getGroupRegExpCompiled(group);
        // При добавлении команды в группу паттерн-строка растёт
        group.regExp = '(?<_0>привет)|(?<_1>пока)';
        const second = getGroupRegExpCompiled(group);
        expect(first).not.toBe(second);
        expect(second?.test('пока')).toBe(true);
    });
});
