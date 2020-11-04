import {assert} from 'chai';
import {Text} from "../../bot/components/standard/Text";

describe('Text', () => {
    it('Is say true', () => {
        assert.isTrue(Text.isSayTrue('конечно да'));
        assert.isTrue(Text.isSayTrue('наверное да'));
        assert.isTrue(Text.isSayTrue('согласен'));
        assert.isTrue(Text.isSayTrue('согласна'));
        assert.isTrue(Text.isSayTrue('подтверждаю'));
        assert.isTrue(Text.isSayTrue('не знаю но да наверное'));
        assert.isTrue(Text.isSayTrue('конечно не дам тебе'));

        assert.isFalse(Text.isSayTrue('наша дама пошла'));
        assert.isFalse(Text.isSayTrue('неа'));
    });

    it('Is say false', () => {
        assert.isFalse(Text.isSayFalse('конечно да'));
        assert.isFalse(Text.isSayFalse('наверное да'));

        assert.isTrue(Text.isSayFalse('не согласен'));
        assert.isFalse(Text.isSayFalse('согласен'));

        assert.isTrue(Text.isSayFalse('не согласна'));
        assert.isFalse(Text.isSayFalse('согласна'));

        assert.isFalse(Text.isSayFalse('подтверждаю'));
        assert.isFalse(Text.isSayFalse('небоскреб'));
        assert.isFalse(Text.isSayFalse('пока думаю, но наверное да'));

        assert.isTrue(Text.isSayFalse('конечно не дам тебе'));
        assert.isTrue(Text.isSayFalse('неа'));
        assert.isTrue(Text.isSayFalse('наверное нет'));
        assert.isTrue(Text.isSayFalse('наверное нет но я надо подумать'));
    });

    it('Is say text', () => {
        assert.isTrue(Text.isSayText(Text.getEncodeText('да'), 'куда', true));
        assert.isFalse(Text.isSayText('да', 'куда'));

        const text = 'По полю шол человек, который сильно устал. Но он н отчаивался и пошел спать';

        assert.isTrue(Text.isSayText('спать', text));
        assert.isTrue(Text.isSayText(['пошел', 'утопал'], text));
    });

    it('Get ending', () => {
        assert.equal(Text.getEnding(1, ['яблоко', 'яблока', 'яблок']), 'яблоко');
        assert.equal(Text.getEnding(2, ['яблоко', 'яблока', 'яблок']), 'яблока');
        assert.equal(Text.getEnding(3, ['яблоко', 'яблока', 'яблок']), 'яблока');
        assert.equal(Text.getEnding(4, ['яблоко', 'яблока', 'яблок']), 'яблока');

        for (let i = 5; i < 21; i++) {
            assert.equal(Text.getEnding(i, ['яблоко', 'яблока', 'яблок']), 'яблок');
        }

        assert.equal(Text.getEnding(21, ['яблоко', 'яблока', 'яблок']), 'яблоко');
        assert.equal(Text.getEnding(22, ['яблоко', 'яблока', 'яблок']), 'яблока');
        assert.equal(Text.getEnding(29, ['яблоко', 'яблока', 'яблок']), 'яблок');
    });
});
