global.fetch = jest.fn();

jest.mock('../../src/utils/standard/util', () => ({
    ...jest.requireActual('../../src/utils'),
    isFile: jest.fn().mockReturnValue(true),
    fread: jest.fn().mockReturnValue({ data: new Uint8Array([1, 2, 3]) }),
}));
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn().mockReturnValue({ data: new Uint8Array([1, 2, 3]) }),
}));

import { AppContext } from '../../src';
import { TelegramRequest } from '../../src/api/TelegramRequest';

const appContext = new AppContext();

describe('TelegramRequest', () => {
    let telegram: TelegramRequest;

    beforeEach(() => {
        appContext.platformParams.telegram_token = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
        telegram = new TelegramRequest(appContext);
        (global.fetch as jest.Mock).mockClear();
        appContext.logError = jest.fn(); // для проверки логирования
    });

    // === Базовая отправка сообщения ===
    it('should send text message', async () => {
        const mockResponse = { ok: true, result: { message_id: 123 } };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const result = await telegram.sendMessage(12345, 'Hello');

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('sendMessage'),
            expect.objectContaining({
                body: expect.stringContaining('"chat_id":12345,"text":"Hello"'),
            }),
        );
    });

    it('should send message with parse_mode', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });

        await telegram.sendMessage(12345, '*bold*', { parse_mode: 'Markdown' });

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"parse_mode":"Markdown"');
    });

    // === Отправка файлов ===
    it('should send photo with FormData', async () => {
        const mockResponse = { ok: true, result: { message_id: 124 } };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });

        const result = await telegram.sendPhoto(12345, 'photo.jpg', 'My photo');

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('sendPhoto'),
            expect.objectContaining({
                body: expect.any(FormData),
            }),
        );
        const formData = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData;
        expect(formData.get('chat_id')).toBe('12345');
        expect(formData.get('caption')).toBe('My photo');
    });

    it('should send document', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });

        await telegram.sendDocument(12345, 'doc.pdf');

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('sendDocument'),
            expect.objectContaining({
                body: expect.any(FormData),
            }),
        );
    });

    it('should send audio', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });

        await telegram.sendAudio(12345, 'audio.mp3', { title: 'Song', performer: 'Artist' });

        const formData = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData;
        expect(formData.get('title')).toContain('Song');
        expect(formData.get('performer')).toContain('Artist');
    });

    // === Отправка опроса ===
    it('should send poll with options', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });

        const result = await telegram.sendPoll(12345, 'Your favorite?', ['Red', 'Blue']);

        expect(result).not.toBeNull();
        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"question":"Your favorite?"');
        expect(body).toContain('"options":["Red","Blue"]');
    });

    it('should return null if poll has less than 2 options', async () => {
        const result = await telegram.sendPoll(12345, 'Q?', ['Only one']);
        expect(result).toBeNull();
        expect(appContext.logError).toHaveBeenCalledWith(
            expect.stringContaining('Недостаточное количество вариантов'),
        );
    });

    // === Обработка ошибок ===
    it('should return null on Telegram API error', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: false, description: 'Bad Request' }),
        });

        const result = await telegram.sendMessage(12345, 'Hi');
        expect(result).toBeNull();
        expect(appContext.logError).toHaveBeenCalled();
    });

    it('should return null if no token provided', async () => {
        appContext.platformParams.telegram_token = undefined;
        const localTelegram = new TelegramRequest(appContext);
        const result = await localTelegram.sendMessage(12345, 'Hi');
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    // === Проверка URL ===
    it('should construct correct API URL', () => {
        const url = telegram['_getUrl']();
        expect(url).toBe('https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/');
    });
});
