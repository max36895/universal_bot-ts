import { Bot, BotController, Alisa, T_ALISA, AlisaSound, Text } from '../../src';
import { performance } from 'perf_hooks';

// Базовое потребление памяти не должно превышать 500кб
// const BASE_MEMORY_USED = 500;
const BASE_MEMORY_USED = 400;
// Базовое время обработки не должно превышать 17мс
let BASE_DURATION = 10;

// Вычисляем базовое время обработки в зависимости от системы пользователя
(function initBasePer() {
    const start = performance.now();
    let count = 2;
    const arr: number[] = [];
    // выполняем относительно простые вычисления
    for (let i = 0; i < 55e4; i++) {
        arr.push(count + 1);
        count *= count;
    }
    count += arr[0] / 2;
    count = Math.min(arr[0] - Math.random(), arr[0] - Math.random(), count);
    BASE_DURATION = performance.now() - start + count;
})();

class TestBotController extends BotController {
    constructor() {
        super();
    }

    action(intentName: string | null, isCommand?: boolean) {
        switch (intentName) {
            case 'btn':
                this.buttons.addBtn('1');
                this.tts = 'btn';
                break;
            case 'card':
                this.card.addImage('', 'Header');
                this.tts = 'card';
                break;
            case 'cardX':
                this.card
                    .addImage('', 'Header')
                    .addImage('', 'Header')
                    .addImage('', 'Header')
                    .addImage('', 'Header')
                    .addImage('', 'Header');
                this.tts = 'card';
                break;
            case 'image':
                this.card.addOneImage('', 'Header');
                break;
            case 'image_btn':
                this.card.addOneImage('', 'Header').addButton('1');
                break;
        }

        this.text = 'test';
        return 'test';
    }
}

class TestBot extends Bot {
    public get appContext() {
        return this._appContext;
    }
}

