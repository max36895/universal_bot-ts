/**
 * Вспомогательные утилиты
 * @package Documentation
 * @module utils
 */
import * as fs from 'fs'
import * as readline from 'readline';

export interface IGetParams {
    [key: string]: string;
}

/**
 * Получение случайного числа из диапазона
 * @param {number} min Минимальное значение
 * @param {number} max Максимальное значение
 * @return {number}
 */
export function rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Проверяем схожесть текста
 * @param {string} first Текст который проверяем
 * @param {string} second Текст с которым сравниваем
 * @param {number} percent
 * @return {number}
 */
export function similarText(first: string, second: string, percent: number = 0): number {
    if (first === null || second === null) {
        return 0;
    }

    let posFirst: number = 0;
    let posSecond: number = 0;
    let max: number = 0;
    let firstLength: number = first.length;
    let secondLength: number = second.length;
    let sum: number;

    for (let firstIndex = 0; firstIndex < firstLength; firstIndex++) {
        for (let secondIndex = 0; secondIndex < secondLength; secondIndex++) {
            let len: number;
            for (len = 0;
                 (firstIndex + len < firstLength) && (secondIndex + len < secondLength)
                 && (first.charAt(firstIndex + len) === second.charAt(secondIndex + len));
                 len++) {
            }
            if (len > max) {
                max = len;
                posFirst = firstIndex;
                posSecond = secondIndex;
            }
        }
    }

    sum = max;

    if (sum) {
        if (posFirst && posSecond) {
            sum += similarText(first.substring(0, posFirst), second.substring(0, posSecond));
        }

        if ((posFirst + max < firstLength) && (posSecond + max < secondLength)) {
            const firstStart = posFirst + max;
            const firstEnd = firstStart + (firstLength - posFirst - max);
            const secondStart = posSecond + max;
            const secondEnd = secondStart + (secondLength - posSecond - max);
            sum += similarText(
                first.substring(firstStart, firstEnd),
                second.substring(secondStart, secondEnd)
            );
        }
    }
    percent = (sum * 200) / (firstLength + secondLength);
    return percent;
}

/**
 * Проверяем существование файла
 * @param {string} file Файл, который необходимо проверить
 * @return {boolean}
 */
export function isFile(file: string): boolean {
    try {
        const stat: fs.Stats = fs.lstatSync(file);
        return stat.isFile();
    } catch (e) {
        return false;
    }
}

/**
 * Читаем содержимое файла
 * @param {string} fileName Файл, содержимое которого нужно получить.
 * @return {string}
 */
export function fread(fileName: string): string {
    return fs.readFileSync(fileName, 'utf-8');
}

/**
 * Записываем данные в файл
 * @param {string} fileName Файл, в который необходимо записать данные.
 * @param {string} fileContent Данные, записываемые в файл.
 * @param {string} mode Режим записи.
 */
export function fwrite(fileName: string, fileContent: string, mode: string = 'w'): void {
    if (mode === 'w') {
        fs.writeFileSync(fileName, fileContent);
    } else {
        fs.appendFileSync(fileName, fileContent);
    }
}

/**
 * Удаление файла
 * @param {string} fileName Файл, который необходимо удалить
 */
export function unlink(fileName: string): void {
    fs.unlinkSync(fileName);
}

/**
 * Проверка на существование директории
 * @param {string} path Проверяемая директория
 * @return {boolean}
 */
export function isDir(path: string): boolean {
    return fs.existsSync(path);
}

/**
 * Создание директории
 * @param {string} path Директория, которую необходимо создать.
 * @param {"fs".Mode} mask Маска для создания директории.
 */
export function mkdir(path: string, mask: fs.Mode = '0774'): void {
    fs.mkdirSync(path, mask);
}

/**
 * Получение Get объекта
 * @param {IGetParams} formData
 * @param {string} separator
 * @return {string}
 */
export function httpBuildQuery(formData: IGetParams, separator: string = '&'): string {
    let key: string;
    const query: string[] = [];
    for (key in formData) {
        if (formData.hasOwnProperty(key)) {
            key = encodeURI(key);
            const val: string = encodeURI((formData[key] + '')).replace(/%20/g, '+');
            query.push(`${key}=${val}`);
        }
    }
    return query.join(separator);
}

let GET: any = {};
if (typeof window !== 'undefined') {
    GET = window
        .location
        .search
        .replace('?', '')
        .split('&')
        .reduce(
            function (p: any, e) {
                const a = e.split('=');
                p[decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
                return p;
            },
            {}
        );
}
export {GET}

/**
 * Чтение введенных данных в консоль
 * @return {Promise<string>}
 */
export function stdin(): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.on('line', (input) => {
            resolve(input);
            rl.close();
        });
    });
}
