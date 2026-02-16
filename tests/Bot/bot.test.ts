import { Bot, BotController, IPlatformData, IUserData, UsersData } from '../../src';
import { T_ALISA, AlisaAdapter, FileAdapter, IAlisaWebhookResponse } from '../../src/plugins';
import { Server } from 'http';

class TestBotController extends BotController {
    constructor() {
        super();
    }

    action(intentName: string | null, isCommand?: boolean, isStep?: boolean): void {
        if (isCommand) {
            this.userData.cool = true;
            return;
        }
        if (isStep) {
            return;
        }
        if (intentName === 'btn') {
            this.buttons.addBtn('1');
            this.tts = 'btn';
        } else if (intentName === 'card') {
            this.card.addImage('', 'Header');
            this.tts = 'card';
        } else if (intentName === 'setStore') {
            this.state = {
                data: 'test',
            };
            return;
        }
        this.text = 'test';
        if (this.userCommand === 'привет') {
            this.text = 'Привет!';
        }
        if (this.userCommand === 'пока') {
            this.text = 'Пока!';
        }
    }
}

class TestBot extends Bot {}

function getContent(query: string, count = 0, state: object = {}): string {
    return JSON.stringify({
        meta: {
            locale: 'ru-Ru',
            timezone: 'UTC',
            client_id: 'yandex.searchplugin_local',
            interfaces: {
                payments: null,
                account_linking: null,
                screen: true,
            },
        },
        session: {
            message_id: count,
            session_id: 'local',
            skill_id: 'local_test',
            user_id: 'test',
            new: count === 0,
        },
        request: {
            command: query.toLowerCase(),
            original_utterance: query,
            nlu: {},
            type: 'SimpleUtterance',
        },
        state: {
            session: state,
        },
        version: '1.0',
    });
}

