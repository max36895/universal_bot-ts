import * as fs from 'fs';
import * as path from 'path';
import { generateFromFlow } from './../../cli/flowGenerator';

const TEST_DIR = path.join(__dirname, '__test_output__');
const JSON_DIR = path.join(TEST_DIR, 'json');

beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(JSON_DIR, { recursive: true });
});

afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true });
    }
});

function writeJsonAndGenerate(name: string, doc: object): string {
    const jsonPath = path.join(JSON_DIR, `${name}.json`);
    const outputPath = path.join(TEST_DIR, name);
    fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 2));
    generateFromFlow(jsonPath, outputPath);
    return fs.readFileSync(path.join(outputPath, 'src', 'index.ts'), 'utf8');
}

describe('flowGenerator', () => {
    describe('Pattern 1: Simple command', () => {
        it('generates addCommand with text', () => {
            const code = writeJsonAndGenerate('p1', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'greeting',
                        slots: ['привет'],
                        isPattern: false,
                        response: { text: 'Привет!', buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("bot.addCommand('greeting', ['привет']");
            expect(code).toContain("setText(ctrl, 'Привет!')");
        });
    });

    describe('Pattern 2: Command with buttons', () => {
        it('generates addBtn and addLink', () => {
            const code = writeJsonAndGenerate('p2', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'menu',
                        slots: ['меню'],
                        isPattern: false,
                        response: {
                            text: 'Выберите:',
                            buttons: [
                                { title: 'Помощь', type: 'action' },
                                { title: 'Сайт', type: 'link', url: 'https://example.com' },
                            ],
                            sounds: [],
                        },
                    },
                ],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("ctrl.buttons.addBtn('Помощь')");
            expect(code).toContain("ctrl.buttons.addLink('Сайт', 'https://example.com')");
        });
    });

    describe('Pattern 3: Step with saveTo', () => {
        it('generates two-step pattern', () => {
            const code = writeJsonAndGenerate('p3', {
                name: 'test',
                nodes: [
                    {
                        type: 'step',
                        id: 's1',
                        name: 'ask_name',
                        prompt: { text: 'Как зовут?', buttons: [] },
                        saveTo: 'name',
                        saveAs: 'original',
                    },
                ],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("bot.addStep('ask_name'");
            expect(code).toContain("ctrl.userData.name = ctrl.userCommand ?? ''");
            expect(code).toContain("setText(ctrl, 'Как зовут?')");
        });
    });

    describe('Pattern 4: Command with inline action', () => {
        it('generates inline rand() call', () => {
            const code = writeJsonAndGenerate('p4', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'random',
                        slots: ['число'],
                        isPattern: false,
                        actions: [{ type: 'random_number', field: 'num', min: 1, max: 10 }],
                        response: { text: 'Число: {{num}}', buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("import { rand } from 'umbot/utils'");
            expect(code).toContain('ctrl.userData.num = rand(1, 10)');
            expect(code).toContain('`Число: ${ctrl.userData.num}`');
        });
    });

    describe('Pattern 5: Step with condition (separate block)', () => {
        it('generates function and call', () => {
            const code = writeJsonAndGenerate('p5', {
                name: 'test',
                nodes: [
                    {
                        type: 'step',
                        id: 's1',
                        name: 'ask',
                        prompt: { text: 'Ответ:', buttons: [] },
                        saveTo: 'userAnswer',
                        saveAs: 'original',
                    },
                    {
                        type: 'condition',
                        id: 'c1',
                        name: 'check',
                        variable: 'userAnswer',
                        operator: 'eq',
                        value: 42,
                        responseTrue: { text: 'Правильно!' },
                        responseFalse: { text: 'Неправильно!' },
                    },
                ],
                edges: [{ from: 's1', to: 'c1', type: 'next' }],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            // Condition generates a function
            expect(code).toContain('function __check(ctrl: BotController)');
            expect(code).toContain('ctrl.userData.userAnswer === 42');
            expect(code).toContain("setText(ctrl, 'Правильно!')");
            // Step calls the function
            expect(code).toContain("bot.addStep('ask'");
            expect(code).toContain('__check(ctrl)');
        });
    });

    describe('Pattern 6: Command with navigation', () => {
        it('generates thisIntentName', () => {
            const code = writeJsonAndGenerate('p6', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'start',
                        slots: ['начать'],
                        isPattern: false,
                        response: { text: 'Начинаем!', buttons: [], sounds: [] },
                    },
                    {
                        type: 'step',
                        id: 's1',
                        name: 'ask',
                        prompt: { text: 'Вопрос', buttons: [] },
                        saveTo: 'f',
                        saveAs: 'original',
                    },
                ],
                edges: [{ from: 'c1', to: 's1', type: 'next' }],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("ctrl.thisIntentName = 'ask'");
        });
    });

    describe('Pattern 7: Full cycle (command → action → step → condition)', () => {
        it('generates functions and calls', () => {
            const code = writeJsonAndGenerate('p7', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'start',
                        slots: ['игра'],
                        isPattern: false,
                        response: { text: 'Привет!', buttons: [], sounds: [] },
                    },
                    {
                        type: 'action',
                        id: 'a1',
                        name: 'gen',
                        actions: [
                            { type: 'random_number', field: 'num1', min: 1, max: 10 },
                            { type: 'set_variable', field: 'answer', value: 'num1 + num2' },
                        ],
                        text: '{{num1}}',
                        buttons: [],
                    },
                    {
                        type: 'step',
                        id: 's1',
                        name: 'ask',
                        prompt: { text: 'Ответ:', buttons: [] },
                        saveTo: 'userAnswer',
                        saveAs: 'original',
                    },
                    {
                        type: 'condition',
                        id: 'cond',
                        name: 'check',
                        variable: 'userAnswer',
                        operator: 'eq',
                        value: 'answer',
                        responseTrue: { text: 'Правильно!' },
                        responseFalse: { text: 'Неправильно!' },
                    },
                ],
                edges: [
                    { from: 'c1', to: 'a1', type: 'next' },
                    { from: 'a1', to: 's1', type: 'next' },
                    { from: 's1', to: 'cond', type: 'next' },
                ],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            // Action function
            expect(code).toContain('function __gen(ctrl: BotController)');
            expect(code).toContain('ctrl.userData.num1 = rand(1, 10)');
            expect(code).toContain('setText(ctrl, `');
            // Condition function
            expect(code).toContain('function __check(ctrl: BotController)');
            expect(code).toContain('ctrl.userData.userAnswer === ctrl.userData.answer');
            // Command calls action and navigates to step
            expect(code).toContain("bot.addCommand('start'");
            expect(code).toContain('__gen(ctrl)');
            expect(code).toContain("ctrl.thisIntentName = 'ask'");
            // Step calls condition
            expect(code).toContain("bot.addStep('ask'");
            expect(code).toContain('__check(ctrl)');
        });
    });

    describe('Pattern 8: Command with card', () => {
        it('generates card.addImage', () => {
            const code = writeJsonAndGenerate('p8', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'gallery',
                        slots: ['галерея'],
                        isPattern: false,
                        response: {
                            text: 'Выберите:',
                            buttons: [],
                            sounds: [],
                            card: {
                                type: 'gallery',
                                title: '',
                                images: [
                                    {
                                        src: 'url1.jpg',
                                        title: 'iPhone',
                                        description: '999₽',
                                        button: { title: 'Купить', type: 'action' },
                                    },
                                ],
                            },
                        },
                    },
                ],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("ctrl.card.addImage('url1.jpg', 'iPhone', '999₽', 'Купить')");
        });
    });

    describe('Pattern 9: Command with TTS', () => {
        it('generates ctrl.tts', () => {
            const code = writeJsonAndGenerate('p9', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'voice',
                        slots: ['голос'],
                        isPattern: false,
                        response: { text: 'Текст', tts: 'Озвучка', buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("setTTS(ctrl, 'Озвучка'");
        });
    });

    describe('Pattern 10: Command with HTTP', () => {
        it('generates async fetch', () => {
            const code = writeJsonAndGenerate('p10', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'weather',
                        slots: ['погода'],
                        isPattern: false,
                        actions: [
                            {
                                type: 'http_request',
                                url: 'https://api.weather.com',
                                method: 'GET',
                                saveResponseTo: 'data',
                            },
                        ],
                        response: { text: '{{data.temp}}°C', buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain('async (cmd: string, ctrl: BotController)');
            expect(code).toContain("await fetch('https://api.weather.com')");
            expect(code).toContain('ctrl.userData.data = data');
        });
    });

    describe('Pattern 11: Response block connected to command', () => {
        it('generates function and call', () => {
            const code = writeJsonAndGenerate('p11', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'menu',
                        slots: ['меню'],
                        isPattern: false,
                        response: {
                            text: 'Выберите:',
                            buttons: [{ title: 'Помощь', type: 'action' }],
                            sounds: [],
                        },
                    },
                    {
                        type: 'response',
                        id: 'r1',
                        name: 'help',
                        response: { text: 'Справка', buttons: [], sounds: [] },
                    },
                ],
                edges: [{ from: 'c1', to: 'r1', type: 'next' }],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            // Response generates a function
            expect(code).toContain('function __help(ctrl: BotController)');
            expect(code).toContain("setText(ctrl, 'Справка')");
            // Command calls the function (without type annotation)
            expect(code).toContain('__help(ctrl)');
            // Command does NOT set its own text (because response has text)
            expect(code).not.toContain("setText(ctrl, 'Выберите:')");
        });
    });

    describe('Pattern 12: Card in action block', () => {
        it('generates card in function', () => {
            const code = writeJsonAndGenerate('p12', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'start',
                        slots: ['start'],
                        isPattern: false,
                        response: { text: 'Hi', buttons: [], sounds: [] },
                    },
                    {
                        type: 'response',
                        id: 'r1',
                        name: 'cards',
                        response: {
                            text: 'Выберите:',
                            buttons: [],
                            sounds: [],
                            card: {
                                type: 'list',
                                title: 'Товары',
                                images: [
                                    { src: 'img1.jpg', title: 'Item 1', description: 'Desc 1' },
                                    { src: 'img2.jpg', title: 'Item 2', description: 'Desc 2' },
                                ],
                            },
                        },
                    },
                ],
                edges: [{ from: 'c1', to: 'r1', type: 'next' }],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain('function __cards(ctrl: BotController)');
            expect(code).toContain("ctrl.card.addImage('img1.jpg', 'Item 1', 'Desc 1')");
            expect(code).toContain("ctrl.card.addImage('img2.jpg', 'Item 2', 'Desc 2')");
        });
    });

    describe('Pattern 13: Command with isEnd', () => {
        it('generates ctrl.isEnd', () => {
            const code = writeJsonAndGenerate('p13', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'bye',
                        slots: ['пока'],
                        isPattern: false,
                        response: { text: 'До свидания!', isEnd: true, buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain('ctrl.isEnd = true');
        });
    });

    describe('Fallback', () => {
        it('generates FALLBACK_COMMAND handler', () => {
            const code = writeJsonAndGenerate('fb', {
                name: 'test',
                nodes: [],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain('bot.addCommand(FALLBACK_COMMAND');
            expect(code).toContain("setText(ctrl, 'Не понял')");
        });
    });

    describe('Database adapter', () => {
        it('imports FileAdapter for file database', () => {
            const code = writeJsonAndGenerate('db', {
                name: 'test',
                nodes: [],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("import { FileAdapter } from 'umbot/plugins'");
            expect(code).toContain('bot.use(new FileAdapter())');
        });

        it('imports MongoAdapter for mongo database', () => {
            const code = writeJsonAndGenerate('dbmongo', {
                name: 'test',
                nodes: [],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'mongo', config: { database: 'mydb' } },
                isLocalStorage: false,
            });
            expect(code).toContain("import { MongoAdapter } from 'umbot/plugins'");
            expect(code).toContain('new MongoAdapter(');
            expect(code).toContain("'mydb'");
        });

        it('no adapter import for none database', () => {
            const code = writeJsonAndGenerate('dbnone', {
                name: 'test',
                nodes: [],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'none', config: {} },
                isLocalStorage: false,
            });
            expect(code).not.toContain('FileAdapter');
            expect(code).not.toContain('MongoAdapter');
        });
    });

    describe('Pattern 14: set_variable expression', () => {
        it('resolves variable references in set_variable', () => {
            const code = writeJsonAndGenerate('p14', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'calc',
                        slots: ['calc'],
                        isPattern: false,
                        actions: [
                            { type: 'set_variable', field: 'a', value: '5' },
                            { type: 'set_variable', field: 'b', value: 'a + 3' },
                        ],
                        response: { text: 'Результат: {{b}}', buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain('ctrl.userData.a = 5;');
            expect(code).toContain('ctrl.userData.b = ctrl.userData.a + 3;');
        });
    });

    describe('Pattern 15: isEmpty condition', () => {
        it('generates simple negation for isEmpty', () => {
            const code = writeJsonAndGenerate('p15', {
                name: 'test',
                nodes: [
                    {
                        type: 'step',
                        id: 's1',
                        name: 'ask',
                        prompt: { text: 'Имя?', buttons: [] },
                        saveTo: 'name',
                        saveAs: 'original',
                    },
                    {
                        type: 'condition',
                        id: 'cond1',
                        name: 'check_empty',
                        variable: 'name',
                        operator: 'isEmpty',
                        value: '',
                        responseTrue: { text: 'Пусто!' },
                        responseFalse: { text: 'Есть значение!' },
                    },
                ],
                edges: [{ from: 's1', to: 'cond1', type: 'next' }],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain('if (!ctrl.userData.name)');
            expect(code).toContain("setText(ctrl, 'Пусто!')");
            expect(code).toContain("setText(ctrl, 'Есть значение!')");
        });
    });

    describe('Pattern 16: Step with saveAs lowercase', () => {
        it('generates toLowerCase for saveAs lowercase', () => {
            const code = writeJsonAndGenerate('p16', {
                name: 'test',
                nodes: [
                    {
                        type: 'step',
                        id: 's1',
                        name: 'get_input',
                        prompt: { text: 'Введите:', buttons: [] },
                        saveTo: 'input',
                        saveAs: 'lowercase',
                    },
                ],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("(ctrl.userCommand ?? '').toLowerCase()");
        });
    });

    describe('Pattern 17: Multi-step chain', () => {
        it('generates correct navigation chain for 3 steps', () => {
            const code = writeJsonAndGenerate('p17', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'start',
                        slots: ['go'],
                        isPattern: false,
                        response: { text: 'Начинаем', buttons: [], sounds: [] },
                    },
                    {
                        type: 'step',
                        id: 's1',
                        name: 'step1',
                        prompt: { text: 'Шаг 1', buttons: [] },
                        saveTo: 'v1',
                        saveAs: 'original',
                    },
                    {
                        type: 'step',
                        id: 's2',
                        name: 'step2',
                        prompt: { text: 'Шаг 2', buttons: [] },
                        saveTo: 'v2',
                        saveAs: 'original',
                    },
                ],
                edges: [
                    { from: 'c1', to: 's1', type: 'next' },
                    { from: 's1', to: 's2', type: 'next' },
                ],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("ctrl.thisIntentName = 'step1'");
            expect(code).toContain("ctrl.thisIntentName = 'step2'");
        });
    });

    describe('Pattern 18: Condition operators', () => {
        it('generates correct operators for gt, lt, contains, neq', () => {
            const makeDoc = (operator: string): Record<string, unknown> => ({
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'cmd',
                        name: 'go',
                        slots: ['go'],
                        isPattern: false,
                        response: { text: '', buttons: [], sounds: [] },
                    },
                    {
                        type: 'condition',
                        id: 'cond',
                        name: 'check',
                        variable: 'score',
                        operator,
                        value: 100,
                        responseTrue: { text: 'Да' },
                        responseFalse: { text: 'Нет' },
                    },
                ],
                edges: [{ from: 'cmd', to: 'cond', type: 'next' }],
                fallback: { text: 'No' },
                welcome: { text: 'Hi' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });

            let code = writeJsonAndGenerate('op_gt', makeDoc('gt'));
            expect(code).toContain('Number(ctrl.userData.score) > Number(100)');

            code = writeJsonAndGenerate('op_lt', makeDoc('lt'));
            expect(code).toContain('Number(ctrl.userData.score) < Number(100)');

            code = writeJsonAndGenerate('op_contains', makeDoc('contains'));
            // includes() конвертирует число в строку автоматически
            expect(code).toContain('String(ctrl.userData.score).includes(100)');

            code = writeJsonAndGenerate('op_neq', makeDoc('neq'));
            expect(code).toContain('ctrl.userData.score !== 100');
        });
    });

    describe('Pattern 19: Command with inline condition', () => {
        it('generates inline if/else in command handler', () => {
            const code = writeJsonAndGenerate('p19', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'check',
                        slots: ['check'],
                        isPattern: false,
                        conditions: [
                            {
                                variable: 'level',
                                operator: 'gte',
                                value: 10,
                                responseTrue: { text: 'Высокий уровень' },
                                responseFalse: { text: 'Низкий уровень' },
                            },
                        ],
                        response: { text: '', buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain('if (Number(ctrl.userData.level) >= Number(10))');
            expect(code).toContain("setText(ctrl, 'Высокий уровень')");
            expect(code).toContain("setText(ctrl, 'Низкий уровень'");
        });
    });

    describe('Pattern 20: Step with buttons', () => {
        it('generates buttons inside step handler', () => {
            const code = writeJsonAndGenerate('p20', {
                name: 'test',
                nodes: [
                    {
                        type: 'step',
                        id: 's1',
                        name: 'menu_step',
                        prompt: {
                            text: 'Выберите:',
                            buttons: [
                                { title: 'Один', type: 'action' },
                                { title: 'Два', type: 'action' },
                            ],
                        },
                        saveTo: 'choice',
                        saveAs: 'original',
                    },
                ],
                edges: [],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("ctrl.buttons.addBtn('Один')");
            expect(code).toContain("ctrl.buttons.addBtn('Два')");
        });
    });

    describe('Pattern 21: Error handling', () => {
        it('throws for missing file', () => {
            expect(() => generateFromFlow('/nonexistent/file.json', '/tmp/test')).toThrow(
                'Файл не найден',
            );
        });

        it('throws for invalid JSON', () => {
            const jsonPath = path.join(JSON_DIR, 'bad.json');
            fs.writeFileSync(jsonPath, 'not json');
            expect(() => generateFromFlow(jsonPath, path.join(TEST_DIR, 'bad'))).toThrow(
                'Ошибка парсинга JSON',
            );
        });

        it('throws for missing name field', () => {
            const jsonPath = path.join(JSON_DIR, 'noname.json');
            fs.writeFileSync(jsonPath, JSON.stringify({ nodes: [] }));
            expect(() => generateFromFlow(jsonPath, path.join(TEST_DIR, 'noname'))).toThrow(
                'отсутствует поле "name"',
            );
        });

        it('throws for missing nodes field', () => {
            const jsonPath = path.join(JSON_DIR, 'nonodes.json');
            fs.writeFileSync(jsonPath, JSON.stringify({ name: 'test' }));
            expect(() => generateFromFlow(jsonPath, path.join(TEST_DIR, 'nonodes'))).toThrow(
                'отсутствует поле "nodes"',
            );
        });
    });

    describe('Pattern 22: Welcome text and fallback', () => {
        it('generates welcome and fallback text', () => {
            const code = writeJsonAndGenerate('p22', {
                name: 'test',
                nodes: [],
                edges: [],
                fallback: { text: 'Извините, не понял вас' },
                welcome: { text: 'Добро пожаловать!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("welcome_text: 'Добро пожаловать!'");
            expect(code).toContain("help_text: 'Извините, не понял вас'");
            expect(code).toContain("setText(ctrl, 'Извините, не понял вас'");
        });
    });

    describe('Pattern 23: set_variable with plain text value', () => {
        it('wraps text value in quotes', () => {
            const code = writeJsonAndGenerate('p23_text', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'start',
                        slots: ['старт'],
                        isPattern: false,
                        response: { text: '', buttons: [], sounds: [] },
                    },
                    {
                        type: 'action',
                        id: 'a1',
                        name: 'set_action',
                        actions: [
                            { type: 'set_variable', field: 'greeting', value: 'Hello world' },
                        ],
                        text: '',
                        buttons: [],
                    },
                ],
                edges: [{ from: 'c1', to: 'a1', type: 'next' }],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("ctrl.userData.greeting = 'Hello world'");
            // Не должно быть невалидного JS
            expect(code).not.toMatch(/ctrl\.userData\.greeting = Hello world;/);
        });
    });

    describe('Pattern 24: isNotEmpty operator', () => {
        it('generates isNotEmpty check', () => {
            const code = writeJsonAndGenerate('p24_notempty', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'start',
                        slots: ['старт'],
                        isPattern: false,
                        response: { text: '', buttons: [], sounds: [] },
                    },
                    {
                        type: 'condition',
                        id: 'cond1',
                        name: 'check_items',
                        variable: 'items',
                        operator: 'isNotEmpty',
                        value: '',
                    },
                    {
                        type: 'response',
                        id: 'r1',
                        name: 'has_items',
                        response: { text: 'Есть элементы!', buttons: [], sounds: [] },
                    },
                ],
                edges: [
                    { from: 'c1', to: 'cond1', type: 'next' },
                    { from: 'cond1', to: 'r1', type: 'branch_true' },
                ],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("!!ctrl.userData.items && ctrl.userData.items !== ''");
        });
    });

    describe('Pattern 25: help command registration', () => {
        it('registers help command via bot.addCommand', () => {
            const code = writeJsonAndGenerate('p25_help', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'start',
                        slots: ['старт'],
                        isPattern: false,
                        response: { text: 'Привет!', buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'Не понял. Введите "помощь" для справки.' },
                welcome: { text: 'Привет! Введите "помощь" для справки.' },
                helpText: { text: 'Это справка по боту. Напишите команду.' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            // Проверяем что help_text берётся из helpText, а не fallback
            expect(code).toContain("help_text: 'Это справка по боту. Напишите команду.'");
            // Проверяем что fallback идёт в empty_text
            expect(code).toContain('empty_text: \'Не понял. Введите "помощь" для справки.\'');
        });
    });

    describe('Pattern 26: condition branch → step uses thisIntentName', () => {
        it('navigates to step via thisIntentName instead of calling non-existent function', () => {
            const code = writeJsonAndGenerate('p26_branch_step', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'start',
                        slots: ['старт'],
                        isPattern: false,
                        response: { text: '', buttons: [], sounds: [] },
                    },
                    {
                        type: 'condition',
                        id: 'cond1',
                        name: 'check',
                        variable: 'v',
                        operator: 'eq',
                        value: 'yes',
                    },
                    {
                        type: 'step',
                        id: 's1',
                        name: 'nextStep',
                        prompt: { text: 'Продолжаем', buttons: [] },
                        saveTo: 'x',
                        saveAs: 'original',
                    },
                ],
                edges: [
                    { from: 'c1', to: 'cond1', type: 'next' },
                    { from: 'cond1', to: 's1', type: 'branch_true' },
                ],
                fallback: { text: 'Не понял' },
                welcome: { text: 'Привет!' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            // Должна быть thisIntentName, а НЕ __nextStep(ctrl)
            expect(code).toContain("ctrl.thisIntentName = 'nextStep'");
            expect(code).not.toContain('__nextStep(ctrl)');
            // Шаг зарегистрирован через addStep
            expect(code).toContain("bot.addStep('nextStep'");
        });
    });

    describe('Edge cases: textExpr escaping', () => {
        it('backticks in text are escaped', () => {
            const code = writeJsonAndGenerate('edge_backtick', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'cmd',
                        slots: ['t'],
                        isPattern: false,
                        response: { text: 'Привет `мир`!', buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'ERR' },
                welcome: { text: 'Hi' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain("setText(ctrl, 'Привет \\`мир\\`!')");
        });

        it('${} in text without {{}} is escaped via escapeStr', () => {
            const code = writeJsonAndGenerate('edge_dollar', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'cmd',
                        slots: ['t'],
                        isPattern: false,
                        response: { text: 'Цена: 100${x}р', buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'ERR' },
                welcome: { text: 'Hi' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            // escapeStr экранирует $ → \$ в строке, результат в файле: \${x}
            expect(code).toContain('Цена: 100\\${x}р');
        });

        it('empty {{}} does not produce invalid ${} in template literal', () => {
            const code = writeJsonAndGenerate('edge_empty_braces', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'cmd',
                        slots: ['t'],
                        isPattern: false,
                        response: { text: 'Значение: {{}}', buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'ERR' },
                welcome: { text: 'Hi' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            // {{}} не совпадёт с regex \{\{(\w+)\}\} → останется как есть → в шаблонном литерале ${}
            // Но escapeStr() экранирует $ → \$, поэтому ${} станет \${} — валидный JS
            expect(code).not.toContain('${}');
        });

        it('variable name with dot uses bracket syntax', () => {
            const code = writeJsonAndGenerate('edge_dot_var', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'cmd',
                        slots: ['t'],
                        isPattern: false,
                        saveTo: 'user.name',
                        response: { text: '', buttons: [], sounds: [] },
                    },
                    {
                        type: 'command',
                        id: 'c2',
                        name: 'cmd2',
                        slots: ['t2'],
                        isPattern: false,
                        actions: [{ type: 'set_variable', field: 'result', value: 'user.name' }],
                        response: { text: '', buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'ERR' },
                welcome: { text: 'Hi' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            // user.name не является валидным JS-идентификатором → используется скобочный синтаксис
            expect(code).toContain("ctrl.userData['user.name']");
            expect(code).toContain("ctrl.userData.result = ctrl.userData['user.name']");
        });

        it('text with backticks inside template literal with {{vars}}', () => {
            const code = writeJsonAndGenerate('edge_backtick_template', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'cmd',
                        slots: ['t'],
                        isPattern: false,
                        response: { text: 'Привет {{name}} `мир`!', buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'ERR' },
                welcome: { text: 'Hi' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            // {{name}} → ${...} (не экранируется), \`мир\` → экранируется
            expect(code).toContain('${');
            expect(code).toContain('\\`');
        });
        it('set_variable with __currentTimestamp system var', () => {
            const code = writeJsonAndGenerate('sysvar_ts', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'c1',
                        name: 'cmd',
                        slots: ['t'],
                        isPattern: false,
                        actions: [
                            { type: 'set_variable', field: 'ts', value: '__currentTimestamp' },
                        ],
                        response: { text: '', buttons: [], sounds: [] },
                    },
                ],
                edges: [],
                fallback: { text: 'ERR' },
                welcome: { text: 'Hi' },
                database: { type: 'file', config: {} },
                isLocalStorage: true,
            });
            expect(code).toContain('ctrl.userData.ts = (Date.now())');
            expect(code).not.toContain('Stamp');
        });
    });

    describe('Empty conditions and actions', () => {
        it('skips conditions with empty variable', () => {
            const code = writeJsonAndGenerate('edge_empty_cond', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'cmd1',
                        name: 'test',
                        slots: ['test'],
                        isPattern: false,
                        response: { text: 'hi', buttons: [], sounds: [] },
                        conditions: [
                            {
                                variable: '',
                                operator: 'eq',
                                value: '',
                                responseTrue: { text: '' },
                                responseFalse: { text: '' },
                            },
                        ],
                        actions: [],
                    },
                ],
                edges: [],
                fallback: { text: 'No' },
                welcome: { text: 'Hi' },
                database: { type: 'none', config: {} },
                isLocalStorage: true,
            });
            // Пустые условия не должны генерировать невалидный код
            expect(code).not.toContain("ctrl.userData === ''");
            expect(code).not.toContain('ctrl.userData === ""');
            // Но сама команда должна быть сгенерирована
            expect(code).toContain("bot.addCommand('test'");
        });

        it('skips set_variable with empty field', () => {
            const code = writeJsonAndGenerate('edge_empty_action', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'cmd1',
                        name: 'test',
                        slots: ['test'],
                        isPattern: false,
                        response: { text: 'hi', buttons: [], sounds: [] },
                        conditions: [],
                        actions: [
                            { type: 'set_variable', field: '', value: '' },
                            { type: 'set_variable', field: 'valid', value: 'hello' },
                        ],
                    },
                ],
                edges: [],
                fallback: { text: 'No' },
                welcome: { text: 'Hi' },
                database: { type: 'none', config: {} },
                isLocalStorage: true,
            });
            // Пустое действие пропущено, валидное — есть
            expect(code).toContain("ctrl.userData.valid = 'hello'");
        });

        it('skips random_number with empty field', () => {
            const code = writeJsonAndGenerate('edge_empty_random', {
                name: 'test',
                nodes: [
                    {
                        type: 'command',
                        id: 'cmd1',
                        name: 'test',
                        slots: ['test'],
                        isPattern: false,
                        response: { text: 'hi', buttons: [], sounds: [] },
                        conditions: [],
                        actions: [
                            { type: 'random_number', field: '', min: 1, max: 10 },
                            { type: 'random_number', field: 'score', min: 0, max: 100 },
                        ],
                    },
                ],
                edges: [],
                fallback: { text: 'No' },
                welcome: { text: 'Hi' },
                database: { type: 'none', config: {} },
                isLocalStorage: true,
            });
            expect(code).not.toContain('rand(1, 10)');
            expect(code).toContain('rand(0, 100)');
            expect(code).toContain('ctrl.userData.score');
        });
    });
});
