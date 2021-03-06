import {assert} from 'chai';
import {Text} from "../../src";

describe('Text', () => {
    it('Resize', () => {
        assert.equal('test te', Text.resize('test te'));
        assert.equal('testing', Text.resize('testing te', 7, false));
        assert.equal('test...', Text.resize('testing te', 7));
        assert.equal('test...', Text.resize('testing te', 7, true));
    });

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
        assert.isTrue(Text.isSayText('да', 'куда'));
        assert.isFalse(Text.isSayText(`(?:^|\\s)${Text.getEncodeText('да')}\\b`, 'куда'));

        const text = 'По полю шол человек, который сильно устал. Но он н отчаивался и пошел спать';

        assert.isTrue(Text.isSayText('спать', text));
        assert.isTrue(Text.isSayText(['пошел', 'утопал'], text));
    });

    it('Get ending', () => {
        assert.strictEqual(Text.getEnding(1, ['яблоко', 'яблока', 'яблок']), 'яблоко');
        assert.strictEqual(Text.getEnding(2, ['яблоко', 'яблока', 'яблок']), 'яблока');
        assert.strictEqual(Text.getEnding(3, ['яблоко', 'яблока', 'яблок']), 'яблока');
        assert.strictEqual(Text.getEnding(4, ['яблоко', 'яблока', 'яблок']), 'яблока');

        for (let i = 5; i < 21; i++) {
            assert.strictEqual(Text.getEnding(i, ['яблоко', 'яблока', 'яблок']), 'яблок');
        }

        assert.strictEqual(Text.getEnding(21, ['яблоко', 'яблока', 'яблок']), 'яблоко');
        assert.strictEqual(Text.getEnding(22, ['яблоко', 'яблока', 'яблок']), 'яблока');
        assert.strictEqual(Text.getEnding(29, ['яблоко', 'яблока', 'яблок']), 'яблок');
    });
});
