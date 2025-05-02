import { Text } from '../../src/utils/standard/Text';

describe('Text', () => {
    it('Resize', () => {
        expect('test te').toEqual(Text.resize('test te'));
        expect('test te').toEqual(Text.resize('test te', 12));
        expect('test te').toEqual(Text.resize('test te', 7));
        expect('test...').toEqual(Text.resize('testing te', 7));
        expect('...').toEqual(Text.resize('testing te', 3));
    });

    it('Resize ellipsis', () => {
        expect('tes').toEqual(Text.resize('testing te', 3, false));
        expect('testing').toEqual(Text.resize('testing te', 7, false));
        expect('testing te').toEqual(Text.resize('testing te', 20, false));
        expect('test...').toEqual(Text.resize('testing te', 7, true));
        expect('testing te').toEqual(Text.resize('testing te', 20, true));
    });

    it('Is say true', () => {
        expect(Text.isSayTrue('конечно да')).toBe(true);
        expect(Text.isSayTrue('наверное да')).toBe(true);
        expect(Text.isSayTrue('согласен')).toBe(true);
        expect(Text.isSayTrue('согласна')).toBe(true);
        expect(Text.isSayTrue('даю согласие')).toBe(true);
        expect(Text.isSayTrue('подтверждаю')).toBe(true);
        expect(Text.isSayTrue('не знаю но да наверное')).toBe(true);
        expect(Text.isSayTrue('конечно не дам тебе')).toBe(true);

        expect(Text.isSayTrue('наша дама пошла')).toBe(false);
        expect(Text.isSayTrue('неа')).toBe(false);
    });

    it('Is say false', () => {
        expect(Text.isSayFalse('конечно да')).toBe(false);
        expect(Text.isSayFalse('наверное да')).toBe(false);

        expect(Text.isSayFalse('не согласен')).toBe(true);
        expect(Text.isSayFalse('согласен')).toBe(false);

        expect(Text.isSayFalse('не согласна')).toBe(true);
        expect(Text.isSayFalse('согласна')).toBe(false);

        expect(Text.isSayFalse('подтверждаю')).toBe(false);
        expect(Text.isSayFalse('небоскреб')).toBe(false);
        expect(Text.isSayFalse('пока думаю, но наверное да')).toBe(false);

        expect(Text.isSayFalse('конечно не дам тебе')).toBe(true);
        expect(Text.isSayFalse('неа')).toBe(true);
        expect(Text.isSayFalse('нет')).toBe(true);
        expect(Text.isSayFalse('не')).toBe(true);
        expect(Text.isSayFalse('не знаю')).toBe(true);
        expect(Text.isSayFalse('наверное нет')).toBe(true);
        expect(Text.isSayFalse('наверное нет но я надо подумать')).toBe(true);
    });

    it('Is say text', () => {
        expect(Text.isSayText('да', 'куда', true)).toBe(true);
        expect(Text.isSayText('да', 'куда')).toBe(true);
        expect(Text.isSayText(`(?:^|\\s)да\\b`, 'куда')).toBe(false);

        const text = 'По полю шол человек, который сильно устал. Но он н отчаивался и пошел спать';

        expect(Text.isSayText('спать', text)).toBe(true);
        expect(Text.isSayText(['пошел', 'утопал'], text)).toBe(true);
    });

    it('Get ending', () => {
        expect(Text.getEnding(1, ['яблоко', 'яблока', 'яблок'])).toEqual('яблоко');
        expect(Text.getEnding(2, ['яблоко', 'яблока', 'яблок'])).toEqual('яблока');
        expect(Text.getEnding(3, ['яблоко', 'яблока', 'яблок'])).toEqual('яблока');
        expect(Text.getEnding(4, ['яблоко', 'яблока', 'яблок'])).toEqual('яблока');

        for (let i = 5; i < 21; i++) {
            expect(Text.getEnding(i, ['яблоко', 'яблока', 'яблок'])).toEqual('яблок');
        }

        expect(Text.getEnding(21, ['яблоко', 'яблока', 'яблок'])).toEqual('яблоко');
        expect(Text.getEnding(22, ['яблоко', 'яблока', 'яблок'])).toEqual('яблока');
        expect(Text.getEnding(29, ['яблоко', 'яблока', 'яблок'])).toEqual('яблок');
    });
});
