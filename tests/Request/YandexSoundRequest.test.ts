global.fetch = jest.fn();

jest.mock('../../src/utils', () => ({
    ...jest.requireActual('../../src/utils'),
    fread: jest.fn().mockReturnValue({ data: new Uint8Array([1, 2, 3]) }),
    isFile: jest.fn().mockReturnValue(true),
}));

import { AppContext } from '../../src';
import { YandexSoundRequest } from '../../src/api/YandexSoundRequest';

const appContext = new AppContext();

describe('YandexSoundRequest', () => {
    let soundApi: YandexSoundRequest;

    beforeEach(() => {
        appContext.platformParams.app_id = 'skill-456';
        appContext.platformParams.yandex_token = 'oauth-token';
        soundApi = new YandexSoundRequest(null, null, appContext);
        (global.fetch as jest.Mock).mockClear();
    });

    it('should check sound storage quota', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                sounds: { quota: { total: 1073741824, used: 2048 } },
            }),
        });

        const quota = await soundApi.checkOutPlace();
        expect(quota).toEqual({ total: 1073741824, used: 2048 });
    });

    it('should upload sound file', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                sound: { id: 'snd-1', originalName: 'test.mp3' },
            }),
        });

        const result = await soundApi.downloadSoundFile('/path/to/sound.mp3');
        expect(result).toEqual({ id: 'snd-1', originalName: 'test.mp3' });
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/skills/skill-456/sounds'),
            expect.objectContaining({
                headers: { 'Content-Type': 'multipart/form-data' },
                body: expect.any(FormData),
            }),
        );
    });

    it('should delete sound', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ result: 'ok' }),
        });

        const result = await soundApi.deleteSound('snd-1');
        expect(result).toBe('ok');
    });
});
