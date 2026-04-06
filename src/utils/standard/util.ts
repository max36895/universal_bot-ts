/**
 * Модуль вспомогательных утилит
 *
 * Предоставляет набор утилит для:
 * - Работы с файловой системой
 * - Обработки текста
 * - Работы с HTTP-параметрами
 * - Взаимодействия с консолью
 */
import * as fs from 'fs';
// Импорт fs/promises — легитимная работа с файловой системой (чтение/запись конфигов, логов, загрузок).
import * as fsPromises from 'fs/promises';
import * as readline from 'readline';
import { TLoggerCb } from '../../core/interfaces/ILogger';
import { IDir } from '../../core/interfaces/IAppContext';
import { join } from 'node:path';

/**
 * Интерфейс для GET-параметров
 *
 * @example
 * ```ts
 * const params: IGetParams = {
 *   name: 'John',
 *   age: '25'
 * };
 * ```
 */
export interface IGetParams {
    [key: string]: string;
}

/**
 * Возвращает случайное число из заданного диапазона
 *
 * @param {number} min - Минимальное значение диапазона (включительно)
 * @param {number} max - Максимальное значение диапазона (включительно)
 * @returns {number} Случайное целое число из диапазона [min, max]
 *
 * @example
 * ```ts
 * rand(1, 10); // -> случайное число от 1 до 10
 * rand(0, 1); // -> 0 или 1
 * ```
 */
export function rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Вычисляет процент схожести двух текстов
 * Использует алгоритм LCS (Longest Common Subsequence)
 *
 * @param {string} first - Первый текст для сравнения
 * @param {string} second - Второй текст для сравнения
 * @returns {number} Процент схожести от 0 до 100
 *
 * @example
 * ```ts
 * similarText('привет', 'привт'); // -> ~90
 * similarText('hello', 'world'); // -> ~20
 * similarText('same', 'same'); // -> 100
 * ```
 */
export function similarText(first: string, second: string): number {
    if (first === second || (first.length === 0 && second.length === 0)) {
        return 100;
    }
    if (first.length === 0 || second.length === 0) {
        return 0;
    }

    // Helper function to calculate LCS length using dynamic programming
    const lcsLength = (shorter: string, longer: string): number => {
        const dp = new Int32Array(longer.length + 1);
        dp.fill(0, 0, longer.length + 1);

        for (let i = 0; i < shorter.length; i++) {
            let prevDiag = 0;
            for (let j = 0; j < longer.length; j++) {
                const current = dp[j + 1];
                dp[j + 1] = shorter[i] === longer[j] ? prevDiag + 1 : Math.max(dp[j + 1], dp[j]);
                prevDiag = current;
            }
        }

        return dp[longer.length];
    };

    // Ensure shorter string is first for optimization
    const [a, b] = first.length <= second.length ? [first, second] : [second, first];
    const totalLength = first.length + second.length;

    return (lcsLength(a, b) * 200) / totalLength;
}

/**
 * Результат выполнения операции с файлом
 *
 * @template T - Тип данных, возвращаемых при успешной операции
 *
 * @example
 * ```ts
 * const result: FileOperationResult<string> = {
 *   success: true,
 *   data: 'file content'
 * };
 *
 * const error: FileOperationResult<void> = {
 *   success: false,
 *   error: new Error('File not found')
 * };
 * ```
 */
export interface FileOperationResult<T> {
    /**
     * Флаг успешности операции
     * true - операция выполнена успешно
     * false - произошла ошибка
     */
    success: boolean;

    /**
     * Данные, полученные в результате операции.
     * Присутствует только при success = true
     */
    data?: T;

    /**
     * Ошибка, возникшая при выполнении операции.
     * Присутствует только при success = false
     */
    error?: Error;
}

/**
 * Быстрое сравнение на то похож введенный текст на имя файла или нет
 * @param str
 */
