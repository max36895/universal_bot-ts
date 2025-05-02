/**
 * Вспомогательные утилиты для работы с файлами и данными
 * @packageDocumentation
 * @module utils
 */
import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Интерфейс для get параметров
 */
export interface IGetParams {
    [key: string]: string;
}

/**
 * Возвращает случайное число из заданного диапазона
 * @param {number} min - Минимальное значение диапазона
 * @param {number} max - Максимальное значение диапазона
 * @returns {number} Случайное число из диапазона
 */
export function rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Вычисляет процент схожести двух текстов
 * @param {string} first - Первый текст для сравнения
 * @param {string} second - Второй текст для сравнения
 * @returns {number} Процент схожести от 0 до 100
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
 * Результат выполнения операции с файлом
 */
interface FileOperationResult<T> {
    /**
     * Флаг успешности операции
     */
    success: boolean;
    /**
     * Данные, полученные в результате операции
     */
    data?: T;
    /**
     * Ошибка, возникшая при выполнении операции
     */
    error?: Error;
}

/**
 * Проверяет существование файла
 * @param {string} file - Путь к проверяемому файлу
 * @returns {boolean} true, если файл существует и это файл, иначе false
 */
export function isFile(file: string): boolean {
    const fileInfo = getFileInfo(file);
    return (fileInfo.success && fileInfo.data?.isFile()) || false;
}

/**
 * Возвращает информацию о файле
 * @param {string} fileName - Путь к файлу
 * @returns {FileOperationResult<fs.Stats>} Результат операции с информацией о файле
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
 * @param {string} fileName - Путь к файлу
 * @returns {FileOperationResult<string>} Результат операции с содержимым файла
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
 * @param {string} fileName - Путь к файлу
 * @param {string} fileContent - Содержимое для записи
 * @param {'w' | 'a'} mode - Режим записи ('w' - перезапись, 'a' - добавление)
 * @returns {FileOperationResult<void>} Результат операции записи
 */
export function fwrite(
    fileName: string,
    fileContent: string,
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
 * @param {string} fileName - Путь к файлу
 * @returns {FileOperationResult<void>} Результат операции удаления
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
 * @param {string} path - Путь к директории
 * @returns {boolean} true, если директория существует, иначе false
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
 * @param {string} path - Путь к создаваемой директории
 * @param {"fs".Mode} mask - Маска прав доступа
 * @returns {FileOperationResult<void>} Результат операции создания директории
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
 * Получение Get объекта
 * @param {IGetParams} formData
 * @param {string} separator
 * @return {string}
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
 * Get параметры
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
 * Чтение введенных данных в консоль
 * @return {Promise<string>}
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
