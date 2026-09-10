/**
 * Тесты API-фасада controller.api и webhook-reply Telegram.
 */
global.fetch = jest.fn();

// Файловая система замокана: upload-операции MAX/VK читают attach-файл с диска.
jest.mock('../../src/utils/standard/util', () => ({
    ...jest.requireActual('../../src/utils/standard/util'),
    isFile: jest.fn().mockResolvedValue(true),
    // fread возвращает конверт {success, data}: мок имитирует успешное чтение.
    fread: jest.fn().mockResolvedValue({
        success: true,
        data: new Uint8Array([1, 2, 3]),
    }),
}));
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn().mockReturnValue({ data: new Uint8Array([1, 2, 3]) }),
}));
jest.mock('fs/promises', () => ({
    ...jest.requireActual('fs/promises'),
    readFile: jest.fn().mockResolvedValue({ data: new Uint8Array([1, 2, 3]) }),
    stat: jest.fn().mockResolvedValue({ isFile: () => true, isDirectory: () => false }),
}));

import { AppContext, BotController, type IControllerApi } from '../../src';
import { BotTest } from '../../src/test';
import {
    T_TELEGRAM,
    T_MAX_APP,
    T_VK,
    AlisaAdapter,
    TelegramAdapter,
    MaxAdapter,
    VkAdapter,
    ViberAdapter,
    BasePlatformAdapter,
} from '../../src/plugins';
import { makePlatformApi } from '../../src/plugins/platforms/Base/apiFacade';
import { makeViberApi } from '../../src/plugins/platforms/Viber/apiFacade';

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

describe('makePlatformApi: выбор фасада по платформе', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
    });

    it('возвращает фасад для чат-платформ и null для голосовых', () => {
        const context = createContext();

        const tg = new TestController(context);
        tg.appType = 'telegram';
        expect(makePlatformApi(tg)).not.toBeNull();

        const vk = new TestController(context);
        vk.appType = 'vk';
        expect(makePlatformApi(vk)).not.toBeNull();

        const max = new TestController(context);
        max.appType = 'max_app';
        expect(makePlatformApi(max)).not.toBeNull();

        const alisa = new TestController(context);
        alisa.appType = 'alisa';
        expect(makePlatformApi(alisa)).toBeNull();

        const unknown = new TestController(context);
        unknown.appType = null;
        expect(makePlatformApi(unknown)).toBeNull();
    });

    it('фасад Telegram отправляет фото через sendPhoto (chat_id из запроса)', async () => {
        const context = createContext();
        context.appConfig.tokens[T_TELEGRAM] = { token: 'tg-token' };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: { message_id: 1 } }),
        });
        const controller = new TestController(context);
        controller.appType = 'telegram';
        controller.userId = 42;
        const api = makePlatformApi(controller) as IControllerApi;
        const result = await api.sendPhoto('photo.jpg', { caption: 'подпись' });
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('sendPhoto'),
            expect.objectContaining({ method: 'POST' }),
        );
        // TelegramRequest.call() возвращает конверт {ok, result} целиком.
        expect(result).toEqual({ ok: true, result: { message_id: 1 } });
    });

    it('фасад Telegram: answerCallback без нажатой кнопки возвращает null', async () => {
        const context = createContext();
        context.appConfig.tokens[T_TELEGRAM] = { token: 'tg-token' };
        const controller = new TestController(context);
        controller.appType = 'telegram';
        const api = makePlatformApi(controller) as IControllerApi;
        const result = await api.answerCallback('готово');
        expect(result).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('can() честно отражает поддержку платформы', () => {
        const context = createContext();
        const tg = new TestController(context);
        tg.appType = 'telegram';
        const tgApi = makePlatformApi(tg) as IControllerApi;
        expect(tgApi.can('sendPhoto')).toBe(true);
        expect(tgApi.can('answerCallback')).toBe(true);

        const viber = new TestController(context);
        viber.appType = 'viber';
        const viberApi = makeViberApi(viber);
        expect(viberApi.can('sendPhoto')).toBe(false);
    });
});

describe('BotController.api: ленивый геттер', () => {
    it('api создаётся фабрикой при первом обращении и кэшируется', () => {
        const context = createContext();
        const controller = new TestController(context);
        let calls = 0;
        controller.setApiFactory(() => {
            calls++;
            return null;
        });
        expect(controller.api).toBeNull();
        expect(controller.api).toBeNull();
        expect(calls).toBe(1);
    });

    it('без фабрики api === null (голосовые платформы)', () => {
        const controller = new TestController(createContext());
        expect(controller.api).toBeNull();
    });

    it('clearStoreData сбрасывает фасад — фабрика создаст новый', () => {
        const context = createContext();
        const controller = new TestController(context);
        let calls = 0;
        controller.setApiFactory(() => {
            calls++;
            return null;
        });
        controller.api;
        controller.clearStoreData();
        controller.api;
        expect(calls).toBe(2);
    });
});

