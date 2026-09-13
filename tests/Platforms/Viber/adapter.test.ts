import { T_VIBER, ViberAdapter, IViberContent } from '../../../src/plugins';
import { AppContext, BotController, BaseBotController } from '../../../src/index';
import { ViberRequest } from '../../../src/plugins/platforms/API';
import { createHmac } from 'node:crypto';

jest.mock('../../../src/plugins/platforms/API/ViberRequest');

// Тип-заглушка декларативная — присвоение нужно для TS, чтобы TS понимал что мок класса
// Само значение не используется напрямую, но мок фиксируется через jest.mock
const _MockedViberRequest = ViberRequest as jest.MockedClass<typeof ViberRequest>;

function makeMessageEvent(overrides?: Partial<IViberContent>): IViberContent {
    return {
        event: 'message',
        timestamp: Date.now(),
        message_token: 123456789,
        sender: {
            id: 'viber-user-1',
            name: 'Иван Петров',
            api_version: 8,
        },
        message: {
            type: 'text',
            text: 'Привет',
        },
        ...overrides,
    };
}

function makeConversationStarted(overrides?: Partial<IViberContent>): IViberContent {
    return {
        event: 'conversation_started',
        timestamp: Date.now(),
        message_token: undefined as unknown as number,
        user: {
            id: 'viber-user-1',
            name: 'Иван Петров',
            api_version: 8,
        },
        sender: {
            id: 'viber-user-1',
            name: 'Иван Петров',
            api_version: 8,
        },
        ...overrides,
    } as IViberContent;
}

function makeSubscribed(overrides?: Partial<IViberContent>): IViberContent {
    return {
        event: 'subscribed',
        timestamp: Date.now(),
        message_token: undefined as unknown as number,
        user: {
            id: 'viber-user-2',
            name: 'Пётр Иванов',
            api_version: 8,
        },
        ...overrides,
    } as IViberContent;
}

function makeUnsubscribed(overrides?: Partial<IViberContent>): IViberContent {
    return {
        event: 'unsubscribed',
        timestamp: Date.now(),
        message_token: undefined as unknown as number,
        user: {
            id: 'viber-user-2',
            name: 'Пётр Иванов',
            api_version: 8,
        },
        ...overrides,
    } as IViberContent;
}

function makeDelivered(overrides?: Partial<IViberContent>): IViberContent {
    return {
        event: 'delivered',
        timestamp: Date.now(),
        message_token: 987654321,
        ...overrides,
    } as IViberContent;
}

function makeSeen(overrides?: Partial<IViberContent>): IViberContent {
    return {
        event: 'seen',
        timestamp: Date.now(),
        message_token: 987654321,
        ...overrides,
    } as IViberContent;
}

function makeFailed(overrides?: Partial<IViberContent>): IViberContent {
    return {
        event: 'failed',
        timestamp: Date.now(),
        message_token: 987654321,
        ...overrides,
    } as IViberContent;
}

