import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'node:child_process';
import { expectProjectToTypeCheck } from '../helpers/typecheck';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const EXAMPLES_DIR = path.join(PROJECT_ROOT, 'examples');

describe('examples', () => {
    it('конфиг примеров не использует устаревшие опции компилятора', () => {
        // moduleResolution "node" (node10) и baseUrl — deprecated в TS 6.0 и
        // вырезаны в TS 7.0: конфиг примеров должен быть готов к обоим.
        const config = fs.readFileSync(path.join(EXAMPLES_DIR, 'tsconfig.json'), 'utf8');
        expect(config).not.toContain('"moduleResolution": "node"');
        expect(config).toContain('"moduleResolution": "Node16"');
        expect(config).not.toContain('"module": "CommonJS"');
        expect(config).toContain('"module": "Node16"');
    });

    it('tsconfig примеров валиден для текущего компилятора', () => {
        // tsc --showConfig разбирает tsconfig через тот же парсер, что и
        // обычная сборка: битый JSON или невалидная опция дадут ненулевой код.
        const tscBin = path.join(PROJECT_ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
        const output = execFileSync(
            process.execPath,
            [tscBin, '-p', EXAMPLES_DIR, '--showConfig', '--noEmit'],
            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
        );
        expect(output).toContain('"moduleResolution": "node16"');
    });

    it('компилируются без ошибок против текущего API umbot', () => {
        // Хелпер подменяет пакет umbot на собранные декларации dist/, поэтому
        // проверяется именно текущий API, а не опубликованная версия.
        expectProjectToTypeCheck(EXAMPLES_DIR);
    });
});
