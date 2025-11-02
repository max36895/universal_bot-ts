global.fetch = jest.fn();

import { AppContext } from '../../src';
import { YandexSpeechKit } from '../../src/api/YandexSpeechKit';
import { unlink } from '../../src/utils';

const appContext = new AppContext();

describe('YandexSpeechKit', () => {
    let tts: YandexSpeechKit;

    beforeEach(() => {
        appContext.platformParams.yandex_speech_kit_token = 'tts-token';
        tts = new YandexSpeechKit(null, appContext);
        (global.fetch as jest.Mock).mockClear();
    });

    it('should synthesize speech', async () => {
        const buffer = new ArrayBuffer(3);
        const mockAudio = new Uint8Array(buffer);
        mockAudio.set([1, 2, 3]);

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => buffer,
        });

        tts.format = YandexSpeechKit.F_OGGOPUS;
        const result = await tts.getTts('Привет, Алиса!');
        if (result) {
            unlink(result?.fileName);
        }
        expect(result?.audioData).toEqual(buffer);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize',
            expect.objectContaining({
                body: expect.stringContaining(
                    '"text":"Привет, Алиса!","lang":"ru-RU","voice":"oksana","format":"oggopus","emotion":"neutral","speed":1',
                ),
            }),
        );
    });

    it('should include emotion and speed for supported voices', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(0),
        });

        tts.voice = YandexSpeechKit.V_JANE;
        tts.emotion = YandexSpeechKit.E_GOOD;
        tts.speed = 1.5;
        const res = await tts.getTts('Тест');

        if (res) {
            unlink(res.fileName);
        }

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"emotion":"good"');
        expect(body).toContain('"speed":1.5');
    });
});
