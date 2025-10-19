global.fetch = jest.fn();

jest.mock('../../src/utils', () => ({
    ...jest.requireActual('../../src/utils'),
    fread: jest.fn().mockReturnValue({ data: new Uint8Array([1, 2, 3]) }),
    isFile: jest.fn().mockReturnValue(true),
}));

import { AppContext } from '../../src';
import { MaxRequest } from '../../src/api/MaxRequest';

const appContext = new AppContext();

describe('MaxRequest', () => {
    let max: MaxRequest;

    beforeEach(() => {
        appContext.platformParams.max_token = 'test-max-token';
        max = new MaxRequest(appContext);
        (global.fetch as jest.Mock).mockClear();
        appContext.saveLog = jest.fn();
    });

    // === Базовый вызов call ===
    it('should set Authorization header and access_token', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ result: 'ok' }),
        });

        await max.call('test_method');

        expect(global.fetch).toHaveBeenCalledWith(
            'https://platform-api.max.ru/test_method',
            expect.objectContaining({
                headers: { Authorization: 'test-max-token' },
                body: expect.stringContaining('"access_token":"test-max-token"'),
            }),
        );
    });

    // === Загрузка файла ===
    it('should upload file with FormData', async () => {
        const mockResponse = { file_id: 'file_123', url: 'https://max.ru/file_123' };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const result = await max.upload('test.jpg', 'image');

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://platform-api.max.ru/uploads',
            expect.objectContaining({
                headers: { 'Content-Type': 'multipart/form-data', Authorization: 'test-max-token' },
                body: expect.any(FormData),
            }),
        );

        const formData = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData;
        expect(formData.get('type')).toBe('image');
        expect(formData.has('file')).toBe(true);
    });

    // === Отправка сообщения ===
    it('should send text message', async () => {
        const mockResponse = { message_id: 999 };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const result = await max.messagesSend(12345, 'Hello from MAX!');

        expect(result).toEqual(mockResponse);
        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"user_id":12345');
        expect(body).toContain('"text":"Hello from MAX!"');
    });

    it('should send message with attachments', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message_id: 1000 }),
        });

        await max.messagesSend(12345, 'With attachment', {
            attachments: 'file_123',
        });

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"attachment":["file_123"]');
    });

    it('should send message with inline keyboard', async () => {
        const keyboard = {
            buttons: [[{ type: 'callback', text: 'OK', payload: 'ok' }]],
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message_id: 1001 }),
        });

        await max.messagesSend(12345, 'With keyboard', {
            keyboard,
        });

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"type":"inline_keyboard"');
        expect(body).toContain('"payload":{"buttons"');
    });

    // === Подписка (webhook) ===
    it('should set subscription webhook', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 'ok' }),
        });

        const result = await max.subscriptions('https://mybot.com/webhook');

        expect(result).toEqual({ status: 'ok' });
        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"url":"https://mybot.com/webhook"');
    });

    // === Обработка ошибок ===
    it('should return null on network error', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        const result = await max.messagesSend(12345, 'Hi');
        expect(result).toBeNull();
        expect(appContext.saveLog).toHaveBeenCalledWith(
            'maxApi.log',
            expect.stringContaining('Network error'),
        );
    });

    it('should return null if no token', async () => {
        appContext.platformParams.max_token = undefined;
        const localMax = new MaxRequest(appContext);
        const result = await localMax.messagesSend(12345, 'Hi');
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should use correct API URL (no trailing spaces)', () => {
        expect(max['MAX_API_ENDPOINT'].trim()).toBe('https://platform-api.max.ru/');
    });
});
