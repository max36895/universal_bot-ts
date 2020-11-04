import {assert} from 'chai';
import {Sound} from "../../bot/components/sound/Sound";
import {mmApp, T_ALISA} from "../../bot/core/mmApp";
import {AlisaSound} from "../../bot/components/sound/types/AlisaSound";

describe('sound', () => {
    it('AlisaSound getPause', () => {
        assert.equal(AlisaSound.getPause(1), 'sil <[1]>')
        assert.equal(AlisaSound.getPause(10), 'sil <[10]>')
        assert.equal(AlisaSound.getPause(100), 'sil <[100]>')
        assert.equal(AlisaSound.getPause(1000), 'sil <[1000]>')
    });

    it('AlisaSound removeSound', () => {
        const speakAudio = '<speaker audio="alice-sounds-game-win-1.opus">';
        const speakEffect = '<speaker effect="alice-sounds-game-win-1.opus">'
        const pause = AlisaSound.getPause(12);
        assert.equal(AlisaSound.removeSound(`${speakAudio}1${speakAudio}`), '1');
        assert.equal(AlisaSound.removeSound(`${speakEffect}1${speakEffect}`), '1');
        assert.equal(AlisaSound.removeSound(`${pause}1${pause}`), '1')
        assert.equal(AlisaSound.removeSound(`${speakEffect}1${speakAudio}1${pause}`), '11')
    });

    it('getSounds', () => {
        const sound = new Sound();
        mmApp.appType = T_ALISA;
        assert.equal(sound.getSounds('hello'), 'hello');
        sound.sounds = [
            {
                key: '[{test}]',
                sounds: [
                    '<my_Sound>'
                ]
            }
        ]
        assert.equal(sound.getSounds('hello'), 'hello');
        assert.equal(sound.getSounds('hello [{test}] listen'), 'hello <my_Sound> listen');
        mmApp.appType = null;
        assert.equal(sound.getSounds('hello [{test}] listen'), 'hello [{test}] listen');
    });
});
