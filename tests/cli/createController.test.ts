import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const CreateController = require('../../cli/controllers/CreateController.js').create;

const TEST_DIR = path.join(__dirname, '__create_output__');
const PROJECT_ROOT = path.resolve(__dirname, '../..');

function expectProjectToTypeCheck(projectPath: string): void {
    const configPath = path.join(projectPath, 'tsconfig.json');
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    expect(configFile.error).toBeUndefined();

    const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectPath);
    const program = ts.createProgram(parsedConfig.fileNames, {
        ...parsedConfig.options,
        baseUrl: PROJECT_ROOT,
        ignoreDeprecations: '6.0',
        noEmit: true,
        outDir: undefined,
        types: ['node'],
        typeRoots: [path.join(PROJECT_ROOT, 'node_modules', '@types')],
        paths: {
            umbot: ['dist/index.d.ts'],
            'umbot/*': ['dist/*'],
        },
        rootDir: undefined,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    expect(
        ts.formatDiagnosticsWithColorAndContext(diagnostics, {
            getCanonicalFileName: (fileName) => fileName,
            getCurrentDirectory: () => PROJECT_ROOT,
            getNewLine: () => ts.sys.newLine,
        }),
    ).toBe('');
}

beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true });
    }
});

describe('CreateController', () => {
    describe('init()', () => {
        it('создаёт структуру папок с именем проекта', async () => {
            const ctrl = new CreateController();
            ctrl.params = { path: path.join(TEST_DIR, 'full') };
            await ctrl.init('test_bot', CreateController.T_DEFAULT);

            const projectDir = path.join(TEST_DIR, 'full');
            expect(fs.existsSync(path.join(projectDir, 'src', 'index.ts'))).toBe(true);
            expect(fs.existsSync(path.join(projectDir, 'src', 'config', 'test_botConfig.ts'))).toBe(
                true,
            );
            expect(fs.existsSync(path.join(projectDir, 'src', 'config', 'test_botParams.ts'))).toBe(
                true,
            );
            expect(
                fs.existsSync(path.join(projectDir, 'src', 'controller', 'Test_botController.ts')),
            ).toBe(true);
            expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true);
            expect(fs.existsSync(path.join(projectDir, 'tsconfig.json'))).toBe(true);
            expect(fs.existsSync(path.join(projectDir, '.gitignore'))).toBe(true);
        });

        it('создаёт проект по вложенному пути', async () => {
            const ctrl = new CreateController();
            ctrl.params = { path: path.join(TEST_DIR, 'nested', 'deep', 'project') };
            await ctrl.init('test-bot', CreateController.T_DEFAULT);

            const projectDir = path.join(TEST_DIR, 'nested', 'deep', 'project');
            expect(fs.existsSync(path.join(projectDir, 'src', 'index.ts'))).toBe(true);
            expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true);
        });

        it('выводит ошибку при пустом имени проекта', () => {
            const ctrl = new CreateController();
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            ctrl.init(null, CreateController.T_DEFAULT);
            expect(consoleSpy).toHaveBeenCalledWith('Не указано имя проекта');
            consoleSpy.mockRestore();
        });

        it('выводит ошибку при undefined имени', () => {
            const ctrl = new CreateController();
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            ctrl.init(undefined, CreateController.T_DEFAULT);
            expect(consoleSpy).toHaveBeenCalledWith('Не указано имя проекта');
            consoleSpy.mockRestore();
        });

        it('создаёт QuizController при type=Quiz', async () => {
            const ctrl = new CreateController();
            ctrl.params = { path: path.join(TEST_DIR, 'quiz') };
            await ctrl.init('quiz-test', CreateController.T_QUIZ);

            const controllerDir = path.join(TEST_DIR, 'quiz', 'src', 'controller');
            expect(fs.existsSync(controllerDir)).toBe(true);
            const files = fs.readdirSync(controllerDir);
            const quizFile = files.find((f) => f.includes('Quiz'));
            expect(quizFile).toBeTruthy();
        });

        it('с --minimal не создаёт controller папку для default типа', async () => {
            const ctrl = new CreateController();
            ctrl.params = { path: path.join(TEST_DIR, 'minimal') };
            ctrl.flags = ['--minimal'];
            await ctrl.init('minimal-test', CreateController.T_DEFAULT);

            const controllerDir = path.join(TEST_DIR, 'minimal', 'src', 'controller');
            expect(fs.existsSync(controllerDir)).toBe(false);
            expect(fs.existsSync(path.join(TEST_DIR, 'minimal', 'src', 'index.ts'))).toBe(true);
        });

        it('с --minimal и Quiz типом всё равно создаёт controller', async () => {
            const ctrl = new CreateController();
            ctrl.params = { path: path.join(TEST_DIR, 'minimal-quiz') };
            ctrl.flags = ['--minimal'];
            await ctrl.init('minimal-quiz', CreateController.T_QUIZ);

            const controllerDir = path.join(TEST_DIR, 'minimal-quiz', 'src', 'controller');
            expect(fs.existsSync(controllerDir)).toBe(true);
        });

        it('с --prod создаёт Dockerfile, .dockerignore и deploy.yml', async () => {
            const ctrl = new CreateController();
            ctrl.params = { path: path.join(TEST_DIR, 'prod') };
            ctrl.flags = ['--prod'];
            await ctrl.init('prod-test', CreateController.T_DEFAULT);

            const projectDir = path.join(TEST_DIR, 'prod');
            expect(fs.existsSync(path.join(projectDir, 'Dockerfile'))).toBe(true);
            expect(fs.existsSync(path.join(projectDir, '.dockerignore'))).toBe(true);
            expect(fs.existsSync(path.join(projectDir, '.github', 'workflows', 'deploy.yml'))).toBe(
                true,
            );

            // .dockerignore должен исключать секреты и артефакты из образа
            const dockerIgnore = fs.readFileSync(path.join(projectDir, '.dockerignore'), 'utf8');
            expect(dockerIgnore).toContain('.env');
            expect(dockerIgnore).toContain('node_modules/');

            // deploy.yml не должен передавать секреты флагами -e (видны в ps),
            // а использовать --env-file; имя образа подставляется из имени проекта
            // (init() заменяет не-буквенно-цифровые символы на '_', поэтому prod_test)
            const deploy = fs.readFileSync(
                path.join(projectDir, '.github', 'workflows', 'deploy.yml'),
                'utf8',
            );
            expect(deploy).toContain('--env-file');
            expect(deploy).not.toContain('-e TELEGRAM_TOKEN=');
            expect(deploy).toContain('prod_test');
            expect(deploy).not.toContain('{{imageName}}');
        });
    });

    describe('_replace()', () => {
        it('заменяет строку в строке', () => {
            const ctrl = new CreateController();
            const result = ctrl._replace('{{name}}', 'test', 'Hello {{name}}!');
            expect(result).toBe('Hello test!');
        });

        it('заменяет массив строк', () => {
            const ctrl = new CreateController();
            const result = ctrl._replace(['{{a}}', '{{b}}'], ['x', 'y'], '{{a}} and {{b}}');
            expect(result).toBe('x and y');
        });

        it('использует последний элемент при нехватке значений', () => {
            const ctrl = new CreateController();
            const result = ctrl._replace(['{{a}}', '{{b}}', '{{c}}'], ['x'], '{{a}}, {{b}}, {{c}}');
            expect(result).toBe('x, x, x');
        });
    });

    describe('_initConfig() и _initParams()', () => {
        it('генерирует конфиг с IAppConfig импортом', () => {
            const ctrl = new CreateController();
            const result = ctrl._initConfig({ host: 'localhost', port: 3000 });
            expect(result).toContain("import { IAppConfig } from 'umbot'");
            expect(result).toContain('localhost');
            expect(result).toContain('3000');
        });

        it('добавляет env-поле при isEnv=true', () => {
            const ctrl = new CreateController();
            ctrl.params = { isEnv: true };
            const result = ctrl._initConfig({ host: 'localhost' });
            expect(result).toContain('./.env');
        });

        it('генерирует params с IAppParam импортом', () => {
            const ctrl = new CreateController();
            const result = ctrl._initParams({ welcome_text: 'Привет!' });
            expect(result).toContain("import { IAppParam } from 'umbot'");
            expect(result).toContain('Привет!');
        });

        it('мержит params с переданными значениями', () => {
            const ctrl = new CreateController();
            ctrl.params = { params: { welcome_text: 'Здравствуйте!' } };
            const result = ctrl._initParams({ welcome_text: 'Привет!', help_text: 'Помощь' });
            expect(result).toContain('Здравствуйте!');
            expect(result).toContain('Помощь');
        });
    });

    describe('безопасность при перезаписи (--force)', () => {
        it('с --force перезаписывает непустую директорию', async () => {
            const existingDir = path.join(TEST_DIR, 'existing-force');
            fs.mkdirSync(existingDir, { recursive: true });
            fs.writeFileSync(path.join(existingDir, 'old-file.txt'), 'old');

            const ctrl = new CreateController();
            ctrl.params = { path: existingDir };
            ctrl.flags = ['--force'];
            await ctrl.init('existing-force', CreateController.T_DEFAULT);

            expect(fs.existsSync(path.join(existingDir, 'old-file.txt'))).toBe(true);
            expect(fs.existsSync(path.join(existingDir, 'src', 'index.ts'))).toBe(true);
        });
    });

    describe('mode выбор шаблона index', () => {
        it('mode=dev создаёт index с BotTest', async () => {
            const ctrl = new CreateController();
            ctrl.params = { path: path.join(TEST_DIR, 'dev'), mode: 'dev' };
            await ctrl.init('dev-mode', CreateController.T_DEFAULT);

            const indexPath = path.join(TEST_DIR, 'dev', 'src', 'index.ts');
            const content = fs.readFileSync(indexPath, 'utf8');
            expect(content).toContain('BotTest');
        });

        it('mode=build создаёт index с run()', async () => {
            const ctrl = new CreateController();
            ctrl.params = { path: path.join(TEST_DIR, 'build'), mode: 'build' };
            await ctrl.init('build-mode', CreateController.T_DEFAULT);

            const indexPath = path.join(TEST_DIR, 'build', 'src', 'index.ts');
            const content = fs.readFileSync(indexPath, 'utf8');
            expect(content).toContain('run');
        });

        it('--minimal + mode=dev создаёт минимальный dev-шаблон', async () => {
            const ctrl = new CreateController();
            ctrl.params = { path: path.join(TEST_DIR, 'dev-min'), mode: 'dev' };
            ctrl.flags = ['--minimal'];
            await ctrl.init('dev-min', CreateController.T_DEFAULT);

            // Минимальный шаблон не создаёт отдельный файл контроллера
            const controllerDir = path.join(TEST_DIR, 'dev-min', 'src', 'controller');
            expect(fs.existsSync(controllerDir)).toBe(false);

            const indexPath = path.join(TEST_DIR, 'dev-min', 'src', 'index.ts');
            const content = fs.readFileSync(indexPath, 'utf8');
            expect(content).toContain('BotTest');
        });
    });

    describe('генерация и безопасность артефактов', () => {
        it('требует --force для непустой директории', async () => {
            const projectDir = path.join(TEST_DIR, 'existing');
            fs.mkdirSync(projectDir, { recursive: true });
            fs.writeFileSync(path.join(projectDir, 'user-file.txt'), 'keep');

            const ctrl = new CreateController();
            ctrl.params = { path: projectDir };

            await expect(ctrl.init('existing', CreateController.T_DEFAULT)).rejects.toThrow(
                '--force',
            );
            expect(fs.readFileSync(path.join(projectDir, 'user-file.txt'), 'utf8')).toBe('keep');
        });

        it('не заменяет Dockerfile и workflow без --force', () => {
            const projectDir = path.join(TEST_DIR, 'existing-assets');
            const workflowDir = path.join(projectDir, '.github', 'workflows');
            fs.mkdirSync(workflowDir, { recursive: true });
            fs.writeFileSync(path.join(projectDir, 'Dockerfile'), 'user dockerfile');
            fs.writeFileSync(path.join(workflowDir, 'deploy.yml'), 'user workflow');

            const ctrl = new CreateController();

            expect(() => ctrl.createDockerFile(projectDir)).toThrow('Укажите --force');
            expect(() => ctrl.createDeployFile(projectDir)).toThrow('Укажите --force');
        });

        it('собирает сгенерированные варианты шаблонов', async () => {
            const variants = [
                {
                    name: 'default',
                    mode: undefined,
                    minimal: false,
                    type: CreateController.T_DEFAULT,
                },
                {
                    name: 'minimal',
                    mode: undefined,
                    minimal: true,
                    type: CreateController.T_DEFAULT,
                },
                { name: 'dev', mode: 'dev', minimal: false, type: CreateController.T_DEFAULT },
                {
                    name: 'dev-online',
                    mode: 'dev-online',
                    minimal: false,
                    type: CreateController.T_DEFAULT,
                },
                { name: 'build', mode: 'build', minimal: false, type: CreateController.T_DEFAULT },
                { name: 'quiz', mode: undefined, minimal: false, type: CreateController.T_QUIZ },
            ];

            for (const variant of variants) {
                const projectDir = path.join(TEST_DIR, `compile-${variant.name}`);
                const ctrl = new CreateController();
                ctrl.params = { path: projectDir, mode: variant.mode };
                ctrl.flags = variant.minimal ? ['--minimal'] : [];
                await ctrl.init(`compile-${variant.name}`, variant.type);

                expectProjectToTypeCheck(projectDir);
            }
        });

        it('escapes hostname and ignores an invalid port before writing TypeScript', async () => {
            const projectDir = path.join(TEST_DIR, 'safe-network-params');
            const ctrl = new CreateController();
            ctrl.params = {
                path: projectDir,
                hostname: 'api".example.test',
                port: '3000; invalid',
            };

            await ctrl.init('safe-network-params', CreateController.T_DEFAULT);

            const index = fs.readFileSync(path.join(projectDir, 'src', 'index.ts'), 'utf8');
            expect(index).toContain('bot.start("api\\".example.test", 3000);');
            expectProjectToTypeCheck(projectDir);
        });
    });
});
