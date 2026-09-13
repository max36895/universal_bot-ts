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
jest.mock('fs/promises', () => ({
    ...jest.requireActual('fs/promises'),
    readFile: jest.fn().mockReturnValue({ data: new Uint8Array([1, 2, 3]) }),
}));

import { AppContext } from '../../src';
import { TelegramRequest } from '../../src/plugins';

const appContext = new AppContext();
appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });

describe('TelegramRequest', () => {
    let telegram: TelegramRequest;

    beforeEach(() => {
        appContext.appConfig.tokens.telegram = {
            token: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        };
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

    it('should preserve valid HTML when HTML parse_mode is explicitly enabled', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });

        await telegram.sendMessage(12345, '<b>Готово</b>', { parse_mode: 'HTML' });

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
        expect(body).toContain('"text":"<b>Готово</b>"');
    });

    it('should reject an empty sendMessage payload before calling Telegram', async () => {
        const result = await telegram.sendMessage(12345, '   ');

        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should enforce the 4096 character sendMessage limit', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });

        await telegram.sendMessage(12345, 'x'.repeat(4097));

        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string) as {
            text: string;
        };
        expect(body.text).toHaveLength(4096);
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
        expect(body).toContain('"options":"[{\\"text\\":\\"Red\\"},{\\"text\\":\\"Blue\\"}]"');
    });

    it('should accept one poll option and normalize current Telegram text limits', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });

        await telegram.sendPoll(12345, 'Q'.repeat(301), ['x'.repeat(101)]);

        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string) as {
            question: string;
            options: Array<{ text: string }>;
        };
        expect(body.question).toHaveLength(300);
        const options = JSON.parse(body.options);
        expect(options).toHaveLength(1);
        expect(options[0].text).toHaveLength(100);
    });

    it('should map the legacy quiz option id to correct_option_ids', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });

        await telegram.sendPoll(12345, 'Q?', ['One'], {
            type: 'quiz',
            correct_option_id: 0,
        });

        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string) as {
            correct_option_id?: number;
            correct_option_ids?: number[];
        };
        // Устаревшее singular-поле приводится к актуальному массивному формату,
        // а не удаляется: quiz-опрос обязан содержать правильный ответ.
        expect(body.correct_option_ids).toEqual([0]);
        expect(body.correct_option_id).toBeUndefined();
    });

    it('should send correct_option_ids as-is for quiz polls', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });

        await telegram.sendPoll(12345, 'Q?', ['One', 'Two'], {
            type: 'quiz',
            correct_option_ids: [1],
        });

        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string) as {
            correct_option_ids?: number[];
        };
        expect(body.correct_option_ids).toEqual([1]);
    });

    it('should send correct_option_ids sorted and without duplicates', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });

        await telegram.sendPoll(12345, 'Q?', ['One', 'Two', 'Three'], {
            type: 'quiz',
            correct_option_ids: [2, 0, 2],
        });

        const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string) as {
            correct_option_ids?: number[];
        };
        // Bot API требует монотонно возрастающий список индексов.
        expect(body.correct_option_ids).toEqual([0, 2]);
    });

    it('should reject quiz polls with an out-of-range correct option index', async () => {
        const result = await telegram.sendPoll(12345, 'Q?', ['One'], {
            type: 'quiz',
            correct_option_ids: [5],
        });

        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should enforce callback notification and media group limits', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });

        await telegram.answerCallbackQuery('callback-id', 'x'.repeat(201));

        const callbackBody = JSON.parse(
            (global.fetch as jest.Mock).mock.calls[0][1].body as string,
        ) as { text: string };
        expect(callbackBody.text).toHaveLength(200);

        await expect(
            telegram.sendMediaGroup(12345, [{ type: 'photo', media: 'file-id' }]),
        ).resolves.toBeNull();
        await expect(
            telegram.sendMediaGroup(
                12345,
                Array.from({ length: 11 }, (_, index) => ({
                    type: 'photo' as const,
                    media: `file-${index}`,
                })),
            ),
        ).resolves.toBeNull();
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should preserve media when optional media group params are supplied', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: [] }),
        });

        await telegram.sendMediaGroup(
            12345,
            [
                { type: 'photo', media: 'file-1' },
                { type: 'photo', media: 'file-2' },
            ],
            { disable_notification: true },
        );

        const body = (global.fetch as jest.Mock).mock.calls[0][1].body as FormData;
        expect(JSON.parse(body.get('media') as string)).toEqual([
            { type: 'photo', media: 'file-1' },
            { type: 'photo', media: 'file-2' },
        ]);
        expect(body.get('disable_notification')).toBe('true');
        expect(body.get('chat_id')).toBe('12345');
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
        appContext.appConfig.tokens.telegram = { token: undefined };
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
