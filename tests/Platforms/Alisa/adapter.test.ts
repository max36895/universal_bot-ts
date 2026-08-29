import { AppContext, BotController } from '../../../src';
import {
    T_ALISA,
    AlisaAdapter,
    IAlisaWebhookRequest,
    IAlisaWebhookResponse,
} from '../../../src/plugins';

class TestAlisaController extends BotController {
    action(): void {
        return;
    }
}

function makeWebhookRequest(overrides?: Partial<IAlisaWebhookRequest>): IAlisaWebhookRequest {
    return {
        meta: {
            locale: 'ru-RU',
            timezone: 'Europe/Moscow',
            client_id: 'yandex.searchplugin/1.0',
            interfaces: {
                screen: {},
                payments: null,
                account_linking: null,
            },
        },
        session: {
            new: true,
            message_id: 1,
            session_id: 'test-session-id',
            skill_id: 'test-skill-id',
            user_id: 'test-user-id',
            application: {
                application_id: 'test-app-id',
            },
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
    };
}

describe('AlisaAdapter', () => {
    let appContext: AppContext;
    let controller: TestAlisaController;
    let adapter: AlisaAdapter;

    beforeEach(() => {
        appContext = new AppContext();
        appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        appContext.appConfig.tokens[T_ALISA] = { token: 'test-oauth-token' };
        controller = new TestAlisaController(appContext);
        adapter = new AlisaAdapter();
        adapter.init(appContext);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('isPlatformOnQuery', () => {
        it('определяет запрос Алисы по client_id с yandex.searchplugin', () => {
            const query = makeWebhookRequest();
            expect(adapter.isPlatformOnQuery(query)).toBe(true);
        });

        it('определяет запрос Алисы по регистрозависимому application_id', () => {
            const query = makeWebhookRequest({
                meta: {
                    locale: 'ru-RU',
                    timezone: 'Europe/Moscow',
                    client_id: 'some-other-client',
                    interfaces: {
                        screen: {},
                        payments: null,
                        account_linking: null,
                    },
                },
                session: {
                    new: true,
                    message_id: 1,
                    session_id: 'test-session-id',
                    skill_id: 'test-skill-id',
                    user_id: 'test-user-id',
                    application: {
                        application_id: 'TestAppWithCase',
                    },
                },
            });
            expect(adapter.isPlatformOnQuery(query)).toBe(true);
        });

        it('возвращает false для запроса без request, version, session', () => {
            const result = adapter.isPlatformOnQuery({} as IAlisaWebhookRequest);
            expect(result).toBe(false);
        });

        it('возвращает false для null/undefined запроса', () => {
            expect(adapter.isPlatformOnQuery(null as unknown as IAlisaWebhookRequest)).toBe(false);
            expect(adapter.isPlatformOnQuery(undefined as unknown as IAlisaWebhookRequest)).toBe(
                false,
            );
        });
    });

    describe('setQueryData', () => {
        it('заполняет контроллер данными из запроса Алисы (application_id как userId)', () => {
            const query = makeWebhookRequest();
            const result = adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.userCommand).toBe('привет');
            expect(controller.originalUserCommand).toBe('Привет!');
            expect(controller.userId).toBe('test-app-id');
            expect(controller.messageId).toBe(1);
            expect(controller.isScreen).toBe(true);
            expect(controller.platformOptions.appId).toBe('test-skill-id');
            expect(controller.requestObject).toBe(query);
            expect(controller.userMeta).toEqual(query.meta);
        });

        it('использует user.user_id при isAuthUser = true', () => {
            appContext.platformParams.isAuthUser = true;
            const query = makeWebhookRequest({
                session: {
                    new: true,
                    message_id: 1,
                    session_id: 'test-session-id',
                    skill_id: 'test-skill-id',
                    user_id: 'fallback-user-id',
                    user: {
                        user_id: 'auth-user-id',
                        access_token: 'test-access-token',
                    },
                    application: {
                        application_id: 'test-app-id',
                    },
                },
            });

            adapter.setQueryData(query, controller);

            expect(controller.userId).toBe('auth-user-id');
            expect(controller.userToken).toBe('test-access-token');
        });

        it('использует session.user_id при отсутствии application_id', () => {
            const query = makeWebhookRequest({
                session: {
                    new: true,
                    message_id: 1,
                    session_id: 'test-session-id',
                    skill_id: 'test-skill-id',
                    user_id: 'plain-user-id',
                },
            });
            // Удаляем user и application
            delete query.session.user;
            delete query.session.application;

            adapter.setQueryData(query, controller);

            expect(controller.userId).toBe('plain-user-id');
        });

        it('заполняет NLU из запроса', () => {
            const query = makeWebhookRequest();
            const nluSetSpy = jest.spyOn(controller.nlu, 'setNlu');

            adapter.setQueryData(query, controller);

            expect(nluSetSpy).toHaveBeenCalledWith(query.request.nlu);
        });

        it('устанавливает state из user', () => {
            const query = makeWebhookRequest({
                state: {
                    user: { step: 'greeting' },
                },
            });
            adapter.setQueryData(query, controller);

            expect(controller.state).toEqual({ step: 'greeting' });
            expect(controller.platformOptions.stateName).toBe('user_state_update');
        });

        it('устанавливает state из application, если user отсутствует', () => {
            const query = makeWebhookRequest({
                state: {
                    application: { data: 'app-value' },
                },
            });
            adapter.setQueryData(query, controller);

            expect(controller.state).toEqual({ data: 'app-value' });
            expect(controller.platformOptions.stateName).toBe('application_state');
        });

        it('устанавливает state из session, если user и application отсутствуют', () => {
            const query = makeWebhookRequest({
                state: {
                    session: { count: 5 },
                },
            });
            adapter.setQueryData(query, controller);

            expect(controller.state).toEqual({ count: 5 });
            expect(controller.platformOptions.stateName).toBe('session_state');
        });

        it('обрабатывает ping-запрос и устанавливает sendInInit', () => {
            const query = makeWebhookRequest({
                request: {
                    command: '',
                    original_utterance: 'ping',
                    type: 'SimpleUtterance',
                },
            });
            const result = adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.platformOptions.sendInInit).toEqual({
                version: '1.0',
                response: {
                    text: 'pong',
                },
            });
        });

        it('обрабатывает account_linking_complete_event', () => {
            // При account_linking_complete_event приходит запрос БЕЗ request и session
            const query = {
                account_linking_complete_event: true,
                version: '1.0',
            } as unknown as IAlisaWebhookRequest;

            const result = adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.userEvents).toEqual({
                auth: {
                    status: true,
                },
            });
        });

        it('возвращает false для null-запроса', () => {
            const result = adapter.setQueryData(
                null as unknown as IAlisaWebhookRequest,
                controller,
            );
            expect(result).toBe(false);
        });
    });

    describe('getContent', () => {
        it('возвращает ответ с текстом, tts, end_session и версией', async () => {
            controller.text = 'Привет!';
            controller.tts = 'Привет!';
            controller.isEnd = false;

            const result = (await adapter.getContent(controller)) as IAlisaWebhookResponse;

            expect(result.version).toBe('1.0');
            expect(result.response?.text).toBe('Привет!');
            expect(result.response?.tts).toBe('Привет!');
            expect(result.response?.end_session).toBe(false);
            expect(result.start_account_linking).toBeUndefined();
        });

        it('помещает start_account_linking в response.directives', async () => {
            controller.isAuth = true;
            controller.userToken = null;
            controller.text = 'Для продолжения авторизуйтесь';

            const result = (await adapter.getContent(controller)) as IAlisaWebhookResponse;

            expect(result.response).toEqual(
                expect.objectContaining({
                    text: 'Для продолжения авторизуйтесь',
                    directives: { start_account_linking: {} },
                }),
            );
            expect(result).not.toHaveProperty('start_account_linking');
        });

        it('обрабатывает state и добавляет его в ответ', async () => {
            controller.text = 'Ответ';
            adapter.setQueryData(
                makeWebhookRequest({
                    state: { session: { count: 1 } },
                }),
                controller,
            );

            const result = (await adapter.getContent(controller, {
                count: 2,
            })) as IAlisaWebhookResponse;

            expect(result.session_state).toEqual({ count: 2 });
        });

        it('вызывает _initTTS при наличии звуков', async () => {
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

            const result = (await adapter.getContent(controller)) as IAlisaWebhookResponse;

            expect(getSoundsSpy).toHaveBeenCalled();
            expect(result.response?.text).toBe('Приветствие');
        });

        it('не учитывает целые speaker-теги в лимите TTS и не разрезает их', async () => {
            controller.text = 'Ответ';
            controller.tts = 'x'.repeat(1018);
            controller.sound.sounds = [
                {
                    key: '#sound#',
                    path: '',
                    sounds: [],
                    isStandard: true,
                },
            ];
            const speaker = '<speaker audio="alice-sounds-game-win-1.opus">';
            jest.spyOn(controller.sound, 'getSounds').mockResolvedValue(
                `${'x'.repeat(1018)}${speaker}ХВОСТ`,
            );

            const result = (await adapter.getContent(controller)) as IAlisaWebhookResponse;

            expect(result.response?.tts).toContain(speaker);
            expect(result.response?.tts?.endsWith('ХВОСТ')).toBe(true);
            expect(result.response?.tts).not.toMatch(/<speaker[^>]*$/);
        });

        it('предупреждает, если stateData передан без выбранного хранилища', async () => {
            controller.text = 'Ответ';
            const logWarn = jest.spyOn(appContext, 'logWarn').mockImplementation(() => {});

            const result = await adapter.getContent(controller, { value: 1 });

            expect(result.session_state).toBeUndefined();
            expect(logWarn).toHaveBeenCalledWith(expect.stringContaining('без выбранного'));
        });
    });

    describe('getLocalStorage / isLocalStorage', () => {
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
        it('всегда возвращает false (Алиса не поддерживает push)', () => {
            expect(adapter.send()).toBe(false);
        });
    });
});
