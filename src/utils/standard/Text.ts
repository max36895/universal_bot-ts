import { rand, similarText } from './util';

/**
 * Тип для поиска совпадений в тексте
 */
export type TPattern = string | readonly string[];

/**
 * Интерфейс для проверки схожести текста
 * @public
 */
export interface ITextSimilarity {
    /**
     * Статус успешности сравнения текстов
     */
    status: boolean;
    /**
     * Индекс совпавшего текста в массиве или null для строки
     */
    index: number | null;
    /**
     * Процент схожести текстов (от 0 до 100)
     */
    percent: number;
    /**
     * Совпавший текст или null, если совпадений нет
     */
    text?: string | null;
}

/**
 * Класс для работы с текстом и текстовыми операциями
 * @class Text
 */
export class Text {
    /**
     * Кэш для скомпилированных регулярных выражений
     * @private
     */
    private static readonly regexCache = new Map<string, RegExp>();

    /**
     * Обрезает текст до указанной длины
     * @param {string | null} text - Исходный текст
     * @param {number} size - Максимальная длина результата
     * @param {boolean} isEllipsis - Добавлять ли многоточие в конце обрезанного текста
     * @returns {string} Обрезанный текст
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
     * @param {string} link - Проверяемая строка
     * @returns {boolean} true, если строка является URL-адресом
     */
    public static isUrl(link: string): boolean {
        const URL_PATTERN = /((http|s:\/\/)[^( |\n)]+)/gimu;
        return URL_PATTERN.test(link);
    }

    /**
     * Определяет наличие в тексте согласия пользователя
     * @param {string} text - Проверяемый текст
     * @returns {boolean} true, если найдено подтверждение
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
     * @param {string} text - Проверяемый текст
     * @returns {boolean} true, если найдено отрицание
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
     * @param {TPattern} patterns - Шаблоны для поиска
     * @param {string} text - Проверяемый текст
     * @returns {boolean} true, если найдено совпадение с одним из шаблонов
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
     * @param {TPattern} find - Искомый текст или массив текстов
     * @param {string} text - Исходный текст для поиска
     * @param {boolean} isPattern - Использовать ли регулярные выражения
     * @returns {boolean} true, если найдено совпадение
     */
    public static isSayText(find: TPattern, text: string, isPattern: boolean = false): boolean {
        if (!text) {
            return false;
        }

        if (!isPattern) {
            return Array.isArray(find)
                ? find.some((value) => text.includes(value))
                : text === find || text.includes(find as string);
        }
        return Text.isSayPattern(find, text);
    }

    /**
     * Получает или создает регулярное выражение из кэша
     * @param {string} pattern - Шаблон регулярного выражения
     * @returns {RegExp} Скомпилированное регулярное выражение
     * @private
     */
    private static getCachedRegex(pattern: string): RegExp {
        let regex = Text.regexCache.get(pattern);
        if (!regex) {
            regex = new RegExp(pattern, 'umig');
            Text.regexCache.set(pattern, regex);
        }
        return regex;
    }

    /**
     * Возвращает случайную строку из массива или исходную строку
     * @param {TPattern} str - Строка или массив строк
     * @returns {string} Выбранная строка
     */
    public static getText(str: TPattern): string {
        return Array.isArray(str) ? str[rand(0, str.length - 1)] : (str as string);
    }

    /**
     * Возвращает правильное окончание слова в зависимости от числа
     * @param {number} num - Число для определения окончания
     * @param {readonly string[]} titles - Варианты окончаний ['один', 'два-четыре', 'пять-десять']
     * @param {number | null} index - Принудительный индекс варианта окончания
     * @returns {string | null} Выбранное окончание или null, если не найдено
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
     * @param {string} origText - Оригинальный текст для сравнения
     * @param {TPattern} compareText - Текст или массив текстов для сравнения
     * @param {number} threshold - Минимальный процент схожести для положительного результата
     * @returns {ITextSimilarity} Результат сравнения текстов
     * @public
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

        return maxSimilarity.status
            ? maxSimilarity
            : {
                  status: false,
                  index: null,
                  percent: 0,
                  text: null,
              };
    }
}
