import { AppContext, BotController } from '../../src';
import {
    AlisaAdapter,
    MaxAdapter,
    MaxButton,
    MaxRequest,
    MarusiaAdapter,
    TelegramAdapter,
    TelegramRequest,
    T_ALISA,
    T_MAX_APP,
    T_MARUSIA,
    T_TELEGRAM,
    T_VIBER,
    T_VK,
    ViberAdapter,
    ViberRequest,
    VkAdapter,
    VkRequest,
} from '../../src/plugins';

class TestController extends BotController {
    action(): void {
        return;
    }
}

function createContext(): AppContext {
    const context = new AppContext();
    context.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
    return context;
}

describe('Контракты платформ', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('ограничивает state Алисы одним килобайтом', async () => {
        const context = createContext();
        context.appConfig.tokens[T_ALISA] = {};
        const adapter = new AlisaAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        controller.text = 'Ответ';
        controller.platformOptions.stateName = 'session_state';

        const content = await adapter.getContent(controller, { value: 'x'.repeat(1_100) });

        expect(content).not.toHaveProperty('session_state');
    });

    it('не падает и не очищает state Алисы при циклических данных', async () => {
        const context = createContext();
        context.appConfig.tokens[T_ALISA] = {};
        const adapter = new AlisaAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        controller.text = 'Ответ';
        controller.platformOptions.stateName = 'session_state';
        const state: Record<string, unknown> = {};
        state.self = state;

        const content = await adapter.getContent(controller, state);

        expect(content).not.toHaveProperty('session_state');
    });

    it('сохраняет намеренно пустой ответ Алисы без подстановки и исключения', async () => {
        const context = createContext();
        context.appConfig.tokens[T_ALISA] = {};
        const adapter = new AlisaAdapter();
        adapter.init(context);
        const logWarn = jest.spyOn(context, 'logWarn').mockImplementation(() => {});

        await expect(adapter.getContent(new TestController(context))).resolves.toEqual(
            expect.objectContaining({
                response: expect.objectContaining({ text: '', tts: '' }),
            }),
        );
        expect(logWarn).toHaveBeenCalledWith(expect.stringContaining('text и tts'));
    });

    it('разрешает пустой text Алисы, когда разработчик явно задал tts', async () => {
        const context = createContext();
        context.appConfig.tokens[T_ALISA] = {};
        const adapter = new AlisaAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        controller.tts = 'Явный голосовой ответ';

        const content = await adapter.getContent(controller);

        expect(content.response).toEqual(
            expect.objectContaining({ text: '', tts: 'Явный голосовой ответ' }),
        );
    });

    it('сохраняет пустой ответ Маруси без подстановки и исключения', async () => {
        const context = createContext();
        context.appConfig.tokens[T_MARUSIA] = {};
        const adapter = new MarusiaAdapter();
        adapter.init(context);
        const logWarn = jest.spyOn(context, 'logWarn').mockImplementation(() => {});

        await expect(adapter.getContent(new TestController(context))).resolves.toEqual(
            expect.objectContaining({
                response: expect.objectContaining({ text: '', tts: '' }),
            }),
        );
        expect(logWarn).toHaveBeenCalledWith(expect.stringContaining('response.text'));
    });

    it('не путает явный client_id Маруси с Алисой', () => {
        const context = createContext();
        const adapter = new AlisaAdapter();
        adapter.init(context);

        expect(
            adapter.isPlatformOnQuery({
                version: '1.0',
                meta: { client_id: 'MailRu-VoiceAssistant' },
                session: { application: { application_id: 'MixedCaseId' } },
                request: {},
            } as never),
        ).toBe(false);
    });

    it('отклоняет повреждённые запросы Алисы и Маруси без исключения', async () => {
        const context = createContext();
        const alisa = new AlisaAdapter();
        const marusia = new MarusiaAdapter();
        alisa.init(context);
        marusia.init(context);

        expect(
            alisa.setQueryData(
                { version: '1.0', request: {} } as never,
                new TestController(context),
            ),
        ).toBe(false);
        expect(
            marusia.setQueryData(
                { version: '1.0', session: {} } as never,
                new TestController(context),
            ),
        ).toBe(false);
    });

    it('сравнивает webhook-secret MAX как значение заголовка, а не HMAC', () => {
        const context = createContext();
        const adapter = new MaxAdapter('bot-token', { secret: 'webhook-secret' });
        adapter.init(context);

        expect(
            adapter.isCorrectQuery(
                { update_type: 'message_created', message: { body: {}, sender: {} } } as never,
                { 'x-max-bot-api-secret': 'webhook-secret' },
            ),
        ).toBe(true);
        expect(
            adapter.isCorrectQuery(
                { update_type: 'message_created', message: { body: {}, sender: {} } } as never,
                { 'x-max-bot-api-secret': 'other-secret' },
            ),
        ).toBe(false);
    });

    it('проверяет MAX webhook-secret, заданный в конфигурации приложения', () => {
        const context = createContext();
        context.appConfig.tokens[T_MAX_APP] = { webhookSecret: 'configured-secret' };
        const adapter = new MaxAdapter('bot-token');
        adapter.init(context);

        expect(
            adapter.isCorrectQuery(
                { update_type: 'message_created', message: { body: {}, sender: {} } } as never,
                { 'x-max-bot-api-secret': 'configured-secret' },
            ),
        ).toBe(true);
    });

    it('не определяет произвольный запрос как MAX только по постороннему заголовку', () => {
        const context = createContext();
        const adapter = new MaxAdapter('bot-token');
        adapter.init(context);

        expect(
            adapter.isPlatformOnQuery({ update_type: 'unknown' } as never, {
                'x-max-signature': 'untrusted',
            }),
        ).toBe(false);
    });

    it('формирует MAX-клавиатуру как массив строк', () => {
        expect(
            MaxButton.buttonProcessing([
                { title: 'Первая', type: null, payload: null, hide: false, options: {} },
                { title: 'Вторая', type: null, payload: null, hide: false, options: {} },
            ]),
        ).toEqual({
            buttons: [[{ type: 'message', text: 'Первая' }], [{ type: 'message', text: 'Вторая' }]],
        });
    });

    it('маппит MAX request_contact без недопустимых полей Telegram', () => {
        expect(
            MaxButton.buttonProcessing([
                {
                    title: 'Поделиться контактом',
                    type: null,
                    payload: 'contact',
                    hide: false,
                    options: { request_contact: true, color: 'primary' },
                },
            ]),
        ).toEqual({
            buttons: [[{ type: 'request_contact', text: 'Поделиться контактом' }]],
        });
    });

    it('отправляет MAX-сообщение с user_id в query-параметре', async () => {
        const context = createContext();
        context.appConfig.tokens[T_MAX_APP] = { token: 'max-token' };
        const request = new MaxRequest(context);
        const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
        context.httpClient = fetchMock;

        await request.messagesSend(42, 'Привет');

        expect(fetchMock).toHaveBeenCalledWith(
            'https://platform-api2.max.ru/messages?user_id=42',
            expect.objectContaining({
                body: JSON.stringify({ text: 'Привет' }),
                headers: { Authorization: 'max-token' },
            }),
        );
    });

    it('не пытается отправить Viber-сообщение для delivered event', async () => {
        const context = createContext();
        context.appConfig.tokens[T_VIBER] = { token: 'viber-token', sender: 'Bot' };
        const adapter = new ViberAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        const sendMessage = jest
            .spyOn(ViberRequest.prototype, 'sendMessage')
            .mockResolvedValue(null);

        await adapter.setQueryData({ event: 'delivered', timestamp: Date.now() }, controller);
        await adapter.getContent(controller);

        expect(sendMessage).not.toHaveBeenCalled();
    });

    it('не отправляет пустое текстовое сообщение Viber перед Rich Media карточкой', async () => {
        const context = createContext();
        context.appConfig.tokens[T_VIBER] = { token: 'viber-token', sender: 'Bot' };
        const adapter = new ViberAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        controller.userId = 'user-1';
        controller.card.addImage('https://example.com/card.jpg', 'Карточка');
        const sendMessage = jest
            .spyOn(ViberRequest.prototype, 'sendMessage')
            .mockResolvedValue(null);
        const richMedia = jest.spyOn(ViberRequest.prototype, 'richMedia').mockResolvedValue(null);

        await adapter.getContent(controller);

        expect(sendMessage).not.toHaveBeenCalled();
        expect(richMedia).toHaveBeenCalled();
    });

    it('не включает Telegram HTML parse_mode без явной настройки', async () => {
        const context = createContext();
        context.appConfig.tokens[T_TELEGRAM] = { token: 'telegram-token' };
        const adapter = new TelegramAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        controller.userId = 42;
        controller.text = 'Цена < 100';
        const sendMessage = jest.spyOn(TelegramRequest.prototype, 'sendMessage').mockResolvedValue({
            ok: true,
            result: null,
        });

        await adapter.getContent(controller);

        expect(sendMessage).toHaveBeenCalledWith(
            42,
            'Цена < 100',
            expect.not.objectContaining({ parse_mode: 'HTML' }),
        );
    });

    it('отвечает на Telegram inline-запрос методом answerInlineQuery', async () => {
        const context = createContext();
        context.appConfig.tokens[T_TELEGRAM] = { token: 'telegram-token' };
        const adapter = new TelegramAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        controller.text = 'Результат поиска';
        const answerInlineQuery = jest
            .spyOn(TelegramRequest.prototype, 'answerInlineQuery')
            .mockResolvedValue({ ok: true, result: null });

        await adapter.setQueryData(
            {
                update_id: 1,
                inline_query: { id: 'inline-query-id', from: { id: 42 }, query: 'поиск' },
            } as never,
            controller,
        );
        await adapter.getContent(controller);

        expect(answerInlineQuery).toHaveBeenCalledWith(
            'inline-query-id',
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'article',
                    input_message_content: { message_text: 'Результат поиска' },
                }),
            ]),
        );
    });

    it('подтверждает callback-кнопку MAX методом answers', async () => {
        const context = createContext();
        context.appConfig.tokens[T_MAX_APP] = { token: 'max-token' };
        const adapter = new MaxAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        controller.text = 'Подтверждено';
        const answerCallback = jest
            .spyOn(MaxRequest.prototype, 'answerCallback')
            .mockResolvedValue({});

        await adapter.setQueryData(
            {
                update_type: 'message_callback',
                callback: { callback_id: 'callback-id', payload: 'confirm', user: { user_id: 42 } },
            } as never,
            controller,
        );
        await adapter.getContent(controller);

        expect(answerCallback).toHaveBeenCalledWith('callback-id', 'Подтверждено', {}, 42);
    });

    it('распознаёт и безопасно подтверждает служебные MAX webhook-события', async () => {
        const context = createContext();
        context.appConfig.tokens[T_MAX_APP] = { token: 'max-token' };
        const adapter = new MaxAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        const event = { update_type: 'bot_added', timestamp: Date.now(), chat_id: 42 } as const;
        const sendMessage = jest.spyOn(MaxRequest.prototype, 'messagesSend');

        expect(adapter.isPlatformOnQuery(event)).toBe(true);
        await expect(adapter.setQueryData(event, controller)).resolves.toBe(true);
        await adapter.getContent(controller);

        expect(controller.skipAutoReply).toBe(true);
        expect(sendMessage).not.toHaveBeenCalled();
    });

    it('не падает на MAX-сообщении без body и sender', async () => {
        const context = createContext();
        context.appConfig.tokens[T_MAX_APP] = { token: 'max-token' };
        const adapter = new MaxAdapter();
        adapter.init(context);
        const controller = new TestController(context);

        await expect(
            adapter.setQueryData(
                {
                    update_type: 'message_created',
                    message: { body: null, recipient: { chat_id: 42, chat_type: 'chat' } },
                } as never,
                controller,
            ),
        ).resolves.toBe(true);
        expect(controller.userCommand).toBe('');
        expect(controller.messageId).toBe(0);
        expect(controller.userId).toBe(0);
    });

    it('отвечает в VK-беседу по peer_id, а не в личные сообщения автора', async () => {
        const context = createContext();
        context.appConfig.tokens[T_VK] = { token: 'vk-token' };
        const adapter = new VkAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        const sendMessage = jest.spyOn(VkRequest.prototype, 'messagesSend').mockResolvedValue({});

        await adapter.setQueryData(
            {
                type: 'message_new',
                group_id: '1',
                object: {
                    message: { from_id: 42, peer_id: 2_000_000_001, id: 10, text: 'привет' },
                    payload: {},
                    peer_id: 2_000_000_001,
                },
            },
            controller,
        );
        await adapter.getContent(controller);

        expect(sendMessage).toHaveBeenCalledWith(
            2_000_000_001,
            expect.any(String),
            expect.any(Object),
        );
    });
});
