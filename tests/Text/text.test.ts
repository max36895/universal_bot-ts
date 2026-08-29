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

    it('Resize не разрывает суррогатную пару', () => {
        // 😀 занимает два code unit'а UTF-16. Обрезка ровно между ними оставляла
        // одинокий суррогат — невалидную для UTF-8 строку, которую платформы отбивают.
        const text = 'aaa😀bbb';
        expect(Text.resize(text, 4, false)).toEqual('aaa');
        expect(Text.resize(text, 5, false)).toEqual('aaa😀');
        expect(Text.resize(text, 7, true)).toEqual('aaa...');
        [...Array(text.length + 2).keys()].forEach((size) => {
            expect(Text.resize(text, size, false)).not.toMatch(/[\uD800-\uDBFF]$/);
            expect(Text.resize(text, size, true)).not.toMatch(/[\uD800-\uDBFF]\.{3}$/);
        });
    });

    it('isSayText с глобальным regexp находит совпадение на каждом вызове', () => {
        // RegExp с флагом g хранит позицию поиска в lastIndex. Фреймворк кэширует
        // объект между запросами, поэтому без сброса совпадение находилось через раз.
        const pattern = /привет/g;
        for (let i = 0; i < 4; i++) {
            expect(Text.isSayText(pattern, 'привет', true)).toBe(true);
            expect(Text.isSayText([pattern], 'привет', true)).toBe(true);
        }
    });

    it('isUrl', () => {
        const url = [
            'https://google.com',
            'http://google.com',
            'https://google.com/',
            'http://google.com/',
            'https://google.com/path',
            'http://google.com/path',
        ];
        const notUrl = ['google.com', 'test', 'text.my', 'test@tel.com'];
        url.forEach((item) => {
            expect(Text.isUrl(item)).toBe(true);
        });
        notUrl.forEach((item) => {
            expect(Text.isUrl(item)).toBe(false);
        });
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

    it('Is say true: ответы с пунктуацией распознаются', () => {
        // Самые частые формы подтверждения — с пунктуацией на конце
        expect(Text.isSayTrue('Да!')).toBe(true);
        expect(Text.isSayTrue('да.')).toBe(true);
        expect(Text.isSayTrue('Да, конечно')).toBe(true);
        expect(Text.isSayTrue('Конечно!')).toBe(true);
        expect(Text.isSayTrue('(да)')).toBe(true);
        // Отрицания и слова, содержащие ключи внутри, не подтверждение
        expect(Text.isSayTrue('незнайка')).toBe(false);
        expect(Text.isSayTrue('даже не пробуй')).toBe(false);
        expect(Text.isSayTrue('дата встречи')).toBe(false);
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

    it('Is say false: ответы с пунктуацией распознаются', () => {
        expect(Text.isSayFalse('Нет!')).toBe(true);
        expect(Text.isSayFalse('нет, спасибо')).toBe(true);
        expect(Text.isSayFalse('Не хочу.')).toBe(true);
        expect(Text.isSayFalse('нету')).toBe(false);
        expect(Text.isSayFalse('окно')).toBe(false);
    });

    it('Is say text', () => {
        expect(Text.isSayText('да', 'куда', true)).toBe(true);
        expect(Text.isSayText('да', 'куда')).toBe(true);
        expect(Text.isSayText(`(?:^|\\s)да\\b`, 'куда', true)).toBe(false);
        expect(Text.isSayText(/(?:^|\s)да\b/, 'куда', true)).toBe(false);

        const text = 'По полю шол человек, который сильно устал. Но он н отчаивался и пошел спать';

        expect(Text.isSayText('спать', text)).toBe(true);
        expect(Text.isSayText(['пошел', 'утопал'], text)).toBe(true);
    });

    it('Is say text regex', () => {
        expect(Text.isSayText(/да/i, 'куда', true)).toBe(true);

        const text = 'По полю шол человек, который сильно устал. Но он н отчаивался и пошел спать';

        expect(Text.isSayText(/спать/i, text, true)).toBe(true);
        expect(Text.isSayText([/пошел/i, 'утопал'], text, true)).toBe(true);
        expect(Text.isSayText([/уехал/i, 'пошла', /куда/i, 'пошел'], text, true)).toBe(true);
        expect(Text.isSayText([/пошла/i, 'утопал', /\d/i], text, true)).toBe(false);
    });

    it('Is say text adaptive regex', () => {
        expect(Text.isSayText(/\d/i, 'игрок под номером 5')).toBe(true);
        expect(Text.isSayText([/\d/i, 'спит'], 'игрок под номером 5')).toBe(true);
        expect(Text.isSayText([/\d/i, 'спит'], 'игрок спит')).toBe(true);
        expect(Text.isSayText([/\d{4,}/i, '\\d'], 'игрок под номером \\d')).toBe(true);
        expect(Text.isSayText([/\d{4,}/i, '\\d'], 'игрок под номером 5', true)).toBe(true);
        expect(Text.isSayText([/\d{4,}/i, '\\d'], 'игрок под номером \\d', true)).toBe(false);
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

    it('textSimilarity', () => {
        expect(Text.textSimilarity('test', 'test', 80)).toEqual({
            percent: 100,
            index: 0,
            status: true,
            text: 'test',
        });
        expect(Text.textSimilarity('test', 'test1', 80)).toEqual({
            percent: 88.88888888888889,
            index: 0,
            status: true,
            text: 'test1',
        });
        expect(Text.textSimilarity('test', 'test12', 80)).toEqual({
            percent: 80,
            index: 0,
            status: true,
            text: 'test12',
        });
        expect(Text.textSimilarity('test', 'test123', 80)).toEqual({
            percent: 72.72727272727273,
            index: 0,
            status: false,
            text: 'test123',
        });
        expect(Text.textSimilarity('test', 'e', 80)).toEqual({
            percent: 40,
            index: 0,
            status: false,
            text: 'e',
        });
        expect(Text.textSimilarity('test', 't', 80)).toEqual({
            percent: 40,
            index: 0,
            status: false,
            text: 't',
        });
        expect(Text.textSimilarity('test', 'jump123', 80)).toEqual({
            percent: 0,
            index: null,
            status: false,
            text: null,
        });
    });
});
