import {rand, similar_text} from "../../utils/functins";

type TFind = string | string[];

export interface ITextSimilarity {
    status: boolean;
    index: number;
    percent?: number;
    text?: string;
}

/**
 * Вспомогательный класс для работы с текстом.
 * Class Text
 * @package bot\components\standard
 */
export class Text {
    /**
     * Обрезает текст до необходимого количества символов.
     *
     * @param text Исходный текст.
     * @param size Максимальный размер текста.
     * @param isEllipsis Если true, тогда в конце добавится троеточие. Иначе текст просто обрезается.
     * @return string
     * @api
     */
    public static resize(text: string, size: number = 950, isEllipsis: boolean = true): string {
        if (text !== null) {
            if (text.length > size) {
                if (isEllipsis) {
                    size -= 3;
                    text = (text.substr(0, size) + '...');
                } else {
                    text = text.substr(0, size);
                }
            }
        } else {
            text = '';
        }
        return text;
    }

    /**
     * Вернет true в том случае, если пользователь выражает согласие.
     *
     * @param text Пользовательский текст.
     * @return boolean
     * @api
     */
    public static isSayTrue(text: string): boolean {
        const confirmText = [
            `(?:^|\\s)${Text.getEncodeText('да')}\\b`,
            `(?:^|\\s)${Text.getEncodeText('конечно')}\\b`,
            `(?:^|\\s)${Text.getEncodeText('соглас')}[^s]+\\b`,
            `(?:^|\\s)${Text.getEncodeText('подтвер')}[^s]+\\b`
        ];
        return Text.isSayText(confirmText, text, true);
        //const reg: RegExp = /(\bда\b)|(\bконечно\b)|(\bсоглас[^s]+\b)|(\bподтвер[^s]+\b)/umi;
        //return text.search(reg) !== -1;
        //return reg.test(text);
    }

    /**
     * Вернет true в том случае, если пользователь выражает не согласие.
     *
     * @param text Пользовательский текст.
     * @return boolean
     * @api
     */
    public static isSayFalse(text: string): boolean {
        const unconfirmText = [
            `(?:^|\\s)${Text.getEncodeText('нет')}\\b`,
            `(?:^|\\s)${Text.getEncodeText('неа')}\\b`,
            `(?:^|\\s)${Text.getEncodeText('не')}\\b`,
        ];
        return Text.isSayText(unconfirmText, text, true);
        //const reg: RegExp = /(\bнет\b)|(\bнеа\b)|(\bне\b)/umi;
        //return text.search(reg) !== -1;
        //return reg.test(text);
    }

    /**
     * Вернет true в том случае, если в текста выполняется необходимое условие.
     *
     * @param find Текст который ищем.
     * @param text Исходный текст, в котором осуществляется поиск.
     * @param isPattern Если true, тогда используется пользовательское регулярное выражение.
     * @return boolean
     * @api
     */
    public static isSayText(find: TFind, text: string, isPattern: boolean = false): boolean {
        let pattern: string = '';
        if (typeof find === 'object') {
            find.forEach((f) => {
                if (pattern) {
                    pattern += '|';
                }
                if (isPattern) {
                    pattern += `(${f})`;
                } else {
                    f = Text.getEncodeText(f);
                    pattern += `((?:^|\\s)${f}(|[^\\s]+)\\b)`;
                    //pattern += `(\b${find[i]}(|[^\s]+)\b)`;
                }
            })
        } else {
            if (isPattern) {
                pattern = find;
            } else {
                find = Text.getEncodeText(find);
                pattern = `((?:^|\\s)${find}(|[^\\s]+)\\b)`;
                //pattern = `(\b${find}(|[^\s]+)\b)`;
            }
        }
        text = Text.getEncodeText(text);
        return !!text.match((new RegExp(pattern, 'umig')));
    }

    /**
     * Переводит unicode text
     *
     * TODO найти решение и переделать
     * Какая-то хрень с регуляркой для русского языка.
     * Пока сделано так, в дальнейшем нужно переделать
     * @param text текст для преобразования
     * @return string
     */
    public static getEncodeText(text: string): string {
        return encodeURIComponent(text).replace(/%20/umig, ' ').replace(/%/umig, 'Z');
    }

    /**
     * Получить строку из массива или строки.
     *
     * @param str Исходная строка или массив из строк.
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
     * Добавляет нужное окончание в зависимости от числа.
     *
     * @param num - само число.
     * @param titles - массив из возможных вариантов. массив должен быть типа ['1 значение','2 значение','3 значение'].
     * Где:
     * 1 значение - это окончание, которое получится если последняя цифра числа 1
     * 2 значение - это окончание, которое получится если последняя цифра числа от 2 до 4
     * 3 значение - это окончание, если последняя цифра числа от 5 до 9 включая 0
     * Пример:
     * ['Яблоко','Яблока','Яблок']
     * Результат:
     * 1 Яблоко, 21 Яблоко, 3 Яблока, 9 Яблок
     *
     * @param index Свое значение из массива. Если элемента в массиве с данным индексом нет, тогда параметр опускается.
     *
     * @return string
     * @api
     */
    public static getEnding(num: number, titles: string[], index: number = null): string {
        if (index !== null) {
            if (typeof titles[index] !== 'undefined') {
                return titles[index];
            }
        }
        if (num < 0) {
            num *= -1;
        }
        const cases = [2, 0, 1, 1, 1, 2];
        return titles[(num % 100 > 4 && num % 100 < 20) ? 2 : cases[Math.min(num % 10, 5)]] ?? null;
    }

    /**
     * Проверка текста на сходство.
     * В результате вернет статус схожести, а также текст и ключ в массиве.
     *
     * Если текста схожи, тогда status = true, и заполняются поля:
     * index - Если был передан массив, тогда вернется его индекс.
     * text - Текст, который оказался максимально схожим.
     * percent - Процент схожести.
     *
     * @param origText - оригинальный текст. С данным текстом будет производиться сравнение.
     * @param text - Текст для сравнения. можно передать массив из текстов для поиска.
     * @param percent - при какой процентной схожести считать что текста одинаковые.
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
            let per: number = similar_text(origText, text[i]);
            if (data.percent < per) {
                data.percent = per;
                data.index = i
            }
        }
        if (data.percent >= percent) {
            data.status = true;
            data.text = text[data.index];
            return data;
        }
        return {
            status: false,
            index: null,
            text: null
        }
    }
}
