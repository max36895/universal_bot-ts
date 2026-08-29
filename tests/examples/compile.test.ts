import * as path from 'path';
import * as ts from 'typescript';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const EXAMPLES_DIR = path.join(PROJECT_ROOT, 'examples');

describe('examples', () => {
    it('компилируются без ошибок против текущего API umbot', () => {
        const configPath = path.join(EXAMPLES_DIR, 'tsconfig.json');
        const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
        expect(configFile.error).toBeUndefined();

        const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, EXAMPLES_DIR);
        expect(parsedConfig.fileNames.length).toBeGreaterThan(0);

        // Примеры импортируют пакет umbot. В рамках репозитория подменяем его
        // на собранные декларации из dist/, чтобы проверять именно текущий API.
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
    });
});