function looksLikeFilePath(str: string): boolean {
    const i = str.lastIndexOf('.');
    return (
        i > 0 && // есть точка, и не в начале
        i < str.length - 1 && // не в конце
        str.length - i <= 6 && // расширение ≤5 символов (".js", ".json" и т.п.)
        /^\w+$/.test(str.slice(i + 1)) // расширение — только словесные символы
    );
}

/**
 * Синхронно проверяет существование файла
 *
 * @param {string} file - Путь к проверяемому файлу
 * @returns {boolean} true, если файл существует и это файл, иначе false
 *
 * @example
 * ```ts
 * isFile('path/to/file.txt'); // -> true
 * isFile('path/to/directory'); // -> false
 * isFile('nonexistent.txt'); // -> false
 * ```
 */
export function isFileSync(file: string): boolean {
    // Если в тексте нет точки, значит это явно не файл
    if (looksLikeFilePath(file)) {
        const fileInfo = getFileInfoSync(file);
        return !!(fileInfo.success && fileInfo.data?.isFile());
    }
    return false;
}

/**
 * Синхронно возвращает информацию о файле
 *
 * @param {string} fileName - Путь к файлу
 * @returns {FileOperationResult<fs.Stats>} Результат операции с информацией о файле
 *
 * @example
 * ```ts
 * const result = getFileInfo('file.txt');
 * if (result.success) {
 *   console.log(result.data.size); // размер файла
 *   console.log(result.data.mtime); // время последнего изменения
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function getFileInfoSync(fileName: string): FileOperationResult<fs.Stats> {
    try {
        const stats = fs.lstatSync(fileName);
        return { success: true, data: stats };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error('Unknown error'),
        };
    }
}

/**
 * Синхронно читает содержимое файла
 *
 * @param {string} fileName - Путь к файлу
 * @returns {FileOperationResult<string>} Результат операции с содержимым файла
 *
 * @example
 * ```ts
 * const result = fread('file.txt');
 * if (result.success) {
 *   console.log(result.data); // содержимое файла
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function freadSync(fileName: string): FileOperationResult<string> {
    try {
        const content = fs.readFileSync(fileName, 'utf-8');
        return { success: true, data: content };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error('Failed to read file'),
        };
    }
}

/**
 * Синхронно записывает данные в файл
 *
 * @param {string} fileName - Путь к файлу
 * @param {string | Uint8Array} fileContent - Содержимое для записи
 * @param {'w' | 'a'} [mode='w'] - Режим записи:
 *   - 'w' - перезапись файла
 *   - 'a' - добавление в конец файла
 * @returns {FileOperationResult<void>} Результат операции записи
 *
 * @example
 * ```ts
 * // Перезапись файла
 * fwrite('file.txt', 'new content');
 *
 * // Добавление в конец файла
 * fwrite('file.txt', 'additional content', 'a');
 * ```
 */
export function fwriteSync(
    fileName: string,
    fileContent: string | Uint8Array,
    mode: 'w' | 'a' | string = 'w',
): FileOperationResult<void> {
    try {
        if (mode === 'w') {
            const tmpPath = `${fileName}.tmp`;
            fs.writeFileSync(tmpPath, fileContent);
            fs.renameSync(tmpPath, fileName);
        } else {
            fs.appendFileSync(fileName, fileContent);
        }
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error('Failed to write file'),
        };
    }
}

/**
 * Синхронно удаляет файл
 *
 * @param {string} fileName - Путь к файлу
 * @returns {FileOperationResult<void>} Результат операции удаления
 *
 * @example
 * ```ts
 * const result = unlink('file.txt');
 * if (result.success) {
 *   console.log('File deleted successfully');
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function unlinkSync(fileName: string): FileOperationResult<void> {
    try {
        fs.unlinkSync(fileName);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error('Failed to delete file'),
        };
    }
}

/**
 * Синхронно проверяет существование директории
 *
 * @param {string} path - Путь к директории
 * @returns {boolean} true, если директория существует, иначе false
 *
 * @example
 * ```ts
 * isDir('path/to/directory'); // -> true
 * isDir('nonexistent/dir'); // -> false
 * ```
 */
