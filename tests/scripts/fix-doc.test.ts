import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SCRIPT_PATH = path.resolve(__dirname, '../../scripts/fix-doc.js');
const TEST_DIR = path.join(__dirname, '__test_output__');

/**
 * Запускает fix-doc.js в изолированной папке-фикстуре.
 * @param cwd Директория, из которой запускается скрипт
 * @returns Код завершения и вывод скрипта
 */
function runFixDoc(cwd: string): { status: number; output: string } {
    try {
        const output = execFileSync(process.execPath, [SCRIPT_PATH], {
            cwd,
            encoding: 'utf8',
        });
        return { status: 0, output };
    } catch (error) {
        const err = error as { status?: number; stdout?: string; stderr?: string };
        return {
            status: err.status ?? 1,
            output: `${err.stdout ?? ''}${err.stderr ?? ''}`,
        };
    }
}

/**
 * Создаёт фикстуру: package.json с версией и markdown-файлы.
 * @param files Карта относительных путей файлов и их содержимого
 */
function createFixture(files: Record<string, string>): void {
    fs.writeFileSync(
        path.join(TEST_DIR, 'package.json'),
        JSON.stringify({ name: 'fixture', version: '3.1.0' }, null, 2),
    );
    for (const [relativePath, content] of Object.entries(files)) {
        const fullPath = path.join(TEST_DIR, relativePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf8');
    }
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

describe('scripts/fix-doc.js', () => {
    it('не помечает битой ссылку на существующий файл с #якорем', () => {
        createFixture({
            'guide.md': '# Guide\n\nСм. [раздел](./sub/page.md#якорь)\n',
            'sub/page.md': '# Page\n',
        });

        const { status, output } = runFixDoc(TEST_DIR);

        expect(status).toBe(0);
        expect(output).toContain('Все ссылки корректны');
    });

    it('сохраняет #якорь при переписывании ссылки на URL', () => {
        createFixture({
            'guide.md': '# Guide\n\nСм. [раздел](./sub/page.md#якорь)\n',
            'sub/page.md': '# Page\n',
        });

        runFixDoc(TEST_DIR);

        const content = fs.readFileSync(path.join(TEST_DIR, 'guide.md'), 'utf8');
        expect(content).toContain('.sub_page.html#якорь');
    });

    it('продолжает находить реально битую ссылку с #якорем', () => {
        createFixture({
            'guide.md': '# Guide\n\nСм. [раздел](./sub/missing.md#якорь)\n',
        });

        const { status, output } = runFixDoc(TEST_DIR);

        expect(status).toBe(1);
        expect(output).toContain('./sub/missing.md#якорь');
    });

    it('обрабатывает ссылку на существующий файл без якоря', () => {
        createFixture({
            'guide.md': 'См. [раздел](./sub/page.md)\n',
            'sub/page.md': '# Page\n',
        });

        const { status } = runFixDoc(TEST_DIR);

        expect(status).toBe(0);
        const content = fs.readFileSync(path.join(TEST_DIR, 'guide.md'), 'utf8');
        expect(content).toContain('.sub_page.html');
        expect(content).not.toContain('#');
    });
});
