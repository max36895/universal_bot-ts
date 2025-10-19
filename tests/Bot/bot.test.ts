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
    TemplateTypeModel,
    IAlisaWebhookResponse,
    T_MAXAPP,
    IBotBotClassAndType,
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
        //return 'test';
    }
}

class TestBot extends Bot {
    getBotClassAndType(val: TemplateTypeModel | null = null): IBotBotClassAndType {
        return super._getBotClassAndType(val);
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
            client_id: 'local',
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
    let botController: TestBotController;
    let usersData: UsersData;
    let vk: Vk;

    beforeEach(() => {
        bot = new TestBot();
        botController = new TestBotController();
        usersData = new UsersData(bot.appContext);
        vk = new Vk(bot.appContext);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('initParams', () => {
        it('should set config if config is provided', () => {
            const params = { intents: [{ name: 'greeting', slots: ['привет', 'здравствуйте'] }] };
            bot.initPlatformParams(params);
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
            });
        });
    });

    describe('initAppConfig', () => {
        it('should set params if params are provided', () => {
            const config = { isLocalStorage: true, error_log: './logs' };
            bot.initAppConfig(config);
            expect(bot.appContext.appConfig).toEqual({
                ...config,
                json: '/../../json',
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
            expect(result.type).toBe(UsersData.T_ALISA);
        });

        it('should return correct botClass and type for T_VK', () => {
            bot.appType = T_VK;
            const result = bot.getBotClassAndType();
            expect(result.botClass).toBeInstanceOf(Vk);
            expect(result.type).toBe(UsersData.T_VK);
        });

        it('should return correct botClass and type for T_TELEGRAM', () => {
            bot.appType = T_TELEGRAM;
            const result = bot.getBotClassAndType();
            expect(result.botClass).toBeInstanceOf(Telegram);
            expect(result.type).toBe(UsersData.T_TELEGRAM);
        });

        it('should return correct botClass and type for T_VIBER', () => {
            bot.appType = T_VIBER;
            const result = bot.getBotClassAndType();
            expect(result.botClass).toBeInstanceOf(Viber);
            expect(result.type).toBe(UsersData.T_VIBER);
        });

        it('should return correct botClass and type for T_MARUSIA', () => {
            bot.appType = T_MARUSIA;
            const result = bot.getBotClassAndType();
            expect(result.botClass).toBeInstanceOf(Marusia);
            expect(result.type).toBe(UsersData.T_MARUSIA);
        });

        it('should return correct botClass and type for T_SMARTAPP', () => {
            bot.appType = T_SMARTAPP;
            const result = bot.getBotClassAndType();
            expect(result.botClass).toBeInstanceOf(SmartApp);
            expect(result.type).toBe(UsersData.T_SMART_APP);
        });

        it('should return correct botClass and type for T_MAX', () => {
            bot.appType = T_MAXAPP;
            const result = bot.getBotClassAndType();
            expect(result.botClass).toBeInstanceOf(MaxApp);
            expect(result.type).toBe(UsersData.T_MAX_APP);
        });

        it('should return correct botClass and type for T_USER_APP', () => {
            bot.appType = T_USER_APP;
            const result = bot.getBotClassAndType(vk);
            expect(result.botClass).toBe(vk);
            expect(result.type).toBe(UsersData.T_USER_APP);
        });
    });

    describe('run', () => {
        it('should throw error if botController is not set', async () => {
            await expect(bot.run()).rejects.toThrow(
                'Не определен класс с логикой приложения. Укажите класс с логикой, передав его в метод initBotController',
            );
        });

        it('should return result if botClass is set and init is successful', async () => {
            bot.initBotController(botController);
            bot.appType = T_USER_APP;
            const botClass = new Alisa(bot.appContext);
            const result = {
                version: '1.0',
                response: {
                    text: 'Привет!',
                    end_session: false,
                },
            };
            jest.spyOn(botClass, 'getContext').mockResolvedValue(Promise.resolve(result));
            jest.spyOn(botClass, 'setLocalStorage').mockResolvedValue(undefined);
            jest.spyOn(botClass, 'getRatingContext').mockResolvedValue(result);
            jest.spyOn(botClass, 'getError').mockReturnValue(null);

            jest.spyOn(usersData, 'whereOne').mockResolvedValue(Promise.resolve(true));
            jest.spyOn(usersData, 'save').mockResolvedValue(Promise.resolve(true));
            jest.spyOn(usersData, 'update').mockResolvedValue(Promise.resolve(true));

            bot.setContent(getContent('Привет'));
            expect(await bot.run(botClass)).toBe(result);
        });

        it('should throw error if botClass is set and init is unsuccessful', async () => {
            bot.initBotController(botController);
            bot.appType = T_USER_APP;
            const botClass = new Alisa(bot.appContext);
            const error = 'Alisa:init(): Отправлен пустой запрос!';
            botClass.init = jest.fn().mockResolvedValue(false);
            botClass.getError = jest.fn().mockReturnValue(error);
            await expect(bot.run(botClass)).rejects.toThrow(error);
        });

        it('added user command', async () => {
            bot.initBotController(botController);
            bot.appType = T_USER_APP;
            const botClass = new Alisa(bot.appContext);
            jest.spyOn(botClass, 'setLocalStorage').mockResolvedValue(undefined);
            jest.spyOn(botClass, 'getError').mockReturnValue(null);

            jest.spyOn(usersData, 'whereOne').mockResolvedValue(Promise.resolve(true));
            jest.spyOn(usersData, 'save').mockResolvedValue(Promise.resolve(true));
            jest.spyOn(usersData, 'update').mockResolvedValue(Promise.resolve(true));
            bot.addCommand('cool', ['cool'], (_, botC) => {
                botC.text = 'cool';
                botC.userData.cool = true;
            });

            bot.setContent(getContent('cool', 2));
            let res = (await bot.run(botClass)) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('cool');
            // Убеждаемся что пользовательские данные скинулись, так как они хранятся в сессии.
            expect(botController.userData.cool).toBe(undefined);

            bot.removeCommand('cool');
            res = (await bot.run(botClass)) as IAlisaWebhookResponse;
            expect(res.response?.text).toBe('test');
        });

        it('local store', async () => {
            bot.initBotController(botController);
            bot.appType = T_USER_APP;
            const botClass = new Alisa(bot.appContext);
            bot.initPlatformParams({
                intents: [{ name: 'setStore', slots: ['сохранить'] }],
            });
            bot.initAppConfig({ isLocalStorage: true });
            jest.spyOn(botClass, 'getError').mockReturnValue(null);

            jest.spyOn(usersData, 'whereOne').mockResolvedValue(Promise.resolve(true));
            jest.spyOn(usersData, 'save').mockResolvedValue(Promise.resolve(true));
            jest.spyOn(usersData, 'update').mockResolvedValue(Promise.resolve(true));

            bot.setContent(getContent('сохранить', 2));
            const res = (await bot.run(botClass)) as IAlisaWebhookResponse;
            expect(res.session_state).toEqual({ data: 'test' });
        });

        it('skill started', async () => {
            bot.initBotController(botController);
            bot.appType = T_ALISA;
            const botClass = new Alisa(bot.appContext);
            bot.initPlatformParams({
                intents: [
                    { name: 'btn', slots: ['кнопка'] },
                    { name: 'card', slots: ['карточка'] },
                ],
            });
            bot.initAppConfig({ isLocalStorage: true });

            bot.setContent(getContent('Привет'));
            expect(await bot.run(botClass)).toEqual({
                response: {
                    end_session: false,
                    buttons: [],
                    text: 'test',
                    tts: 'test',
                },
                session_state: {},
                version: '1.0',
            });
            bot.initAppConfig({ isLocalStorage: false });

            bot.setContent(getContent('Привет'));
            expect(await bot.run(botClass)).toEqual({
                response: {
                    end_session: false,
                    buttons: [],
                    text: 'test',
                    tts: 'test',
                },
                version: '1.0',
            });
            bot.setContent(getContent('кнопка'));
            expect(await bot.run(botClass)).toEqual({
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
            bot.setContent(getContent('карточка'));
            expect(await bot.run(botClass)).toEqual({
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