export function isDirSync(path: string): boolean {
    try {
        return fs.existsSync(path);
    } catch {
        return false;
    }
}

/**
 * Синхронно создает директорию
 *
 * @param {string} path - Путь к создаваемой директории
 * @param {fs.Mode} [mask='0774'] - Маска прав доступа
 * @returns {FileOperationResult<void>} Результат операции создания директории
 *
 * @example
 * ```ts
 * const result = mkdir('new/directory');
 * if (result.success) {
 *   console.log('Directory created successfully');
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function mkdirSync(path: string, mask: fs.Mode = '0774'): FileOperationResult<void> {
    try {
        fs.mkdirSync(path, mask);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error('Failed to create directory'),
        };
    }
}

/**
 * Синхронно сохраняет данные в файл
 * @param {IDir} dir - Объект с путем и названием файла
 * @param {string} data - Сохраняемые данные
 * @param {string} mode - Режим записи
 * @param {TLoggerCb} errorLogger - Функция для логирования ошибок
 * @returns {boolean} true в случае успешного сохранения
 */
export function saveDataSync(
    dir: IDir,
    data: string,
    mode?: string,
    errorLogger?: TLoggerCb,
): boolean {
    if (!isDirSync(dir.path)) {
        mkdirSync(dir.path);
    }
    try {
        JSON.parse(data);
    } catch (e) {
        errorLogger?.(
            `Ошибка при сохранении данных в файл: "${dir.path}/${dir.fileName}", так как данные не в json формате. Ошибка: ${(e as Error).message}`,
            {
                error: e,
                data,
                mode,
            },
        );
    }
    const res = fwriteSync(join(dir.path, dir.fileName), data, mode);
    if (!res.success) {
        errorLogger?.(
            `Ошибка при сохранении данных в файл: "${dir.path}/${dir.fileName}". Ошибка: ${res.error}`,
            {
                error: res.error,
                data,
                mode,
            },
        );
        return false;
    }
    return true;
}

/**
 * Синхронно возвращает информацию о файле
 *
 * @param {string} fileName - Путь к файлу
 * @returns {FileOperationResult<fs.Stats>} Результат операции с информацией о файле
 *
 * @example
 * ```ts
 * const result = getFileInfo('file.txt');
 * if (result.success) {
 *   console.log(result.data.size); // размер файла
 *   console.log(result.data.mtime); // время последнего изменения
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function getFileInfo(fileName: string): Promise<FileOperationResult<fs.Stats>> {
    try {
        const stats = await fsPromises.stat(fileName);
        return { success: true, data: stats };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error('Unknown error'),
        };
    }
}

/**
 * Синхронно проверяет существование файла
 *
 * @param {string} file - Путь к проверяемому файлу
 * @returns {boolean} true, если файл существует и это файл, иначе false
 *
 * @example
 * ```ts
 * isFile('path/to/file.txt'); // -> true
 * isFile('path/to/directory'); // -> false
 * isFile('nonexistent.txt'); // -> false
 * ```
 */
export async function isFile(file: string): Promise<boolean> {
    // Если в тексте нет точки, значит это явно не файл
    if (looksLikeFilePath(file)) {
        const fileInfo = await getFileInfo(file);
        return !!(fileInfo.success && fileInfo.data?.isFile());
    }
    return false;
}

/**
 * Проверяет существование директории
 * @param path - Путь к директории
 * @returns Promise<boolean> - true если директория существует
 */
export async function isDir(path: string): Promise<boolean> {
    try {
        const stat = await fsPromises.stat(path);
        return stat.isDirectory();
    } catch {
        return false;
    }
}

/**
 * Создает директорию
 * @param path - Путь к создаваемой директории
 * @param mask - Маска прав доступа
 * @returns Promise с результатом операции
 */
export async function mkdir(path: string, mask?: fs.Mode): Promise<FileOperationResult<void>> {
    try {
        await fsPromises.mkdir(path, mask);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error('Failed to create directory'),
        };
    }
}

