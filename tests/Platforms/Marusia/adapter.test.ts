import { AppContext, BotController } from '../../../src';
import { T_MARUSIA, MarusiaAdapter } from '../../../src/plugins';
import type { IMarusiaWebhookRequest } from '../../../src/plugins';

class TestMarusiaController extends BotController {
    action(): void {
        return;
    }
}

function makeMarusiaRequest(overrides?: Partial<IMarusiaWebhookRequest>): IMarusiaWebhookRequest {
    return {
        meta: {
            locale: 'ru-RU',
            timezone: 'Europe/Moscow',
            client_id: 'MailRu_local',
            interfaces: {},
        },
        session: {
            new: true,
            message_id: 1,
            session_id: 'test-session',
            skill_id: 'test-skill',
            user_id: 'test-user',
        },
        request: {
            command: 'привет',
            original_utterance: 'Привет!',
            type: 'SimpleUtterance',
            nlu: {
                tokens: ['привет'],
                entities: [],
                intents: {},
            },
        },
        version: '1.0',
        ...overrides,
    } as IMarusiaWebhookRequest;
}

describe('MarusiaAdapter', () => {
    let appContext: AppContext;
    let controller: TestMarusiaController;
    let adapter: MarusiaAdapter;

    beforeEach(() => {
        appContext = new AppContext();
        appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        appContext.appConfig.tokens[T_MARUSIA] = { token: 'test-marusia-token' };
        controller = new TestMarusiaController(appContext);
        adapter = new MarusiaAdapter();
        adapter.init(appContext);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('isPlatformOnQuery', () => {
        it('определяет запрос по заголовку x-marusia-signature', () => {
            expect(
                adapter.isPlatformOnQuery({} as IMarusiaWebhookRequest, {
                    'x-marusia-signature': 'sig',
                }),
            ).toBe(true);
        });

        it('определяет запрос Маруси по client_id с MailRu', () => {
            const query = makeMarusiaRequest();
            expect(adapter.isPlatformOnQuery(query)).toBe(true);
        });

        it('возвращает false для запроса Алисы (yandex.searchplugin)', () => {
            const query = makeMarusiaRequest({
                meta: {
                    ...makeMarusiaRequest().meta!,
                    client_id: 'yandex.searchplugin/1.0' as string,
                },
            });
            expect(adapter.isPlatformOnQuery(query)).toBe(false);
        });

        it('определяет запрос без client_id по регистру application_id', () => {
            const query = makeMarusiaRequest({
                meta: {
                    ...makeMarusiaRequest().meta!,
                    client_id: '' as string,
                },
                session: {
                    ...makeMarusiaRequest().session!,
                    application: {
                        application_id: 'testappid',
                    },
                },
            });
            expect(adapter.isPlatformOnQuery(query)).toBe(true);
        });

        it('возвращает false для null/undefined запроса', () => {
            expect(adapter.isPlatformOnQuery(null as unknown as IMarusiaWebhookRequest)).toBe(
                false,
            );
            expect(adapter.isPlatformOnQuery(undefined as unknown as IMarusiaWebhookRequest)).toBe(
                false,
            );
        });

        it('возвращает false для запроса без request/version/session', () => {
            expect(adapter.isPlatformOnQuery({} as IMarusiaWebhookRequest)).toBe(false);
        });
    });

    describe('setQueryData', () => {
        it('заполняет контроллер данными из запроса Маруси', () => {
            const query = makeMarusiaRequest();
            const result = adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.userCommand).toBe('привет');
            expect(controller.originalUserCommand).toBe('Привет!');
            expect(controller.userId).toBe('test-user');
            expect(controller.isScreen).toBe(false);
        });

        it('обрабатывает health-check (ping)', () => {
            const query = makeMarusiaRequest({
                request: {
                    command: '',
                    original_utterance: 'ping',
                    type: 'SimpleUtterance',
                },
            });
            const result = adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.text).toBe('pong');
            expect(controller.platformOptions.sendInInit).toBeDefined();
        });

        it('устанавливает state из user', () => {
            const query = makeMarusiaRequest({
                state: {
                    user: { step: 'greeting' },
                },
            });
            adapter.setQueryData(query, controller);

            expect(controller.state).toEqual({ step: 'greeting' });
            expect(controller.platformOptions.stateName).toBe('user_state_update');
        });

        it('устанавливает state из session', () => {
            const query = makeMarusiaRequest({
                state: {
                    session: { count: 5 },
                },
            });
            adapter.setQueryData(query, controller);

            expect(controller.state).toEqual({ count: 5 });
            expect(controller.platformOptions.stateName).toBe('session_state');
        });

        it('обрабатывает account_linking_complete_event', () => {
            const query = {
                account_linking_complete_event: true,
                version: '1.0',
            } as unknown as IMarusiaWebhookRequest;

            const result = adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.userEvents).toEqual({
                auth: { status: true },
            });
        });

        it('возвращает false для запроса без session и request', () => {
            const query = makeMarusiaRequest();
            const queryObj = query as Record<string, unknown>;
            delete queryObj.session;
            delete queryObj.request;

            const result = adapter.setQueryData(queryObj as IMarusiaWebhookRequest, controller);

            expect(result).toBe(false);
            expect(controller.platformOptions.error).toBeDefined();
        });

        it('возвращает false для null-запроса', () => {
            const result = adapter.setQueryData(
                null as unknown as IMarusiaWebhookRequest,
                controller,
            );
            expect(result).toBe(false);
        });
    });

    describe('getContent', () => {
        it('возвращает ответ с текстом', async () => {
            const query = makeMarusiaRequest();
            adapter.setQueryData(query, controller);
            controller.text = 'Привет!';
            controller.isEnd = false;

            const result = await adapter.getContent(controller);

            expect(result.version).toBe('1.0');
            expect(result.response?.text).toBe('Привет!');
            expect(result.response?.end_session).toBe(false);
        });

        it('содержит session с корректными полями', async () => {
            const query = makeMarusiaRequest();
            adapter.setQueryData(query, controller);
            controller.text = 'Ответ';

            const result = await adapter.getContent(controller);

            expect(result.session).toBeDefined();
            expect(result.session?.session_id).toBe('test-session');
            expect(result.session?.message_id).toBe(1);
            expect(result.session?.user_id).toBe('test-user');
        });

        it('добавляет state при наличии stateData', async () => {
            const query = makeMarusiaRequest({
                state: { user: { data: 'val' } },
            });
            adapter.setQueryData(query, controller);
            controller.text = 'Ответ';

            const result = await adapter.getContent(controller, {
                data: 'new-val',
            });

            expect(result.user_state_update).toEqual({ data: 'new-val' });
        });

        it('предупреждает, если stateData передан без выбранного хранилища', async () => {
            adapter.setQueryData(makeMarusiaRequest(), controller);
            controller.text = 'Ответ';
            const logWarn = jest.spyOn(appContext, 'logWarn').mockImplementation(() => {});

            const result = await adapter.getContent(controller, { data: 'value' });

            expect(result.session_state).toBeUndefined();
            expect(logWarn).toHaveBeenCalledWith(expect.stringContaining('без выбранного'));
        });

        it('не добавляет state при превышении лимита', async () => {
            const query = makeMarusiaRequest({
                state: { user: { data: 'val' } },
            });
            adapter.setQueryData(query, controller);
            controller.text = 'Ответ';
            const logError = jest.spyOn(appContext, 'logError').mockImplementation(() => {});

            const largeState = { data: 'x'.repeat(12000) };
            const result = await adapter.getContent(controller, largeState);

            expect(result.user_state_update).toBeUndefined();
            expect(logError).toHaveBeenCalled();
        });

        it('вызывает soundProcessing при наличии звуков', async () => {
            const query = makeMarusiaRequest();
            adapter.setQueryData(query, controller);
            controller.text = 'Приветствие';
            controller.sound.sounds = [
                {
                    key: 'S_AUDIO_GAME_WIN',
                    path: '',
                    sounds: [],
                    isStandard: true,
                },
            ];

            const getSoundsSpy = jest
                .spyOn(controller.sound, 'getSounds')
                .mockResolvedValue('Приветствие со звуком');

            await adapter.getContent(controller);

            expect(getSoundsSpy).toHaveBeenCalled();
        });

        it('не оставляет оборванный speaker-тег на границе TTS', async () => {
            adapter.setQueryData(makeMarusiaRequest(), controller);
            controller.text = 'Ответ';
            controller.tts = `${'x'.repeat(1018)}<speaker audio="marusia-test">`;

            const result = await adapter.getContent(controller);

            expect(result.response?.tts).not.toMatch(/<speaker[^>]*$/);
        });

        it('не считает служебные теги в лимите TTS', async () => {
            // Регрессия: лимит 1024 считался вместе с тегами, поэтому разметка
            // «съедала» часть видимого текста. Как и у Алисы, теги в лимит не входят.
            adapter.setQueryData(makeMarusiaRequest(), controller);
            controller.text = 'Ответ';
            const tag = '<speaker audio="marusia-test">';
            controller.tts = `${'x'.repeat(1000)}${tag}${'y'.repeat(24)}`;

            const result = await adapter.getContent(controller);

            expect(result.response?.tts).toBe(`${'x'.repeat(1000)}${tag}${'y'.repeat(24)}`);
        });

        it('обрезает TTS по видимому тексту, сохраняя теги целиком', async () => {
            adapter.setQueryData(makeMarusiaRequest(), controller);
            controller.text = 'Ответ';
            const tag = '<speaker audio="marusia-test">';
            controller.tts = `${'x'.repeat(1020)}${tag}${'y'.repeat(50)}`;

            const result = await adapter.getContent(controller);

            expect(result.response?.tts).toBe(`${'x'.repeat(1020)}${tag}${'y'.repeat(4)}`);
        });
    });

    describe('isLocalStorage / getLocalStorage', () => {
        it('возвращает state как локальное хранилище', () => {
            controller.state = { data: 'test' };
            expect(adapter.getLocalStorage(controller)).toEqual({ data: 'test' });
        });

        it('isLocalStorage возвращает true когда state не null', () => {
            controller.state = { data: 'test' };
            expect(adapter.isLocalStorage(controller)).toBe(true);
        });

        it('isLocalStorage возвращает false когда state null', () => {
            controller.state = null;
            expect(adapter.isLocalStorage(controller)).toBe(false);
        });
    });

    describe('send', () => {
        it('всегда возвращает false', () => {
            expect(adapter.send()).toBe(false);
        });
    });
});
