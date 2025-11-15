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
import { AppContext } from '../../src/core/AppContext';

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
        return super._getBotClassAndType(this._appContext.appType, val);
    }

    public get appContext(): AppContext {
        return this._appContext;
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
            expect(bot.appContext.platformParams).toEqual({
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
            expect(bot.appContext.appConfig).toEqual({
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
                log: (_: string) => {},
                error: (_: string) => {},
                warn: () => {},
            });
            await expect(bot.run()).rejects.toThrow('Alisa:init(): Отправлен пустой запрос!');
        });

        it('should return result if botClass is set and init is successful', async () => {
            bot.initBotControllerClass(TestBotController);
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
            bot.initBotControllerClass(TestBotController);
            bot.appType = T_USER_APP;
            const error = 'Alisa:init(): Отправлен пустой запрос!';
            jest.spyOn(Alisa.prototype, 'getError').mockReturnValue(error);
            bot.setLogger({
                log: (_: string) => {},
                error: (_: string) => {},
                warn: () => {},
            });
            await expect(bot.run(Alisa, T_USER_APP, '')).rejects.toThrow(error);
        });

        it('added user command', async () => {
            bot.initBotControllerClass(TestBotController);
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
            bot.initBotControllerClass(TestBotController);
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
            bot.initBotControllerClass(TestBotController);
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
            bot.initBotControllerClass(TestBotController);
            bot.appType = T_USER_APP;
            const botClass = new Alisa(bot.appContext);
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
});
