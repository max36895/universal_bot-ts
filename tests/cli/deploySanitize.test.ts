/**
 * Тесты санитизации значений .env в генерируемом scripts/deploy.js (useCloud).
 *
 * Значения .env попадают в аргументы spawnSync с shell:true (Windows): cmd.exe
 * склеивает команду без экранирования, поэтому спецсимволы (&, |, ^, %, ", CRLF)
 * из значения токена исполнялись бы оболочкой или дописывали бы переменные .env.
 *
 * Правила живут в генерируемой строке deploy.js и недоступны для импорта.
 * Тест фиксирует их двумя слоями:
 *  1. контракт-зеркало — точная копия правил, синхронизированная маркерами
 *     (при рассинхронизации тест падает и требует перенести правку в генератор);
 *  2. проверка генерата — сами определения и их вызовы присутствуют в
 *     сгенерированном deploy.js дословно.
 */
import * as fs from 'fs';
import * as path from 'path';
import { generateFromFlow } from '../../cli/flowGenerator';

// Своя директория вывода (не общая с flowGenerator.test.ts): jest запускает
// сьюты параллельно, и rmSync общей папки в beforeEach ронял соседний сьют.
const TEST_DIR = path.join(__dirname, '__test_output__deploySanitize__');
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

function generateDeployScript(envValue: string): string {
    const jsonPath = path.join(JSON_DIR, 'sanitize.json');
    const outputPath = path.join(TEST_DIR, 'sanitize');
    fs.writeFileSync(
        jsonPath,
        JSON.stringify({
            name: 'sanitize-probe',
            nodes: [],
            edges: [],
            tokens: { telegram: envValue },
            database: { type: 'none' },
        }),
    );
    generateFromFlow(jsonPath, outputPath, { useCloud: true });
    return fs.readFileSync(path.join(outputPath, 'scripts', 'deploy.js'), 'utf8');
}

// ─── Контракт-зеркало правил из cli/flowGenerator.js (generateDeployScript) ───
const sanitizeEnvValue = (value: unknown): string =>
    String(value)
        .replace(/[\r\n\0]/g, '')
        // eslint-disable-next-line no-control-regex -- управляющие символы вычищаются намеренно (зеркало продакшн-правила)
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/"/g, '')
        .replace(/%/g, '');
const quoteArg = (arg: unknown): string => '"' + String(arg).replace(/"/g, '') + '"';

describe('deploy.js: санитизация значений .env для spawnSync shell:true', () => {
    describe('правила (контракт-зеркало)', () => {
        it('вырезает переводы строк — новые переменные .env невозможны', () => {
            const sanitized = sanitizeEnvValue('secret\r\nEVIL_INJECTED=1');
            // Гарантия: без CRLF значение не может разделиться на несколько
            // записей .env и не может перенести команду на новую строку cmd.
            // Текст «EVIL_INJECTED» остаётся литералом внутри значения —
            // для парсера .env и cmd это часть TELEGRAM_TOKEN=..., не переменная.
            expect(sanitized).not.toContain('\r');
            expect(sanitized).not.toContain('\n');
            expect(sanitized).not.toContain('\0');
        });

        it('вырезает кавычки — выйти из квотинга аргумента cmd нельзя', () => {
            const sanitized = sanitizeEnvValue('a" & whoami');
            expect(sanitized).not.toContain('"');
            // Амперсанд остаётся, но аргумент уходит в двойные кавычки
            // (quoteArg), внутри которых & литерален для cmd.
            expect(sanitized).toBe('a & whoami');
        });

        it('вырезает % — раскрытие %PATH% в аргументах невозможно', () => {
            // В режиме командной строки (cmd /c, без batch-файла) удвоение %%
            // НЕ даёт литеральный % — это семантика batch-файлов (замерено на
            // Node 24/win10: %%PATH% раскрывается в значение PATH). Единственная
            // надёжная защита от уноса переменных окружения машины в аргументы
            // деплоя — вырезать %; затронутые переменные помечаются warn'ом.
            expect(sanitizeEnvValue('100%PATH%')).toBe('100PATH');
            expect(sanitizeEnvValue('50%')).toBe('50');
        });

        it('вырезает управляющие символы', () => {
            expect(sanitizeEnvValue('to\x00ken\x1f')).toBe('token');
        });

        it('quoteArg оборачивает аргумент в кавычки и вырезает внутренние', () => {
            expect(quoteArg('--environment')).toBe('"--environment"');
            // Все кавычки значения вырезаются: внутри двойного квотинга cmd
            // вырваться нельзя, хвостовых пустых кавычек не остаётся.
            expect(quoteArg('TELEGRAM_TOKEN=a "b"')).toBe('"TELEGRAM_TOKEN=a b"');
        });
    });

    describe('генерат содержит правила дословно', () => {
        // Генерация ленивая: describe-блоки исполняются на фазе сбора,
        // когда beforeEach ещё не создал директории.
        let deployScript = '';
        beforeEach(() => {
            deployScript = generateDeployScript('plain-token');
        });

        it('определения sanitizeEnvValue/quoteArg/useShell присутствуют', () => {
            expect(deployScript).toContain('const sanitizeEnvValue = (value) =>');
            expect(deployScript).toContain("const useShell = process.platform === 'win32'");
            expect(deployScript).toContain("spawnSync('yc', args.map(quoteArg)");
        });

        it('зеркало синхронно с генератом: цепочка replace совпадает дословно', () => {
            // Ключевая цепочка правил генерата — единственный источник для зеркала.
            // При изменении генератора тест падает здесь: перенеси правку
            // и в контракт-зеркало выше.
            //
            // Внимание: flowGenerator.js собирает deployScript как template
            // literal, поэтому \u0000-эскейпы превращаются в литеральные
            // управляющие символы (NUL/US/DEL) — в генерате нет текста "\u0000".
            // Ожидание собирается из fromCharCode, чтобы исходник теста не
            // содержал невидимых control-символов.
            const CR = String.fromCharCode(13);
            const LF = String.fromCharCode(10);
            const NUL = String.fromCharCode(0);
            const US = String.fromCharCode(0x1f);
            const DEL = String.fromCharCode(0x7f);
            const chain = [
                'const sanitizeEnvValue = (value) => String(value)',
                `.replace(/[${CR}${LF}${NUL}]/g, '')`,
                `.replace(/[${NUL}-${US}${DEL}]/g, '')`,
                `.replace(/"/g, '')`,
                `.replace(/%/g, '');`,
            ].join('\n    ');
            expect(deployScript).toContain(chain);
        });
    });
});
