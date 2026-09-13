/**
 * Контракты голосовых платформ и нажатий кнопок, найденные при финальной
 * сверке с документацией (Яндекс.Диалоги, архив протокола Маруси, типы
 * официального SDK SmartApp @salutejs/scenario, SDK MAX, Telegram Bot API).
 */
global.fetch = jest.fn();

import { AppContext, BotController } from '../../src';
import {
    AlisaAdapter,
    TelegramAdapter,
    MarusiaAdapter,
    SmartAppAdapter,
    MaxAdapter,
    TelegramSound,
    TelegramRequest,
    YandexSpeechKit,
    T_TELEGRAM,
    MaxCard,
    MaxRequest,
} from '../../src/plugins';

class TestController extends BotController {
    action(): void {
        return;
    }
}

function createContext(): AppContext {
    const context = new AppContext();
    context.setLogger({ error: () => {}, warn: () => {}, log: () => {} });
    return context;
}

describe('Алиса: ButtonPressed', () => {
    it('кнопка с объектным payload даёт команду из payload, а не пустую строку', () => {
        const context = createContext();
        const adapter = new AlisaAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        // По протоколу ButtonPressed НЕ содержит command/original_utterance.
        adapter.setQueryData(
            {
                meta: { client_id: 'yandex.searchplugin', interfaces: { screen: {} } },
                session: {
                    message_id: 3,
                    session_id: 's',
                    skill_id: 'k',
                    user_id: 'u',
                    new: false,
                },
                request: {
                    type: 'ButtonPressed',
                    payload: { command: 'buy', id: 7 },
                    nlu: { tokens: ['купить'], entities: [], intents: {} },
                },
                version: '1.0',
            } as never,
            controller,
        );
        expect(controller.userCommand).toBe('buy');
        expect(controller.payload).toEqual({ command: 'buy', id: 7 });
    });

    it('без имени действия в payload команда берётся из текста кнопки (nlu.tokens)', () => {
        const context = createContext();
        const adapter = new AlisaAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        adapter.setQueryData(
            {
                meta: { client_id: 'yandex.searchplugin' },
                session: {
                    message_id: 3,
                    session_id: 's',
                    skill_id: 'k',
                    user_id: 'u',
                    new: false,
                },
                request: {
                    type: 'ButtonPressed',
                    payload: { id: 7 },
                    nlu: { tokens: ['да', 'конечно'], entities: [], intents: {} },
                },
                version: '1.0',
            } as never,
            controller,
        );
        expect(controller.userCommand).toBe('да конечно');
    });

    it('ответ на health-check ping содержит обязательный end_session', () => {
        const context = createContext();
        const adapter = new AlisaAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        adapter.setQueryData(
            {
                meta: { client_id: 'yandex.searchplugin' },
                session: {
                    message_id: 1,
                    session_id: 's',
                    skill_id: 'k',
                    user_id: 'u',
                    new: false,
                },
                request: { command: '', original_utterance: 'ping', type: 'SimpleUtterance' },
                version: '1.0',
            } as never,
            controller,
        );
        expect(controller.platformOptions.sendInInit).toEqual({
            version: '1.0',
            response: { text: 'pong', end_session: false },
        });
    });
});

describe('Маруся: обязательные поля ответа', () => {
    const marusiaQuery = (command: string, utterance: string): Record<string, unknown> => ({
        meta: { client_id: 'MailRu', interfaces: {} },
        session: {
            message_id: 2,
            session_id: 'sess',
            skill_id: 'skill',
            user_id: 'user-1',
            new: false,
        },
        request: { command, original_utterance: utterance, type: 'SimpleUtterance' },
        version: '1.0',
    });

    it('ответ на ping содержит session (обязателен в протоколе Маруси)', () => {
        const context = createContext();
        const adapter = new MarusiaAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        adapter.setQueryData(marusiaQuery('', 'ping') as never, controller);
        expect(controller.platformOptions.sendInInit).toEqual({
            version: '1.0',
            response: { text: 'pong', end_session: false },
            session: { session_id: 'sess', message_id: 2, user_id: 'user-1' },
        });
    });

    it('при пустом text он заполняется из tts без разметки (text не должен быть пустым)', async () => {
        const context = createContext();
        const adapter = new MarusiaAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        adapter.setQueryData(marusiaQuery('привет', 'привет') as never, controller);
        controller.text = '';
        controller.tts = 'Гот+ов <speaker audio="marusia-sounds/game-win-1"> начать';
        const result = (await adapter.getContent(controller)) as { response: { text: string } };
        expect(result.response.text).toBe('Готов начать');
    });
});

describe('SmartApp: кнопки с payload (SERVER_ACTION)', () => {
    const serverAction = (serverActionBody: Record<string, unknown>): Record<string, unknown> => ({
        messageName: 'SERVER_ACTION',
        sessionId: 's',
        messageId: 5,
        uuid: { userId: 'u1', userChannel: 'B2C', sub: 'sub' },
        payload: {
            device: {},
            app_info: { applicationId: 'app' },
            character: { id: 'sber', appeal: 'official' },
            server_action: serverActionBody,
        },
    });

    it('строковый payload кнопки → команда (action_id фреймворка, parameters.value)', () => {
        const context = createContext();
        const adapter = new SmartAppAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        adapter.setQueryData(
            serverAction({ action_id: 'umbot_action', parameters: { value: 'buy' } }) as never,
            controller,
        );
        expect(controller.userCommand).toBe('buy');
        expect(controller.payload).toEqual({ value: 'buy' });
    });

    it('собственный action_id становится командой, parameters — payload', () => {
        const context = createContext();
        const adapter = new SmartAppAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        adapter.setQueryData(
            serverAction({ action_id: 'ORDER', parameters: { orderId: 42 } }) as never,
            controller,
        );
        expect(controller.userCommand).toBe('order');
        expect(controller.payload).toEqual({ orderId: 42 });
    });

    it('в ответе всегда есть items (обязательное поле ANSWER_TO_USER)', () => {
        const context = createContext();
        const adapter = new SmartAppAdapter();
        adapter.init(context);
        const controller = new TestController(context);
        adapter.setQueryData(
            serverAction({ action_id: 'ORDER', parameters: {} }) as never,
            controller,
        );
        controller.text = '';
        controller.tts = 'Только голос';
        const result = adapter.getContent(controller) as unknown as {
            payload: { items: unknown[] };
        };
        expect(Array.isArray(result.payload.items)).toBe(true);
    });
});

