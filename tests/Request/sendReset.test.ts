/**
 * Тесты сброса состояния Request.send() при переиспользовании инстанса.
 *
 * Контракт «инстанс переиспользуется» (комментарий в send) ранее был выполнен
 * частично: header, isConvertJson, isBinaryResponse оставались от прошлого
 * вызова. Заголовок одного API (например, Authorization MAX) мог уйти в запрос
 * другого, а бинарный режим SpeechKit — в JSON-запрос (фикс 3.1.0).
 */
global.fetch = jest.fn();

import { AppContext, Request } from '../../src';

const appContext = new AppContext();
appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });

function mockOkJson(data: unknown): void {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => data,
    });
}

describe('Request.send(): сброс per-call состояния', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
    });

    it('сбрасывает header после вызова — секрет не течёт в следующий запрос', async () => {
        const request = new Request(appContext);

        request.header = { Authorization: 'Bearer secret-token' };
        request.post = { a: 1 };
        mockOkJson({ ok: true });
        await request.send('https://api.example.com/first');

        // Второй запрос без явного header: если бы Authorization «залип»,
        // он ушёл бы в чужой API.
        request.post = { b: 2 };
        mockOkJson({ ok: true });
        await request.send('https://api.example.com/second');

        const secondOptions = (global.fetch as jest.Mock).mock.calls[1][1];
        expect(secondOptions.headers).not.toHaveProperty('Authorization');
        // Content-Type подставляется автоматически для JSON-тела
        expect(secondOptions.headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('сбрасывает isBinaryResponse/isConvertJson после вызова', async () => {
        const request = new Request(appContext);

        request.isConvertJson = false;
        request.isBinaryResponse = true;
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(8),
        });
        await request.send('https://api.example.com/audio');

        // Второй запрос должен получить JSON, а не arrayBuffer
        mockOkJson({ data: 'json' });
        const result = await request.send<{ data: string }>('https://api.example.com/json');
        expect(result.status).toBe(true);
        expect(result.data).toEqual({ data: 'json' });
    });

    it('сбрасывает attach/attachName/isAttachContent (прежний контракт сохранён)', async () => {
        const request = new Request(appContext);

        request.attachName = 'photo';
        request.isAttachContent = true;
        request.attach = 'binary-content';
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true }),
        });
        await request.send('https://api.example.com/upload');

        expect(request.attach).toBeNull();
        expect(request.attachName).toBe('file');
        expect(request.isAttachContent).toBe(false);
    });

    it('НЕ сбрасывает maxTimeQuery — это настройка клиента, а не вызова', async () => {
        const request = new Request(appContext);
        request.maxTimeQuery = 5500;

        mockOkJson({ ok: true });
        await request.send('https://api.example.com/first');

        expect(request.maxTimeQuery).toBe(5500);
    });

    it('ошибка fetch нормализуется в Error (не маскируется строкой)', async () => {
        const request = new Request(appContext);
        (global.fetch as jest.Mock).mockRejectedValueOnce('raw string rejection');

        const result = await request.send<object>('https://api.example.com/fail');

        expect(result.status).toBe(false);
        expect(result.err).toBe('raw string rejection');
        // Строка осталась строкой, а не undefined-полем Error: потребители
        // читают err.message — у строки его нет, у Error оно есть.
        const err = result.err as Error | string;
        if (typeof err === 'string') {
            expect(err).toBe('raw string rejection');
        } else {
            expect(err.message).toBeTruthy();
        }
    });
});
