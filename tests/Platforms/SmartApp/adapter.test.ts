import { AppContext, BotController } from '../../../src';
import { T_SMART_APP, SmartAppAdapter } from '../../../src/plugins';
import type { ISberSmartAppWebhookRequest } from '../../../src/plugins';

class TestSmartAppController extends BotController {
    action(): void {
        return;
    }
}

function makeSmartAppRequest(
    overrides?: Partial<ISberSmartAppWebhookRequest>,
): ISberSmartAppWebhookRequest {
    return {
        messageName: 'MESSAGE_TO_SKILL',
        sessionId: 'test-session',
        messageId: 1,
        uuid: {
            userId: 'test-user',
            userChannel: '',
            sub: '',
        },
        payload: {
            device: {
                type: 'sdk',
                capabilities: {
                    screen: { available: true },
                },
            },
            meta: {
                time: {
                    timezone_id: 'Europe/Moscow',
                    timezone_offset_sec: 10800,
                    timestamp: 1000000,
                },
            },
            app_info: {
                projectId: 'proj-1',
                applicationId: 'app-1',
                appversionId: 'v1',
            },
            character: {
                id: 'sber',
                name: 'Сбер',
                gender: 'male',
                appeal: 'official',
            },
            projectName: 'test-project',
            intent: '',
            original_intent: '',
            intent_meta: {},
            new_session: true,
            message: {
                normalized_text: 'привет',
                original_text: 'Привет!',
                tokenized_elements_list: ['привет'],
            },
            annotations: {},
            strategies: { happy_birthday: false, last_call: 0 },
        },
        ...overrides,
    } as ISberSmartAppWebhookRequest;
}