describe('ViberAdapter', () => {
    let appContext: AppContext;
    let controller: BotController;
    let adapter: ViberAdapter;

    beforeEach(() => {
        appContext = new AppContext();
        appContext.setLogger({ log: jest.fn(), error: jest.fn(), warn: jest.fn() });
        appContext.appConfig.tokens[T_VIBER] = { token: 'test-viber-token' };
        controller = new BaseBotController(appContext);
        adapter = new ViberAdapter();
        adapter.init(appContext);
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // =============================================
    // isPlatformOnQuery
    // =============================================
    describe('isPlatformOnQuery', () => {
        it('определяет запрос Viber по заголовку x-viber-content-signature', () => {
            const query = makeMessageEvent();
            expect(adapter.isPlatformOnQuery(query, { 'x-viber-content-signature': 'abc' })).toBe(
                true,
            );
        });

        it('определяет запрос Viber по полям event и timestamp', () => {
            const query = makeMessageEvent();
            expect(adapter.isPlatformOnQuery(query)).toBe(true);
        });

        it('не требует message_token для детекции (conversation_started без поля)', () => {
            const query = makeConversationStarted();
            delete (query as Record<string, unknown>).message_token;
            expect(adapter.isPlatformOnQuery(query)).toBe(true);
        });

        it('возвращает false при пустом query', () => {
            expect(adapter.isPlatformOnQuery(null as unknown as IViberContent)).toBe(false);
        });

        it('возвращает false при отсутствии event', () => {
            const query = { timestamp: Date.now() } as IViberContent;
            expect(adapter.isPlatformOnQuery(query)).toBe(false);
        });

        it('возвращает false при отсутствии timestamp', () => {
            const query = { event: 'message' } as IViberContent;
            expect(adapter.isPlatformOnQuery(query)).toBe(false);
        });
    });

    // =============================================
    // setQueryData
    // =============================================
    describe('setQueryData', () => {
        it('обрабатывает текстовое сообщение (event: message)', async () => {
            const query = makeMessageEvent({
                message: { type: 'text', text: 'Привет, бот!' },
                sender: { id: 'user-123', name: 'Тест Тестов', api_version: 8 },
            });

            const result = await adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.userId).toBe('user-123');
            expect(controller.userCommand).toBe('привет, бот!');
            expect(controller.originalUserCommand).toBe('Привет, бот!');
            expect(controller.messageId).toBe(123456789);
        });

        it('обрабатывает сообщение с пустым текстом', async () => {
            const query = makeMessageEvent({
                message: { type: 'text', text: '' },
            });

            const result = await adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.userCommand).toBe('');
            expect(controller.originalUserCommand).toBe('');
        });

        it('сохраняет userId и NLU для conversation_started', async () => {
            const query = makeConversationStarted({
                user: { id: 'user-cs', name: 'Новый Пользователь', api_version: 7 },
            });

            const result = await adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.userId).toBe('user-cs');
            expect(controller.userCommand).toBe('');
            expect(controller.messageId).toBe(0);
        });

        it('обрабатывает subscribed с логированием', async () => {
            const logSpy = jest.spyOn(appContext, 'log');
            const query = makeSubscribed({
                user: { id: 'user-sub', name: 'Подписчик', api_version: 8 },
            });

            const result = await adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.userId).toBe('user-sub');
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('подписался на бота'));
        });

        it('обрабатывает unsubscribed с логированием', async () => {
            const logSpy = jest.spyOn(appContext, 'log');
            const query = makeUnsubscribed({
                user: { id: 'user-unsub', name: 'Бывший подписчик', api_version: 8 },
            });

            const result = await adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.userId).toBe('user-unsub');
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('отписался от бота'));
        });

        it('подтверждает получение delivered без бизнес-логики', async () => {
            const result = await adapter.setQueryData(makeDelivered(), controller);
            expect(result).toBe(true);
        });

        it('подтверждает получение seen без бизнес-логики', async () => {
            const result = await adapter.setQueryData(makeSeen(), controller);
            expect(result).toBe(true);
        });

        it('подтверждает получение failed без бизнес-логики', async () => {
            const result = await adapter.setQueryData(makeFailed(), controller);
            expect(result).toBe(true);
        });

        it('возвращает false при пустом query', async () => {
            const result = await adapter.setQueryData(null as unknown as IViberContent, controller);
            expect(result).toBe(false);
        });

        it('возвращает false при отсутствии appContext', async () => {
            const adapterNoCtx = new ViberAdapter();
            const result = await adapterNoCtx.setQueryData(makeMessageEvent(), controller);
            expect(result).toBe(false);
        });

        it('обрабатывает не-текстовое сообщение: picture', async () => {
            const query = makeMessageEvent({
                message: {
                    type: 'picture',
                    text: '',
                    media: 'https://example.com/photo.jpg',
                },
            });

            const result = await adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.userCommand).toBe('');
            expect((controller.platformOptions as Record<string, unknown>).viberMessageType).toBe(
                'picture',
            );
            expect(controller.payload).toEqual({
                media: 'https://example.com/photo.jpg',
            });
        });

        it('обрабатывает не-текстовое сообщение: location', async () => {
            const location = { lat: 55.75, lon: 37.62 };
            const query = makeMessageEvent({
                message: {
                    type: 'location',
                    text: '',
                    location,
                },
            });

            const result = await adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect((controller.platformOptions as Record<string, unknown>).viberMessageType).toBe(
                'location',
            );
            expect(controller.payload).toEqual({ location });
        });

        it('обрабатывает не-текстовое сообщение: contact', async () => {
            const contact = { name: 'Иван', phone_number: '+79990000000', avatar: '' };
            const query = makeMessageEvent({
                message: {
                    type: 'contact',
                    text: '',
                    contact,
                },
            });

            const result = await adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.payload).toEqual({ contact });
        });

        it('обрабатывает не-текстовое сообщение: sticker', async () => {
            const query = makeMessageEvent({
                message: {
                    type: 'sticker',
                    text: '',
                    sticker_id: 12345,
                },
            });

            const result = await adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect((controller.platformOptions as Record<string, unknown>).viberMessageType).toBe(
                'sticker',
            );
            expect(controller.payload).toEqual({ sticker_id: 12345 });
        });

        it('не сохраняет payload для не-текстового сообщения без дополнительных данных', async () => {
            const query = makeMessageEvent({
                message: {
                    type: 'picture',
                    text: '',
                },
            });

            const result = await adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect((controller.platformOptions as Record<string, unknown>).viberMessageType).toBe(
                'picture',
            );
            expect(controller.payload).toBeNull();
        });

        it('не трогает payload для текстового сообщения', async () => {
            const result = await adapter.setQueryData(makeMessageEvent(), controller);
            expect(result).toBe(true);
            expect(controller.payload).toBeNull();
            expect(
                (controller.platformOptions as Record<string, unknown>).viberMessageType,
            ).toBeUndefined();
        });

        it('заполняет NLU из полного имени пользователя', async () => {
            const query = makeMessageEvent({
                sender: { id: 'user-nlu', name: 'Иван Петрович Сидоров', api_version: 8 },
            });

            await adapter.setQueryData(query, controller);

            expect(controller.nlu.getUserName()).toEqual({
                username: 'Иван',
                first_name: 'Иван Петрович',
                last_name: 'Сидоров',
            });
        });

        it('заполняет NLU из одиночного имени', async () => {
            const query = makeMessageEvent({
                sender: { id: 'user-nlu', name: 'Простоник', api_version: 8 },
            });

            await adapter.setQueryData(query, controller);

            expect(controller.nlu.getUserName()).toEqual({
                username: 'Простоник',
                first_name: null,
                last_name: null,
            });
        });

        it('устанавливает apiVersion из сендера', async () => {
            const query = makeMessageEvent({
                sender: { id: 'user-api', name: 'Тест', api_version: 10 },
            });

            await adapter.setQueryData(query, controller);

            expect(controller.platformOptions.apiVersion).toBe(10);
        });

        it('использует VIBER_DEFAULT_API_VERSION при отсутствии api_version в запросе', async () => {
            const query = makeMessageEvent({
                sender: { id: 'user-api', name: 'Тест' } as IViberContent['sender'],
            });

            await adapter.setQueryData(query, controller);

            expect(controller.platformOptions.apiVersion).toBe(7);
        });
    });

    // =============================================
    // getQueryExample
    // =============================================
    describe('getQueryExample', () => {
        it('генерирует корректный пример запроса с timestamp', () => {
            const example = adapter.getQueryExample('тест', 'user-1');

            expect(example).toMatchObject({
                event: 'message',
                message: { text: 'тест', type: 'text' },
                sender: { id: 'user-1', name: 'local_name', api_version: 8 },
            });
            expect(example.timestamp).toBeGreaterThan(0);
            expect(example.message_token).toBeGreaterThan(0);
        });
    });

    // =============================================
    // isVoice / platformName / limit / signatureName
    // =============================================
    describe('свойства адаптера', () => {
        it('имеет корректное имя платформы', () => {
            expect(adapter.platformName).toBe(T_VIBER);
        });

        it('не является голосовой платформой', () => {
            expect(ViberAdapter.isVoice()).toBe(false);
            expect(adapter.isVoice).toBe(false);
        });

        it('имеет лимит 30 запросов в секунду', () => {
            expect(adapter.limit).toBe(30);
        });

        it('имеет корректное имя заголовка подписи', () => {
            expect(adapter.signatureName).toBe('x-viber-content-signature');
        });
    });

    // =============================================
    // init
    // =============================================
    describe('init', () => {
        it('сохраняет токен в appConfig', () => {
            const customAdapter = new ViberAdapter('custom-token');
            customAdapter.init(appContext);

            expect(appContext.appConfig.tokens.viber.token).toBe('custom-token');
        });

        it('сохраняет viber_api_version в appConfig', () => {
            const customAdapter = new ViberAdapter('token', {
                viber_api_version: '10',
            } as Record<string, unknown>);
            customAdapter.init(appContext);

            expect(appContext.appConfig.tokens.viber.api_version).toBe('10');
        });

        it('сохраняет viber_sender в appConfig', () => {
            const sender = { name: 'MyBot', avatar: 'https://example.com/avatar.png' };
            const customAdapter = new ViberAdapter('token', {
                viber_sender: sender,
            } as Record<string, unknown>);
            customAdapter.init(appContext);

            expect(appContext.appConfig.tokens.viber.sender).toEqual(sender);
        });
    });

    // =============================================
    // isCorrectQuery — проверка HMAC-SHA256 подписи webhook
    // =============================================
    describe('isCorrectQuery (HMAC-SHA256)', () => {
        // Вспомогательная функция для вычисления правильной подписи.
        // Viber шлёт x-viber-content-signature = hex(HMAC_SHA256(auth_token, raw_body))
        // см. src/plugins/platforms/Base/Base.ts isCorrectQuery.
        const sign = (token: string, body: string): string => {
            return createHmac('sha256', token).update(body).digest('hex');
        };

        it('возвращает true при корректной HMAC-подписи', () => {
            const token = appContext.appConfig.tokens[T_VIBER].token as string;
            const query = makeMessageEvent();
            const rawBody = JSON.stringify(query);
            const signature = sign(token, rawBody);

            expect(adapter.isCorrectQuery(query, { 'x-viber-content-signature': signature })).toBe(
                true,
            );
        });

        it('возвращает true при строковом query (raw body)', () => {
            const token = appContext.appConfig.tokens[T_VIBER].token as string;
            const rawBody = JSON.stringify(makeMessageEvent());
            const signature = sign(token, rawBody);

            expect(
                adapter.isCorrectQuery(rawBody, { 'x-viber-content-signature': signature }),
            ).toBe(true);
        });

        it('возвращает false при отсутствии заголовка x-viber-content-signature', () => {
            const query = makeMessageEvent();
            expect(adapter.isCorrectQuery(query)).toBe(false);
            expect(adapter.isCorrectQuery(query, {})).toBe(false);
        });

        it('возвращает false при неверной подписи', () => {
            const query = makeMessageEvent();
            const wrongSig = '0'.repeat(64); // hex, но не тот
            expect(adapter.isCorrectQuery(query, { 'x-viber-content-signature': wrongSig })).toBe(
                false,
            );
        });

        it('возвращает false, если тело изменено после подписи (tampering)', () => {
            const token = appContext.appConfig.tokens[T_VIBER].token as string;
            const original = makeMessageEvent();
            const originalBody = JSON.stringify(original);
            const signature = sign(token, originalBody);
            // Атакующий модифицировал тело после подписи (user id подменил)
            const forged = { ...original, sender: { ...original.sender!, id: 'attacker' } };

            expect(adapter.isCorrectQuery(forged, { 'x-viber-content-signature': signature })).toBe(
                false,
            );
        });

        it('возвращает false при подписи, сделанной другим токеном', () => {
            const query = makeMessageEvent();
            const rawBody = JSON.stringify(query);
            const otherSig = sign('some-other-token', rawBody);

            expect(adapter.isCorrectQuery(query, { 'x-viber-content-signature': otherSig })).toBe(
                false,
            );
        });

        it('возвращает false при подписи некорректной длины (timingSafeEqual бросает)', () => {
            const query = makeMessageEvent();
            // Слишком короткая hex-строка — Buffer.from даст буфер другой длины,
            // и timingSafeEqual выбросит; isCorrectQuery должен вернуть false, а не упасть.
            expect(adapter.isCorrectQuery(query, { 'x-viber-content-signature': 'abc' })).toBe(
                false,
            );
        });

        it('возвращает true если токен не задан (opt-out от проверки)', () => {
            delete appContext.appConfig.tokens[T_VIBER].token;
            const query = makeMessageEvent();
            // По семантике Base.isCorrectQuery — проверка skip-able, если токен не задан
            expect(adapter.isCorrectQuery(query)).toBe(true);
        });
    });
});
