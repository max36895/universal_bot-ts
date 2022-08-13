import {rand, similarText} from "../../utils";

export type TFind = string | string[];

export interface ITextSimilarity {
    /**
     * Статус выполнения
     */
    status: boolean;
    /**
     * В каком тексте значение совпало, либо максимальное. При передаче строки вернет 0
     */
    index: number | null;
    /**
     * На сколько процентов текста похожи
     */
    percent: number;
    /**
     * Текст, который совпал
     */
    text?: string | null;
}

/**
 * Вспомогательный класс, отвечающий за работу с текстом.
 * @class Text
 */
export class Text {
    /**
     * Обрезает текст до необходимого количества символов.
     *
     * @param {string} text Исходный текст.
     * @param {number} size Максимальный размер текста.
     * @param {boolean} isEllipsis Если true, тогда в конце добавится троеточие. Иначе текст просто обрезается.
     * @return string
     * @api
     */
    public static resize(text: string | null, size: number = 950, isEllipsis: boolean = true): string {
        if (text !== null) {
            if (text.length > size) {
                if (isEllipsis) {
                    size -= 3;
                    if (size < 0) {
                        size = 0;
                    }
                    text = (text.substring(0, size) + '...');
                } else {
                    text = text.substring(0, size);
                }
            }
            return text;
        }
        return '';
    }

    /**
     * Определяет наличие ссылки в переданном тексте
     *
     * @param {string} link Проверяемая строка
     * @return boolean
     * @api
     */
    public static isUrl(link: string): boolean {
        return !!link.match(/((http|s:\/\/)[^( |\n)]+)/umig);
    }

    /**
     * Определяет наличие в тексте согласие пользователя
     *
     * @param {string} text Пользовательский текст.
     * @return boolean
     * @api
     */
    public static isSayTrue(text: string): boolean {
        if (text) {
            const confirmText = [
                '(?:^|\\s)да(?:^|\\s|$)',
                '(?:^|\\s)конечно(?:^|\\s|$)',
                '(?:^|\\s)соглас[^s]+(?:^|\\s|$)',
                '(?:^|\\s)подтвер[^s]+(?:^|\\s|$)',
            ];
            return Text.isSayText(confirmText, text, true);
        }
        return false;
    }

    /**
     * Определяет наличие в тексте не согласие пользователя
     *
     * @param {string} text Пользовательский текст.
     * @return boolean
     * @api
     */
    public static isSayFalse(text: string): boolean {
        if (text) {
            const unconfirmText = [
                '(?:^|\\s)нет(?:^|\\s|$)',
                '(?:^|\\s)неа(?:^|\\s|$)',
                '(?:^|\\s)не(?:^|\\s|$)',
            ];
            return Text.isSayText(unconfirmText, text, true);
        }
        return false;
    }

    /**
     * Определяет наличие в тексте определенного условия
     *
     * @param {TFind} find Текст который ищем.
     * @param {string} text Исходный текст, в котором осуществляется поиск.
     * @param {boolean} isPattern Определяет использование регулярного выражения
     * @return boolean
     * @api
     */
    public static isSayText(find: TFind, text: string, isPattern: boolean = false): boolean {
        if (text) {
            let pattern: string = '';
            if (typeof find === 'object') {
                const result = find.some((value) => {
                    if (isPattern) {
                        if (pattern) {
                            pattern += '|';
                        }
                        pattern += `(${value})`;
                    } else {
                        if (text.indexOf(value) !== -1) {
                            return true;
                        }
                    }
                });
                if (!isPattern) {
                    return result;
                }
            } else {
                if (isPattern) {
                    pattern = find;
                } else {
                    if (text.indexOf(find) !== -1) {
                        return true;
                    }
                }
            }
            if (isPattern && pattern) {
                return !!text.match((new RegExp(pattern, 'umig')));
            }
        }
        return false;
    }

    /**
     * Получение строки из массива строк. В случае если передана строка, то вернется исходное значение.
     *
     * @param {TFind} str Исходная строка или массив из строк.
     * @return string
     * @api
     */
    public static getText(str: TFind): string {
        if (typeof str !== 'string') {
            return str[rand(0, str.length - 1)];
        }
        return str;
    }

    /**
     * Добавление нужного окончание в зависимости от переданного числа.
     *
     * @param {number} num - само число.
     * @param {string[]} titles - массив из возможных вариантов. массив должен быть типа ['1 значение','2 значение','3 значение'].
     * Где:
     * 1 значение - это окончание, которое получится если последняя цифра числа 1
     * 2 значение - это окончание, которое получится если последняя цифра числа от 2 до 4
     * 3 значение - это окончание, если последняя цифра числа от 5 до 9 включая 0
     * Пример:
     * ['Яблоко','Яблока','Яблок']
     * Результат:
     * 1 Яблоко, 21 Яблоко, 3 Яблока, 9 Яблок
     *
     * @param {number} index Свое значение из массива. Если элемента в массиве с данным индексом нет, тогда параметр игнорируется.
     *
     * @return string
     * @api
     */
    public static getEnding(num: number, titles: string[], index: number | null = null): string | null {
        if (index !== null) {
            if (typeof titles[index] !== 'undefined') {
                return titles[index];
            }
        }
        if (num < 0) {
            num *= -1;
        }
        const cases = [2, 0, 1, 1, 1, 2];
        return titles[(num % 100 > 4 && num % 100 < 20) ? 2 : cases[Math.min(num % 10, 5)]] || null;
    }

    /**
     * Проверяет тексты на сходство.
     * В результате вернет статус схожести, а также текст и ключ в массиве.
     *
     * Если текста схожи, тогда status = true, и заполняются поля:
     * index - Если был передан массив, тогда вернется его индекс.
     * text - Текст, который оказался максимально схожим.
     * percent - Процент схожести.
     *
     * @param {string} origText - оригинальный текст. С данным текстом будет производиться сравнение.
     * @param {string} text - Текст для сравнения. можно передать массив из текстов для поиска.
     * @param {number} percent - при какой процентной схожести считать, что текста одинаковые.
     *
     * @return ITextSimilarity [
     *  - 'status' => bool, Статус выполнения
     *  - 'index' => int|string, В каком тексте значение совпало, либо максимальное. При передаче строки вернет 0
     *  - 'text' => string, Текст, который совпал
     *  - 'percent' => int На сколько процентов текста похожи
     * ]
     * @api
     */
    public static textSimilarity(origText: string, text: TFind, percent: number = 80): ITextSimilarity {
        const data: ITextSimilarity = {
            percent: 0,
            index: null,
            status: false
        };
        if (typeof text !== 'object') {
            text = [text];
        }
        origText = origText.toLowerCase();
        for (let i = 0; i < text.length; i++) {
            text[i] = text[i].toLowerCase();
            if (text[i] === origText) {
                return {
                    index: i,
                    status: true,
                    percent: 100,
                    text: text[i]
                }
            }
            let per: number = similarText(origText, text[i]);
            if (data.percent < per) {
                data.percent = per;
                data.index = i;
            }
        }
        if (data.percent >= percent) {
            data.status = true;
            data.text = text[data.index as number];
            return data;
        }
        return {
            status: false,
            index: null,
            percent: 0,
            text: null
        };
    }
}
