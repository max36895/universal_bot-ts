import { BotController, ISoundInfo } from '../../../src';
import { TelegramSound, TelegramRequest, YandexSpeechKit } from '../../../src/plugins';

// Мокаем утилиты isFile для getBaseDataSoundProcessing
jest.mock('../../../src/utils/standard/util', () => ({
    ...jest.requireActual('../../../src/utils/standard/util'),
    isFile: jest.fn().mockResolvedValue(true),
    unlink: jest.fn().mockResolvedValue(undefined),
}));

class TestController extends BotController {
    action(): void {
        return;
    }
}

describe('Telegram Sound', () => {
    let controller: TestController;

    beforeEach(() => {
        const appContext = new (jest.requireActual('../../../src').AppContext)();
        appContext.appConfig.tokens.telegram = {
            token: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
            speech_kit_token: 'test-speech-kit-token',
        };
        controller = new TestController(appContext);
        controller.userId = 12345;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('soundProcessing', () => {
        it('возвращает массив при наличии звуков', async () => {
            jest.spyOn(TelegramRequest.prototype, 'sendAudio').mockResolvedValue({
                ok: true,
                result: {
                    message_id: 200,
                    audio: { file_id: 'audio_file_id', duration: 30 },
                },
            } as never);

            const soundInfo: ISoundInfo = {
                usedStandardSound: false,
                text: '',
                sounds: [
                    {
                        key: '#test_sound#',
                        path: '',
                        sounds: ['/path/to/audio.mp3'],
                    },
                ],
            };

            const result = await TelegramSound.soundProcessing(soundInfo, controller);

            expect(Array.isArray(result)).toBe(true);
        });

        it('логирует предупреждение если speech_kit_token не настроен при наличии text', async () => {
            const appContext = new (jest.requireActual('../../../src').AppContext)();
            appContext.appConfig.tokens.telegram = {
                token: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
            };
            const localController = new TestController(appContext);
            localController.userId = 12345;
            const logWarn = jest.spyOn(appContext, 'logWarn').mockImplementation(() => {});

            const soundInfo: ISoundInfo = {
                usedStandardSound: false,
                text: 'Озвучь этот текст',
                sounds: [],
            };

            await TelegramSound.soundProcessing(soundInfo, localController);

            expect(logWarn).toHaveBeenCalledWith(
                expect.stringContaining('speech_kit_token не настроен'),
            );
        });

        it('не вызывает TTS если text отсутствует', async () => {
            const speechKitMock = jest
                .spyOn(YandexSpeechKit.prototype, 'getTts')
                .mockResolvedValue(null);

            const soundInfo: ISoundInfo = {
                usedStandardSound: false,
                text: '',
                sounds: [],
            };

            await TelegramSound.soundProcessing(soundInfo, controller);

            expect(speechKitMock).not.toHaveBeenCalled();
        });

        it('вызывает sendAudio при наличии звуков с путями к файлам', async () => {
            const sendAudioMock = jest
                .spyOn(TelegramRequest.prototype, 'sendAudio')
                .mockResolvedValue({
                    ok: true,
                    result: {
                        message_id: 200,
                        audio: { file_id: 'audio_file_id', duration: 30 },
                    },
                } as never);

            const soundInfo: ISoundInfo = {
                usedStandardSound: false,
                text: '',
                sounds: [
                    {
                        key: '#sound1#',
                        path: '',
                        sounds: ['/path/to/sound.mp3'],
                    },
                ],
            };

            await TelegramSound.soundProcessing(soundInfo, controller);

            // sendAudio должен быть вызван для загрузки файла и получения file_id
            expect(sendAudioMock).toHaveBeenCalled();
        });
    });
});
