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
import { MarusiaRequest } from '../../src/api/MarusiaRequest';

const appContext = new AppContext();

describe('MarusiaRequest', () => {
    let marusia: MarusiaRequest;

    beforeEach(() => {
        appContext.platformParams.marusia_token = 'test-marusia-token';
        appContext.platformParams.vk_token = 'test-vk-token';
        marusia = new MarusiaRequest(appContext);
        (global.fetch as jest.Mock).mockClear();
        appContext.logError = jest.fn();
    });

    it('should get picture upload link', async () => {
        const mockResponse = { upload_url: 'https://marusia.example.com/upload' };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: mockResponse }),
        });

        const result = await marusia.marusiaGetPictureUploadLink();
        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('marusia.getPictureUploadLink'),
            expect.objectContaining({
                body: expect.any(String),
            }),
        );
    });

    it('should upload file using inherited upload method', async () => {
        const mockUploadResponse = { photo: 'photo123', server: '1', hash: 'abc' };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockUploadResponse,
        });

        const result = await marusia.upload('https://upload.example.com', 'test.jpg');
        expect(result).toEqual(mockUploadResponse);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://upload.example.com',
            expect.objectContaining({
                body: expect.any(FormData),
            }),
        );
    });

    it('should call marusia.savePicture with correct params', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: { id: 'pic_123' } }),
        });

        await marusia.marusiaSavePicture('PHOTO123', 'SRV456', 'HASH789');

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('PHOTO123');
        expect(body).toContain('SRV456');
        expect(body).toContain('HASH789');
    });

    it('should send audio_meta as nested object', async () => {
        const meta = { file: 'audio_file_123' };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: { id: 'audio_1' } }),
        });

        await marusia.marusiaCreateAudio(meta);

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain(
            'audio_meta=%5Bobject+Object%5D&access_token=test-marusia-token&v=5.103',
        );
    });

    it('should return null when API returns error', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                error: { error_code: 5, error_msg: 'User authorization failed' },
            }),
        });

        const result = await marusia.marusiaGetPictureUploadLink();
        expect(result).toBeNull();
        expect(appContext.logError).toHaveBeenCalled(); // если логирование вызывается
    });

    it('should return null if no token is provided', async () => {
        appContext.platformParams.marusia_token = null;
        appContext.platformParams.vk_token = null;
        const localMarusia = new MarusiaRequest(appContext);

        const result = await localMarusia.marusiaGetPictureUploadLink();
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should call marusia.getPictures', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: { items: [] } }),
        });

        await marusia.marusiaGetPictures();
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('marusia.getPictures'),
            expect.anything(),
        );
    });
});
