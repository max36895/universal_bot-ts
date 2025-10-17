/**
 * Модуль вспомогательных утилит
 *
 * Предоставляет набор утилит для:
 * - Работы с файловой системой
 * - Обработки текста
 * - Работы с HTTP-параметрами
 * - Взаимодействия с консолью
 *
 * @module utils/standard/util
 */
import * as fs from 'fs';
import * as readline from 'readline';
import { IDir } from '../../core/AppContext';

/**
 * Интерфейс для GET-параметров
 *
 * @example
 * ```typescript
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
 * ```typescript
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
 * ```typescript
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
 * Объединяет два массива объектов
 * @param {object[]} array1 - Основной массив
 * @param {object[]} array2 - Массив для объединения
 * @returns {object} Объединенный массив
 */
export function arrayMerge(array1: object[], array2?: object[]): object {
    if (array2) {
        return [...array1, ...array2];
    }
    return array1;
}

/**
 * Результат выполнения операции с файлом
 *
 * @template T - Тип данных, возвращаемых при успешной операции
 *
 * @example
 * ```typescript
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
 * Проверяет существование файла
 *
 * @param {string} file - Путь к проверяемому файлу
 * @returns {boolean} true, если файл существует и это файл, иначе false
 *
 * @example
 * ```typescript
 * isFile('path/to/file.txt'); // -> true
 * isFile('path/to/directory'); // -> false
 * isFile('nonexistent.txt'); // -> false
 * ```
 */
export function isFile(file: string): boolean {
    const fileInfo = getFileInfo(file);
    return (fileInfo.success && fileInfo.data?.isFile()) || false;
}

/**
 * Возвращает информацию о файле
 *
 * @param {string} fileName - Путь к файлу
 * @returns {FileOperationResult<fs.Stats>} Результат операции с информацией о файле
 *
 * @example
 * ```typescript
 * const result = getFileInfo('file.txt');
 * if (result.success) {
 *   console.log(result.data.size); // размер файла
 *   console.log(result.data.mtime); // время последнего изменения
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function getFileInfo(fileName: string): FileOperationResult<fs.Stats> {
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
 * Читает содержимое файла
 *
 * @param {string} fileName - Путь к файлу
 * @returns {FileOperationResult<string>} Результат операции с содержимым файла
 *
 * @example
 * ```typescript
 * const result = fread('file.txt');
 * if (result.success) {
 *   console.log(result.data); // содержимое файла
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function fread(fileName: string): FileOperationResult<string> {
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
 * Записывает данные в файл
 *
 * @param {string} fileName - Путь к файлу
 * @param {string | Buffer} fileContent - Содержимое для записи
 * @param {'w' | 'a'} [mode='w'] - Режим записи:
 *   - 'w' - перезапись файла
 *   - 'a' - добавление в конец файла
 * @returns {FileOperationResult<void>} Результат операции записи
 *
 * @example
 * ```typescript
 * // Перезапись файла
 * fwrite('file.txt', 'new content');
 *
 * // Добавление в конец файла
 * fwrite('file.txt', 'additional content', 'a');
 * ```
 */
export function fwrite(
    fileName: string,
    fileContent: string | Uint8Array,
    mode: 'w' | 'a' | string = 'w',
): FileOperationResult<void> {
    try {
        if (mode === 'w') {
            fs.writeFileSync(fileName, fileContent);
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
 * Удаляет файл
 *
 * @param {string} fileName - Путь к файлу
 * @returns {FileOperationResult<void>} Результат операции удаления
 *
 * @example
 * ```typescript
 * const result = unlink('file.txt');
 * if (result.success) {
 *   console.log('File deleted successfully');
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function unlink(fileName: string): FileOperationResult<void> {
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
 * Проверяет существование директории
 *
 * @param {string} path - Путь к директории
 * @returns {boolean} true, если директория существует, иначе false
 *
 * @example
 * ```typescript
 * isDir('path/to/directory'); // -> true
 * isDir('nonexistent/dir'); // -> false
 * ```
 */
export function isDir(path: string): boolean {
    try {
        return fs.existsSync(path);
    } catch {
        return false;
    }
}

/**
 * Создает директорию
 *
 * @param {string} path - Путь к создаваемой директории
 * @param {fs.Mode} [mask='0774'] - Маска прав доступа
 * @returns {FileOperationResult<void>} Результат операции создания директории
 *
 * @example
 * ```typescript
 * const result = mkdir('new/directory');
 * if (result.success) {
 *   console.log('Directory created successfully');
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function mkdir(path: string, mask: fs.Mode = '0774'): FileOperationResult<void> {
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
 * Сохраняет данные в файл
 * @param {IDir} dir - Объект с путем и названием файла
 * @param {string} data - Сохраняемые данные
 * @param {string} mode - Режим записи
 * @returns {boolean} true в случае успешного сохранения
 */
export function saveData(dir: IDir, data: string, mode?: string): boolean {
    if (!isDir(dir.path)) {
        mkdir(dir.path);
    }
    fwrite(`${dir.path}/${dir.fileName}`, data, mode);
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
 * ```typescript
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
 * Объект с GET-параметрами текущего URL
 * Доступен только в браузере
 *
 * @example
 * ```typescript
 * // URL: http://example.com?name=John&age=25
 * console.log(GET.name); // -> 'John'
 * console.log(GET.age); // -> '25'
 * ```
 */
let GET: any = {};
if (typeof window !== 'undefined') {
    GET = window.location.search
        .replace('?', '')
        .split('&')
        .reduce(function (p: any, e) {
            const a = e.split('=');
            p[decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
            return p;
        }, {});
}
export { GET };

/**
 * Читает введенные данные из консоли
 *
 * @returns {Promise<string>} Промис с введенной строкой
 *
 * @example
 * ```typescript
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
