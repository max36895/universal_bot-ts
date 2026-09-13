/**
 * Тесты для маскирования секретов в `AppContext`.
 *
 * Фреймворк гарантирует, что токены/ключи не попадут в лог в открытом виде.
 * Реализация находится в `src/core/AppContext.ts`:
 *  - `#maskSecrets` — regex-замены (PATTERNS),
 *  - `#maskUnknown` — рекурсивная маскировка meta (включая `Date`, `Error`, циклические ссылки),
 *  - opt-out через `ILogger.maskSecrets === false`.
 */
import { AppContext, ILogger } from '../../src';

describe('AppContext: маскирование секретов (logError / logWarn)', () => {
    let ctx: AppContext;
    let errorSpy: jest.Mock;
    let warnSpy: jest.Mock;

    /**
     * Создаёт новый AppContext с зашлушенным логгером-шпионом.
     * Перед каждым тестом — свежий инстанс, чтобы не протекало состояние.
     */
    beforeEach(() => {
        ctx = new AppContext();
        errorSpy = jest.fn();
        warnSpy = jest.fn();
        ctx.setLogger({
            error: errorSpy,
            warn: warnSpy,
        } as ILogger);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ---------------------------------------------
    // Базовые regex-паттерны (PATTERNS из AppContext.ts)
    // ---------------------------------------------

    it('маскирует Telegram-токен формата "bot<id>:<35+ символов>"', () => {
        const tgToken = 'bot1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'; // 35 'A'
        ctx.logError(`Фатальная ошибка: ${tgToken} не удалось`);
        expect(errorSpy).toHaveBeenCalledTimes(1);
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        expect(msg).toContain('bot***');
    });

    it('маскирует VK-токен формата "vk1a<79 hex>"', () => {
        const vkToken = 'vk1a' + 'a1'.repeat(40).slice(0, 79); // ровно 79 символов
        ctx.logError(`VK auth: ${vkToken}`);
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain(vkToken.slice(10));
        expect(msg).toContain('***');
    });

    it('маскирует VK-токен реального формата vk1.a.<payload>', () => {
        // Прежний шаблон /vk1a[a-z0-9]{79}/ не совпадал с настоящим форматом токена
        // (он содержит точки), поэтому VK-токен маскировался только по счастливой случайности.
        const vkToken = 'vk1.a.' + 'a1b2c3d4e5'.repeat(8);
        ctx.logError(`VK auth: ${vkToken}`);
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain('a1b2c3d4e5');
        expect(msg).toContain('vk1.a.***');
    });

    it('маскирует Telegram-токен без префикса bot (как он лежит в .env)', () => {
        // regBot требует литерального "bot", поэтому ловил токен только внутри URL API.
        // Голый токен из конфигурации уходил в лог в открытом виде.
        const secret = 'AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsawX'; // ровно 35 символов
        ctx.logError(`TELEGRAM_TOKEN=7123456789:${secret}`);
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain(secret);
        expect(msg).toContain('***');
    });

    it('маскирует Viber-токен (~46 hex, короче прежнего порога 64)', () => {
        const viberToken = '45b3f26e91c046a8b2b3a1d0f5e6c7d8a9b0c1d2e3f4a5b';
        ctx.logError(`Viber auth: ${viberToken}`);
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain(viberToken.slice(5));
        expect(msg).toContain('***');
    });

    it('маскирует MAX-токен (UUID с дефисами)', () => {
        const maxToken = '550e8400-e29b-41d4-a716-446655440000';
        ctx.logError(`MAX auth: ${maxToken}`);
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain('446655440000');
        expect(msg).toContain('***');
    });

    it('маскирует Яндекс OAuth-токен (y0_A...)', () => {
        const oauth = 'y0_AgAAAAAB6f3fTCDhb5p8iYz8iZy8AAAAAAAAAA';
        ctx.logError(`Alisa OAuth: ${oauth}`);
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain('TCDhb5p8');
        expect(msg).toContain('***');
    });

    it('маскирует access_token в нормальном JSON (прежде regVk2 требовал второе двоеточие и не срабатывал)', () => {
        const json = '{"access_token": "vk1.a.abcdefgh12345678", "v": "5.199"}';
        ctx.logError(`Ответ API: ${json}`);
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain('abcdefgh12345678');
        // Ключ остался, значение замаскировано (пробел после двоеточия не сохраняется)
        expect(msg).toMatch(/"access_token":?\s*"?\*\*\*"?/);
    });

    it('маскирует Api-Key Яндекс SpeechKit (32 hex — ниже порога regToken2)', () => {
        const apiKey = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'; // ровно 32 hex
        ctx.logError(`SpeechKit: ${apiKey}`);
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain('a1b2c3d4');
        expect(msg).toContain('***');
    });

    it('маскирует password/pass в тексте лога (JSON-строка), не только в meta', () => {
        // Конфигурация БД печатается в лог именно текстом — "pass":"..." в строке,
        // а не как объект meta. Раньше SECRET_KEY_PATTERN работал только в #maskUnknown.
        ctx.logError('cfg: {"password":"hunter2secret","pass":"qwerty123"}');
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain('hunter2secret');
        expect(msg).not.toContain('qwerty123');
        expect(msg).toMatch(/"?(password|pass)"?:?"?\*\*\*"?/);
    });

    it('маскирует пароль БД по ключу pass в meta (структура из JSDoc AppContext)', () => {
        ctx.logError('Не удалось подключиться к БД', {
            db: { host: 'localhost', user: 'admin', pass: 'S3cr3t-P4ssw0rd!' },
        });
        const [, meta] = errorSpy.mock.calls[0];
        expect(JSON.stringify(meta)).not.toContain('S3cr3t-P4ssw0rd');
        expect(meta.db.pass).toBe('***');
    });

    it('маскирует JWT (Сбер SmartApp, OAuth)', () => {
        const jwt =
            'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV';
        ctx.logError(`access: ${jwt}`);
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV');
        expect(msg).toContain('***');
    });

    it('маскирует значение meta по имени ключа, даже если формат неизвестен', () => {
        // Формат токена у платформы может измениться, имя поля — нет.
        ctx.logError('ошибка', {
            telegram_token: 'short-but-secret',
            nested: { apiKey: 'zzz', password: 'p@ss' },
            safeField: 'видно',
        });
        const [, meta] = errorSpy.mock.calls[0];
        const serialised = JSON.stringify(meta);
        expect(serialised).not.toContain('short-but-secret');
        expect(serialised).not.toContain('zzz');
        expect(serialised).not.toContain('p@ss');
        expect(serialised).toContain('видно');
    });

    it('маскирует контейнер под секретным ключом целиком (объекты и массивы)', () => {
        // Раньше маскировка по имени ключа срабатывала только для string/number,
        // и { tokens: { telegram: '...' } } утекало в meta логгера как есть.
        ctx.logError('ошибка', {
            tokens: { telegram: 'plain-secret-value', jwt: 'another-secret-value' },
            passwords: ['hunter2-secret'],
            auth: { credential: { login: 'user', secret: 'deep-secret' } },
            safeField: 'видно',
        });
        const [, meta] = errorSpy.mock.calls[0];
        const serialised = JSON.stringify(meta);
        expect(serialised).not.toContain('plain-secret-value');
        expect(serialised).not.toContain('another-secret-value');
        expect(serialised).not.toContain('hunter2-secret');
        expect(serialised).not.toContain('deep-secret');
        expect(serialised).toContain('видно');
    });

    it('маскирует значения полей api_key / vk_secret_key / oauth / private_key (без кавычек)', () => {
        // Ключи без кавычек находит regVk2 (см. src/core/AppContext.ts PATTERNS).
        ctx.logError(
            'payload: api_key:"secretValue12345" client_secret:"abcdef123456789" private_key:"rsaKeyData999"',
        );
        const [msg] = errorSpy.mock.calls[0];
        // Ни один из секретов не должен раскрыться
        expect(msg).not.toContain('secretValue12345');
        expect(msg).not.toContain('abcdef123456789');
        expect(msg).not.toContain('rsaKeyData999');
        // Ключи обязаны остаться видимыми (это позволяет понять контекст)
        expect(msg).toContain('api_key:"***"');
        expect(msg).toContain('client_secret:"***"');
        expect(msg).toContain('private_key:"***"');
    });

    it('маскирует значения секретных полей в JSON с кавычками у ключей', () => {
        ctx.logError(
            'payload: {"api_key": "secretValue12345", "client_secret": "abcdef123456789"}',
        );
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain('secretValue12345');
        expect(msg).not.toContain('abcdef123456789');
        expect(msg).toContain('"api_key":"***"');
    });

    it('маскирует длинную произвольную строку в кавычках (regToken: 30-256 символов)', () => {
        const opaque = 'X'.repeat(50);
        ctx.logError(`payload: "${opaque}"`);
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain(opaque);
        expect(msg).toContain('"***"');
    });

    it('маскирует длинную hex-строку без кавычек (regToken2: 64+ символа)', () => {
        const hex64 = 'abcdef0123'.repeat(7); // 70 символов hex-подобных
        ctx.logError(`request id: ${hex64}`);
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).not.toContain(hex64);
        expect(msg).toContain('***');
    });

    // ---------------------------------------------
    // Границы: когда маскировка не должна срабатывать
    // ---------------------------------------------

    it('не маскирует короткие токены < 30 символов (не задетектированы как секреты)', () => {
        ctx.logError('user_id="short"');
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).toContain('"short"');
    });

    it('пустое сообщение логируется как есть', () => {
        ctx.logError('');
        expect(errorSpy).toHaveBeenCalledWith('', undefined);
    });

    // ---------------------------------------------
    // Рекурсивная обработка meta (#maskUnknown)
    // ---------------------------------------------

    it('маскирует секреты во вложенных полях meta (nested objects)', () => {
        const tgToken = 'bot1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        ctx.logError('DB error', {
            request: {
                headers: {
                    Authorization: `Bearer ${tgToken}`,
                },
            },
        });
        expect(errorSpy).toHaveBeenCalledTimes(1);
        const [, meta] = errorSpy.mock.calls[0];
        expect(meta).toBeDefined();
        // Проверяем, что токен не утечёт в сериализации
        const serialised = JSON.stringify(meta);
        expect(serialised).not.toContain('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        // Поле Authorization маскируется целиком по имени ключа.
        expect(serialised).toContain('***');
    });

    it('маскирует секреты в meta внутри массивов', () => {
        const vkToken = 'vk1a' + 'a1'.repeat(40).slice(0, 79);
        ctx.logError('errors batch', {
            errors: [`failure 1: ${vkToken}`, 'failure 2: no secrets'],
        });
        const [, meta] = errorSpy.mock.calls[0];
        const serialised = JSON.stringify(meta);
        expect(serialised).not.toContain(vkToken.slice(10));
        expect(serialised).toContain('***');
        expect(serialised).toContain('failure 2: no secrets');
    });

    it('массив meta: один и тот же объект в двух местах НЕ помечается как [Circular] (stack-семантика seen)', () => {
        // regToken2: \b[A-Za-z0-9]{64,256}\b — от 64 символов
        const shared = { requestId: 'a'.repeat(64) };
        ctx.logError('dup references', {
            first: shared,
            second: shared,
        });
        const [, meta] = errorSpy.mock.calls[0] as [
            unknown,
            { first: { requestId: string }; second: { requestId: string } },
        ];
        // Оба поля должны быть одинаково замаскированы, а не заменены на '[Circular]'
        expect(meta.first).toEqual({ requestId: '***' });
        expect(meta.second).toEqual({ requestId: '***' });
    });

    it('заменяет реальные циклические ссылки на "[Circular]"', () => {
        const circular: Record<string, unknown> = { self: null };
        circular.self = circular;
        ctx.logError('circular data', { data: circular });
        const [, meta] = errorSpy.mock.calls[0] as [unknown, { data: { self: string } }];
        expect(meta.data.self).toBe('[Circular]');
    });

    it('маскирует секреты в Error.message и Error.stack внутри meta', () => {
        const tgToken = 'bot1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        const err = new Error(`Failed to fetch: token=${tgToken} expired`);
        err.stack = `Error: ${tgToken}\n    at Object.<anonymous> (/src/test.ts:1:1)`;
        ctx.logError('network fail', { error: err });
        const [, meta] = errorSpy.mock.calls[0] as [
            unknown,
            { error: { name: string; message: string; stack?: string } },
        ];
        expect(meta.error.name).toBe('Error');
        expect(meta.error.message).toContain('bot***');
        expect(meta.error.message).not.toContain('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        expect(meta.error.stack).toBeDefined();
        expect(meta.error.stack).not.toContain('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    });

    it('сериализует Date в ISO-строку внутри meta', () => {
        const when = new Date('2026-08-10T12:34:56.000Z');
        ctx.logError('event', { at: when });
        const [, meta] = errorSpy.mock.calls[0] as [unknown, { at: string }];
        expect(meta.at).toBe('2026-08-10T12:34:56.000Z');
        expect(typeof meta.at).toBe('string');
    });

    // ---------------------------------------------
    // logWarn — те же гарантии, что и у logError
    // ---------------------------------------------

    it('максирует токены и в logWarn', () => {
        const tgToken = 'bot1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        ctx.logWarn(`подозрительный токен: ${tgToken}`);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        const [msg] = warnSpy.mock.calls[0];
        expect(msg).not.toContain('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        expect(msg).toContain('bot***');
    });

    // ---------------------------------------------
    // Opt-out через maskSecrets: false
    // ---------------------------------------------

    it('при маскировке выключенной (maskSecrets: false) токены попадают в лог как есть', () => {
        ctx.setLogger({
            error: errorSpy,
            maskSecrets: false,
        } as ILogger);
        const tgToken = 'bot1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        ctx.logError(`sensitive ${tgToken}`);
        const [msg] = errorSpy.mock.calls[0];
        // Явно подтверждаем поведение opt-out: секрет НЕ маскируется
        expect(msg).toContain(tgToken);
        expect(msg).not.toContain('bot***');
    });

    it('при маскировке выключенной (maskSecrets: false) meta тоже не маскируется', () => {
        ctx.setLogger({
            error: errorSpy,
            maskSecrets: false,
        } as ILogger);
        const vkToken = 'vk1a' + 'a1'.repeat(40).slice(0, 79);
        ctx.logError('auth', { vk: vkToken });
        const [, meta] = errorSpy.mock.calls[0] as [unknown, { vk: string }];
        expect(meta.vk).toBe(vkToken);
    });

    // ---------------------------------------------
    // Смешанные кейсы / безопасность
    // ---------------------------------------------

    it('несколько разных секретов в одном сообщении маскируются все', () => {
        const tgToken = 'bot1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        const vkToken = 'vk1a' + 'a1'.repeat(40).slice(0, 79);
        const opaque = 'X'.repeat(50);
        ctx.logError(`tg=${tgToken} vk=${vkToken} token="${opaque}"`);
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).toContain('bot***');
        expect(msg).toContain('***');
        expect(msg).toContain('"***"');
        expect(msg).not.toContain(tgToken);
        expect(msg).not.toContain(vkToken);
        expect(msg).not.toContain(opaque);
    });

    it('не ломает лог без секретов', () => {
        ctx.logError('обычная ошибка: БД недоступна, повторим позже');
        const [msg] = errorSpy.mock.calls[0];
        expect(msg).toBe('обычная ошибка: БД недоступна, повторим позже');
    });

    // ---------------------------------------------
    // logMetric: label идёт в кастомный логгер и обязан маскироваться
    // ---------------------------------------------

    it('logMetric маскирует токен в label (url запроса Telegram)', () => {
        const metricSpy = jest.fn();
        ctx.setLogger({ error: errorSpy, warn: warnSpy, metric: metricSpy } as ILogger);

        const tgToken = 'bot1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        // Request.#run() кладёт в метрику полный URL, который содержит токен бота
        ctx.logMetric('request', 12.5, { url: `https://api.telegram.org/${tgToken}/sendMessage` });

        expect(metricSpy).toHaveBeenCalledTimes(1);
        const [, , label] = metricSpy.mock.calls[0] as [string, unknown, { url: string }];
        expect(label.url).not.toContain('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        expect(label.url).toContain('bot***');
    });

    it('logMetric оставляет label без изменений, если секретов нет', () => {
        const metricSpy = jest.fn();
        ctx.setLogger({ error: errorSpy, warn: warnSpy, metric: metricSpy } as ILogger);

        ctx.logMetric('db_select', 3.5, { tableName: 'UsersData' });

        const [, , label] = metricSpy.mock.calls[0] as [string, unknown, { tableName: string }];
        expect(label.tableName).toBe('UsersData');
    });
});
