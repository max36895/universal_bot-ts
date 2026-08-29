import * as fs from 'fs';
import * as path from 'path';
import { computeLogStats, generateEnv, main } from '../../cli/controllers/ConsoleController.js';

describe('CLI stats (computeLogStats)', () => {
    const tmpDir = path.join(__dirname, '__stats_tmp__');
    const logFile = path.join(tmpDir, 'app.log');

    beforeEach(() => {
        if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
        fs.mkdirSync(tmpDir, { recursive: true });
    });
    afterEach(() => {
        if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
    });

    it('возвращает базовые счётчики', () => {
        fs.writeFileSync(
            logFile,
            `[2026-01-01]: Command 'start' matched for user 1
[2026-01-01]: Command 'help' matched for user 2
[2026-01-01]: ERROR something exploded
[2026-01-01]: WARN slow request
`,
        );
        const stats = computeLogStats(logFile);
        expect(stats.total).toBe(4);
        expect(stats.errors).toBe(1);
        expect(stats.warnings).toBe(1);
        expect(stats.topCommands).toEqual([
            ['start', 1],
            ['help', 1],
        ]);
    });

    it('вычисляет p50/p95/p99 из Duration строк', () => {
        const lines = Array.from({ length: 100 }, (_, i) => `Duration: ${i + 1}ms`).join('\n');
        fs.writeFileSync(logFile, lines);
        const stats = computeLogStats(logFile);
        // Math.floor(100 * 0.5) = 50 — индекс массива [0..99], там 51
        expect(stats.p50).toBe(51);
        expect(stats.p95).toBe(96);
        expect(stats.p99).toBe(100);
    });

    it('кидает ошибку при отсутствии файла', () => {
        expect(() => computeLogStats(path.join(tmpDir, 'absent.log'))).toThrow('файл не найден');
    });

    it('корректно работает с пустым файлом', () => {
        fs.writeFileSync(logFile, '');
        const stats = computeLogStats(logFile);
        expect(stats.total).toBe(0);
        expect(stats.p50).toBeNull();
        expect(stats.topCommands).toEqual([]);
    });

    it('не перезаписывает .env без --force', () => {
        const envFile = path.join(tmpDir, '.env');
        fs.writeFileSync(envFile, 'USER_TOKEN=keep');

        expect(() => generateEnv(false, envFile)).toThrow('Укажите --force');
        expect(fs.readFileSync(envFile, 'utf8')).toBe('USER_TOKEN=keep');

        generateEnv(true, envFile);
        expect(fs.readFileSync(envFile, 'utf8')).toContain('TELEGRAM_TOKEN=your-telegram-token');
    });

    it('не сохраняет токены в Params.ts при create с isEnv (утечка секретов)', async () => {
        const projectDir = path.join(tmpDir, 'leak-bot');
        const logSpy = jest.spyOn(console, 'log').mockImplementation();
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        await main(
            {
                command: 'create',
                appName: 'leak_bot',
                mode: 'prod',
                hostname: '0.0.0.0',
                port: 3000,
                params: {
                    path: projectDir,
                    isEnv: true,
                    params: {
                        welcome_text: 'Привет!',
                        alisa_token: 'SECRET-ALISA-TOKEN',
                        yandex_token: 'SECRET-YANDEX-TOKEN',
                        telegram_token: 'SECRET-TELEGRAM-TOKEN',
                        vk_token: 'SECRET-VK-TOKEN',
                    },
                    config: {
                        host: 'localhost',
                        port: 3000,
                        db: { host: 'db-host', user: 'db-user', pass: 'db-pass', database: 'db' },
                    },
                },
            },
            ['node', 'umbot', 'create', 'leak_bot'],
        );

        // Токены попадают в .env (который в .gitignore), а не в коммитящийся Params.ts
        const envContent = fs.readFileSync(path.join(projectDir, '.env'), 'utf8');
        expect(envContent).toContain('ALISA_TOKEN=SECRET-ALISA-TOKEN');
        expect(envContent).toContain('TELEGRAM_TOKEN=SECRET-TELEGRAM-TOKEN');
        expect(envContent).toContain('DB_HOST=db-host');

        const paramsContent = fs.readFileSync(
            path.join(projectDir, 'src', 'config', 'Leak_botParams.ts'),
            'utf8',
        );
        expect(paramsContent).toContain('Привет!');
        expect(paramsContent).not.toContain('SECRET-ALISA-TOKEN');
        expect(paramsContent).not.toContain('SECRET-YANDEX-TOKEN');
        expect(paramsContent).not.toContain('SECRET-TELEGRAM-TOKEN');
        expect(paramsContent).not.toContain('SECRET-VK-TOKEN');

        // db-конфиг с паролем также не должен попасть в коммитящийся Config.ts
        const configContent = fs.readFileSync(
            path.join(projectDir, 'src', 'config', 'Leak_botConfig.ts'),
            'utf8',
        );
        expect(configContent).not.toContain('db-pass');
        expect(configContent).toContain('./.env');

        logSpy.mockRestore();
        warnSpy.mockRestore();
    });

    it('возвращает ненулевой код при ошибке from-flow', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();
        const originalExitCode = process.exitCode;
        process.exitCode = undefined;

        await main(
            { command: 'create', appName: null, mode: 'prod', hostname: '0.0.0.0', port: 3000 },
            ['node', 'umbot', 'create', 'from-flow', path.join(tmpDir, 'missing-flow.json')],
        );

        expect(process.exitCode).toBe(1);
        expect(errorSpy).toHaveBeenCalled();
        process.exitCode = originalExitCode;
        errorSpy.mockRestore();
    });

    it('принимает flow.json после флагов в create from-flow', async () => {
        const flowPath = path.join(tmpDir, 'flow.json');
        fs.writeFileSync(
            flowPath,
            JSON.stringify({
                name: 'flag-order',
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
            }),
        );
        const outputDir = path.join(tmpDir, 'flag-order-bot');
        const logSpy = jest.spyOn(console, 'log').mockImplementation();
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();
        const originalExitCode = process.exitCode;
        process.exitCode = undefined;

        await main(
            { command: 'create', appName: null, mode: 'prod', hostname: '0.0.0.0', port: 3000 },
            ['node', 'umbot', 'create', 'from-flow', '--output', outputDir, flowPath],
        );

        expect(fs.existsSync(path.join(outputDir, 'src', 'index.ts'))).toBe(true);
        expect(process.exitCode).not.toBe(1);
        process.exitCode = originalExitCode;
        logSpy.mockRestore();
        warnSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