let saveSpy: any;
let updateSpy: any;
describe('Bot', () => {
    let bot: TestBot;

    beforeEach(() => {
        bot = new TestBot();
        bot.use(new FileAdapter());
        saveSpy = jest.spyOn(UsersData.prototype, 'save').mockResolvedValue(Promise.resolve(true));
        updateSpy = jest
            .spyOn(UsersData.prototype, 'update')
            .mockResolvedValue(Promise.resolve(true));
    });

    afterEach(() => {
        jest.resetAllMocks();
        bot.close();
    });

    describe('setPlatformParams', () => {
        it('should set config if config is provided', () => {
            const params = { intents: [{ name: 'greeting', slots: ['привет', 'здравствуйте'] }] };
            bot.setPlatformParams(params);
            expect(bot.getAppContext().platformParams).toEqual({
                ...params,
                utm_text: null,
                welcome_text: 'Текст приветствия',
                isAuthUser: false,
                help_text: 'Текст помощи',
                empty_text: 'Извините, но я вас не понимаю',
            });
        });
    });

    describe('setAppConfig', () => {
        it('should set params if params are provided', () => {
            const config = {
                isLocalStorage: true,
                error_log: './logs',
                json: '/../json',
                tokens: {},
                env: '',
            };
            bot.setAppConfig(config);
            expect(bot.getAppContext().appConfig).toEqual({
                ...config,
                json: '/../json',
                db: {
                    database: '',
                    host: '',
                    pass: '',
                    user: '',
                },
                tokens: {},
            });
        });
    });

    describe('run', () => {
        it('should throw error for empty request', async () => {
            bot.setLogger({
                error: () => {},
                warn: () => {},
            });
            await expect(bot.run()).rejects.toThrow(
                'Не удалось определить платформу, от которой пришел запрос.',
            );
        });

        it('should return result if botClass is set and init is successful', async () => {
            bot.initBotController(TestBotController);
            const result = {
                version: '1.0',
                response: {
                    buttons: [],
                    tts: 'Привет!',
                    text: 'Привет!',
                    end_session: false,
                },
            };
            jest.spyOn(AlisaAdapter.prototype, 'getRatingContext').mockResolvedValue(result);

            bot.use(new AlisaAdapter());

            expect(await bot.run(T_ALISA, getContent('Привет'))).toEqual(result);
            jest.resetAllMocks();
        });

        it('should throw error if botClass is set and init is unsuccessful', async () => {
            bot.initBotController(TestBotController);
            const error =
                'Для платформы "alisa", передано пустое содержимое, корректно обработать запрос невозможно';
            bot.setLogger({
                error: (_: string) => {},
                warn: () => {},
            });
            bot.use(new AlisaAdapter());
            await expect(bot.run(T_ALISA, '')).rejects.toThrow(error);
        });

        it('added user command', async () => {
            bot.initBotController(TestBotController);
            bot.addCommand('cool', ['cool'], (_, botC) => {
                botC.text = 'cool';
                botC.userData.cool = true;
            });
            let botController: TestBotController = new TestBotController();
            bot.use((controller: TestBotController, next) => {
                botController = controller;
                return next();
            });

            bot.use(new AlisaAdapter());
            let res = (await bot.run(T_ALISA, getContent('cool', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            // Убеждаемся что пользовательские данные скинулись, так как они хранятся в сессии.
            expect(botController.userData.cool).toBe(undefined);

            bot.removeCommand('cool');
            res = (await bot.run(T_ALISA, getContent('cool', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('test');
        });

        it('added user step', async () => {
            bot.setAppConfig({
                isLocalStorage: true,
            });
            bot.initBotController(TestBotController);
            bot.addCommand('cool', ['cool'], (_, botC) => {
                botC.text = 'cool';
                botC.userData.cool = true;
                botC.thisIntentName = 'cool_step';
            });
            bot.addStep('cool_step', (botC) => {
                botC.text = 'coolStep';
                botC.userData.coolStep = true;
                if (botC.userCommand === 'cool2') {
                    botC.thisIntentName = null;
                } else {
                    botC.thisIntentName = 'cool_step';
                }
            });

            bot.use(new AlisaAdapter());
            let res = (await bot.run(T_ALISA, getContent('cool', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');

            res = (await bot.run(
                T_ALISA,
                getContent('cool', 2, {
                    oldIntentName: 'cool_step',
                }),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('coolStep');

            res = (await bot.run(
                T_ALISA,
                getContent('cool2', 2, res.session_state as object),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('coolStep');
            res = (await bot.run(
                T_ALISA,
                getContent('c00l2', 2, res.session_state as object),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('test');
            bot.removeStep('cool_step');

            res = (await bot.run(
                T_ALISA,
                getContent('cool', 2, res.session_state as object),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            // Убеждаемся что не попали в шаг после удаления
            res = (await bot.run(
                T_ALISA,
                getContent('c00l', 2, res.session_state as object),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('test');
            bot.removeCommand('cool');

            // Просто на всякий случай
            bot.clearSteps();
            bot.clearCommands();
        });

        it('local store', async () => {
            const tBot = new TestBot();
            tBot.initBotController(TestBotController);
            tBot.setPlatformParams({
                intents: [{ name: 'setStore', slots: ['сохранить'] }],
            });
            tBot.setAppConfig({ isLocalStorage: true });
            tBot.use(new AlisaAdapter());
            const res = (await tBot.run(
                T_ALISA,
                getContent('сохранить', 2),
            )) as IAlisaWebhookResponse;
            expect(res.session_state).toEqual({ data: 'test' });
        });

        it('skill started', async () => {
            bot.initBotController(TestBotController);
            bot.use(new AlisaAdapter());
            bot.setPlatformParams({
                intents: [
                    { name: 'btn', slots: ['кнопка'] },
                    { name: 'card', slots: ['карточка'] },
                ],
            });
            bot.setAppConfig({ isLocalStorage: true });

            expect(await bot.run(T_ALISA, getContent('test'))).toEqual({
                response: {
                    end_session: false,
                    buttons: [],
                    text: 'test',
                    tts: 'test',
                },
                session_state: {},
                version: '1.0',
            });
            bot.setAppConfig({ isLocalStorage: false });

            expect(await bot.run(T_ALISA, getContent('test'))).toEqual({
                response: {
                    end_session: false,
                    buttons: [],
                    text: 'test',
                    tts: 'test',
                },
                version: '1.0',
            });
            expect(await bot.run(T_ALISA, getContent('кнопка'))).toEqual({
                response: {
                    end_session: false,
                    buttons: [
                        {
                            hide: true,
                            title: '1',
                        },
                    ],
                    text: 'test',
                    tts: 'btn',
                },
                version: '1.0',
            });
            expect(await bot.run(T_ALISA, getContent('карточка'))).toEqual({
                response: {
                    card: {
                        header: {
                            text: '',
                        },
                        items: [
                            {
                                description: ' ',
                                title: 'Header',
                            },
                        ],
                        type: 'ItemsList',
                    },
                    end_session: false,
                    buttons: [],
                    text: 'test',
                    tts: 'card',
                },
                version: '1.0',
            });
        });
    });

    describe('saved state and DB', () => {
        it('get state is not isLocalStorage', async () => {
            const tBot = new TestBot();
            tBot.initBotController(TestBotController);
            let bUserData: IUserData = {};
            let bState: IPlatformData | null = {};
            tBot.addCommand('cool', ['cool002'], (_, botC) => {
                botC.text = 'cool';
                bUserData = botC.userData;
                bState = botC.state;
            });

            tBot.use(new AlisaAdapter());
            const res = (await tBot.run(
                T_ALISA,
                getContent('cool002', 2, {
                    test: 'test',
                }),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            expect(res.session_state?.test).toBe('test');
            expect(bState?.test).toBe('test');
            expect(bUserData?.test).toBe(undefined);

            tBot.clearCommands();
        });
        it('saved state and not DB', async () => {
            const tBot = new TestBot();
            tBot.setAppConfig({
                isLocalStorage: true,
            });
            tBot.initBotController(TestBotController);
            tBot.addCommand('cool', ['cool002'], (_, botC) => {
                botC.text = 'cool';
                botC.userData.cool = true;
                botC.state = {
                    cool2: true,
                };
            });

            tBot.use(new AlisaAdapter());
            const res = (await tBot.run(
                T_ALISA,
                getContent('cool002', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            expect(res.session_state?.cool).toBe(true);
            tBot.clearCommands();
        });
        it('saved state. used userData, empty state', async () => {
            bot.setAppConfig({
                isLocalStorage: true,
            });
            bot.use(new FileAdapter());
            bot.initBotController(TestBotController);
            bot.addCommand('cool', ['cool001'], (_, botC) => {
                botC.state = null;
                botC.text = 'cool';
                botC.userData.cool = true;
            });
            saveSpy.mockRestore();
            updateSpy.mockRestore();
            bot.use(new AlisaAdapter());
            const userData = new UsersData(bot.getAppContext());
            userData.platform = T_ALISA;
            userData.userId = 'test';
            userData.remove();
            const res = (await bot.run(T_ALISA, getContent('cool001', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            expect(res.session_state?.cool).toBe(true);
            const select = await userData.selectOne();
            expect(select.status).toBe(false);
            bot.clearCommands();
            await userData.remove();
            await bot.close();
        });

        it('saved state and DB', async () => {
            bot.setAppConfig({
                isLocalStorage: true,
            });
            bot.use(new FileAdapter());
            bot.initBotController(TestBotController);
            bot.addCommand('cool', ['cool004'], (_, botC) => {
                botC.text = 'cool';
                botC.userData.cool = true;
                botC.state = {
                    cool2: true,
                };
            });
            saveSpy.mockRestore();
            updateSpy.mockRestore();
            bot.use(new AlisaAdapter());
            const res = (await bot.run(T_ALISA, getContent('cool004', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');

            expect(res.session_state?.cool2).toBe(true);
            const userData = new UsersData(bot.getAppContext());
            userData.platform = T_ALISA;
            userData.userId = 'test';
            const select = await userData.selectOne();
            expect(JSON.parse(select.data?.data as string).cool).toBe(true);
            bot.clearCommands();
            await userData.remove();
            await bot.close();
        });

        it('get correct state and userData', async () => {
            bot.setAppConfig({
                isLocalStorage: true,
            });
            bot.use(new FileAdapter());
            bot.initBotController(TestBotController);
            bot.addCommand('cool', ['cool123'], (_, botC) => {
                botC.text = 'cool';
                botC.userData.test1 = true;
                botC.state = {
                    test2: true,
                };
            });
            let bUserData: IUserData = {};
            let bState: IPlatformData | null = {};
            let bBotController: BotController | undefined;
            bot.addCommand('getValue', ['state-value'], (_, botC) => {
                bUserData = botC.userData;
                bState = botC.state;
                bBotController = botC;
                botC.text = 'getValue';
            });
            saveSpy.mockRestore();
            updateSpy.mockRestore();
            bot.use(new AlisaAdapter());
            let res = (await bot.run(T_ALISA, getContent('cool123', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            expect(res.session_state?.test2).toBe(true);
            const userData = new UsersData(bot.getAppContext());
            userData.platform = T_ALISA;
            userData.userId = 'test';
            const select = await userData.selectOne();
            expect(JSON.parse(select.data?.data as string).test1).toBe(true);

            res = (await bot.run(
                T_ALISA,
                getContent('state-value', 2, res.session_state),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('getValue');

            expect(bUserData.test1).toBe(undefined);
            expect(bState.test2).toBe(true);
            bot.setAppConfig({
                isLocalStorage: false,
            });
            res = (await bot.run(
                T_ALISA,
                getContent('state-value', 2, res.session_state),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('getValue');
            expect(bUserData.test1).toBe(true);
            expect(bState.test2).toBe(true);

            await userData.remove();
            bBotController?.clearStoreData();

            bot.setAppConfig({
                isLocalStorage: true,
            });
            res = (await bot.run(
                T_ALISA,
                getContent('state-value', 2, res.session_state),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('getValue');

            expect(bUserData === bState).toBe(true);
            expect(bState.test2).toBe(true);
            expect((await userData.selectOne()).status).toBe(false);

            bot.clearCommands();
            await userData.remove();
            await bot.close();
        });
    });

    describe('request-scoped', () => {
        it('should not use shared controller', async () => {
            bot.initBotController(TestBotController);
            const result1 = {
                version: '1.0',
                response: {
                    buttons: [],
                    tts: 'Привет!',
                    text: 'Привет!',
                    end_session: false,
                },
            };
            const result2 = {
                version: '1.0',
                response: {
                    buttons: [],
                    tts: 'Пока!',
                    text: 'Пока!',
                    end_session: false,
                },
            };
            jest.spyOn(AlisaAdapter.prototype, 'getRatingContext').mockResolvedValue(result1);

            bot.use(new AlisaAdapter());

            const run1 = bot.run(T_ALISA, getContent('привет'));
            const run2 = bot.run(T_ALISA, getContent('пока'));
            let resp: (value: unknown) => void;
            const pr = new Promise((resolve) => (resp = resolve));
            let res1;
            let res2;
            run1.then((res) => {
                res1 = res;
                run2.then((res_2) => {
                    res2 = res_2;
                    resp(true);
                });
            });

            await pr;
            expect(res1).toEqual(result1);
            expect(res2).toEqual(result2);
        });
    });

    describe('start', () => {
        it('should start server on specified hostname and port', async () => {
            const hostname = 'localhost';
            const port = 3000;
            const server = bot.start(hostname, port);
            // Ожидаем, пока сервер начнёт слушать порт
            await new Promise<void>((resolve) => {
                server!.on('listening', resolve);
                server!.on('error', resolve);
            });
            expect(server).toBeInstanceOf(Server);
            bot.close();
            expect(server.listening).toBe(false);
        });
    });
    describe('custom resolver', () => {
        it('setCustomCommandResolver', async () => {
            bot.addCommand('hi', ['привет'], (_, bc) => {
                bc.text = 'Привет!';
            });
            bot.addCommand('by', ['пока'], (_, bc) => {
                bc.text = 'Пока!';
            });
            bot.use(new AlisaAdapter());
            bot.initBotController(TestBotController);
            bot.setCustomCommandResolver((userCommand, commands) => {
                if (commands.has('hi') || commands.has('by')) {
                    if (userCommand === 'привет') {
                        return 'by';
                    }
                    return 'hi';
                }
                return null;
            });
            const result1 = {
                version: '1.0',
                response: {
                    buttons: [],
                    tts: 'Привет!',
                    text: 'Привет!',
                    end_session: false,
                },
            };
            const result2 = {
                version: '1.0',
                response: {
                    buttons: [],
                    tts: 'Пока!',
                    text: 'Пока!',
                    end_session: false,
                },
            };
            const run1 = await bot.run(T_ALISA, getContent('привет'));
            const run2 = await bot.run(T_ALISA, getContent('пока'));
            expect(run1).toEqual(result2);
            expect(run2).toEqual(result1);
        });
    });

    describe('findCommand', () => {
        it('not used group and not regexp', async () => {
            bot.initBotController(TestBotController);
            bot.addCommand('cool', ['cool'], (_, botC) => {
                botC.text = 'cool';
            });
            bot.use(new AlisaAdapter());
            let res = (await bot.run(T_ALISA, getContent('cool', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            for (let i = 0; i < 50; i++) {
                bot.addCommand(`test_${i}`, [`test_${i}`], () => {
                    return 'empty';
                });
            }
            res = (await bot.run(T_ALISA, getContent('cool', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            bot.addCommand('my', ['hello'], (_, botC) => {
                botC.text = 'hello';
            });
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            for (let i = 50; i < 150; i++) {
                bot.addCommand(`test_${i}`, [`test_${i}`], () => {
                    return 'empty';
                });
            }
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.addCommand('my', ['by'], (_, botC) => {
                botC.text = 'by';
            });
            res = (await bot.run(T_ALISA, getContent('by', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('by');
        });

        it('not used group(many command) and not regexp', async () => {
            bot.initBotController(TestBotController);
            bot.addCommand('cool', ['cool'], (_, botC) => {
                botC.text = 'cool';
            });
            for (let i = 0; i < 300; i++) {
                bot.addCommand(`test_${i}`, [`test_${i}`], () => {
                    return 'empty';
                });
            }
            bot.use(new AlisaAdapter());
            let res = (await bot.run(T_ALISA, getContent('cool', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            bot.addCommand('my', ['hello'], (_, botC) => {
                botC.text = 'hello';
            });
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            for (let i = 0; i < 150; i++) {
                bot.addCommand(`test_${i}_${i}`, [`test_${i}_${i}`], () => {
                    return 'empty_' + i;
                });
            }
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.addCommand('by', ['by'], (_, botC) => {
                botC.text = 'by';
            });
            res = (await bot.run(T_ALISA, getContent('by', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('by');
        });

        it('not used group and used regexp', async () => {
            bot.initBotController(TestBotController);
            bot.addCommand(
                'cool',
                ['cool'],
                (_, botC) => {
                    botC.text = 'cool';
                },
                true,
            );
            bot.use(new AlisaAdapter());
            let res = (await bot.run(T_ALISA, getContent('cool', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            for (let i = 0; i < 50; i++) {
                bot.addCommand(
                    `test_${i}`,
                    [`test_${i}`],
                    () => {
                        return 'empty';
                    },
                    true,
                );
            }
            res = (await bot.run(T_ALISA, getContent('cool', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            bot.addCommand(
                'my',
                ['hello'],
                (_, botC) => {
                    botC.text = 'hello';
                },
                true,
            );
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            for (let i = 50; i < 150; i++) {
                bot.addCommand(
                    `test_${i}`,
                    [`test_${i}`],
                    () => {
                        return 'empty';
                    },
                    true,
                );
            }
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.addCommand(
                'by',
                ['by'],
                (_, botC) => {
                    botC.text = 'by';
                },
                true,
            );
            res = (await bot.run(T_ALISA, getContent('by', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('by');
        });

        it('used group and used regexp', async () => {
            bot.initBotController(TestBotController);
            bot.addCommand(
                'cool',
                ['cool'],
                (_, botC) => {
                    botC.text = 'cool';
                },
                true,
            );
            for (let i = 0; i < 300; i++) {
                bot.addCommand(
                    `test_${i}`,
                    [`test_${i}`],
                    () => {
                        return 'empty';
                    },
                    true,
                );
            }
            bot.use(new AlisaAdapter());
            let res = (await bot.run(T_ALISA, getContent('cool', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            bot.addCommand(
                'my',
                ['hello'],
                (_, botC) => {
                    botC.text = 'hello';
                },
                true,
            );
            await new Promise((res) => setTimeout(res, 200));
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            for (let i = 0; i < 150; i++) {
                bot.addCommand(
                    `test_${i}_${i}`,
                    [`test_${i}_${i}`],
                    () => {
                        return 'empty_' + i;
                    },
                    true,
                );
            }
            await new Promise((res) => setTimeout(res, 200));
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.addCommand(
                'by',
                ['by'],
                (_, botC) => {
                    botC.text = 'by';
                },
                true,
            );
            await new Promise((res) => setTimeout(res, 200));
            res = (await bot.run(T_ALISA, getContent('by', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('by');
        });

        it('used group and used find text and regexp', async () => {
            bot.initBotController(TestBotController);
            bot.addCommand(
                'cool',
                ['cool'],
                (_, botC) => {
                    botC.text = 'cool';
                },
                true,
            );
            for (let i = 0; i < 300; i++) {
                bot.addCommand(
                    `test_${i}`,
                    [`test_${i}`],
                    () => {
                        return 'empty';
                    },
                    i % 50 !== 0,
                );
            }
            await new Promise((res) => setTimeout(res, 200));
            bot.use(new AlisaAdapter());
            let res = (await bot.run(T_ALISA, getContent('cool', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');

            bot.addCommand(
                'no group',
                ['group'],
                (_, botC) => {
                    botC.text = 'no group';
                },
                true,
            );
            await new Promise((res) => setTimeout(res, 200));
            res = (await bot.run(T_ALISA, getContent('no group', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('no group');

            bot.addCommand(
                'my',
                ['hello'],
                (_, botC) => {
                    botC.text = 'hello';
                },
                true,
            );
            await new Promise((res) => setTimeout(res, 200));
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            for (let i = 0; i < 300; i++) {
                bot.addCommand(
                    `test_${i}_${i}`,
                    [`test_${i}_${i}`],
                    () => {
                        return 'empty_' + i;
                    },
                    i % 50 !== 0,
                );
            }
            await new Promise((res) => setTimeout(res, 200));
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.addCommand(
                'by',
                ['by'],
                (_, botC) => {
                    botC.text = 'by';
                },
                true,
            );
            await new Promise((res) => setTimeout(res, 200));
            res = (await bot.run(T_ALISA, getContent('by', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('by');
        });

        it('used group and removeCommand', async () => {
            bot.initBotController(TestBotController);
            bot.addCommand(
                'cool',
                ['cool'],
                (_, botC) => {
                    botC.text = 'cool';
                },
                true,
            );
            for (let i = 0; i < 300; i++) {
                bot.addCommand(
                    `test_${i}`,
                    [`test_${i}`],
                    () => {
                        return 'empty';
                    },
                    i % 30 !== 0,
                );
            }
            await new Promise((res) => setTimeout(res, 200));
            bot.use(new AlisaAdapter());
            let res = (await bot.run(T_ALISA, getContent('cool', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');

            bot.addCommand(
                'no group',
                ['group'],
                (_, botC) => {
                    botC.text = 'no group';
                },
                true,
            );
            res = (await bot.run(T_ALISA, getContent('no group', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('no group');

            bot.addCommand(
                'my',
                ['hello'],
                (_, botC) => {
                    botC.text = 'hello';
                },
                true,
            );
            await new Promise((res) => setTimeout(res, 200));
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            for (let i = 0; i < 300; i++) {
                bot.addCommand(
                    `test_${i}_${i}`,
                    [`test_${i}_${i}`],
                    () => {
                        return 'empty_' + i;
                    },
                    i % 30 !== 0,
                );
            }
            await new Promise((res) => setTimeout(res, 200));
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.addCommand(
                'by',
                ['by'],
                (_, botC) => {
                    botC.text = 'by';
                },
                true,
            );
            await new Promise((res) => setTimeout(res, 200));
            res = (await bot.run(T_ALISA, getContent('by', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('by');
            bot.removeCommand('text_299_299');
            await new Promise((res) => setTimeout(res, 200));
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.removeCommand('text_291_291');
            await new Promise((res) => setTimeout(res, 200));
            res = (await bot.run(T_ALISA, getContent('hello', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
        });
    });
});
