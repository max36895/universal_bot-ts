/**
 * Модуль для работы с текстом
 *
 * Предоставляет набор утилит для:
 * - Обработки и форматирования текста
 * - Поиска совпадений в тексте
 * - Проверки схожести текстов
 * - Работы с окончаниями слов
 *
 * @module utils/standard/Text
 */
import { rand, similarText } from './util';

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

const MAX_CACHE_SIZE = 3000;

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
     *
     * @private
     */
    private static readonly regexCache = new Map<string, RegExp>();

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
        const URL_PATTERN = /((http|s:\/\/)[^( |\n)]+)/gimu;
        return URL_PATTERN.test(link);
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

        const CONFIRM_PATTERNS: readonly string[] = [
            '(?:^|\\s)да(?:^|\\s|$)',
            '(?:^|\\s)конечно(?:^|\\s|$)',
            '(?:^|\\s)соглас[^s]+(?:^|\\s|$)',
            '(?:^|\\s)подтвер[^s]+(?:^|\\s|$)',
        ];

        return Text.isSayPattern(CONFIRM_PATTERNS, text);
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

        const REJECT_PATTERNS: readonly string[] = [
            '(?:^|\\s)нет(?:^|\\s|$)',
            '(?:^|\\s)неа(?:^|\\s|$)',
            '(?:^|\\s)не(?:^|\\s|$)',
        ];

        return Text.isSayPattern(REJECT_PATTERNS, text);
    }

    /**
     * Проверяет наличие совпадений в тексте по шаблонам
     *
     * @param {TPattern} patterns - Шаблоны для поиска
     * @param {string} text - Проверяемый текст
     * @returns {boolean} true, если найдено совпадение с одним из шаблонов
     *
     * @private
     */
    private static isSayPattern(patterns: TPattern, text: string): boolean {
        if (!text) {
            return false;
        }

        const pattern = Array.isArray(patterns)
            ? `(${patterns.join(')|(')})`
            : (patterns as string);
        const cachedRegex = Text.getCachedRegex(pattern);
        return !!text.match(cachedRegex);
    }

    /**
     * Проверяет наличие совпадений в тексте
     *
     * @param {TPattern} find - Искомый текст или массив текстов
     * @param {string} text - Исходный текст для поиска
     * @param {boolean} [isPattern=false] - Использовать ли регулярные выражения
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
    public static isSayText(find: TPattern, text: string, isPattern: boolean = false): boolean {
        if (!text) return false;

        if (isPattern) {
            return Text.isSayPattern(find, text);
        }

        if (typeof find === 'string') {
            return text === find || text.includes(find);
        }

        // Оптимизированный вариант для массива: early return + includes
        for (const value of find) {
            if (text.includes(value)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Получает или создает регулярное выражение из кэша
     *
     * @param {string} pattern - Шаблон регулярного выражения
     * @returns {RegExp} Скомпилированное регулярное выражение
     *
     * @private
     */
    private static getCachedRegex(pattern: string): RegExp {
        let regex = Text.regexCache.get(pattern);
        if (!regex) {
            if (Text.regexCache.size >= MAX_CACHE_SIZE) {
                Text.regexCache.clear();
            }
            regex = new RegExp(pattern, 'umig');
            Text.regexCache.set(pattern, regex);
        }
        return regex;
    }

    /**
     * Очищает кэш регулярных выражений.
     * Стоит вызывать только в крайних случаях
     */
    public static clearCache(): void {
        Text.regexCache.clear();
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
        const texts = Array.isArray(compareText) ? compareText : [compareText];
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
