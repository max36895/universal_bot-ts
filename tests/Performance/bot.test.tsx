import { Bot, BotController, SoundConstants, Text } from '../../src';
import { T_ALISA, AlisaAdapter, FileAdapter } from '../../src/plugins';
import { performance } from 'node:perf_hooks';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Базовое потребление памяти не должно превышать 400кб
let BASE_MEMORY_USED = 400;
if (typeof global.gc !== 'function') {
    // без gc потребление памяти выше
    BASE_MEMORY_USED = 700;
}
// Базовое время обработки не должно превышать 5мс
const BASE_DURATION = 5;

const WARMUP = 3;
const RUNS = 10;

function forceGc(): void {
    if (typeof global.gc === 'function') {
        global.gc();
    }
}

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

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function getPerformance(fn: () => Promise<void>, bot?: Bot): Promise<void> {
    for (let i = 0; i < WARMUP; i++) {
        Text.clearCache();
        bot?.clearCommands();
        await fn();
        bot?.clearCommands();
        Text.clearCache();
    }
    forceGc();
    const durations: number[] = [];
    const memories: number[] = [];

    for (let i = 0; i < RUNS; i++) {
        Text.clearCache();
        bot?.clearCommands();
        if (bot) {
            bot.setPlatformParams({ intents: [] });
        }

        const beforeMemory = process.memoryUsage().heapUsed;

        const start = performance.now();
        await fn();
        const duration = performance.now() - start;

        forceGc();
        const afterMemory = process.memoryUsage().heapUsed;

        const memoryUsed = Math.max(0, (afterMemory - beforeMemory) / 1024);

        durations.push(duration);
        memories.push(memoryUsed);
    }

    const p50Duration = median(durations);
    const p50Memory = median(memories);

    expect(p50Duration).toBeLessThan(BASE_DURATION);
    expect(p50Memory).toBeLessThan(BASE_MEMORY_USED);
}

describe('umbot', () => {
    let bot: Bot;

    // Дефолтные пути записи (json/, logs/) указывают в cwd — в корень
    // репозитория. Перенаправляем во временную папку: сьют прогоняет сотни
    // итераций с карточками/кнопками, и FileAdapter оставлял в репо
    // UsersData/ImageTokens/SoundTokens.json (вкл. осиротевшие .tmp).
    const TEST_DATA_DIR = mkdtempSync(join(tmpdir(), 'umbot-test-perf-'));

    beforeEach(() => {
        bot = new Bot();
        bot.setAppConfig({ json: TEST_DATA_DIR, error_log: TEST_DATA_DIR });
        bot.setLogger({
            error: () => {},
        });
        bot.use(new AlisaAdapter());
        bot.use(new FileAdapter());
    });

    afterEach(async () => {
        bot.clearCommands();
        await bot.close();
        jest.resetAllMocks();
    });
    afterAll(() => {
        // afterEach уже дожидается close(), так что флашей после rmSync нет;
        // rmSync оставлен здесь на случай отмены тестов Jest'ом.
        rmSync(TEST_DATA_DIR, { recursive: true, force: true });
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
                    bot.setAppConfig({ isLocalStorage: true, tokens: {} });

                    bot.setContent(getContent('0'.repeat(i * 2)));
                    await bot.run();
                });
            });
        }
        for (let i = 2; i < 50; i++) {
            it(`Простое текстовое отображение с кнопкой. Длина запроса от пользователя ${i * 3}`, async () => {
                await getPerformance(async () => {
                    bot.initBotController(TestBotController);
                    bot.appType = T_ALISA;
                    bot.setPlatformParams({
                        intents: [{ name: 'btn', slots: ['кнопка'] }],
                    });
                    bot.setAppConfig({ isLocalStorage: true, tokens: {} });

                    bot.setContent(getContent('0'.repeat(i) + ` кнопка ${''.repeat(i * 2)}`));
                    await bot.run();
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
                bot.setAppConfig({ isLocalStorage: true, tokens: {} });

                bot.setContent(getContent('картинка'));
                await bot.run();
            });
        });
        it(`Отображение карточки с 1 изображением и кнопкой`, async () => {
            await getPerformance(async () => {
                bot.initBotController(TestBotController);
                bot.appType = T_ALISA;
                bot.setPlatformParams({
                    intents: [{ name: 'image_btn', slots: ['картинка_с_кнопкой'] }],
                });
                bot.setAppConfig({ isLocalStorage: true, tokens: {} });

                bot.setContent(getContent('картинка'));
                await bot.run();
            });
        });
        it(`Отображение галереи из 1 изображения.`, async () => {
            await getPerformance(async () => {
                bot.initBotController(TestBotController);
                bot.appType = T_ALISA;
                bot.setPlatformParams({
                    intents: [{ name: 'card', slots: ['картинка'] }],
                });
                bot.setAppConfig({ isLocalStorage: true, tokens: {} });

                bot.setContent(getContent('картинка'));
                await bot.run();
            });
        });
        it(`Отображение галереи из 5 изображений.`, async () => {
            await getPerformance(async () => {
                bot.initBotController(TestBotController);
                bot.appType = T_ALISA;
                bot.setPlatformParams({
                    intents: [{ name: 'cardX', slots: ['картинка'] }],
                });
                bot.setAppConfig({ isLocalStorage: true, tokens: {} });

                bot.setContent(getContent('картинка'));
                await bot.run();
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
                    bot.setAppConfig({ isLocalStorage: true, tokens: {} });
                    bot.addCommand('sound', ['звук'], (_, botController) => {
                        botController.tts = ` ${SoundConstants.S_AUDIO_GAME_WIN} `.repeat(i);
                    });

                    bot.setContent(getContent('звук'));
                    await bot.run();
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
                    bot.setAppConfig({ isLocalStorage: true, tokens: {} });

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
                    await bot.run();
                    bot.removeCommand('sound');
                });
            });
        }
        // большое количество команд для обработки
        for (let i = 1; i < 16; i++) {
            it(`Обработка большого количества команд в intents. Количество команд равно ${i * 100}`, async () => {
                await getPerformance(async () => {
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
                    bot.setAppConfig({ isLocalStorage: true, tokens: {} });

                    bot.setContent(getContent(`команда${Math.floor((i * 100) / 2)}`));
                    await bot.run();
                }, bot);
            });
        }

        for (let i = 1; i < 16; i++) {
            it(`Обработка большого количества команд в addCommand. Количество команд равно ${i * 100}`, async () => {
                await getPerformance(async () => {
                    bot.initBotController(TestBotController);
                    bot.setPlatformParams({
                        intents: [],
                    });
                    bot.setAppConfig({ isLocalStorage: true, tokens: {} });

                    for (let j = 0; j < i * 100; j++) {
                        bot.addCommand(`cmd_${j}`, [`команда${j}`], (_, botController) => {
                            botController.text = `cmd_${j}`;
                        });
                    }

                    await bot.run(T_ALISA, getContent(`команда${Math.floor((i * 100) / 2)}`));
                }, bot);
            });
        }
    });
});
