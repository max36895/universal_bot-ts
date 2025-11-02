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

import { VkRequest } from '../../src/api/VkRequest';
import { AppContext } from '../../src';

const appContext = new AppContext();

describe('VkRequest', () => {
    let vk: VkRequest;

    beforeEach(() => {
        appContext.platformParams.vk_token = 'test-token';
        vk = new VkRequest(appContext);
        (global.fetch as jest.Mock).mockClear();
        appContext.saveLog = jest.fn();
    });

    // === messagesSend ===

    it('should send message with peer_id and message', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: { message_id: 123 } }),
        });

        const result = await vk.messagesSend(12345, 'Hello');

        expect(result).toEqual({ message_id: 123 });
        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('peer_id=12345&message=Hello&access_token=test-token');
    });

    it('should add random_id if not provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: {} }),
        });

        await vk.messagesSend(12345, 'Hi', {});

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toMatch(/random_id=\d+/);
    });

    it('should use custom random_id if provided', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: {} }),
        });

        await vk.messagesSend(12345, 'Hi', { random_id: 999 });

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('random_id=999&peer_id=12345&message=Hi&access_token=test-token');
    });

    it('should handle attachments', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: {} }),
        });

        await vk.messagesSend(12345, 'Photo', {
            attachments: ['photo123_456', 'doc789_012'],
            random_id: 1761643168159,
        });

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('attachment=photo123_456,doc789_012');
    });

    // === usersGet ===

    it('should call users.get with user_id', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: [{ id: 123 }] }),
        });

        const result = await vk.usersGet(123);
        expect(result).toEqual([{ id: 123 }]);
        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('user_id=123&access_token=test-token');
    });

    it('should call users.get with user_ids array', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: [] }),
        });

        await vk.usersGet(['123', '456']);
        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('user_ids=123,456&access_token=test-token');
    });

    // === photos & docs ===
    it('should get photo upload server', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: { upload_url: 'https://vk.com/upload' } }),
        });

        const result = await vk.photosGetMessagesUploadServer(12345);
        expect(result).toEqual({ upload_url: 'https://vk.com/upload' });
    });

    it('should save photo', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: [{ id: 100 }] }),
        });

        const result = await vk.photosSaveMessagesPhoto('PHOTO', '1', 'HASH');
        expect(result).toEqual([{ id: 100 }]);
        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('PHOTO');
    });

    it('should get doc upload server', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: { upload_url: 'https://vk.com/doc' } }),
        });

        const result = await vk.docsGetMessagesUploadServer(12345, 'doc');
        expect(result).toEqual({ upload_url: 'https://vk.com/doc' });
    });

    it('should save doc', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ response: { id: 200 } }),
        });

        const result = await vk.docsSave('FILE123', 'MyDoc', 'tag1,tag2');
        expect(result).toEqual({ id: 200 });
        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('file=FILE123&title=MyDoc&tags=tag1,tag2&access_token=test-token');
    });

    // === Ошибки ===
    it('should return null on API error', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ error: { error_code: 100 } }),
        });

        const result = await vk.messagesSend(12345, 'Hi');
        expect(result).toBeNull();
        expect(appContext.saveLog).toHaveBeenCalled();
    });

    it('should return null if no token', async () => {
        appContext.platformParams.vk_token = null;
        const localVk = new VkRequest(appContext);
        const result = await localVk.messagesSend(12345, 'Hi');
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    // === upload (наследуется, но проверим) ===
    it('should upload file with FormData', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ file: 'doc123' }),
        });

        const result = await vk.upload('https://vk.com/upload', 'test.pdf');
        expect(result).toEqual({ file: 'doc123' });
        expect(global.fetch).toHaveBeenCalledWith(
            'https://vk.com/upload',
            expect.objectContaining({
                body: expect.any(FormData),
            }),
        );
    });
});
