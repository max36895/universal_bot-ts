/**
 * Модуль для работы с текстом
 *
 * Предоставляет набор утилит для:
 * - Обработки и форматирования текста
 * - Поиска совпадений в тексте
 * - Проверки схожести текстов
 * - Работы с окончаниями слов
 */
import { getRegExp, getRegExpOrSelf, isRegex, TPatternRegExp as PatternItem } from './RegExp';
import { rand, similarText } from './util';
import os from 'os';

/**
 * Тип для поиска совпадений в тексте.
 * Может быть строкой или массивом строк.
 *
 * @example
 * ```ts
 * const pattern: TPattern = 'привет';
 * const patterns: TPattern = ['привет', 'здравствуйте'];
 * ```
 */
export type TPattern = string | readonly string[];

/**
 * Тип для поиска совпадений в тексте с учетом регулярных выражений.
 * Может быть строкой, регулярным выражением или их массивом.
 *
 * @example
 * ```ts
 * const pattern: TPatternReg = /привет/;
 * const patterns: TPatternReg = ['привет', /здравствуйте/];
 * ```
 */
export type TPatternReg = PatternItem | readonly PatternItem[];

/**
 * Интерфейс результата проверки схожести текстов
 *
 * @example
 * ```ts
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
     * true - если процент схожести не менее порогового значения
     */
    status: boolean;

    /**
     * Индекс совпавшего текста в массиве; 0 для одиночной строки; null — если совпадений нет.
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
    // Ограничиваем размер кэша сверху: регулярка с группами может занять заметно
    // больше памяти, поэтому на машинах с малым объёмом RAM держим кэш меньше.
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

// Границы слова задаются через lookaround: ключевое слово не должно граничить
// с буквой/цифрой, но может заканчиваться пунктуацией — «Да!», «Нет, спасибо».
// Раньше после слова требовались только ^/\s/$, и самые частые формы
// подтверждения с пунктуацией не распознавались.
const CONFIRM_WORD_BOUNDARY = '(?<![a-zа-яё0-9_])';
const CONFIRM_NOT_BOUNDARY = '(?![a-zа-яё0-9_])';
const CONFIRM_PATTERNS = new RegExp(
    `${CONFIRM_WORD_BOUNDARY}(?:да|конечно)${CONFIRM_NOT_BOUNDARY}` +
        `|${CONFIRM_WORD_BOUNDARY}(?:соглас|подтвер)`,
    'iu',
);
const REJECT_PATTERNS = new RegExp(
    `${CONFIRM_WORD_BOUNDARY}(?:нет|неа|не)${CONFIRM_NOT_BOUNDARY}`,
    'iu',
);

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
 * ```ts
 * // Обрезка текста (итоговая длина = size, включая троеточие)
 * Text.resize('Длинный текст', 5); // -> 'Дл...'
 *
 * // Проверка URL
 * Text.isUrl('http://localhost'); // -> true
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
 * Text.textSimilarity('привет', 'привт', 80); // -> { status: true, percent: ~91, ... }
 * ```
 */
export class Text {
    /**
     * Кэш для скомпилированных регулярных выражений, заданных строкой.
     * Ключ — исходная строка шаблона.
     */
    static readonly #regexCache = new Map<string, ICacheItem>();

    /**
     * Кэш для регулярных выражений, переданных как объект RegExp.
     * Используем WeakMap: когда исходный RegExp-объект умирает,
     * запись удаляется автоматически, поэтому eviction-логика не нужна.
     * Это устраняет горячую конкатенацию `${flags}@@${source}` и Map.get(string)
     * на каждый вызов isSayText с RegExp-слотами.
     */
    static readonly #regexObjectCache = new WeakMap<RegExp, RegExp>();

    /**
     * Порог вытеснения записей из кэша: удаляются паттерны, чей счётчик
     * использований не выше этого значения. После вытеснения сбрасывается в 0
     * (см. #evictRegexCache).
     */
    static #minCacheUsage = 0;

