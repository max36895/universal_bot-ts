/**
 * Модуль для работы с текстом
 *
 * Предоставляет набор утилит для:
 * - Обработки и форматирования текста
 * - Поиска совпадений в тексте
 * - Проверки схожести текстов
 * - Работы с окончаниями слов
 */
import { getRegExp, isRegex } from './RegExp';
import { rand, similarText } from './util';
import os from 'os';

/**
 * Тип для поиска совпадений в тексте
 * Может быть строкой или массивом строк
 *
 * @example
 * ```typescript
 * const pattern: TPattern = 'привет';
 * const patterns: TPattern = ['привет', 'здравствуйте'];
 * ```
 */
export type TPattern = string | readonly string[];

/**
 * Тип для регулярного выражения
 */
type PatternItem = string | RegExp;
/**
 * Тип для поиска совпадений в тексте с учетом регулярных выражений
 * Может быть строкой или массивом строк
 *
 * @example
 * ```typescript
 * const pattern: TPattern = /привет/;
 * const patterns: TPattern = ['привет', /здравствуйте/];
 * ```
 */
export type TPatternReg = PatternItem | readonly PatternItem[];

/**
 * Интерфейс результата проверки схожести текстов
 *
 * @example
 * ```typescript
 * const result: ITextSimilarity = {
 *   status: true,
 *   index: 0,
 *   percent: 100,
 *   text: 'привет'
 * };
 * ```
 */
export interface ITextSimilarity {
    /**
     * Статус успешности сравнения текстов
     * true - если процент схожести превышает пороговое значение
     */
    status: boolean;

    /**
     * Индекс совпавшего текста в массиве или null для строки.
     * Используется при сравнении с массивом текстов
     */
    index: number | null;

    /**
     * Процент схожести текстов (от 0 до 100)
     * 100% означает полное совпадение
     */
    percent: number;

    /**
     * Совпавший текст или null, если совпадений нет.
     * Содержит оригинальный текст из массива сравнения
     */
    text?: string | null;
}

let MAX_CACHE_SIZE = 3000;

function setMemoryLimit(): void {
    const total = os.totalmem();
    // На всякий случай ограничиваем кэш, если в кэш будут класть группы
    if (total < 0.8 * 1024 ** 3) {
        MAX_CACHE_SIZE = 2000;
    } else if (total < 3 * 1024 ** 3) {
        MAX_CACHE_SIZE = 2500;
    } else {
        MAX_CACHE_SIZE = 3000;
    }
}

setMemoryLimit();

interface ICacheItem {
    /**
     * Количество вызовов
     */
    cReq: number;
    /**
     * Регулярное выражение
     */
    regex: RegExp;
}

const CONFIRM_PATTERNS =
    /(?:^|\s)да(?:^|\s|$)|(?:^|\s)конечно(?:^|\s|$)|(?:^|\s)соглас[^s]+(?:^|\s|$)|(?:^|\s)подтвер[^s]+(?:^|\s|$)/imu;
const REJECT_PATTERNS = /(?:^|\s)нет(?:^|\s|$)|(?:^|\s)неа(?:^|\s|$)|(?:^|\s)не(?:^|\s|$)/imu;

/**
 * Класс для работы с текстом и текстовыми операциями
 *
 * @remarks
 * Класс предоставляет статические методы для:
 * - Обрезки текста
 * - Проверки URL
 * - Определения согласия/отрицания
 * - Поиска совпадений
 * - Работы с окончаниями слов
 * - Проверки схожести текстов
 *
 * @example
 * ```typescript
 * // Обрезка текста
 * Text.resize('Длинный текст', 5); // -> 'Длин...'
 *
 * // Проверка URL
 * Text.isUrl('https://example.com'); // -> true
 *
 * // Определение согласия
 * Text.isSayTrue('да, согласен'); // -> true
 *
 * // Поиск совпадений
 * Text.isSayText(['привет', 'здравствуйте'], 'привет мир'); // -> true
 *
 * // Работа с окончаниями
 * Text.getEnding(5, ['яблоко', 'яблока', 'яблок']); // -> 'яблок'
 *
 * // Проверка схожести
 * Text.textSimilarity('привет', 'привт', 80); // -> { status: true, percent: 90, ... }
 * ```
 */