describe('Telegram webhook-reply (opt-in)', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockReset();
    });

    function setup(options?: Record<string, unknown>): {
        context: AppContext;
        adapter: TelegramAdapter;
    } {
        const context = createContext();
        context.appConfig.tokens[T_TELEGRAM] = { token: 'tg-token' };
        const adapter = new TelegramAdapter('tg-token', options);
        adapter.init(context);
        return { context, adapter };
    }

    async function makeMessageUpdate(): Promise<Record<string, unknown>> {
        return {
            update_id: 1,
            message: {
                message_id: 1,
                from: { id: 42, is_bot: false, first_name: 'U' },
                chat: { id: 42, type: 'private' },
                text: 'привет',
            },
        };
    }

    it('выключен по умолчанию: getContent отправляет сообщение через API и возвращает ok', async () => {
        const { context, adapter } = setup();
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true, result: { message_id: 1 } }),
        });
        const controller = new TestController(context);
        controller.userId = 42;
        await adapter.setQueryData((await makeMessageUpdate()) as never, controller);
        controller.text = 'ответ';
        const result = await adapter.getContent(controller);
        expect(result).toBe('ok');
        expect(global.fetch).toHaveBeenCalled();
    });

    it('включён: простой текстовый ответ уходит телом webhook-ответа без POST', async () => {
        const { adapter } = setup({ telegram_webhook_reply: true });
        const controller = new TestController(createContext());
        await adapter.setQueryData((await makeMessageUpdate()) as never, controller);
        controller.text = 'ответ';
        const result = await adapter.getContent(controller);
        // Ответ — конверт метода для тела webhook, сеть не трогаем.
        expect(typeof result).toBe('object');
        expect((result as Record<string, unknown>).method).toBe('sendMessage');
        expect((result as Record<string, unknown>).text).toBe('ответ');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('включён, но ответ с карточкой уходит обычным POST-путём', async () => {
        const { context, adapter } = setup({ telegram_webhook_reply: true });
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ ok: true, result: { message_id: 1 } }),
        });
        const controller = new TestController(context);
        await adapter.setQueryData((await makeMessageUpdate()) as never, controller);
        controller.text = 'ответ';
        controller.card.addImage('http://localhost/x.jpg', 'заголовок');
        const result = await adapter.getContent(controller);
        expect(result).toBe('ok');
        expect(global.fetch).toHaveBeenCalled();
    });

    it('включён, но callback-запрос уходит обычным путём (нужен answerCallbackQuery)', async () => {
        const { context, adapter } = setup({ telegram_webhook_reply: true });
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ ok: true, result: true }),
        });
        const controller = new TestController(context);
        await adapter.setQueryData(
            {
                update_id: 2,
                callback_query: {
                    id: 'cb-1',
                    from: { id: 42, is_bot: false, first_name: 'U' },
                    message: { message_id: 9, chat: { id: 42, type: 'private' } },
                    data: 'buy',
                },
            } as never,
            controller,
        );
        controller.text = 'заказ оформлен';
        const result = await adapter.getContent(controller);
        expect(result).toBe('ok');
        // answerCallbackQuery и sendMessage ушли через API.
        expect(global.fetch).toHaveBeenCalled();
    });

    it('включён: текст длиннее 4096 обрезается, сеть не трогаем (Telegram отклонил бы молча)', async () => {
        const { adapter } = setup({ telegram_webhook_reply: true });
        const controller = new TestController(createContext());
        await adapter.setQueryData((await makeMessageUpdate()) as never, controller);
        controller.text = 'a'.repeat(5000);
        const result = (await adapter.getContent(controller)) as Record<string, unknown>;
        expect(typeof result).toBe('object');
        expect(result.method).toBe('sendMessage');
        expect((result.text as string).length).toBeLessThanOrEqual(4096);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('включён + telegram_parse_mode: у обрезанного текста parse_mode снимается', async () => {
        const { adapter } = setup({ telegram_webhook_reply: true, telegram_parse_mode: 'HTML' });
        const controller = new TestController(createContext());
        await adapter.setQueryData((await makeMessageUpdate()) as never, controller);
        // Чистый текст длиной >4096: обрезка обязана снять parse_mode, иначе
        // Telegram отклонит webhook-ответ молча (нет ответа API в этом режиме).
        controller.text = `${'жирный текст без тегов. '.repeat(250)}хвост`;
        const result = (await adapter.getContent(controller)) as Record<string, unknown>;
        expect(result.method).toBe('sendMessage');
        expect(result.parse_mode).toBeUndefined();
        expect((result.text as string).length).toBeLessThanOrEqual(4096);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('включён + telegram_parse_mode: короткий корректный HTML сохраняет parse_mode', async () => {
        const { adapter } = setup({ telegram_webhook_reply: true, telegram_parse_mode: 'HTML' });
        const controller = new TestController(createContext());
        await adapter.setQueryData((await makeMessageUpdate()) as never, controller);
        controller.text = '<b>жирный</b> без обрезки';
        const result = (await adapter.getContent(controller)) as Record<string, unknown>;
        expect(result.method).toBe('sendMessage');
        expect(result.parse_mode).toBe('HTML');
        expect(result.text).toBe('<b>жирный</b> без обрезки');
        expect(global.fetch).not.toHaveBeenCalled();
    });
});

describe('MAX-фасад: вложения и answerCallback', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockReset();
    });

    function setupMax(): { context: AppContext; controller: TestController } {
        const context = createContext();
        context.appConfig.tokens[T_MAX_APP] = { token: 'max-token' };
        const controller = new TestController(context);
        controller.appType = 'max_app';
        controller.userId = 100;
        return { context, controller };
    }

    it.each([
        ['sendVideo', 'video'],
        ['sendDocument', 'file'],
        ['sendAudio', 'audio'],
        ['sendPhoto', 'image'],
    ] as const)(
        '%s отправляет вложение с корректным типом %s (не audio)',
        async (method, expectedType) => {
            const { controller } = setupMax();
            // Три шага: POST /uploads -> {url}; POST <url> -> {token};
            // POST /messages -> отправка с вложением.
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ url: 'http://localhost/upload' }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ token: 'tok-1' }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ body: {} }),
                });
            const api = makePlatformApi(controller) as IControllerApi;
            await api[method]('file.bin', { caption: 'подпись' });
            const calls = (global.fetch as jest.Mock).mock.calls;
            expect(calls.length).toBe(3);
            // Последний вызов — POST messages с вложением и подписью
            // (текст и attachments на верхнем уровне тела).
            const last = calls[calls.length - 1] as unknown[];
            expect(String(last[0])).toContain('/messages');
            const body = JSON.parse(String(last[1]?.body)) as {
                attachments: { type: string; payload: { token: string } }[];
                text: string;
            };
            expect(body.attachments[0].type).toBe(expectedType);
            expect(body.attachments[0].payload.token).toBe('tok-1');
            expect(body.text).toBe('подпись');
        },
    );

    it('answerCallback передаёт chat_id запроса как dialog_id (очередь 2 ответа/сек)', async () => {
        const { context, controller } = setupMax();
        // Callback-запрос MAX: callback_id внутри query.callback, чат — в
        // query.message.recipient.chat_id (адаптер кладёт их в requestData).
        const adapter = new MaxAdapter('max-token');
        adapter.init(context);
        await adapter.setQueryData(
            {
                update_type: 'message_callback',
                callback: { callback_id: 'cb-77', user: { user_id: 100 }, payload: 'buy' },
                message: { recipient: { chat_id: 777 }, sender: { user_id: 100 } },
            } as never,
            controller,
        );
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });
        const api = makePlatformApi(controller) as IControllerApi;
        const result = await api.answerCallback('готово');
        // Ответ API максимума возвращается конвертом; главное — запрос ушёл.
        expect(result).not.toBeNull();
        const calls = (global.fetch as jest.Mock).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const last = calls[calls.length - 1] as unknown[];
        expect(String(last[0])).toContain('/answers');
        expect(String(last[0])).toContain(`callback_id=${encodeURIComponent('cb-77')}`);
        // dialogId=777 включает waitForMaxMessageTurn ДО fetch: если путь
        // сломан, fetch не вызывается вовсе.
        expect(last[1]).toBeDefined();
    });
});