describe('SmartAppAdapter', () => {
    let appContext: AppContext;
    let controller: TestSmartAppController;
    let adapter: SmartAppAdapter;

    beforeEach(() => {
        appContext = new AppContext();
        appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        appContext.appConfig.tokens[T_SMART_APP] = { token: 'test-smartapp-token' };
        controller = new TestSmartAppController(appContext);
        adapter = new SmartAppAdapter();
        adapter.init(appContext);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('isPlatformOnQuery', () => {
        it('определяет запрос по заголовку x-sber-smartapp-webhook-token', () => {
            expect(
                adapter.isPlatformOnQuery({} as ISberSmartAppWebhookRequest, {
                    'x-sber-smartapp-webhook-token': 'token',
                }),
            ).toBe(true);
        });

        it('определяет запрос по заголовку x-sber-token', () => {
            expect(
                adapter.isPlatformOnQuery({} as ISberSmartAppWebhookRequest, {
                    'x-sber-token': 'token',
                }),
            ).toBe(true);
        });

        it('определяет запрос по структуре (messageName + uuid + payload.character)', () => {
            const query = makeSmartAppRequest();
            expect(adapter.isPlatformOnQuery(query)).toBe(true);
        });

        it('возвращает false для null/undefined запроса', () => {
            expect(adapter.isPlatformOnQuery(null as unknown as ISberSmartAppWebhookRequest)).toBe(
                false,
            );
            expect(
                adapter.isPlatformOnQuery(undefined as unknown as ISberSmartAppWebhookRequest),
            ).toBe(false);
        });

        it('возвращает false для запроса без необходимых полей', () => {
            expect(
                adapter.isPlatformOnQuery({ messageName: 'test' } as ISberSmartAppWebhookRequest),
            ).toBe(false);
        });
    });

    describe('setQueryData', () => {
        it('заполняет контроллер данными из MESSAGE_TO_SKILL', () => {
            const query = makeSmartAppRequest();
            const result = adapter.setQueryData(query, controller);

            expect(result).toBe(true);
            expect(controller.userCommand).toBe('привет');
            expect(controller.originalUserCommand).toBe('Привет!');
            expect(controller.userId).toBe('test-user');
            expect(controller.isScreen).toBe(true);
            expect(controller.platformOptions.appId).toBe('app-1');
            expect(controller.appeal).toBe('official');
        });

        it('обрабатывает CLOSE_APP', () => {
            const query = makeSmartAppRequest({ messageName: 'CLOSE_APP' });
            adapter.setQueryData(query, controller);

            expect(controller.isEnd).toBe(true);
        });

        it('обрабатывает SERVER_ACTION', () => {
            const query = makeSmartAppRequest({
                messageName: 'SERVER_ACTION',
            });
            (query.payload as Record<string, unknown>).server_action = {
                action_id: 'umbot_action',
                parameters: { orderId: 42 },
            };
            delete (query.payload as Record<string, unknown>).message;

            adapter.setQueryData(query, controller);

            expect(controller.payload).toEqual({ orderId: 42 });
        });

        it('обрабатывает RUN_APP', () => {
            const query = makeSmartAppRequest({
                messageName: 'RUN_APP',
                messageId: 0,
            });
            (query.payload as Record<string, unknown>).server_action = {
                action_id: 'start',
                parameters: { source: 'deep_link' },
            };
            delete (query.payload as Record<string, unknown>).message;

            adapter.setQueryData(query, controller);

            expect(controller.payload).toEqual({ source: 'deep_link' });
            expect(controller.messageId).toBe(0);
        });

        it('обрабатывает RATING_RESULT', () => {
            const query = makeSmartAppRequest({
                messageName: 'RATING_RESULT',
            });
            (query.payload as Record<string, unknown>).status_code = { code: 1 };
            (query.payload as Record<string, unknown>).rating = { estimation: 5 };
            delete (query.payload as Record<string, unknown>).message;

            adapter.setQueryData(query, controller);

            expect(controller.userEvents).toEqual({
                rating: { status: true, value: 5 },
            });
        });

        it('устанавливает isScreen=true при отсутствии capabilities', () => {
            const query = makeSmartAppRequest();
            query.payload!.device!.capabilities = {} as { screen: { available: boolean } };

            adapter.setQueryData(query, controller);

            expect(controller.isScreen).toBe(true);
        });

        it('возвращает false для null-запроса', () => {
            const result = adapter.setQueryData(
                null as unknown as ISberSmartAppWebhookRequest,
                controller,
            );
            expect(result).toBe(false);
        });
    });

    describe('getContent', () => {
        it('возвращает ответ с текстом', () => {
            const query = makeSmartAppRequest();
            adapter.setQueryData(query, controller);
            controller.text = 'Привет!';
            controller.isEnd = false;

            const result = adapter.getContent(controller);

            expect(result.messageName).toBe('ANSWER_TO_USER');
            expect(result.payload?.pronounceText).toBe('Привет!');
            expect(result.payload?.finished).toBe(false);
            expect(result.payload?.auto_listening).toBe(true);
        });

        it('добавляет emotion при наличии', () => {
            const query = makeSmartAppRequest();
            adapter.setQueryData(query, controller);
            controller.text = 'Ответ';
            controller.emotion = 'joy';

            const result = adapter.getContent(controller);

            expect(result.payload?.emotion).toEqual({ emotionId: 'joy' });
        });

        it('добавляет TTS pronounceTextType как application/ssml', () => {
            const query = makeSmartAppRequest();
            adapter.setQueryData(query, controller);
            controller.text = 'Текст';
            controller.tts = '<speak>Озвучка</speak>';

            const result = adapter.getContent(controller);

            expect(result.payload?.pronounceText).toBe('<speak>Озвучка</speak>');
            expect(result.payload?.pronounceTextType).toBe('application/ssml');
        });

        it('не помечает обычный текст со знаком «<» как SSML', () => {
            // Регрессия: эвристика ловила «< буква» и помечала обычный текст как
            // application/ssml — парсер Сбера ломался на незаэкранированных символах.
            const query = makeSmartAppRequest();
            adapter.setQueryData(query, controller);
            controller.text = 'Текст';
            controller.tts = 'Если x < y, то заплатите меньше';

            const result = adapter.getContent(controller);

            expect(result.payload?.pronounceTextType).toBe('application/text');
        });

        it('добавляет команду close_app при isEnd', () => {
            const query = makeSmartAppRequest();
            adapter.setQueryData(query, controller);
            controller.text = 'Пока';
            controller.isEnd = true;

            const result = adapter.getContent(controller);

            expect(result.payload?.finished).toBe(true);
            expect(result.payload?.auto_listening).toBe(false);
            expect(result.payload?.items).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ command: { type: 'close_app' } }),
                ]),
            );
        });

        it('добавляет кнопки в suggestions', () => {
            const query = makeSmartAppRequest();
            adapter.setQueryData(query, controller);
            controller.text = 'Выберите';
            controller.buttons.addBtn('Кнопка 1');

            const result = adapter.getContent(controller);

            expect(result.payload?.suggestions?.buttons).toBeDefined();
        });

        it('удаляет неподдерживаемые звуковые маркеры из TTS', () => {
            adapter.setQueryData(makeSmartAppRequest(), controller);
            controller.text = 'Начало #bell# конец';
            controller.sound.sounds = [{ key: '#bell#', sounds: ['bell'] }];

            const result = adapter.getContent(controller);

            expect(result.payload?.pronounceText).not.toContain('#bell#');
            expect(result.payload?.pronounceText).toContain('Начало');
            expect(result.payload?.pronounceText).toContain('конец');
        });
    });

    describe('getRatingContext', () => {
        it('возвращает CALL_RATING сообщение', () => {
            const query = makeSmartAppRequest();
            adapter.setQueryData(query, controller);

            const result = adapter.getRatingContext(controller);

            expect(result.messageName).toBe('CALL_RATING');
        });
    });

    describe('isLocalStorage', () => {
        it('возвращает true', () => {
            expect(adapter.isLocalStorage()).toBe(true);
        });
    });

    describe('send', () => {
        it('возвращает false', () => {
            expect(adapter.send()).toBe(false);
        });
    });

    describe('getQueryExample', () => {
        it('возвращает пример запроса для SmartApp', () => {
            const result = adapter.getQueryExample('тест', 'user1', 1);

            expect(result).toBeDefined();
            expect((result as Record<string, unknown>).messageName).toBe('MESSAGE_TO_SKILL');
        });
    });
});