    /**
     * Обрезает строку по границе символа, не разрывая суррогатную пару.
     *
     * `String.substring` режет по code unit'ам UTF-16, поэтому обрыв ровно между
     * старшим и младшим суррогатом эмодзи оставляет «половину символа». Такая строка
     * невалидна в UTF-8: платформы либо показывают U+FFFD, либо отклоняют сообщение.
     * Поэтому при попадании обрезки на старший суррогат отступаем на один code unit назад.
     *
     * @param text Исходный текст
     * @param size Максимальная длина в code unit'ах UTF-16
     */
    static #safeCut(text: string, size: number): string {
        if (size <= 0) {
            return '';
        }
        let end = size;
        const code = text.charCodeAt(end - 1);
        // 0xD800..0xDBFF — старший суррогат, значит младший остался за границей обрезки
        if (code >= 0xd800 && code <= 0xdbff) {
            end--;
        }
        return text.substring(0, end);
    }

    /**
     * Обрезает текст до указанной длины
     *
     * Обрезка выполняется по границе символа: суррогатные пары (эмодзи) не разрываются,
     * поэтому результат остаётся валидной строкой для отправки платформе.
     *
     * @param {string | null} text - Исходный текст
     * @param {number} [size=950] - Максимальная длина результата
     * @param {boolean} [isEllipsis=true] - Добавлять ли многоточие в конце
     * @returns {string} Обрезанный текст
     *
     * @example
     * ```ts
     * Text.resize('Длинный текст', 6); // -> 'Дли...'
     * Text.resize('Длинный текст', 6, false); // -> 'Длинны'
     * Text.resize('aaa😀bbb', 4, false); // -> 'aaa' (эмодзи не разрезано пополам)
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
            return Text.#safeCut(text, size);
        }

        const ellipsisSize = Math.max(0, size - 3);
        return Text.#safeCut(text, ellipsisSize) + '...';
    }

    /**
     * Проверяет, является ли строка URL-адресом
     *
     * @param {string} link - Проверяемая строка
     * @returns {boolean} true, если строка является URL-адресом
     *
     * @example
     * ```ts
     * Text.isUrl('http://localhost'); // -> true
     * Text.isUrl('не url'); // -> false
     * ```
     */
    public static isUrl(link: string): boolean {
        if (link.startsWith('https://') || link.startsWith('http://')) {
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
     * - "согласен"/"согласна" и производные (шаблон "соглас…")
     * - "подтверждаю"/"подтверди" и производные (шаблон "подтвер…")
     *
     * @example
     * ```ts
     * Text.isSayTrue('да, согласен'); // -> true
     * Text.isSayTrue('нет, не хочу'); // -> false
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
     * ```ts
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
     * @param {TPatternReg} patterns - Шаблоны для поиска
     * @param {string} text - Проверяемый текст
     * @param {boolean} useDirectRegExp - Использовать исходные RegExp напрямую без нормализации и кэширования
     * @param {RegExpConstructor} customReg - Произвольный обработчик для регулярных выражений
     * @returns {boolean} true, если найдено совпадение с одним из шаблонов
     */
    static #isSayPattern(
        patterns: TPatternReg,
        text: string,
        useDirectRegExp: boolean = false,
        customReg: RegExpConstructor | undefined = undefined,
    ): boolean {
        if (!text) {
            return false;
        }
        let pattern: PatternItem;
        if (Array.isArray(patterns)) {
            const newPatterns: string[] = [];
            for (let i = 0; i < patterns.length; i++) {
                const patternBase = patterns[i];
                if (isRegex(patternBase)) {
                    const cachedRegex = useDirectRegExp
                        ? patternBase
                        : (Text.#regexObjectCache.get(patternBase) ??
                          ((): RegExp => {
                              const re = getRegExpOrSelf(patternBase, 'ium', customReg);
                              Text.#regexObjectCache.set(patternBase, re);
                              return re;
                          })());
                    if (cachedRegex.global) {
                        cachedRegex.lastIndex = 0;
                    }
                    const res = cachedRegex.test(text);
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
            pattern = patterns as PatternItem;
        }

        const cachedRegex =
            useDirectRegExp && isRegex(pattern)
                ? pattern
                : Text.#getCachedRegex(pattern, customReg);
        // У regexp с флагом g/y `test` продвигает lastIndex, поэтому на следующем запросе
        // тот же объект начнёт поиск с середины строки и вернёт false. Кэш переиспользует
        // объект между запросами — обязательно сбрасываем позицию перед проверкой.
        if (cachedRegex.lastIndex !== 0) {
            cachedRegex.lastIndex = 0;
        }
        return cachedRegex.test(text);
    }

    /**
     * Возвращает скомпилированное регулярное выражение для слота команды.
     *
     * Использует те же кэши, что и `isSayText` (WeakMap для RegExp-объектов,
     * кэш с вытеснением наименее используемых паттернов для строковых шаблонов):
     * повторные вызовы не компилируют регулярку заново. Предназначено для извлечения
     * групп совпадения (`exec`) после того, как команда уже сработала — например,
     * для заполнения `controller.match`.
     *
     * @param {PatternItem} slot Слот команды: RegExp или строка-паттерн
     * @param {boolean} [useDirectRegExp=false] Не нормализовать и не кэшировать RegExp
     * @param {RegExpConstructor} [customReg] Кастомный движок RegExp (например, re2)
     * @returns {RegExp | null} Скомпилированное выражение или null, если слот не строка и не RegExp
     *
     * @example
     * ```ts
     * const reg = Text.getMatchRegExp(/(\d+)/);
     * const match = reg?.exec('заказ 5'); // match?.[1] === '5'
     * ```
     */
    public static getMatchRegExp(
        slot: PatternItem,
        useDirectRegExp: boolean = false,
        customReg: RegExpConstructor | undefined = undefined,
    ): RegExp | null {
        // Строковый паттерн компилируется через тот же кэш с вытеснением наименее
        // используемых паттернов, что и поиск команд (#getCachedRegex): вызов из
        // горячего пути на каждый совпавший запрос не должен платить за new RegExp заново.
        if (typeof slot === 'string') {
            return Text.#getCachedRegex(slot, customReg);
        }
        if (!isRegex(slot)) {
            return null;
        }
        if (useDirectRegExp) {
            return slot;
        }
        const cached = Text.#regexObjectCache.get(slot);
        if (cached) {
            return cached;
        }
        const re = getRegExpOrSelf(slot, 'ium', customReg);
        Text.#regexObjectCache.set(slot, re);
        return re;
    }

    /**
     * Проверяет наличие совпадений в тексте
     *
     * @param {TPatternReg} find - Искомый текст или массив текстов
     * @param {string} text - Исходный текст для поиска
     * @param {boolean} [isPattern=false] - Использовать ли регулярные выражения
     * @param {boolean} [useDirectRegExp=false] - Использовать исходные RegExp напрямую без нормализации и кэширования. Стоит использовать только в крайних случаях.
     * @param {RegExpConstructor} [customReg=undefined] - Произвольная реализация для обработки регулярных выражений
     * @returns {boolean} true, если найдено совпадение
     *
     * @example
     * ```ts
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
        customReg: RegExpConstructor | undefined = undefined,
    ): boolean {
        if (!text) {
            return false;
        }

        if (isPattern) {
            return Text.#isSayPattern(find, text, useDirectRegExp, customReg);
        }

        const oneFind = Array.isArray(find) && find.length === 1 ? find[0] : find;

        if (typeof oneFind === 'string') {
            if (text.length < oneFind.length) {
                return false;
            }
            return text === oneFind || text.includes(oneFind);
        } else if (isRegex(oneFind)) {
            return this.#isSayPattern(oneFind, text, useDirectRegExp, customReg);
        }

        // Оптимизированный вариант для массива: early return + includes
        for (let i = 0; i < (find as TPatternReg[]).length; i++) {
            const value = (find as TPatternReg[])[i];
            if (value === undefined) {
                continue;
            }
            if (isRegex(value)) {
                if (this.#isSayPattern(value, text, useDirectRegExp, customReg)) {
                    return true;
                }
            } else {
                if (text.length < value.length) {
                    continue;
                }
                if (text === value || text.includes(value as string)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Удаляет из кэша записи с минимальным количеством использований.
     * Вместо сортировки всего кэша (O(n log n)) удаляет записи на уровне минимума (O(n)).
     * Стремится удалить ~30% записей кэша; гарантированная доля не обеспечивается.
     */
    static #evictRegexCache(): void {
        const target = Math.floor(MAX_CACHE_SIZE * 0.3);
        let removed = 0;

        for (const [k, item] of Text.#regexCache) {
            if (item.cReq <= Text.#minCacheUsage) {
                Text.#regexCache.delete(k);
                removed++;
                if (removed >= target) {
                    break;
                }
            }
        }

        if (removed < target && Text.#regexCache.size > 0) {
            let newMin = Infinity;
            for (const item of Text.#regexCache.values()) {
                if (item.cReq < newMin) {
                    newMin = item.cReq;
                }
            }
            Text.#minCacheUsage = newMin;
            for (const [k, item] of Text.#regexCache) {
                if (item.cReq <= Text.#minCacheUsage) {
                    Text.#regexCache.delete(k);
                    removed++;
                    if (removed >= target) {
                        break;
                    }
                }
            }
        }

        Text.#minCacheUsage = 0;
    }

    /**
     * Получает регулярное выражение из кэша либо компилирует и сохраняет его.
     * Если кэш переполнен, вызывает внутреннюю очистку кэша (evict).
     *
     * @param pattern - Строка шаблона или уже готовое `RegExp` (в виде объекта паттерна).
     * @param customReg - Произвольная реализация для компиляции регулярного выражения.
     * @returns Скомпилированное `RegExp`.
     */
    static #getCachedRegex(
        pattern: PatternItem,
        customReg: RegExpConstructor | undefined = undefined,
    ): RegExp {
        // Hot-path: если это RegExp-объект, используем WeakMap без eviction.
        // Быстро (нет string concat), и не накапливает записи.
        if (typeof pattern !== 'string') {
            let cached = Text.#regexObjectCache.get(pattern);
            if (!cached) {
                cached = getRegExpOrSelf(pattern, 'ium', customReg);
                Text.#regexObjectCache.set(pattern, cached);
            }
            return cached;
        }
        const cache = Text.#regexCache.get(pattern);
        let regex = cache?.regex;
        if (!regex) {
            if (Text.#regexCache.size >= MAX_CACHE_SIZE) {
                Text.#evictRegexCache();
            }
            regex = getRegExp(pattern, 'ium', customReg);
            Text.#regexCache.set(pattern, {
                cReq: 1,
                regex,
            });
        } else if (cache) {
            cache.cReq++;
        }
        return regex;
    }

    /**
     * Очищает кэш регулярных выражений (только кэш строковых паттернов;
     * WeakMap для RegExp-объектов очищать не нужно — записи удаляются сборщиком мусора).
     * Стоит вызывать только в крайних случаях
     */
    public static clearCache(): void {
        Text.#regexCache.clear();
        Text.#minCacheUsage = 0;
    }

    /**
     * Возвращает случайную строку из массива или исходную строку
     *
     * @param {TPattern} str - Строка или массив строк
     * @returns {string} Выбранная строка
     *
     * @example
     * ```ts
     * Text.getText('привет'); // -> 'привет'
     * Text.getText(['привет', 'здравствуйте']); // -> случайная строка из массива
     * ```
     */
    public static getText(str?: TPattern): string {
        if (str) {
            return Array.isArray(str) ? str[rand(0, str.length - 1)] : (str as string);
        }
        return '';
    }

    /**
     * Заменяет ключ в тексте на значение
     * @param {string} key - Ключ для замены
     * @param {string | string[]} value - Значение для замены (из массива выбирается случайный вариант)
     * @param {string} text - Исходный текст
     * @returns {string} Текст с заменённым ключом
     *
     * @example
     * ```ts
     * Text.textReplace('#name#', 'Иван', 'Привет, #name#!'); // -> 'Привет, Иван!'
     * Text.textReplace('#name#', ['Иван', 'Пётр'], 'Привет, #name#!'); // -> случайное имя
     * ```
     */
    public static textReplace(key: string, value: string | string[], text: string): string {
        return text.replaceAll(key, Text.getText(value));
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
     * ```ts
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
        const digitCase = cases[Math.min(absNum % 10, 5)] ?? 2;
        const titleIndex = absNum % 100 > 4 && absNum % 100 < 20 ? 2 : digitCase;

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
     * ```ts
     * // Сравнение с одним текстом
     * Text.textSimilarity('привет', 'привт', 80);
     * // -> {
     * //   status: true,
     * //   index: 0,
     * //   percent: ~91,
     * //   text: 'привт'
     * // }
     *
     * // Сравнение с массивом текстов
     * Text.textSimilarity('привет', ['привт', 'здравствуйте'], 80);
     * // -> {
     * //   status: true,
     * //   index: 0,
     * //   percent: ~91,
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

        // Сначала проверяем точные совпадения
        const exactMatch = texts.findIndex((t) => t.toLowerCase() === normalizedOrigText);

        if (exactMatch !== -1) {
            // exactOptionalPropertyTypes: текст гарантированно найден findIndex,
            // но поле заполняем только реальным значением.
            const exactText = texts[exactMatch];
            if (exactText !== undefined) {
                return {
                    index: exactMatch,
                    status: true,
                    percent: 100,
                    text: exactText,
                };
            }
        }

        // Если точного совпадения нет — ищем наиболее похожий текст
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
