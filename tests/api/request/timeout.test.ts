/**
 * Тесты для механизма таймаута в базовом `Request` (`src/api/request/Request.ts`).
 *
 * Критический инвариант (AGENTS.md §4): HTTP-вызовы во фреймворке **обязаны** иметь
 * ограниченный таймаут. Зависший upstream (Telegram API/VK API/...) не должен вешать
 * обработку webhook'а пользователя на неопределённое время.
 *
 * Реализация: `Request.#run` использует `AbortSignal.timeout(this.maxTimeQuery)`
 * (Request.ts:211). Здесь проверяем:
 *  - что AbortSignal реально создаётся и передаётся в httpClient;
 *  - что сигнал имеет `aborted === true` после истечения таймаута;
 *  - что можно переопределить `maxTimeQuery`;
 *  - что при `maxTimeQuery = null` сигнал не создаётся (opt-out).
 */
import { AppContext, Request } from '../../../src';

/** Создаёт AppContext-заглушку (всё, что нужно Request'у — это httpClient и logError). */
function makeContext(httpClient: jest.Mock): AppContext {
    const ctx = new AppContext();
    ctx.setLogger({ error: jest.fn(), warn: jest.fn() });
    (ctx as unknown as { httpClient: typeof httpClient }).httpClient = httpClient;
    return ctx;
}

describe('Request: AbortSignal-таймаут', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('по умолчанию maxTimeQuery = 2000 мс (не бесконечный)', () => {
        const ctx = makeContext(jest.fn());
        const req = new Request(ctx);
        expect(req.maxTimeQuery).toBe(2000);
    });

    it('передаёт AbortSignal в httpClient при отправке запроса', async () => {
        const httpClient = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ result: 'ok' }),
        });
        const ctx = makeContext(httpClient);
        const req = new Request(ctx);
        req.url = 'https://example.com/api';

        await req.send();

        expect(httpClient).toHaveBeenCalledTimes(1);
        const [, options] = httpClient.mock.calls[0] as [string, RequestInit];
        expect(options).toBeDefined();
        expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it('AbortSignal срабатывает по истечении maxTimeQuery', async () => {
        let capturedSignal: AbortSignal | undefined;
        const httpClient = jest.fn().mockImplementation((_url: string, options: RequestInit) => {
            capturedSignal = options.signal as AbortSignal;
            // Симулируем «зависший» upstream, не reject'им сам
            return new Promise(() => {
                /* never resolves; abort must come from outside */
            });
        });
        const ctx = makeContext(httpClient);
        const req = new Request(ctx);
        req.maxTimeQuery = 50; // 50 мс — тест не должен ждать 2 секунды
        req.url = 'https://example.com/slow';

        // Запускаем send, но не ждём завершения (оно выйдет по abort)
        const pending = req.send();

        // Ждём срабатывания AbortSignal
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(capturedSignal).toBeDefined();
        expect(capturedSignal!.aborted).toBe(true);
        expect(capturedSignal!.reason).toBeInstanceOf(DOMException);
        expect((capturedSignal!.reason as DOMException).name).toBe('TimeoutError');

        // Прибираем pending promise без утечек
        pending.catch(() => undefined);
    });

    it('при maxTimeQuery = null сигнал НЕ устанавливается (opt-out, код это поддерживает)', async () => {
        const httpClient = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ ok: 1 }),
        });
        const ctx = makeContext(httpClient);
        const req = new Request(ctx);
        req.url = 'https://example.com/api';
        req.maxTimeQuery = null;

        await req.send();

        const [, options] = httpClient.mock.calls[0] as [string, RequestInit];
        expect(options.signal).toBeUndefined();
    });

    it('maxTimeQuery кастомизируется: разные значения попадают в сигнал', async () => {
        // Шпионируем AbortSignal.timeout, чтобы проверить переданное значение
        const timeoutSpy = jest.spyOn(AbortSignal, 'timeout');

        const httpClient = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });
        const ctx = makeContext(httpClient);
        const req = new Request(ctx);
        req.url = 'https://example.com/api';
        req.maxTimeQuery = 7500;

        await req.send();

        expect(timeoutSpy).toHaveBeenCalledWith(7500);
    });

    it('send возвращает status:false если httpClient бросил AbortError', async () => {
        const abortErr = new DOMException('The operation was aborted', 'AbortError');
        const httpClient = jest.fn().mockRejectedValue(abortErr);
        const ctx = makeContext(httpClient);
        const req = new Request(ctx);
        req.url = 'https://example.com/api';

        const result = await req.send<unknown>();

        expect(result.status).toBe(false);
        // Нормализация в Request.#run (3.1.0): не-Error исключение превращается
        // в строку. В песочнице Jest DOMException не проходит `instanceof Error`
        // (кросс-контекстный instanceof), поэтому err приходит строкой; в чистом
        // Node DOMException — наследник Error и остаётся объектом. Контракт
        // IRequestSend.err допускает оба варианта: `Error | string`.
        expect([abortErr, String(abortErr)]).toContain(result.err);
        expect(result.data).toBeNull();
    });
});