describe('VK-фасад: caption у sendDocument', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockReset();
    });

    it('sendDocument отправляет подпись текстом сообщения вместе с вложением', async () => {
        const context = createContext();
        context.appConfig.tokens[T_VK] = { token: 'vk-token', v: '5.199' };
        const controller = new TestController(context);
        controller.appType = 'vk';
        controller.userId = 42;
        // Четыре шага VK: getUploadServer -> upload -> docs.save -> messages.send.
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ response: { upload_url: 'http://localhost/u' } }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ file: 'file-key' }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ response: { id: 10, owner_id: 5 } }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ response: 123 }),
            });
        const api = makePlatformApi(controller) as IControllerApi;
        await api.sendDocument('doc.pdf', { caption: 'ваш отчёт' });
        const calls = (global.fetch as jest.Mock).mock.calls;
        expect(calls.length).toBe(4);
        const messagesCall = calls[calls.length - 1] as unknown[];
        expect(String(messagesCall[0])).toContain('messages.send');
        const body = String(messagesCall[1]?.body);
        // httpBuildQuery кодирует пробел как '+', не как '%20'.
        expect(body).toContain(encodeURIComponent('ваш').slice(0, 3));
        expect(body).toContain('%D0%BE%D1%82%D1%87%D1%91%D1%82');
        expect(body).toContain(`attachment=${encodeURIComponent('doc5_10')}`);
    });
});

