/**
 * Тесты загрузки файлов через базовый `Request` (src/api/request/Request.ts).
 *
 * Критический инвариант: когда attach-файл не найден или не прочитан,
 * запрос к платформе отправляться НЕ должен. Раньше `_getOptions()` возвращал
 * undefined, но `#run()` выполнял `fetch(url, undefined)` — паразитный GET-запрос
 * к API платформы без тела и метода, затиравший причину отказа.
 */
import { AppContext, Request } from '../../../src';

function makeContext(httpClient: jest.Mock): AppContext {
    const ctx = new AppContext();
    ctx.setLogger({ error: jest.fn(), warn: jest.fn() });
    (ctx as unknown as { httpClient: typeof httpClient }).httpClient = httpClient;
    return ctx;
}

describe('Request: attach-файл', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('не отправляет запрос, если attach-файл не найден', async () => {
        const httpClient = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });
        const ctx = makeContext(httpClient);
        const req = new Request(ctx);
        req.url = 'https://api.telegram.org/bot123/sendPhoto';
        req.attach = './non-existent-dir/non-existent-file.jpg';

        const result = await req.send();

        expect(result.status).toBe(false);
        expect(result.err).toContain('Не удалось найти файл');
        // Паразитный GET не должен уходить на платформу
        expect(httpClient).not.toHaveBeenCalled();
    });

    it('ошибка attach не затирается ответом платформы', async () => {
        const httpClient = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ ok: true, result: { photo: [] } }),
        });
        const ctx = makeContext(httpClient);
        const req = new Request(ctx);
        req.url = 'https://api.telegram.org/bot123/sendPhoto';
        req.attach = './non-existent-dir/non-existent-file.jpg';

        const result = await req.send();

        expect(result.status).toBe(false);
        expect(String(result.err)).toContain('non-existent-file.jpg');
    });
});
