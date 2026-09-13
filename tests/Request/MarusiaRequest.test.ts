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
jest.mock('fs/promises', () => ({
    ...jest.requireActual('fs/promises'),
    readFile: jest.fn().mockReturnValue({ data: new Uint8Array([1, 2, 3]) }),
}));

import { AppContext } from '../../src';
import { MarusiaRequest } from '../../src/plugins';

const appContext = new AppContext();
appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });

describe('MarusiaRequest', () => {
    let marusia: MarusiaRequest;

    beforeEach(() => {
        appContext.appConfig.tokens.marusia = { token: 'test-marusia-token' };
        appContext.appConfig.tokens.vk = { token: 'test-vk-token' };
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

    it('should send audio_meta as JSON string', async () => {
        const meta = { file: 'audio_file_123' };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: { id: 'audio_1' } }),
        });

        await marusia.marusiaCreateAudio(meta);

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        // JSON.stringify({file: 'audio_file_123'}) -> '%7B%22file%22%3A%22audio_file_123%22%7D'
        expect(body).toContain(
            'audio_meta=%7B%22file%22%3A%22audio_file_123%22%7D&access_token=test-marusia-token&v=5.199',
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
        appContext.appConfig.tokens.marusia = { token: undefined };
        appContext.appConfig.tokens.vk = { token: undefined };
        const localMarusia = new MarusiaRequest(appContext);

        const result = await localMarusia.marusiaGetPictureUploadLink();
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('не подставляет VK-токен, если токен Маруси не задан', async () => {
        // Раньше MarusiaRequest наследовал токен VK от родителя и слал его в API Маруси
        appContext.appConfig.tokens.marusia = { token: undefined };
        appContext.appConfig.tokens.vk = { token: 'vk-secret-token' };
        const localMarusia = new MarusiaRequest(appContext);

        expect(localMarusia.token).toBeNull();
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