export class Text {
    /**
     * Кэш для скомпилированных регулярных выражений.
     * Улучшает производительность при повторном использовании шаблонов
     */
    static readonly #regexCache = new Map<string, ICacheItem>();

    /**
     * Обрезает текст до указанной длины
     *
     * @param {string | null} text - Исходный текст
     * @param {number} [size=950] - Максимальная длина результата
     * @param {boolean} [isEllipsis=true] - Добавлять ли многоточие в конце
     * @returns {string} Обрезанный текст
     *
     * @example
     * ```typescript
     * Text.resize('Длинный текст', 5); // -> 'Длин...'
     * Text.resize('Длинный текст', 5, false); // -> 'Длинн'
     * ```
     */
    public static resize(
        text: string | null,
        size: number = 950,
        isEllipsis: boolean = true,
    ): string {
        if (!text) {
            return '';
        }

        if (text.length <= size) {
            return text;
        }

        if (!isEllipsis) {
            return text.substring(0, size);
        }

        const ellipsisSize = Math.max(0, size - 3);
        return text.substring(0, ellipsisSize) + '...';
    }

    /**
     * Проверяет, является ли строка URL-адресом
     *
     * @param {string} link - Проверяемая строка
     * @returns {boolean} true, если строка является URL-адресом
     *
     * @example
     * ```typescript
     * Text.isUrl('https://example.com'); // -> true
     * Text.isUrl('не url'); // -> false
     * ```
     */
    public static isUrl(link: string): boolean {
        if (link.startsWith('http://') || link.startsWith('https://')) {
            try {
                new URL(link);
                return true;
            } catch {
                return false;
            }
        }
        return false;
    }

    /**
     * Определяет наличие в тексте согласия пользователя
     *
     * @param {string} text - Проверяемый текст
     * @returns {boolean} true, если найдено подтверждение
     *
     * @remarks
     * Распознает следующие паттерны:
     * - "да"
     * - "конечно"
     * - "согласен"/"согласна"
     * - "подтверждаю"/"подтверждаю"
     *
     * @example
     * ```typescript
     * Text.isSayTrue('да, согласен'); // -> true
     * Text.isSayTrue('нет, не согласен'); // -> false
     * ```
     */
    public static isSayTrue(text: string): boolean {
        if (!text) {
            return false;
        }
        return Text.#isSayPattern(CONFIRM_PATTERNS, text, true);
    }

    /**
     * Определяет наличие в тексте отрицания пользователя
     *
     * @param {string} text - Проверяемый текст
     * @returns {boolean} true, если найдено отрицание
     *
     * @remarks
     * Распознает следующие паттерны:
     * - "нет"
     * - "неа"
     * - "не"
     *
     * @example
     * ```typescript
     * Text.isSayFalse('нет, не хочу'); // -> true
     * Text.isSayFalse('да, хочу'); // -> false
     * ```
     */
    public static isSayFalse(text: string): boolean {
        if (!text) {
            return false;
        }
        return Text.#isSayPattern(REJECT_PATTERNS, text, true);
    }

