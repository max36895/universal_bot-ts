import {
    BotController,
    Alisa,
    T_ALISA,
    T_MAXAPP,
    T_VK,
    T_VIBER,
    T_TELEGRAM,
    T_MARUSIA,
    T_SMARTAPP,
    TemplateTypeModel,
    AlisaSound,
    Text,
    Viber,
    SmartApp,
    Telegram,
    Vk,
    MaxApp,
    Marusia,
    TAppType,
} from '../../src';
import { BotTest } from '../../src/core/BotTest';
import { AppContext } from '../../src/core/AppContext';

class TestBotController extends BotController {
    constructor() {
        super();
    }

    action(intentName: string | null, isCommand?: boolean) {
        if (isCommand) {
            this.userData.cool = true;
            return;
        }

        if (intentName === 'btn') {
            this.buttons.addBtn('1');
            this.text = 'btn';
            return;
        } else if (intentName === 'card') {
            this.card.addImage('', 'Header');
            this.card.isOne = false;
            this.text = 'card';
            return;
        } else if (intentName === 'cardX') {
            this.card.addImage('', 'Header');
            this.card.addImage('', 'Header');
            this.card.addImage('', 'Header');
            this.card.addImage('', 'Header');
            this.card.addImage('', 'Header');
            this.text = 'cardX';
            return;
        } else if (intentName === 'image') {
            this.card.addImage('', 'Header');
            this.card.isOne = true;
            this.text = 'image';
            return;
        } else if (intentName === 'setStore') {
            this.store = {
                data: 'test',
            };
            return;
        } else if (intentName === 'image_btn') {
            this.card.addImage('', 'Header', '', 'button');
            this.text = 'image_btn';
            return;
        }
        this.text = 'test';
    }
}

class TestBot extends BotTest {
    getBotClassAndType(val: TemplateTypeModel | null = null) {
        return super._getBotClassAndType(val);
    }

    public getSkillContent(query: string, count = 0) {
        return super.getSkillContent(query, count, {});
    }

    public getText() {
        return this._botController.text;
    }

    public getTts() {
        return this._botController.tts;
    }

    protected _clearState() {
        return;
    }

    public clearState() {
        super._clearState();
    }

    public get appContext(): AppContext {
        return this._appContext;
    }
}

const SKILLS = [T_SMARTAPP, T_VIBER, T_TELEGRAM, T_MARUSIA, T_VK, T_MAXAPP, T_ALISA];

function getSkills(
    cb: (skill: TAppType, botClass: TemplateTypeModel) => Promise<void>,
    title: string,
    appContext: AppContext,
) {
    for (let i = 0; i < SKILLS.length; i++) {
        const skill = SKILLS[i];
        let botClass;
        switch (skill) {
            case T_SMARTAPP:
                botClass = new SmartApp(appContext);
                break;
            case T_VIBER:
                botClass = new Viber(appContext);
                break;
            case T_TELEGRAM:
                botClass = new Telegram(appContext);
                break;
            case T_MARUSIA:
                botClass = new Marusia(appContext);
                break;
            case T_VK:
                botClass = new Vk(appContext);
                break;
            case T_MAXAPP:
                botClass = new MaxApp(appContext);
                break;
            default:
                botClass = new Alisa(appContext);
                break;
        }
        it(`${title}: Проверка для приложения: ${skill}`, async () => {
            await cb(skill, botClass);
        });
    }
}

