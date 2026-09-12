/**
 * Типечек сгенерированных/примерных проектов через CLI tsc — без программного
 * API компилятора (require('typescript')).
 *
 * Зачем: TypeScript 7 (нативный компилятор) больше не публикует JS API —
 * ts.createProgram/readConfigFile/parseJsonConfigFileContent недоступны.
 * Вызов CLI tsc работает одинаково на всех мажорных версиях компилятора,
 * поэтому тесты, проверяющие компилируемость артефактов, переходят на него.
 *
 * Как: рядом с проверяемым проектом пишется временный tsconfig
 * `tsconfig.umbot-typecheck.json`, расширяющий собственный tsconfig проекта
 * (наследуется вместе с outDir/rootDir/include — с noEmit они безвредны) и
 * подменяющий пакет `umbot` на собранные декларации dist/ репозитория (как
 * это делал прежний программный вариант через paths). Конфиг подчищается
 * после запуска. paths задаются абсолютными путями от корня репозитория —
 * baseUrl не нужен (опция deprecated в TS 6.0, вырезается в 7.0).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Корень репозитория umbot (tests/helpers/.. /..). */
const PROJECT_ROOT = resolve(__dirname, '..', '..');

/** Имя временного конфига — пишется прямо в папку проверяемого проекта. */
const TYPECHECK_CONFIG = 'tsconfig.umbot-typecheck.json';

/**
 * Проверяет, что TS-проект компилируется без ошибок, с подменой пакета umbot
 * на текущие декларации dist/ репозитория.
 *
 * Диагностика компилятора уходит в исключение целиком (вывод tsc) — в отчёте
 * теста видны файлы и коды ошибок, а не только факт падения.
 *
 * @param projectPath Абсолютный путь к папке проекта с собственным tsconfig.json
 * @throws Error с полным выводом tsc, если проект не компилируется
 * @example
 * ```ts
 * import { expectProjectToTypeCheck } from '../helpers/typecheck';
 *
 * generateFromFlow(jsonPath, outputPath);
 * expectProjectToTypeCheck(outputPath);
 * ```
 */
export function expectProjectToTypeCheck(projectPath: string): void {
    const projectTsconfig = join(projectPath, 'tsconfig.json');
    if (!existsSync(projectTsconfig)) {
        throw new Error(`В проекте нет tsconfig.json: ${projectTsconfig}`);
    }

    const configPath = join(projectPath, TYPECHECK_CONFIG);
    writeFileSync(
        configPath,
        JSON.stringify(
            {
                extends: './tsconfig.json',
                compilerOptions: {
                    noEmit: true,
                    types: ['node'],
                    typeRoots: [join(PROJECT_ROOT, 'node_modules', '@types')],
                    paths: {
                        umbot: [join(PROJECT_ROOT, 'dist', 'index.d.ts')],
                        'umbot/*': [join(PROJECT_ROOT, 'dist', '*')],
                    },
                },
            },
            null,
            4,
        ),
        'utf8',
    );

    // tsc берём из node_modules репозитория, а не проверяемого проекта:
    // генерируемые проекты собственных зависимостей не устанавливают.
    const tscBin = join(PROJECT_ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

    let stdout: string;
    try {
        // Ошибки компиляции = ненулевой exit-код tsc; вывод собираем в
        // исключение, чтобы в отчёте теста были файлы и коды ошибок.
        stdout = execFileSync(process.execPath, [tscBin, '-p', configPath], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    } catch (error) {
        const execError = error as { stdout?: string; stderr?: string; message?: string };
        const output = [execError.stdout, execError.stderr].filter(Boolean).join('\n');
        throw new Error(
            `Проект не компилируется (${projectPath}):\n${output || execError.message}`,
            {
                cause: error,
            },
        );
    } finally {
        rmSync(configPath, { force: true });
    }

    // Успешный tsc молчит; непустой вывод без кода ошибки — повод насторожиться.
    if (stdout.trim() !== '') {
        throw new Error(`tsc вернул непустой вывод (${projectPath}):\n${stdout}`);
    }
}