/**
 * Читает файл
 * @param fileName - Путь к файлу
 * @returns Promise с результатом операции
 */
export async function fread(fileName: string): Promise<FileOperationResult<string | Buffer>> {
    try {
        const content = await fsPromises.readFile(fileName);
        return { success: true, data: content };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error('Failed to read file'),
        };
    }
}

/**
 * Записывает данные в файл
 * @param fileName - Путь к файлу
 * @param fileContent - Содержимое для записи
 * @param mode - Режим записи: 'w' - перезапись, 'a' - добавление
 * @returns Promise с результатом операции
 */
export async function fwrite(
    fileName: string,
    fileContent: string | Uint8Array,
    mode: 'w' | 'a' | string = 'w',
): Promise<FileOperationResult<void>> {
    try {
        if (mode === 'w') {
            const tmpPath = `${fileName}.tmp`;
            await fsPromises.writeFile(tmpPath, fileContent);
            await fsPromises.rename(tmpPath, fileName);
        } else {
            await fsPromises.appendFile(fileName, fileContent);
        }
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error('Failed to write file'),
        };
    }
}

/**
 * Удаляет файл
 * @param fileName - Путь к файлу
 * @returns Promise с результатом операции
 */
export async function unlink(fileName: string): Promise<FileOperationResult<void>> {
    try {
        await fsPromises.unlink(fileName);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error('Failed to delete file'),
        };
    }
}

/**
 * Сохраняет данные в файл
 * @param {IDir} dir - Объект с путем и названием файла
 * @param {string} data - Сохраняемые данные
 * @param {string} mode - Режим записи
 * @param {TLoggerCb} errorLogger - Функция для логирования ошибок
 * @returns {boolean} true в случае успешного сохранения
 */
export async function saveData(
    dir: IDir,
    data: string,
    mode?: string,
    errorLogger?: TLoggerCb,
): Promise<boolean> {
    if (!(await isDir(dir.path))) {
        await mkdir(dir.path);
    }
    if (data.startsWith('{')) {
        try {
            JSON.parse(data);
        } catch (e) {
            errorLogger?.(
                `Ошибка при сохранении данных в файл: "${dir.path}/${dir.fileName}", так как данные не в json формате. Ошибка: ${(e as Error).message}`,
                {
                    error: e,
                    data,
                    mode,
                },
            );
        }
    }
    const res = await fwrite(join(dir.path, dir.fileName), data, mode);
    if (!res.success) {
        errorLogger?.(
            `Ошибка при сохранении данных в файл: "${dir.path}/${dir.fileName}". Ошибка: ${res.error}`,
            {
                error: res.error,
                data,
                mode,
            },
        );
        return false;
    }
    return true;
}

/**
 * Преобразует объект параметров в URL-строку запроса
 *
 * @param {IGetParams} formData - Объект с параметрами
 * @param {string} [separator='&'] - Разделитель параметров
 * @returns {string} URL-строка запроса
 *
 * @example
 * ```ts
 * const params = {
 *   name: 'John Doe',
 *   age: '25'
 * };
 *
 * httpBuildQuery(params);
 * // -> 'name=John+Doe&age=25'
 *
 * httpBuildQuery(params, ';');
 * // -> 'name=John+Doe;age=25'
 * ```
 */
export function httpBuildQuery(formData: IGetParams, separator: string = '&'): string {
    return Object.entries(formData)
        .map(([key, value]) => {
            const encodedKey = encodeURI(key);
            const encodedValue = encodeURI(String(value)).replace(/%20/g, '+');
            return `${encodedKey}=${encodedValue}`;
        })
        .join(separator);
}

/**
 * Читает введенные данные из консоли
 *
 * @returns {Promise<string>} Промис с введенной строкой
 *
 * @example
 * ```ts
 * // В консоли:
 * // > Enter your name: John
 * const name = await stdin(); // -> 'John'
 * ```
 */
export function stdin(): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.once('line', (input) => {
            rl.close();
            resolve(input);
        });
    });
}
