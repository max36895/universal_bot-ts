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
import { ViberRequest } from '../../src/plugins';

const appContext = new AppContext();
appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });

describe('ViberRequest', () => {
    let viber: ViberRequest;

    beforeEach(() => {
        appContext.appConfig.tokens.viber = {
            token: 'test-viber-token',
            api_version: 2,
            sender: 'Configured Bot',
        };
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

    it('should not invent a visible Viber sender name', async () => {
        delete appContext.appConfig.tokens.viber.sender;

        await expect(viber.richMedia('user123', [{ Text: 'Card' }])).resolves.toBeNull();

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should keep required text fields and enforce the 7000 character limit', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 0, status_message: 'ok' }),
        });

        await viber.sendMessage('user123', 'BotName', 'x'.repeat(7001), {
            receiver: 'other-user',
            sender: { name: 'Other Bot' },
            text: 'overridden',
            type: 'picture',
            min_api_version: '7',
        });

        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string) as {
            receiver: string;
            sender: { name: string };
            text: string;
            type: string;
            min_api_version: number;
        };
        expect(body).toEqual(
            expect.objectContaining({
                receiver: 'user123',
                sender: { name: 'BotName' },
                type: 'text',
                min_api_version: 7,
            }),
        );
        expect(body.text).toHaveLength(7000);
    });

    it('should not send a request larger than the Viber 30 KB limit', async () => {
        const result = await viber.sendMessage('user123', 'BotName', 'ok', {
            tracking_data: 'x'.repeat(31 * 1024),
        });

        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
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

    it('should not allow webhook params to replace the explicit URL', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 0, status_message: 'ok' }),
        });

        await viber.setWebhook('https://mybot.com/webhook', {
            url: 'https://other.example/webhook',
            event_types: ['message'],
        });

        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string) as {
            url: string;
            event_types: string[];
        };
        expect(body.url).toBe('https://mybot.com/webhook');
        expect(body.event_types).toEqual(['message']);
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
        expect(body).toContain('"ButtonsGroupRows":7');
        expect(body).toContain('"Text":"Button 1"');
        expect(body).toContain('"sender":{"name":"Configured Bot"}');
    });

    it('should protect required rich media fields from params', async () => {
        const buttons = [{ Text: 'Expected' }];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 0, status_message: 'ok' }),
        });

        await viber.richMedia('user123', buttons, {
            receiver: 'other-user',
            type: 'text',
            rich_media: {
                Type: 'rich_media',
                ButtonsGroupColumns: 1,
                ButtonsGroupRows: 1,
                BgColor: '#000000',
                Buttons: [{ Text: 'Unexpected' }],
            },
        });

        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string) as {
            receiver: string;
            type: string;
            rich_media: { Buttons: Array<{ Text?: string }> };
        };
        expect(body.receiver).toBe('user123');
        expect(body.type).toBe('rich_media');
        expect(body.rich_media.Buttons).toEqual(buttons);
    });

    // === sendFile ===
    it('should send file via URL', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 0, status_message: 'ok' }),
        });

        const result = await viber.sendFile('user123', 'https://example.com/file.pdf', {
            size: 4096,
        });

        expect(result).not.toBeNull();
        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"type":"file"');
        expect(body).toContain('"media":"https://example.com/file.pdf"');
        expect(body).toContain('"file_name":"file.pdf"');
        expect(body).toContain('"size":4096');
        expect(body).toContain('"sender":{"name":"Configured Bot"}');
    });

    it('should reject a remote file when its real size is unknown', async () => {
        const result = await viber.sendFile('user123', 'https://example.com/file.pdf');

        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should reject a malformed file URL without throwing', () => {
        expect(viber.sendFile('user123', 'http://', { size: 10 })).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should reject a file without extension or larger than 50 MB', () => {
        expect(viber.sendFile('user123', 'https://example.com/file', { size: 10 })).toBeNull();
        expect(
            viber.sendFile('user123', 'https://example.com/file.pdf', {
                size: 50 * 1024 * 1024 + 1,
            }),
        ).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
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
        expect(appContext.logError).toHaveBeenCalledWith(
            expect.stringContaining('Not subscribed'),
            expect.objectContaining({}),
        );
    });

    it('should return null if no token provided', async () => {
        appContext.appConfig.tokens.viber = { token: undefined };
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
