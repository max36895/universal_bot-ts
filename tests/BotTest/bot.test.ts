import { BotController, TAppType, SoundConstants } from '../../src';
import { BotTest } from '../../src/core/BotTest';
import {
    T_ALISA,
    T_MAX_APP,
    T_VK,
    T_VIBER,
    T_TELEGRAM,
    T_MARUSIA,
    T_SMART_APP,
    fullPlatforms,
    FileAdapter,
} from '../../src/plugins';

class TestBotController extends BotController {
    constructor() {
        super();
    }

    action(intentName: string | null, isCommand?: boolean): void {
        this.skipAutoReply = true;
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
            this.state = {
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
    constructor() {
        super(undefined, TestBotController);
    }

    public getSkillContent(query: string, count = 0): string {
        return super.getSkillContent(query, count, {}) as string;
    }

    public getText(): string {
        return this._botController.text;
    }

    public getTts(): string | null {
        return this._botController.tts;
    }

    protected _clearState(): void {
        return;
    }

    public clearState(): void {
        this._botController?.clearStoreData?.();
    }
}

const SKILLS = [T_SMART_APP, T_VIBER, T_TELEGRAM, T_MARUSIA, T_VK, T_MAX_APP, T_ALISA];

function getSkills(cb: (skill: TAppType) => Promise<void>, title: string): void {
    for (const skill of SKILLS) {
        it(`${title}: Проверка для приложения: ${skill}`, async () => {
            await cb(skill);
        });
    }
}

const fileAdapter = new FileAdapter();
let bot: TestBot;
describe('umbot', () => {
    beforeAll(() => {
        bot = new TestBot();
        bot.use(fullPlatforms);
        bot.use(fileAdapter);
        bot.setPlatformParams({
            intents: [],
        });
        bot.setAppConfig({
            tokens: {
                vk: {
                    token: '123',
                },
                telegram: {
                    token: '123',
                },
                viber: {
                    token: '123',
                },
                marusia: {
                    token: '123',
                },
            },
        });
        bot.getAppContext().httpClient = (): Promise<Response> => {
            return Promise.resolve({
                ok: true,
                json: () => {
                    return Promise.resolve({});
                },
            }) as Promise<Response>;
        };
    });

    beforeEach(() => {
        bot.use(fullPlatforms);
    });

    afterEach(() => {
        bot.clearSteps();
        bot.clearCommands();
        bot.clearUse();
    });

    afterAll(() => {
        fileAdapter.setCachedFileData('UserData', undefined);
        bot.close();
        jest.resetAllMocks();
    });

    describe('run bot test', () => {
        // Простое текстовое отображение
        getSkills(async (type) => {
            bot.initBotController(TestBotController);
            bot.appType = type;
            bot.setPlatformParams({
                intents: [],
            });
            bot.setAppConfig({ isLocalStorage: true });
            bot.setContent(bot.getSkillContent('0'.repeat(50)));
            await bot.run(type);
            expect(bot.getText()).toEqual('test');
            bot.clearState();
        }, `Простое текстовое отображение. Длина запроса от пользователя 50`);
        getSkills(async (type) => {
            bot.initBotController(TestBotController);
            bot.appType = type;
            bot.setPlatformParams({
                intents: [{ name: 'btn', slots: ['кнопка'] }],
            });
            bot.setAppConfig({ isLocalStorage: true });

            bot.setContent(bot.getSkillContent('0'.repeat(5) + ` кнопка ${'my '.repeat(10)}`));
            await bot.run(type);
            expect(bot.getText()).toEqual('btn');
            bot.clearState();
        }, `Простое текстовое отображение c кнопкой.`);

        getSkills(async (type) => {
            bot.initBotController(TestBotController);
            bot.appType = type;
            bot.setPlatformParams({
                intents: [{ name: 'image', slots: ['картинка'] }],
            });
            bot.setAppConfig({ isLocalStorage: true });

            bot.setContent(bot.getSkillContent('картинка'));
            await bot.run(type);
            expect(bot.getText()).toEqual('image');
            bot.clearState();
        }, `Отображение карточки с 1 изображением.`);

        getSkills(async (type) => {
            bot.initBotController(TestBotController);
            bot.appType = type;
            bot.setPlatformParams({
                intents: [{ name: 'image_btn', slots: ['картинка', 'картинка_с_кнопкой'] }],
            });
            bot.setAppConfig({ isLocalStorage: true });

            bot.setContent(bot.getSkillContent('картинка'));
            await bot.run(type);
            expect(bot.getText()).toEqual('image_btn');
            bot.clearState();
        }, `Отображение карточки с 1 изображением и кнопкой`);

        getSkills(async (type) => {
            bot.initBotController(TestBotController);
            bot.appType = type;
            bot.setPlatformParams({
                intents: [{ name: 'card', slots: ['картинка'] }],
            });
            bot.setAppConfig({ isLocalStorage: true });

            bot.setContent(bot.getSkillContent('картинка'));
            await bot.run(type);
            expect(bot.getText()).toEqual('card');
            bot.clearState();
        }, `Отображение галереи из 1 изображения.`);

        getSkills(async (type) => {
            bot.initBotController(TestBotController);
            bot.appType = type;
            bot.setPlatformParams({
                intents: [{ name: 'cardX', slots: ['картинка'] }],
            });
            bot.setAppConfig({ isLocalStorage: true });

            bot.setContent(bot.getSkillContent('картинка'));
            await bot.run(type);
            expect(bot.getText()).toEqual('cardX');
            bot.clearState();
        }, `Отображение галереи из 5 изображений.`);

        // Обработка звуков, включая свои
        for (let i = 1; i < 10; i++) {
            getSkills(async (type) => {
                bot.appType = type;
                bot.initBotController(TestBotController);
                bot.setPlatformParams({
                    intents: [],
                });
                bot.setAppConfig({ isLocalStorage: true });
                bot.addCommand('sound', ['звук'], (_, botController) => {
                    botController.tts = `${SoundConstants.S_AUDIO_GAME_WIN} `.repeat(i).trim();
                });

                bot.setContent(bot.getSkillContent('звук'));
                await bot.run(type);
                bot.removeCommand('sound');
                await bot.run(type);
                let res;
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
            }, `Обработка звуков. Количество мелодий равно ${i}`);
        }

        for (let i = 1; i < 9; i++) {
            getSkills(async (type) => {
                bot.initBotController(TestBotController);
                bot.appType = type;
                bot.setPlatformParams({
                    intents: [],
                });
                bot.setAppConfig({ isLocalStorage: true });

                bot.addCommand('sound', ['звук'], (_, botController) => {
                    botController.tts = ``;
                    for (let j = 1; j <= i; j++) {
                        botController.tts += `$s_${j} `;
                    }
                });
                bot.use((botController, next) => {
                    botController.sound.sounds = [];
                    for (let j = 1; j < 15; j++) {
                        botController.sound.sounds.push({
                            key: `$s_${j}`,
                            sounds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                        });
                    }
                    botController.sound.isUsedStandardSound = false;
                    return next();
                });

                bot.setContent(bot.getSkillContent('звук'));
                await bot.run(type);
                bot.removeCommand('sound');
                expect(bot.getTts()?.match(/\d+/g)?.length).toEqual(i);
                bot.clearState();
            }, `Обработка своих звуков. Количество мелодий равно ${i}`);
        }

        for (let i = 2; i <= 10; i += 2) {
            getSkills(
                async (type) => {
                    bot.initBotController(TestBotController);
                    bot.appType = type;
                    bot.setPlatformParams({
                        intents: [],
                    });
                    bot.setAppConfig({ isLocalStorage: true });
                    for (let j = 0; j < i * 100; j++) {
                        bot.addCommand(`cmd_${j}`, [`команда${j}`], (_, botController) => {
                            botController.text = `cmd_${j}`;
                        });
                    }

                    bot.setContent(bot.getSkillContent(`команда${i / 2}`));
                    await bot.run(type);
                    bot.clearCommands();
                    expect(bot.getText()).toEqual(`cmd_${Math.floor(i / 2)}`);
                    bot.clearState();
                },
                `Обработка большого количества команд в addCommand. Количество команд равно ${i * 100}`,
            );
        }
    });
});
