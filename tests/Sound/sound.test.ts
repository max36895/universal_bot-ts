import {Sound, mmApp, T_ALISA, AlisaSound} from '../../src';

describe('sound', () => {
    it('AlisaSound getPause', () => {
        expect(AlisaSound.getPause(1)).toEqual('sil <[1]>');
        expect(AlisaSound.getPause(10)).toEqual('sil <[10]>');
        expect(AlisaSound.getPause(100)).toEqual('sil <[100]>');
        expect(AlisaSound.getPause(1000)).toEqual('sil <[1000]>');
    });

    it('AlisaSound removeSound', () => {
        const speakAudio = '<speaker audio="alice-sounds-game-win-1.opus">';
        const speakEffect = '<speaker effect="alice-sounds-game-win-1.opus">';
        const pause = AlisaSound.getPause(12);
        expect(AlisaSound.removeSound(`${speakAudio}1${speakAudio}`)).toEqual('1');
        expect(AlisaSound.removeSound(`${speakEffect}1${speakEffect}`)).toEqual('1');
        expect(AlisaSound.removeSound(`${pause}1${pause}`)).toEqual('1');
        expect(AlisaSound.removeSound(`${speakEffect}1${speakAudio}1${pause}`)).toEqual('11');
    });

    it('getSounds', async () => {
        const sound = new Sound();
        mmApp.appType = T_ALISA;
        expect(await sound.getSounds('hello')).toEqual('hello');
        sound.sounds = [
            {
                key: '[{test}]',
                sounds: [
                    '<my_Sound>'
                ]
            }
        ];
        expect(await sound.getSounds('hello')).toEqual('hello');
        expect(await sound.getSounds('hello [{test}] listen')).toEqual('hello <my_Sound> listen');
        mmApp.appType = null;
        expect(await sound.getSounds('hello [{test}] listen')).toEqual('hello [{test}] listen');
    });
});