    /**
     * Проверяет наличие совпадений в тексте по шаблонам
     *
     * @param {TPattern} patterns - Шаблоны для поиска
     * @param {string} text - Проверяемый текст
     * @param {boolean} useDirectRegExp - Использовать исходные RegExp напрямую без нормализации и кэширования
     * @returns {boolean} true, если найдено совпадение с одним из шаблонов
     */
    static #isSayPattern(
        patterns: TPatternReg,
        text: string,
        useDirectRegExp: boolean = false,
    ): boolean {
        if (!text) {
            return false;
        }
        let pattern: string | RegExp;
        if (Array.isArray(patterns)) {
            const newPatterns: string[] = [];
            for (const patternBase of patterns) {
                if (isRegex(patternBase)) {
                    const cachedRegex = useDirectRegExp
                        ? patternBase
                        : Text.#getCachedRegex(patternBase);
                    if (cachedRegex.global) {
                        // На случай если кто-то задал флаг g, сбрасываем lastIndex,
                        // так как это может привести к не корректному результату
                        cachedRegex.lastIndex = 0;
                    }
                    const res = cachedRegex.test(text);
                    //console.log(cachedRegex);
                    if (res) {
                        return res;
                    }
                } else {
                    newPatterns.push(patternBase);
                }
            }
            if (newPatterns.length) {
                pattern = `(${newPatterns.join(')|(')})`;
                newPatterns.length = 0;
            } else {
                return false;
            }
        } else {
            pattern = patterns as string | RegExp;
        }

        const cachedRegex =
            useDirectRegExp && isRegex(pattern) ? pattern : Text.#getCachedRegex(pattern);
        return cachedRegex.test(text);
    }

    /**
     * Проверяет наличие совпадений в тексте
     *
     * @param {TPattern} find - Искомый текст или массив текстов
     * @param {string} text - Исходный текст для поиска
     * @param {boolean} [isPattern=false] - Использовать ли регулярные выражения
     * @param {boolean} [useDirectRegExp=false] - Использовать исходные RegExp напрямую без нормализации и кэширования. Стоит использовать только в крайних случаях.
     * @returns {boolean} true, если найдено совпадение
     *
     * @example
     * ```typescript
     * // Поиск подстроки
     * Text.isSayText('привет', 'привет мир'); // -> true
     *
     * // Поиск одной из подстрок
     * Text.isSayText(['привет', 'здравствуйте'], 'привет мир'); // -> true
     *
     * // Поиск по регулярному выражению
     * Text.isSayText(['\\bпривет\\b', '\\bмир\\b'], 'привет мир', true); // -> true
     * ```
     */
    public static isSayText(
        find: TPatternReg,
        text: string,
        isPattern: boolean = false,
        useDirectRegExp: boolean = false,
    ): boolean {
        if (!text) return false;

        if (isPattern) {
            return Text.#isSayPattern(find, text, useDirectRegExp);
        }

        const oneFind = Array.isArray(find) && find.length === 1 ? find[0] : find;

        if (typeof oneFind === 'string') {
            if (text.length < oneFind.length) {
                return false;
            }
            return text === oneFind || text.includes(oneFind);
        } else if (isRegex(oneFind)) {
            return this.#isSayPattern(oneFind, text, useDirectRegExp);
        }

        // Оптимизированный вариант для массива: early return + includes
        for (const value of find as PatternItem[]) {
            if (isRegex(value)) {
                if (this.#isSayPattern(value, text, useDirectRegExp)) {
                    return true;
                }
            } else {
                if (text.length < value.length) {
                    continue;
                }
                if (text === value || text.includes(value)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Получает или создает регулярное выражение из кэша
     *
     * @param {string} pattern - Шаблон регулярного выражения
     * @returns {RegExp} Скомпилированное регулярное выражение
     */
    static #getCachedRegex(pattern: string | RegExp): RegExp {
        const key = typeof pattern === 'string' ? pattern : `${pattern.flags}@@${pattern.source}`;
        const cache = Text.#regexCache.get(key);
        let regex = cache?.regex;
        if (!regex) {
            if (Text.#regexCache.size >= MAX_CACHE_SIZE) {
                // При переполнении кэша чистим 30% редко используемых команд
                const entries = [...Text.#regexCache.entries()].sort((tValue, oValue) => {
                    return tValue[1].cReq - oValue[1].cReq;
                });
                const toRemove = Math.floor(MAX_CACHE_SIZE * 0.3);
                for (let i = 0; i < toRemove; i++) {
                    Text.#regexCache.delete(entries[i][0]);
                }
            }
            if (typeof pattern === 'string') {
                regex = getRegExp(pattern);
                Text.#regexCache.set(pattern, {
                    cReq: 1,
                    regex,
                });
            } else {
                regex = getRegExp(pattern);
                Text.#regexCache.set(key, {
                    cReq: 1,
                    regex,
                });
            }
        } else {
            if (cache) {
                cache.cReq++;
                Text.#regexCache.set(key, cache);
            }
        }
        return regex;
    }

    /**
     * Очищает кэш регулярных выражений.
     * Стоит вызывать только в крайних случаях
     */
    public static clearCache(): void {
        Text.#regexCache.clear();
    }

    /**
     * Возвращает случайную строку из массива или исходную строку
     *
     * @param {TPattern} str - Строка или массив строк
     * @returns {string} Выбранная строка
     *
     * @example
     * ```typescript
     * Text.getText('привет'); // -> 'привет'
     * Text.getText(['привет', 'здравствуйте']); // -> случайная строка из массива
     * ```
     */
    public static getText(str: TPattern): string {
        return Array.isArray(str) ? str[rand(0, str.length - 1)] : (str as string);
    }

    /**
     * Заменяет ключ в тексте на значение
     * @param {string} key - Ключ для замены
     * @param {string | string[]} value - Значение для замены
     * @param {string} text - Исходный текст
     */
    public static textReplace(key: string, value: string | string[], text: string): string {
        const correctKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(correctKey, 'g'), () => Text.getText(value));
    }

    /**
     * Возвращает правильное окончание слова в зависимости от числа
     *
     * @param {number} num - Число для определения окончания
     * @param {readonly string[]} titles - Варианты окончаний ['один', 'два-четыре', 'пять-десять']
     * @param {number | null} [index=null] - Принудительный индекс варианта окончания
     * @returns {string | null} Выбранное окончание или null, если не найдено
     *
     * @example
     * ```typescript
     * const titles = ['яблоко', 'яблока', 'яблок'];
     * Text.getEnding(1, titles); // -> 'яблоко'
     * Text.getEnding(2, titles); // -> 'яблока'
     * Text.getEnding(5, titles); // -> 'яблок'
     *
     * // Принудительный выбор формы
     * Text.getEnding(5, titles, 0); // -> 'яблоко'
     * ```
     */
    public static getEnding(
        num: number,
        titles: readonly string[],
        index: number | null = null,
    ): string | null {
        if (index !== null && titles[index] !== undefined) {
            return titles[index];
        }

        const absNum = Math.abs(num);
        const cases = [2, 0, 1, 1, 1, 2];
        const titleIndex =
            absNum % 100 > 4 && absNum % 100 < 20 ? 2 : cases[Math.min(absNum % 10, 5)];

        return titles[titleIndex] || null;
    }

    /**
     * Проверяет схожесть текстов и возвращает результат сравнения
     *
     * @param {string} origText - Оригинальный текст для сравнения
     * @param {TPattern} compareText - Текст или массив текстов для сравнения
     * @param {number} [threshold=80] - Минимальный процент схожести для положительного результата
     * @returns {ITextSimilarity} Результат сравнения текстов
     *
     * @example
     * ```typescript
     * // Сравнение с одним текстом
     * Text.textSimilarity('привет', 'привт', 80);
     * // -> {
     * //   status: true,
     * //   index: 0,
     * //   percent: 90,
     * //   text: 'привт'
     * // }
     *
     * // Сравнение с массивом текстов
     * Text.textSimilarity('привет', ['привт', 'здравствуйте'], 80);
     * // -> {
     * //   status: true,
     * //   index: 0,
     * //   percent: 90,
     * //   text: 'привт'
     * // }
     * ```
     */
    public static textSimilarity(
        origText: string,
        compareText: TPattern,
        threshold: number = 80,
    ): ITextSimilarity {
        const texts: string[] = Array.isArray(compareText) ? compareText : [compareText];
        const normalizedOrigText = origText.toLowerCase();

        let maxSimilarity: ITextSimilarity = {
            percent: 0,
            index: null,
            status: false,
            text: null,
        };

        // Check for exact matches first
        const exactMatch = texts.findIndex((t) => t.toLowerCase() === normalizedOrigText);

        if (exactMatch !== -1) {
            return {
                index: exactMatch,
                status: true,
                percent: 100,
                text: texts[exactMatch],
            };
        }

        // Find best similarity if no exact match
        texts.forEach((currentText, index) => {
            const similarity = similarText(normalizedOrigText, currentText.toLowerCase());
            if (similarity > maxSimilarity.percent) {
                maxSimilarity = {
                    percent: similarity,
                    index: index,
                    status: similarity >= threshold,
                    text: currentText,
                };
            }
        });

        return maxSimilarity;
    }
}
