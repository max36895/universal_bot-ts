import { Sound, BaseBotController, SoundConstants } from '../../src';
import { T_ALISA, AlisaSound, pUtils } from '../../src/plugins';

const botController = new BaseBotController();
botController.appType = T_ALISA;

describe('sound', () => {
    it('AlisaSound getPause', () => {
        expect(SoundConstants.getPause(1)).toEqual('#pause_<[1]>#');
        expect(SoundConstants.getPause(10)).toEqual('#pause_<[10]>#');
        expect(SoundConstants.getPause(100)).toEqual('#pause_<[100]>#');
        expect(SoundConstants.getPause(1000)).toEqual('#pause_<[1000]>#');

        expect(pUtils.getPause(SoundConstants.getPause(1))).toEqual('sil <[1]>');
        expect(pUtils.getPause(SoundConstants.getPause(10))).toEqual('sil <[10]>');
        expect(pUtils.getPause(SoundConstants.getPause(100))).toEqual('sil <[100]>');
        expect(pUtils.getPause(SoundConstants.getPause(1000))).toEqual('sil <[1000]>');
    });

    it('pUtils.removeSound', () => {
        const speakAudio = '<speaker audio="alice-sounds-game-win-1.opus">';
        const speakEffect = '<speaker effect="alice-sounds-game-win-1.opus">';
        const pause = pUtils.getPause(SoundConstants.getPause(12));
        expect(pUtils.removeSound(`${speakAudio}1${speakAudio}`)).toEqual('1');
        expect(pUtils.removeSound(`${speakEffect}1${speakEffect}`)).toEqual('1');
        expect(pUtils.removeSound(`${pause}1${pause}`)).toEqual('1');
        expect(pUtils.removeSound(`${speakEffect}1${speakAudio}1${pause}`)).toEqual('11');
    });

    it('getSounds', async () => {
        const sound = new Sound();
        expect(await sound.getSounds('hello', AlisaSound.soundProcessing, botController)).toEqual(
            'hello',
        );
        sound.sounds = [
            {
                key: '[{test}]',
                sounds: ['<my_Sound>'],
            },
        ];
        expect(await sound.getSounds('hello', AlisaSound.soundProcessing, botController)).toEqual(
            'hello',
        );
        expect(
            await sound.getSounds(
                'hello [{test}] listen',
                AlisaSound.soundProcessing,
                botController,
            ),
        ).toEqual('hello <my_Sound> listen');
        expect(
            await sound.getSounds(
                'hello [{test}] listen',
                () => {
                    return null;
                },
                botController,
            ),
        ).toEqual('hello [{test}] listen');
    });
});
