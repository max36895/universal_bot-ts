global.fetch = jest.fn();

jest.mock('../../src/utils', () => ({
    ...jest.requireActual('../../src/utils'),
    fread: jest.fn().mockReturnValue({ data: new Uint8Array([1, 2, 3]) }),
    isFile: jest.fn().mockReturnValue(true),
}));
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn().mockReturnValue({ data: new Uint8Array([1, 2, 3]) }),
}));

import { AppContext } from '../../src';
import { YandexImageRequest } from '../../src/api/YandexImageRequest';

const appContext = new AppContext();

describe('YandexImageRequest', () => {
    let imageApi: YandexImageRequest;

    beforeEach(() => {
        appContext.platformParams.app_id = 'skill-123';
        appContext.platformParams.yandex_token = 'oauth-token';
        imageApi = new YandexImageRequest(null, null, appContext);
        (global.fetch as jest.Mock).mockClear();
    });

    it('should check storage quota', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                images: { quota: { total: 1073741824, used: 1024 } },
            }),
        });

        const quota = await imageApi.checkOutPlace();
        expect(quota).toEqual({ total: 1073741824, used: 1024 });
    });

    it('should upload image from URL', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                image: { id: 'img-1', origUrl: 'https://example.com/img.jpg' },
            }),
        });

        const result = await imageApi.downloadImageUrl('https://example.com/img.jpg');
        expect(result).toEqual({ id: 'img-1', origUrl: 'https://example.com/img.jpg' });
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/skills/skill-123/images'),
            expect.objectContaining({
                body: expect.stringContaining('https://example.com/img.jpg'),
            }),
        );
    });

    it('should upload image from file', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                image: { id: 'img-2', size: 1024 },
            }),
        });

        const result = await imageApi.downloadImageFile('/path/to/image.jpg');
        expect(result).toEqual({ id: 'img-2', size: 1024 });
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/skills/skill-123/images'),
            expect.objectContaining({
                body: expect.any(FormData),
            }),
        );
    });

    it('should delete image', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ result: 'ok' }),
        });

        const result = await imageApi.deleteImage('img-1');
        expect(result).toBe('ok');
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/skills/skill-123/images/img-1'),
            expect.objectContaining({ method: 'DELETE' }),
        );
    });
});
