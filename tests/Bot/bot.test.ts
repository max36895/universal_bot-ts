import {
    Bot,
    BotController,
    UsersData,
    Telegram,
    Alisa,
    Marusia,
    Vk,
    SmartApp,
    Viber,
    MaxApp,
    T_ALISA,
    T_TELEGRAM,
    T_MARUSIA,
    T_VK,
    T_VIBER,
    T_SMARTAPP,
    T_USER_APP,
    IAlisaWebhookResponse,
    T_MAXAPP,
    IBotBotClassAndType,
    TTemplateTypeModelClass,
} from '../../src';
import { Server } from 'http';

class TestBotController extends BotController {
    constructor() {
        super();
    }

    action(intentName: string | null, isCommand?: boolean): void {
        if (isCommand) {
            this.userData.cool = true;
            return;
        }
        if (intentName === 'btn') {
            this.buttons.addBtn('1');
            this.tts = 'btn';
        } else if (intentName === 'card') {
            this.card.addImage('', 'Header');
            this.tts = 'card';
        } else if (intentName === 'setStore') {
            this.store = {
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
        //return 'test';
    }
}

class TestBot extends Bot {
    getBotClassAndType(val: TTemplateTypeModelClass | null = null): IBotBotClassAndType {
        return super._getBotClassAndType(this.getAppContext().appType, val);
    }
}

function getContent(query: string, count = 0): string {
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
            session: {},
        },
        version: '1.0',
    });
}