describe('IPlatformAdapter.createApi: контракт фасада', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockReset();
    });

    /** Кастомная платформа без своего фасада — базовая реализация BasePlatform. */
    class PlainPlatform extends BasePlatformAdapter {
        platformName = 'plain_platform';

        isPlatformOnQuery(): boolean {
            return true;
        }

        setQueryData(): boolean {
            return true;
        }

        getContent(): string {
            return 'ok';
        }
    }

    /**
     * Кастомная платформа со своим фасадом — сценарий «своя платформа + свой cb».
     * can() читает this адаптера: если ядро передаст createApi как
     * detached-метод, platformName внутри будет undefined и can() вернёт false.
     */
    class CustomApiPlatform extends BasePlatformAdapter {
        platformName = 'custom_api_platform';

        isPlatformOnQuery(): boolean {
            return true;
        }

        setQueryData(): boolean {
            return true;
        }

        getContent(): string {
            return 'ok';
        }

        createApi(controller: BotController): IControllerApi | null {
            void controller;
            return {
                async sendPhoto(): Promise<Record<string, unknown> | null> {
                    return null;
                },
                async sendDocument(): Promise<Record<string, unknown> | null> {
                    return null;
                },
                async sendAudio(): Promise<Record<string, unknown> | null> {
                    return null;
                },
                async sendVideo(): Promise<Record<string, unknown> | null> {
                    return null;
                },
                async answerCallback(): Promise<Record<string, unknown> | null> {
                    return null;
                },
                can: (method) =>
                    method === 'sendPhoto' && this.platformName === 'custom_api_platform',
            };
        }
    }

    it('кастомная платформа с createApi получает рабочий фасад через ядро (регрессия core→plugins)', async () => {
        // Регрессия бага: ядро резолвило apiFacade из plugins ленивым require
        // с жёстким switch по appType — у любой кастомной платформы
        // controller.api навсегда оставался null.
        const bot = new BotTest();
        bot.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        bot.use(new CustomApiPlatform());
        bot.addCommand('фото', ['фото'], (_, ctx) => {
            ctx.text = 'ok';
        });

        await bot.simulate('фото', { platform: 'custom_api_platform' });
        const controller = bot.getBotController();
        expect(controller).not.toBeNull();
        // Ядро подключило фабрику адаптера к контроллеру через контракт;
        // can() подтверждает и работу фасада, и сохранение this адаптера.
        const api = controller?.api as IControllerApi | null;
        expect(api).not.toBeNull();
        expect(api?.can('sendPhoto')).toBe(true);
        expect(api?.can('answerCallback')).toBe(false);
    });

    it('адаптер без переопределения createApi оставляет api === null', async () => {
        const bot = new BotTest();
        bot.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        bot.use(new PlainPlatform());
        bot.addCommand('ping', ['ping'], (_, ctx) => {
            ctx.text = 'pong';
        });

        await bot.simulate('ping', { platform: 'plain_platform' });
        expect(bot.getBotController()?.api).toBeNull();
    });

    it('встроенные адаптеры отдают свои фабрики через createApi', () => {
        const context = createContext();
        const controller = new TestController(context);
        controller.appType = 'telegram';

        expect(new TelegramAdapter('tg-token').createApi(controller)?.can('sendPhoto')).toBe(true);
        expect(new VkAdapter('vk-token').createApi(controller)?.can('sendPhoto')).toBe(true);
        expect(new MaxAdapter('max-token').createApi(controller)?.can('sendVideo')).toBe(true);
        expect(new ViberAdapter('viber-token').createApi(controller)?.can('sendPhoto')).toBe(false);
        // Голосовые платформы не переопределяют createApi — фасад недоступен.
        expect(new AlisaAdapter().createApi(controller)).toBeNull();
    });
});
