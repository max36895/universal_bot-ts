/**
 * Тесты формирования параметров запроса в базовом `Request` (`src/api/request/Request.ts`).
 *
 * Проверяем инварианты, которые раньше нарушались и ломали работу с платформами:
 *  - кастомный заголовок (Authorization у MAX, X-Viber-Auth-Token у Viber) не должен
 *    затирать `Content-Type: application/json` у JSON-тела;
 *  - для FormData Content-Type должен выставлять сам fetch (нужен boundary);
 *  - `get` и `customRequest` не должны «залипать» между вызовами переиспользуемого
 *    инстанса Request;
 *  - текст ошибочного ответа должен попадать в err, иначе по логам нельзя понять
 *    причину отказа платформы.
 */
import { AppContext, Request } from '../../../src';

function makeContext(httpClient: jest.Mock): AppContext {
    const ctx = new AppContext();
    ctx.setLogger({ log: jest.fn(), error: jest.fn(), warn: jest.fn() });
    (ctx as unknown as { httpClient: typeof httpClient }).httpClient = httpClient;
    return ctx;
}

function okClient(): jest.Mock {
    return jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: 'ok' }),
    });
}

describe('Request: формирование параметров', () => {
    it('подставляет Content-Type к JSON-телу рядом с кастомным заголовком', async () => {
        const httpClient = okClient();
        const req = new Request(makeContext(httpClient));
        req.url = 'https://example.com/api';
        req.header = { Authorization: 'token' };
        req.post = { text: 'привет' };

        await req.send();

        const [, options] = httpClient.mock.calls[0] as [string, RequestInit];
        expect(options.headers).toEqual({
            Authorization: 'token',
            'Content-Type': 'application/json',
        });
    });

    it('не переопределяет Content-Type, заданный вызывающим кодом', async () => {
        const httpClient = okClient();
        const req = new Request(makeContext(httpClient));
        req.url = 'https://example.com/api';
        req.header = { 'Content-Type': 'application/x-www-form-urlencoded' };
        req.postInString = 'a=1';

        await req.send();

        const [, options] = httpClient.mock.calls[0] as [string, RequestInit];
        expect(options.headers).toEqual({
            'Content-Type': 'application/x-www-form-urlencoded',
        });
    });

    it('убирает Content-Type для FormData, чтобы fetch добавил boundary', async () => {
        const httpClient = okClient();
        const req = new Request(makeContext(httpClient));
        req.url = 'https://example.com/upload';
        req.header = { 'Content-Type': 'multipart/form-data', Authorization: 'token' };
        req.post = new FormData();

        await req.send();

        const [, options] = httpClient.mock.calls[0] as [string, RequestInit];
        expect(options.headers).toEqual({ Authorization: 'token' });
    });

    it('не тянет get и customRequest в следующий запрос', async () => {
        const httpClient = okClient();
        const req = new Request(makeContext(httpClient));
        req.url = 'https://example.com/api';
        req.get = { type: 'image' };
        req.customRequest = 'DELETE';

        await req.send();
        expect(req.get).toBeNull();
        expect(req.customRequest).toBeNull();

        req.post = { a: 1 };
        await req.send('https://example.com/other');

        const [url, options] = httpClient.mock.calls[1] as [string, RequestInit];
        expect(url).toBe('https://example.com/other');
        expect(options.method).toBe('POST');
    });

    it('запрещает следование редиректу: секреты в заголовках и URL не покидают доверенный хост', async () => {
        // Клиенты фреймворка ходят только на фиксированные endpoint'ы API платформ.
        // redirect: 'manual' превращает 3xx в ошибку запроса вместо того, чтобы
        // (при компрометации DNS/CDN или редиректе со стороны API) унести
        // Authorization / X-Viber-Auth-Token / токен Telegram в URL на сторонний хост.
        const httpClient = okClient();
        const req = new Request(makeContext(httpClient));
        req.url = 'https://api.example.com/method';
        req.header = { Authorization: 'Bearer secret' };
        req.post = { a: 1 };

        await req.send();

        const [, options] = httpClient.mock.calls[0] as [string, RequestInit];
        expect(options.redirect).toBe('manual');
    });

    it('кладёт тело ошибочного ответа в err', async () => {
        const httpClient = jest.fn().mockResolvedValue({
            ok: false,
            status: 400,
            text: async () => '{"ok":false,"description":"chat not found"}',
        });
        const req = new Request(makeContext(httpClient));
        req.url = 'https://example.com/api';
        req.post = { a: 1 };

        const result = await req.send();

        expect(result.status).toBe(false);
        expect(String(result.err)).toContain('chat not found');
    });

    it('отправляет attach как содержимое, когда isAttachContent=true', async () => {
        const httpClient = okClient();
        const req = new Request(makeContext(httpClient));
        req.url = 'https://example.com/upload';
        req.attach = 'raw file content';
        req.attachName = 'file';
        req.isAttachContent = true;

        await req.send();

        const [, options] = httpClient.mock.calls[0] as [string, RequestInit];
        expect(options.body).toBeInstanceOf(FormData);
        const form = options.body as FormData;
        await expect((form.get('file') as Blob).text()).resolves.toBe('raw file content');
    });
});