describe('Bot', () => {
    let bot: TestBot;

    beforeEach(() => {
        bot = new TestBot();
        //jest.spyOn(UsersData.prototype, 'whereOne').mockResolvedValue(Promise.resolve(true));
        jest.spyOn(UsersData.prototype, 'save').mockResolvedValue(Promise.resolve(true));
        jest.spyOn(UsersData.prototype, 'update').mockResolvedValue(Promise.resolve(true));
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('setPlatformParams', () => {
        it('should set config if config is provided', () => {
            const params = { intents: [{ name: 'greeting', slots: ['привет', 'здравствуйте'] }] };
            bot.setPlatformParams(params);
            expect(bot.getAppContext().platformParams).toEqual({
                ...params,
                marusia_token: null,
                telegram_token: null,
                user_id: null,
                utm_text: null,
                viber_api_version: null,
                viber_sender: null,
                viber_token: null,
                vk_api_version: null,
                vk_confirmation_token: null,
                vk_token: null,
                max_token: null,
                welcome_text: 'Текст приветствия',
                y_isAuthUser: false,
                yandex_token: null,
                app_id: null,
                help_text: 'Текст помощи',
                empty_text: 'Извините, но я вас не понимаю',
            });
        });
    });

    describe('setAppConfig', () => {
        it('should set params if params are provided', () => {
            const config = { isLocalStorage: true, error_log: './logs', json: '/../json' };
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
            });
        });
    });

    describe('_getBotClassAndType', () => {
        it('should return correct botClass and type for T_ALISA', () => {
            bot.appType = T_ALISA;
            const result = bot.getBotClassAndType();
            expect(result.botClass).toBeInstanceOf(Alisa);
            expect(result.platformType).toBe(UsersData.T_ALISA);
        });

        it('should return correct botClass and type for T_VK', () => {
            bot.appType = T_VK;
            const result = bot.getBotClassAndType();
            expect(result.botClass).toBeInstanceOf(Vk);
            expect(result.platformType).toBe(UsersData.T_VK);
        });

        it('should return correct botClass and type for T_TELEGRAM', () => {
            bot.appType = T_TELEGRAM;
            const result = bot.getBotClassAndType();
            expect(result.botClass).toBeInstanceOf(Telegram);
            expect(result.platformType).toBe(UsersData.T_TELEGRAM);
        });

        it('should return correct botClass and type for T_VIBER', () => {
            bot.appType = T_VIBER;
            const result = bot.getBotClassAndType();
            expect(result.botClass).toBeInstanceOf(Viber);
            expect(result.platformType).toBe(UsersData.T_VIBER);
        });

        it('should return correct botClass and type for T_MARUSIA', () => {
            bot.appType = T_MARUSIA;
            const result = bot.getBotClassAndType();
            expect(result.botClass).toBeInstanceOf(Marusia);
            expect(result.platformType).toBe(UsersData.T_MARUSIA);
        });

        it('should return correct botClass and type for T_SMARTAPP', () => {
            bot.appType = T_SMARTAPP;
            const result = bot.getBotClassAndType();
            expect(result.botClass).toBeInstanceOf(SmartApp);
            expect(result.platformType).toBe(UsersData.T_SMART_APP);
        });

        it('should return correct botClass and type for T_MAX', () => {
            bot.appType = T_MAXAPP;
            const result = bot.getBotClassAndType();
            expect(result.botClass).toBeInstanceOf(MaxApp);
            expect(result.platformType).toBe(UsersData.T_MAX_APP);
        });

        it('should return correct botClass and type for T_USER_APP', () => {
            bot.appType = T_USER_APP;
            const result = bot.getBotClassAndType(Vk);
            expect(result.platformType).toBe(UsersData.T_USER_APP);
        });
    });

    describe('run', () => {
        it('should throw error for empty request', async () => {
            bot.setLogger({
                error: (_: string) => {},
                warn: () => {},
            });
            await expect(bot.run()).rejects.toThrow('Alisa:init(): Отправлен пустой запрос!');
        });

        it('should return result if botClass is set and init is successful', async () => {
            bot.initBotController(TestBotController);
            bot.appType = T_USER_APP;
            const result = {
                version: '1.0',
                response: {
                    buttons: [],
                    tts: 'Привет!',
                    text: 'Привет!',
                    end_session: false,
                },
            };
            jest.spyOn(Alisa.prototype, 'setLocalStorage').mockResolvedValue(undefined);
            jest.spyOn(Alisa.prototype, 'getRatingContext').mockResolvedValue(result);
            jest.spyOn(Alisa.prototype, 'getError').mockReturnValue(null);

            expect(await bot.run(Alisa, T_USER_APP, getContent('Привет'))).toEqual(result);
            jest.resetAllMocks();
        });

        it('should throw error if botClass is set and init is unsuccessful', async () => {
            bot.initBotController(TestBotController);
            bot.appType = T_USER_APP;
            const error = 'Alisa:init(): Отправлен пустой запрос!';
            jest.spyOn(Alisa.prototype, 'getError').mockReturnValue(error);
            bot.setLogger({
                error: (_: string) => {},
                warn: () => {},
            });
            await expect(bot.run(Alisa, T_USER_APP, '')).rejects.toThrow(error);
        });

        it('added user command', async () => {
            bot.initBotController(TestBotController);
            bot.appType = T_USER_APP;
            jest.spyOn(Alisa.prototype, 'setLocalStorage').mockResolvedValue(undefined);
            jest.spyOn(Alisa.prototype, 'getError').mockReturnValue(null);
            bot.addCommand('cool', ['cool'], (_, botC) => {
                botC.text = 'cool';
                botC.userData.cool = true;
            });
            let botController: TestBotController = new TestBotController();
            bot.use((controller: TestBotController, next) => {
                botController = controller;
                return next();
            });

            let res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('cool', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            // Убеждаемся что пользовательские данные скинулись, так как они хранятся в сессии.
            expect(botController.userData.cool).toBe(undefined);

            bot.removeCommand('cool');
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('cool', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('test');
        });

        it('local store', async () => {
            bot.initBotController(TestBotController);
            bot.appType = T_USER_APP;
            bot.setPlatformParams({
                intents: [{ name: 'setStore', slots: ['сохранить'] }],
            });
            bot.setAppConfig({ isLocalStorage: true });
            jest.spyOn(Alisa.prototype, 'getError').mockReturnValue(null);
            const res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('сохранить', 2),
            )) as IAlisaWebhookResponse;
            expect(res.session_state).toEqual({ data: 'test' });
        });

        it('skill started', async () => {
            bot.initBotController(TestBotController);
            bot.appType = T_ALISA;
            bot.setPlatformParams({
                intents: [
                    { name: 'btn', slots: ['кнопка'] },
                    { name: 'card', slots: ['карточка'] },
                ],
            });
            bot.setAppConfig({ isLocalStorage: true });

            expect(await bot.run(Alisa, T_ALISA, getContent('test'))).toEqual({
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

            expect(await bot.run(Alisa, T_ALISA, getContent('test'))).toEqual({
                response: {
                    end_session: false,
                    buttons: [],
                    text: 'test',
                    tts: 'test',
                },
                version: '1.0',
            });
            expect(await bot.run(Alisa, T_ALISA, getContent('кнопка'))).toEqual({
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
            expect(await bot.run(Alisa, T_ALISA, getContent('карточка'))).toEqual({
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

    describe('request-scoped', () => {
        it('should not use shared controller', async () => {
            bot.initBotController(TestBotController);
            bot.appType = T_USER_APP;
            const botClass = new Alisa(bot.getAppContext());
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
            jest.spyOn(botClass, 'setLocalStorage').mockResolvedValue(undefined);
            jest.spyOn(botClass, 'getRatingContext').mockResolvedValue(result1);
            jest.spyOn(botClass, 'getError').mockReturnValue(null);

            const run1 = bot.run(Alisa, T_USER_APP, getContent('привет'));
            const run2 = bot.run(Alisa, T_USER_APP, getContent('пока'));
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
    describe('custom', () => {
        it('setCustomCommandResolver', async () => {
            bot.addCommand('hi', ['привет'], (_, bc) => {
                bc.text = 'Привет!';
            });
            bot.addCommand('by', ['пока'], (_, bc) => {
                bc.text = 'Пока!';
            });
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
            const run1 = await bot.run(Alisa, T_USER_APP, getContent('привет'));
            const run2 = await bot.run(Alisa, T_USER_APP, getContent('пока'));
            expect(run1).toEqual(result2);
            expect(run2).toEqual(result1);
        });
    });

    describe('findCommand', () => {
        it('not used group and not regexp', async () => {
            bot.initBotController(TestBotController);
            bot.appType = T_USER_APP;
            jest.spyOn(Alisa.prototype, 'setLocalStorage').mockResolvedValue(undefined);
            jest.spyOn(Alisa.prototype, 'getError').mockReturnValue(null);
            bot.addCommand('cool', ['cool'], (_, botC) => {
                botC.text = 'cool';
            });
            let res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('cool', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            for (let i = 0; i < 50; i++) {
                bot.addCommand(`test_${i}`, [`test_${i}`], () => {
                    return 'empty';
                });
            }
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('cool', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            bot.addCommand('my', ['hello'], (_, botC) => {
                botC.text = 'hello';
            });
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            for (let i = 50; i < 150; i++) {
                bot.addCommand(`test_${i}`, [`test_${i}`], () => {
                    return 'empty';
                });
            }
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.addCommand('my', ['by'], (_, botC) => {
                botC.text = 'by';
            });
            res = (await bot.run(Alisa, T_USER_APP, getContent('by', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('by');
        });

        it('not used group(many command) and not regexp', async () => {
            bot.initBotController(TestBotController);
            bot.appType = T_USER_APP;
            jest.spyOn(Alisa.prototype, 'setLocalStorage').mockResolvedValue(undefined);
            jest.spyOn(Alisa.prototype, 'getError').mockReturnValue(null);
            bot.addCommand('cool', ['cool'], (_, botC) => {
                botC.text = 'cool';
            });
            for (let i = 0; i < 300; i++) {
                bot.addCommand(`test_${i}`, [`test_${i}`], () => {
                    return 'empty';
                });
            }
            let res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('cool', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            bot.addCommand('my', ['hello'], (_, botC) => {
                botC.text = 'hello';
            });
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            for (let i = 0; i < 150; i++) {
                bot.addCommand(`test_${i}_${i}`, [`test_${i}_${i}`], () => {
                    return 'empty_' + i;
                });
            }
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.addCommand('by', ['by'], (_, botC) => {
                botC.text = 'by';
            });
            res = (await bot.run(Alisa, T_USER_APP, getContent('by', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('by');
        });

        it('not used group and used regexp', async () => {
            bot.initBotController(TestBotController);
            bot.appType = T_USER_APP;
            jest.spyOn(Alisa.prototype, 'setLocalStorage').mockResolvedValue(undefined);
            jest.spyOn(Alisa.prototype, 'getError').mockReturnValue(null);
            bot.addCommand(
                'cool',
                ['cool'],
                (_, botC) => {
                    botC.text = 'cool';
                },
                true,
            );
            let res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('cool', 2),
            )) as IAlisaWebhookResponse;
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
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('cool', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            bot.addCommand(
                'my',
                ['hello'],
                (_, botC) => {
                    botC.text = 'hello';
                },
                true,
            );
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
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
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.addCommand(
                'by',
                ['by'],
                (_, botC) => {
                    botC.text = 'by';
                },
                true,
            );
            res = (await bot.run(Alisa, T_USER_APP, getContent('by', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('by');
        });

        it('used group and used regexp', async () => {
            bot.initBotController(TestBotController);
            bot.appType = T_USER_APP;
            jest.spyOn(Alisa.prototype, 'setLocalStorage').mockResolvedValue(undefined);
            jest.spyOn(Alisa.prototype, 'getError').mockReturnValue(null);
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
            let res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('cool', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            bot.addCommand(
                'my',
                ['hello'],
                (_, botC) => {
                    botC.text = 'hello';
                },
                true,
            );
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
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
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.addCommand(
                'by',
                ['by'],
                (_, botC) => {
                    botC.text = 'by';
                },
                true,
            );
            res = (await bot.run(Alisa, T_USER_APP, getContent('by', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('by');
        });

        it('used group and used find text and regexp', async () => {
            bot.initBotController(TestBotController);
            bot.appType = T_USER_APP;
            jest.spyOn(Alisa.prototype, 'setLocalStorage').mockResolvedValue(undefined);
            jest.spyOn(Alisa.prototype, 'getError').mockReturnValue(null);
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
            let res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('cool', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');

            bot.addCommand(
                'no group',
                ['group'],
                (_, botC) => {
                    botC.text = 'no group';
                },
                true,
            );
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('no group', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('no group');

            bot.addCommand(
                'my',
                ['hello'],
                (_, botC) => {
                    botC.text = 'hello';
                },
                true,
            );
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
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
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.addCommand(
                'by',
                ['by'],
                (_, botC) => {
                    botC.text = 'by';
                },
                true,
            );
            res = (await bot.run(Alisa, T_USER_APP, getContent('by', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('by');
        });

        it('used group and removeCommand', async () => {
            bot.initBotController(TestBotController);
            bot.appType = T_USER_APP;
            jest.spyOn(Alisa.prototype, 'setLocalStorage').mockResolvedValue(undefined);
            jest.spyOn(Alisa.prototype, 'getError').mockReturnValue(null);
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
            let res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('cool', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');

            bot.addCommand(
                'no group',
                ['group'],
                (_, botC) => {
                    botC.text = 'no group';
                },
                true,
            );
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('no group', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('no group');

            bot.addCommand(
                'my',
                ['hello'],
                (_, botC) => {
                    botC.text = 'hello';
                },
                true,
            );
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
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
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.addCommand(
                'by',
                ['by'],
                (_, botC) => {
                    botC.text = 'by';
                },
                true,
            );
            res = (await bot.run(Alisa, T_USER_APP, getContent('by', 2))) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('by');
            bot.removeCommand('text_299_299');
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
            bot.removeCommand('text_291_291');
            res = (await bot.run(
                Alisa,
                T_USER_APP,
                getContent('hello', 2),
            )) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('hello');
        });
    });
});
