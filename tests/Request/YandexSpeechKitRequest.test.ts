global.fetch = jest.fn();

import { AppContext } from '../../src';
import { YandexSpeechKit } from '../../src/plugins';
import { unlink } from '../../src/utils';

const appContext = new AppContext();
appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });

/** Параметры последнего вызова fetch: тело и заголовки. */
function lastRequest(): { body: string; headers: Record<string, string> } {
    const calls = (global.fetch as jest.Mock).mock.calls;
    const options = calls[calls.length - 1][1] as RequestInit;
    return {
        body: String(options.body),
        headers: options.headers as Record<string, string>,
    };
}

describe('YandexSpeechKit', () => {
    let tts: YandexSpeechKit;

    beforeEach(() => {
        tts = new YandexSpeechKit('tts-token', appContext);
        (global.fetch as jest.Mock).mockReset();
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
            await unlink(result.fileName);
        }
        expect(result?.audioData).toEqual(buffer);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize',
            expect.objectContaining({ method: 'POST' }),
        );
        const params = new URLSearchParams(lastRequest().body);
        expect(params.get('text')).toBe('Привет, Алиса!');
        expect(params.get('lang')).toBe('ru-RU');
        expect(params.get('voice')).toBe('oksana');
        expect(params.get('format')).toBe('oggopus');
        expect(params.get('emotion')).toBe('neutral');
        expect(params.get('speed')).toBe('1');
    });

    it('отправляет тело в x-www-form-urlencoded: JSON SpeechKit v1 отклоняет (400)', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(0),
        });
        const res = await tts.getTts('Тест');
        if (res) {
            await unlink(res.fileName);
        }
        const { body, headers } = lastRequest();
        expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');
        expect(body.startsWith('{')).toBe(false);
    });

    it('API-ключ уходит схемой Api-Key, а не OAuth', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(0),
        });
        const res = await tts.getTts('Тест');
        if (res) {
            await unlink(res.fileName);
        }
        expect(lastRequest().headers.Authorization).toBe('Api-Key tts-token');
    });

    it('IAM-токен (t1.) уходит схемой Bearer', async () => {
        const iam = new YandexSpeechKit('t1.abc', appContext);
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(0),
        });
        const res = await iam.getTts('Тест');
        if (res) {
            await unlink(res.fileName);
        }
        expect(lastRequest().headers.Authorization).toBe('Bearer t1.abc');
    });

    it('явно заданная схема авторизации передаётся как есть', async () => {
        const explicit = new YandexSpeechKit('Bearer custom-iam', appContext);
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(0),
        });
        const res = await explicit.getTts('Тест');
        if (res) {
            await unlink(res.fileName);
        }
        expect(lastRequest().headers.Authorization).toBe('Bearer custom-iam');
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
            await unlink(res.fileName);
        }

        const params = new URLSearchParams(lastRequest().body);
        expect(params.get('emotion')).toBe('good');
        expect(params.get('speed')).toBe('1.5');
    });
});