describe('MAX: bot_started', () => {
    it('на нажатие «Начать» отправляется приветствие в чат диалога', async () => {
        (global.fetch as jest.Mock).mockReset();
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
        const context = createContext();
        context.appConfig.tokens.max_app = { token: 'max-token' };
        const adapter = new MaxAdapter('max-token');
        adapter.init(context);
        const controller = new TestController(context);
        await adapter.setQueryData(
            {
                update_type: 'bot_started',
                timestamp: 1,
                chat_id: 555,
                user: { user_id: 42 },
            } as never,
            controller,
        );
        controller.text = 'Добро пожаловать!';
        await adapter.getContent(controller);
        const call = (global.fetch as jest.Mock).mock.calls.find((c) =>
            String(c[0]).includes('/messages'),
        );
        expect(String(call?.[0])).toContain('chat_id=555');
        expect(String(call?.[1]?.body)).toContain('Добро пожаловать!');
    });
});

describe('Telegram: TTS уходит голосовым сообщением', () => {
    it('синтезированный OGG/Opus отправляется через sendVoice, а не sendAudio', async () => {
        const context = createContext();
        context.appConfig.tokens[T_TELEGRAM] = { token: 'tg', speech_kit_token: 'key' };
        const controller = new TestController(context);
        controller.userId = 42;
        jest.spyOn(YandexSpeechKit.prototype, 'getTts').mockResolvedValue({
            fileName: 'tts_fake.ogg',
            audioData: new ArrayBuffer(1),
        });
        const voice = jest.spyOn(TelegramRequest.prototype, 'sendVoice').mockResolvedValue(null);
        const audio = jest.spyOn(TelegramRequest.prototype, 'sendAudio').mockResolvedValue(null);

        await TelegramSound.soundProcessing(
            { text: 'Привет', sounds: [], usedStandardSound: false },
            controller,
        );

        // sendAudio по Bot API — только MP3/M4A; OGG/Opus — формат голосовых.
        expect(voice).toHaveBeenCalledWith(42, 'tts_fake.ogg');
        expect(audio).not.toHaveBeenCalled();
        jest.restoreAllMocks();
    });
});

describe('Медиа без DB-адаптера', () => {
    it('загруженный токен картинки возвращается, даже если кэшировать его некуда', async () => {
        const context = createContext();
        context.appConfig.tokens.max_app = { token: 'max-token' };
        const controller = new TestController(context);
        const upload = jest
            .spyOn(MaxRequest.prototype, 'upload')
            .mockResolvedValue({ url: 'https://upload', token: 'img-token' });

        // Без БД model.save() возвращает false, но токен всё равно должен вернуться —
        // иначе картинка из локального файла не дойдёт до пользователя.
        const token = await MaxCard.getImageInDB(controller, './local.png');

        expect(context.database.adapter).toBeUndefined();
        expect(token).toBe('img-token');
        upload.mockRestore();
    });
});

describe('Голос в чатах: достаточно tts и speech_kit_token', () => {
    it('Telegram отправляет голосовое, даже если звуки не заданы', async () => {
        (global.fetch as jest.Mock).mockReset();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ ok: true, result: {} }),
        });
        const context = createContext();
        context.appConfig.tokens[T_TELEGRAM] = { token: 'tg', speech_kit_token: 'key' };
        const adapter = new TelegramAdapter('tg');
        adapter.init(context);
        const controller = new TestController(context);
        await adapter.setQueryData(
            {
                update_id: 1,
                message: {
                    message_id: 1,
                    from: { id: 42, is_bot: false, first_name: 'U' },
                    chat: { id: 42, type: 'private' },
                    date: 1,
                    text: 'hi',
                },
            } as never,
            controller,
        );
        controller.text = 'Победа!';
        controller.tts = 'Победа! #game_win#';
        const tts = jest.spyOn(YandexSpeechKit.prototype, 'getTts').mockResolvedValue(null);

        await adapter.getContent(controller);

        // Документация: «при заданном speech_kit_token tts озвучивается».
        // Маркеры звуков голосовых платформ в синтез не попадают.
        expect(tts).toHaveBeenCalledWith('Победа!');
        tts.mockRestore();
    });

    it('без speech_kit_token голос не синтезируется', async () => {
        const context = createContext();
        context.appConfig.tokens[T_TELEGRAM] = { token: 'tg' };
        const adapter = new TelegramAdapter('tg');
        adapter.init(context);
        const controller = new TestController(context);
        controller.tts = 'Победа!';
        const tts = jest.spyOn(YandexSpeechKit.prototype, 'getTts');
        expect(controller.isSoundInit()).toBe(false);
        await adapter.getContent(controller).catch(() => undefined);
        expect(tts).not.toHaveBeenCalled();
        tts.mockRestore();
    });
});