let bot: TestBot;
let appContext: AppContext;
describe('umbot', () => {
    let botController: TestBotController;

    beforeEach(() => {
        bot = new TestBot();
        botController = new TestBotController();
        appContext = bot.appContext;
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('run bot test', () => {
        // Простое текстовое отображение
        getSkills(
            async (type, botClass) => {
                botController = new TestBotController();
                //bot = new TestBot();
                bot.initBotController(botController);
                bot.appType = type;
                bot.initPlatformParams({
                    intents: [],
                });
                bot.initAppConfig({ isLocalStorage: true });
                bot.setContent(bot.getSkillContent('0'.repeat(50)));
                await bot.run(botClass);
                expect(bot.getText()).toEqual('test');
                bot.clearState();
            },
            `Простое текстовое отображение. Длина запроса от пользователя 50`,
            appContext,
        );
        getSkills(
            async (type, botClass) => {
                bot.initBotController(botController);
                bot.appType = type;
                bot.initPlatformParams({
                    intents: [{ name: 'btn', slots: ['кнопка'] }],
                });
                bot.initAppConfig({ isLocalStorage: true });

                bot.setContent(bot.getSkillContent('0'.repeat(5) + ` кнопка ${'my '.repeat(10)}`));
                await bot.run(botClass);
                expect(bot.getText()).toEqual('btn');
                bot.clearState();
            },
            `Простое текстовое отображение c кнопкой.`,
            appContext,
        );

        getSkills(
            async (type, botClass) => {
                bot.initBotController(botController);
                bot.appType = type;
                bot.initPlatformParams({
                    intents: [{ name: 'image', slots: ['картинка'] }],
                });
                bot.initAppConfig({ isLocalStorage: true });

                bot.setContent(bot.getSkillContent('картинка'));
                await bot.run(botClass);
                expect(bot.getText()).toEqual('image');
                bot.clearState();
            },
            `Отображение карточки с 1 изображением.`,
            appContext,
        );

        getSkills(
            async (type, botClass) => {
                bot.initBotController(botController);
                bot.appType = type;
                bot.initPlatformParams({
                    intents: [{ name: 'image_btn', slots: ['картинка', 'картинка_с_кнопкой'] }],
                });
                bot.initAppConfig({ isLocalStorage: true });

                bot.setContent(bot.getSkillContent('картинка'));
                await bot.run(botClass);
                expect(bot.getText()).toEqual('image_btn');
                bot.clearState();
            },
            `Отображение карточки с 1 изображением и кнопкой`,
            appContext,
        );

        getSkills(
            async (type, botClass) => {
                bot.initBotController(botController);
                bot.appType = type;
                bot.initPlatformParams({
                    intents: [{ name: 'card', slots: ['картинка'] }],
                });
                bot.initAppConfig({ isLocalStorage: true });

                bot.setContent(bot.getSkillContent('картинка'));
                await bot.run(botClass);
                expect(bot.getText()).toEqual('card');
                bot.clearState();
            },
            `Отображение галереи из 1 изображения.`,
            appContext,
        );

        getSkills(
            async (type, botClass) => {
                bot.initBotController(botController);
                bot.appType = type;
                bot.initPlatformParams({
                    intents: [{ name: 'cardX', slots: ['картинка'] }],
                });
                bot.initAppConfig({ isLocalStorage: true });

                bot.setContent(bot.getSkillContent('картинка'));
                await bot.run(botClass);
                expect(bot.getText()).toEqual('cardX');
                bot.clearState();
            },
            `Отображение галереи из 5 изображений.`,
            appContext,
        );

        // Обработка звуков, включая свои
        for (let i = 1; i < 10; i++) {
            getSkills(
                async (type, botClass) => {
                    bot.appType = type;
                    bot.initBotController(botController);
                    bot.initPlatformParams({
                        intents: [],
                    });
                    bot.initAppConfig({ isLocalStorage: true });
                    bot.addCommand('sound', ['звук'], () => {
                        botController.tts = `${AlisaSound.S_AUDIO_GAME_WIN} `.repeat(i).trim();
                    });

                    bot.setContent(bot.getSkillContent('звук'));
                    await bot.run(botClass);
                    bot.removeCommand('sound');
                    await bot.run(botClass);
                    let res = '';
                    if (type === T_ALISA) {
                        res = '<speaker audio="alice-sounds-game-win-d.opus"> '.repeat(i);
                    } else if (type === T_MARUSIA) {
                        res = '<speaker audio="marusia-sounds/game-win-d"> '.repeat(i);
                    } else {
                        res = '#game_win# '.repeat(i);
                    }
                    res = res.trim();
                    expect(bot.getTts()?.replace(/(win-\d)/g, 'win-d')).toEqual(res);
                    bot.clearState();
                },
                `Обработка звуков. Количество мелодий равно ${i}`,
                appContext,
            );
        }

        for (let i = 1; i < 9; i++) {
            getSkills(
                async (type, botClass) => {
                    bot.initBotController(botController);
                    bot.appType = type;
                    bot.initPlatformParams({
                        intents: [],
                    });
                    bot.initAppConfig({ isLocalStorage: true });
                    botController.sound.sounds = [];
                    for (let j = 1; j < 15; j++) {
                        botController.sound.sounds.push({
                            key: `$s_${j}`,
                            sounds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                        });
                    }
                    botController.sound.isUsedStandardSound = false;
                    bot.addCommand('sound', ['звук'], () => {
                        botController.tts = ``;
                        for (let j = 1; j <= i; j++) {
                            botController.tts += `$s_${j} `;
                        }
                    });

                    bot.setContent(bot.getSkillContent('звук'));
                    await bot.run(botClass);
                    bot.removeCommand('sound');
                    // expect(bot.getTts()).toEqual('');
                    expect(bot.getTts()?.match(/\d+/g)?.length).toEqual(i);
                    bot.clearState();
                },
                `Обработка своих звуков. Количество мелодий равно ${i}`,
                appContext,
            );
        }

        for (let i = 2; i <= 10; i += 2) {
            getSkills(
                async (type, botClass) => {
                    bot.initBotController(botController);
                    bot.appType = type;
                    bot.initPlatformParams({
                        intents: [],
                    });
                    bot.initAppConfig({ isLocalStorage: true });
                    for (let j = 0; j < i * 100; j++) {
                        bot.addCommand(`cmd_${j}`, [`команда${j}`], () => {
                            botController.text = `cmd_${j}`;
                        });
                    }

                    bot.setContent(bot.getSkillContent(`команда${i / 2}`));
                    await bot.run(botClass);
                    bot.clearCommands();
                    expect(bot.getText()).toEqual(`cmd_${Math.floor(i / 2)}`);
                    bot.clearState();
                },
                `Обработка большого количества команд в addCommand. Количество команд равно ${i * 100}`,
                appContext,
            );
        }
    });
});
