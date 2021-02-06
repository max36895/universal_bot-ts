import {assert} from 'chai';
import {Sound, mmApp, T_ALISA, AlisaSound} from "../../src";

describe('sound', () => {
    it('AlisaSound getPause', () => {
        assert.strictEqual(AlisaSound.getPause(1), 'sil <[1]>');
        assert.strictEqual(AlisaSound.getPause(10), 'sil <[10]>');
        assert.strictEqual(AlisaSound.getPause(100), 'sil <[100]>');
        assert.strictEqual(AlisaSound.getPause(1000), 'sil <[1000]>');
    });

    it('AlisaSound removeSound', () => {
        const speakAudio = '<speaker audio="alice-sounds-game-win-1.opus">';
        const speakEffect = '<speaker effect="alice-sounds-game-win-1.opus">';
        const pause = AlisaSound.getPause(12);
        assert.strictEqual(AlisaSound.removeSound(`${speakAudio}1${speakAudio}`), '1');
        assert.strictEqual(AlisaSound.removeSound(`${speakEffect}1${speakEffect}`), '1');
        assert.strictEqual(AlisaSound.removeSound(`${pause}1${pause}`), '1');
        assert.strictEqual(AlisaSound.removeSound(`${speakEffect}1${speakAudio}1${pause}`), '11');
    });

    it('getSounds', async () => {
        const sound = new Sound();
        mmApp.appType = T_ALISA;
        assert.strictEqual(await sound.getSounds('hello'), 'hello');
        sound.sounds = [
            {
                key: '[{test}]',
                sounds: [
                    '<my_Sound>'
                ]
            }
        ];
        assert.strictEqual(await sound.getSounds('hello'), 'hello');
        assert.strictEqual(await sound.getSounds('hello [{test}] listen'), 'hello <my_Sound> listen');
        mmApp.appType = null;
        assert.strictEqual(await sound.getSounds('hello [{test}] listen'), 'hello [{test}] listen');
    });
});
