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
import { ViberRequest } from '../../src/api/ViberRequest';

const appContext = new AppContext();

describe('ViberRequest', () => {
    let viber: ViberRequest;

    beforeEach(() => {
        appContext.platformParams.viber_token = 'test-viber-token';
        appContext.platformParams.viber_api_version = 2;
        viber = new ViberRequest(appContext);
        (global.fetch as jest.Mock).mockClear();
        appContext.logError = jest.fn();
    });

    // === Базовый вызов call ===
    it('should set correct auth header and min_api_version', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 0, status_message: 'ok' }),
        });

        await viber.call('test_method');

        expect(global.fetch).toHaveBeenCalledWith(
            'https://chatapi.viber.com/pa/test_method',
            expect.objectContaining({
                headers: {
                    'X-Viber-Auth-Token': 'test-viber-token',
                },
                body: expect.stringContaining('"min_api_version":2'),
            }),
        );
    });

    // === getUserDetails ===
    it('should get user details', async () => {
        const mockResponse = {
            status: 0,
            status_message: 'ok',
            user: {
                id: 'user123',
                name: 'John',
                avatar: 'https://example.com/avatar.jpg',
                country: 'US',
                language: 'en',
                primary_device_os: 'iOS 15',
                api_version: 7,
                viber_version: '16.5.0',
                mcc: 310,
                mnc: 410,
                device_type: 'iPhone12,1',
            },
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const result = await viber.getUserDetails('user123');
        expect(result).toEqual(mockResponse);
        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"id":"user123"');
    });

    // === sendMessage ===
    it('should send text message with sender object', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 0, status_message: 'ok' }),
        });

        await viber.sendMessage(
            'user123',
            { name: 'Bot', avatar: 'https://example.com/bot.jpg' },
            'Hello!',
        );

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"receiver":"user123"');
        expect(body).toContain('"text":"Hello!"');
        expect(body).toContain('"type":"text"');
        expect(body).toContain('"name":"Bot"');
    });

    it('should send text message with sender as string', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 0, status_message: 'ok' }),
        });

        await viber.sendMessage('user123', 'BotName', 'Hi');

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"sender":{"name":"BotName"}');
    });

    // === setWebhook ===
    it('should set webhook with default event types', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 0, status_message: 'ok' }),
        });

        await viber.setWebhook('https://mybot.com/webhook');

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"url":"https://mybot.com/webhook"');
        expect(body).toContain(
            '"event_types":["delivered","seen","failed","subscribed","unsubscribed","conversation_started"]',
        );
    });

    it('should remove webhook with empty URL', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 0, status_message: 'ok' }),
        });

        await viber.setWebhook('');

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"url":""');
    });

    // === richMedia ===
    it('should send rich media message', async () => {
        const buttons = [
            {
                Columns: 6,
                Rows: 1,
                Text: 'Button 1',
                ActionType: 'reply',
                ActionBody: 'btn1',
            },
        ];

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 0, status_message: 'ok' }),
        });

        await viber.richMedia('user123', buttons);

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"type":"rich_media"');
        expect(body).toContain('"ButtonsGroupRows":1');
        expect(body).toContain('"Text":"Button 1"');
    });

    // === sendFile ===
    it('should send file via URL', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 0, status_message: 'ok' }),
        });

        const result = await viber.sendFile('user123', 'https://example.com/file.pdf');

        expect(result).not.toBeNull();
        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"type":"file"');
        expect(body).toContain('"media":"https://example.com/file.pdf"');
    });

    it('should return null for local file path', async () => {
        const result = await viber.sendFile('user123', '/local/file.pdf');
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    // === Обработка ошибок ===
    it('should return null on API error (status !== 0)', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 6, status_message: 'Not subscribed' }),
        });

        const result = await viber.sendMessage('user123', 'Bot', 'Hi');
        expect(result).toBeNull();
        expect(appContext.logError).toHaveBeenCalledWith(expect.stringContaining('Not subscribed'));
    });

    it('should return null if no token provided', async () => {
        appContext.platformParams.viber_token = undefined;
        const localViber = new ViberRequest(appContext);
        const result = await localViber.sendMessage('user123', 'Bot', 'Hi');
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    // === Важно: исправьте заголовок! ===
    it('should use correct header format', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 0 }),
        });

        await viber.call('test');

        const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
        expect(headers).toEqual({ 'X-Viber-Auth-Token': 'test-viber-token' });
    });
});