function getContent(query: string, count = 0) {
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

async function getPerformance(
    fn: () => Promise<void>,
    defaultDuration = BASE_DURATION,
    defaultMemory = BASE_MEMORY_USED,
) {
    Text.clearCache();
    let allDuration = 0;
    let allMemory = 0;
    for (let i = 0; i < 10; i++) {
        Text.clearCache();
        const beforeMemory = process.memoryUsage().heapUsed;
        const start = performance.now();
        await fn();
        Text.clearCache();
        const duration = performance.now() - start;
        const afterMemory = process.memoryUsage().heapUsed;
        const memoryUsed = (afterMemory - beforeMemory) / 1024;
        allDuration += duration;
        allMemory += memoryUsed;
    }

    expect(allDuration / 10).toBeLessThan(defaultDuration);
    expect(allMemory / 10).toBeLessThan(defaultMemory);
}

describe('umbot', () => {
    let bot: TestBot;

    beforeEach(() => {
        bot = new TestBot();
    });

    afterEach(() => {
        bot.clearCommands();
        jest.resetAllMocks();
    });
    describe('run performance', () => {
        // Простое текстовое отображение
        for (let i = 2; i < 100; i++) {
            it(`Простое текстовое отображение. Длина запроса от пользователя ${i * 2}`, async () => {
                await getPerformance(async () => {
                    bot.initBotController(TestBotController);
                    bot.appType = T_ALISA;
                    bot.setPlatformParams({
                        intents: [],
                    });
                    bot.setAppConfig({ isLocalStorage: true });

                    bot.setContent(getContent('0'.repeat(i * 2)));
                    await bot.run(Alisa);
                });
            });
        }
        for (let i = 2; i < 50; i++) {
            it(`Простое текстовое отображение c кнопкой. Длина запроса от пользователя ${i * 3}`, async () => {
                await getPerformance(async () => {
                    bot.initBotController(TestBotController);
                    bot.appType = T_ALISA;
                    bot.setPlatformParams({
                        intents: [{ name: 'btn', slots: ['кнопка'] }],
                    });
                    bot.setAppConfig({ isLocalStorage: true });

                    bot.setContent(getContent('0'.repeat(i) + ` кнопка ${''.repeat(i * 2)}`));
                    await bot.run(Alisa);
                });
            });
        }

        it(`Отображение карточки с 1 изображением.`, async () => {
            await getPerformance(async () => {
                bot.initBotController(TestBotController);
                bot.appType = T_ALISA;
                bot.setPlatformParams({
                    intents: [{ name: 'image', slots: ['картинка'] }],
                });
                bot.setAppConfig({ isLocalStorage: true });

                bot.setContent(getContent('картинка'));
                await bot.run(Alisa);
            });
        });
        it(`Отображение карточки с 1 изображением и кнопкой`, async () => {
            await getPerformance(async () => {
                bot.initBotController(TestBotController);
                bot.appType = T_ALISA;
                bot.setPlatformParams({
                    intents: [{ name: 'image_btn', slots: ['картинка_с_кнопкой'] }],
                });
                bot.setAppConfig({ isLocalStorage: true });

                bot.setContent(getContent('картинка'));
                await bot.run(Alisa);
            });
        });
        it(`Отображение галереи из 1 изображения.`, async () => {
            await getPerformance(async () => {
                bot.initBotController(TestBotController);
                bot.appType = T_ALISA;
                bot.setPlatformParams({
                    intents: [{ name: 'card', slots: ['картинка'] }],
                });
                bot.setAppConfig({ isLocalStorage: true });

                bot.setContent(getContent('картинка'));
                await bot.run(Alisa);
            });
        });
        it(`Отображение галереи из 5 изображений.`, async () => {
            await getPerformance(async () => {
                bot.initBotController(TestBotController);
                bot.appType = T_ALISA;
                bot.setPlatformParams({
                    intents: [{ name: 'cardX', slots: ['картинка'] }],
                });
                bot.setAppConfig({ isLocalStorage: true });

                bot.setContent(getContent('картинка'));
                await bot.run(Alisa);
            });
        });

        // Обработка звуков, включая свои
        for (let i = 1; i < 15; i++) {
            it(`Обработка звуков. Количество мелодий равно ${i}`, async () => {
                await getPerformance(async () => {
                    bot.initBotController(TestBotController);
                    bot.appType = T_ALISA;
                    bot.setPlatformParams({
                        intents: [],
                    });
                    bot.setAppConfig({ isLocalStorage: true });
                    bot.addCommand('sound', ['звук'], (_, botController) => {
                        botController.tts = ` ${AlisaSound.S_AUDIO_GAME_WIN} `.repeat(i);
                    });

                    bot.setContent(getContent('звук'));
                    await bot.run(Alisa);
                    bot.removeCommand('sound');
                });
            });
        }
        for (let i = 1; i < 15; i++) {
            it(`Обработка своих звуков. Количество мелодий равно ${i}`, async () => {
                await getPerformance(async () => {
                    bot.initBotController(TestBotController);
                    bot.appType = T_ALISA;
                    bot.setPlatformParams({
                        intents: [],
                    });
                    bot.setAppConfig({ isLocalStorage: true });

                    bot.addCommand('sound', ['звук'], (_, botController) => {
                        botController.tts = ``;
                        for (let j = 1; j < i; j++) {
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
                        botController.sound.isUsedStandardSound = true;
                        return next();
                    });

                    bot.setContent(getContent('звук'));
                    await bot.run(Alisa);
                    bot.removeCommand('sound');
                });
            });
        }

        // большое количество команд для обработки
        for (let i = 1; i < 16; i++) {
            it(`Обработка большого количества команд в intents. Количество команд равно ${i * 100}`, async () => {
                await getPerformance(
                    async () => {
                        bot.initBotController(TestBotController);
                        bot.appType = T_ALISA;
                        const intents = [];
                        for (let j = 0; j < i * 100; j++) {
                            intents.push({
                                name: `cmd_${j}`,
                                slots: [`команда${j}`],
                            });
                        }
                        bot.setPlatformParams({
                            intents,
                        });
                        bot.setAppConfig({ isLocalStorage: true });

                        bot.setContent(getContent(`команда${i / 2}`));
                        await bot.run(Alisa);
                    },
                    BASE_DURATION,
                    BASE_MEMORY_USED + i * 3,
                );
            });
        }

        for (let i = 1; i < 16; i++) {
            it(`Обработка большого количества команд в addCommand. Количество команд равно ${i * 100}`, async () => {
                await getPerformance(
                    async () => {
                        bot.initBotController(TestBotController);
                        bot.setPlatformParams({
                            intents: [],
                        });
                        bot.setAppConfig({ isLocalStorage: true });
                        for (let j = 0; j < i * 100; j++) {
                            bot.addCommand(`cmd_${j}`, [`команда${j}`], (_, botController) => {
                                botController.text = `cmd_${j}`;
                            });
                        }

                        await bot.run(Alisa, T_ALISA, getContent(`команда${i / 2}`));
                    },
                    BASE_DURATION,
                    /*
                     * Из-за доп логики в поиске ReDoS команд, немного увеличилось потребление памяти
                     * В среднем на выполнение 1 команды требуется около 0.33 кб
                     */
                    BASE_MEMORY_USED + 10 + i * 11,
                );
            });
        }
    });
});
