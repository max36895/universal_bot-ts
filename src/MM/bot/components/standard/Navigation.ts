/**
 * Класс, отвечающий за корректную навигацию по элементам меню.
 * Class Navigation
 * @package bot\components\standard
 */
import {Text} from "./Text";

export class Navigation {
    public STANDARD_NEXT_TEXT: string[] = ['дальше', 'вперед'];
    public STANDARD_OLD_TEXT: string[] = ['назад'];

    /**
     * Если true, тогда используются стандартные команды для навигации.
     * @var bool $isUsedStandardText Если true, тогда используются стандартные команды для навигации.
     */
    public isUsedStandardText: boolean;
    /**
     * Массив с возможными командами для навигации вперед.
     * @var nextText Массив с возможными командами для навигации вперед.
     */
    public nextText: string[];
    /**
     * Массив с возможными командами для навигации назад.
     * @var oldText Массив с возможными командами для навигации назад.
     */
    public oldText: string[];
    /**
     * Массив элементов для обработки.
     * @var elements Массив элементов для обработки.
     */
    public elements: any[];
    /**
     * (default 5) Максимальное количество отображаемых элементов.
     * @var maxElement (default 5) Максимальное количество отображаемых элементов.
     */
    public maxElement: number;
    /**
     * (default 0) Текущая страница. Рекомендуется получать это значение после завершения всех операция.
     * @var int $thisPage (default 0) Текущая страница. Рекомендуется получать это значение после завершения всех операция.
     */
    public thisPage: number;

    /**
     * Navigation constructor.
     * @param maxElement Максимально количество отображаемых элементов.
     */
    public constructor(maxElement: number = 5) {
        this.isUsedStandardText = true;
        this.nextText = [];
        this.oldText = [];
        this.elements = [];
        this.maxElement = maxElement;
        this.thisPage = 0;
    }

    /**
     * Пользователь хочет двигаться дальше по массиву.
     *
     * @param text Пользовательский запрос.
     * @return boolean
     * @api
     */
    public isNext(text: string): boolean {
        let nextText: string[];
        if (this.isUsedStandardText) {
            nextText = [...this.nextText, ...this.STANDARD_NEXT_TEXT];
        } else {
            nextText = this.nextText;
        }
        return Text.isSayText(nextText, text);
    }

    /**
     * Пользователь хочет двигаться назад по массиву.
     *
     * @param text Пользовательский запрос.
     * @return boolean
     * @api
     */
    public isOld(text: string): boolean {
        let oldText: string[];
        if (this.isUsedStandardText) {
            oldText = [...this.oldText, ...this.STANDARD_OLD_TEXT];
        } else {
            oldText = this.oldText;
        }
        return Text.isSayText(oldText, text);
    }

    /**
     * Пользователь переходит на определенную страницу.
     * В случае успешного перехода вернет true.
     *
     * @param text Пользовательский запрос.
     * @return boolean
     */
    public numberPage(text: string): boolean {
        const data = text.match(/((-|)\d) страни/umi);
        if (data) {
            this.thisPage = +data[1] - 1;
            const maxPage = this.getMaxPage();
            if (this.thisPage >= maxPage) {
                this.thisPage = maxPage - 1;
            }
            if (this.thisPage < 0) {
                this.thisPage = 0;
            }
            return true;
        }
        return false;
    }

    /**
     * Пользователь переходит на следующую страницу.
     * В случае успешного перехода вернет true.
     *
     * @param text Пользовательский запрос.
     * @return boolean
     */
    protected _nextPage(text: string): boolean {
        if (this.isNext(text)) {
            this.thisPage++;
            const maxPage = this.getMaxPage();
            if (this.thisPage >= maxPage) {
                this.thisPage = maxPage - 1;
            }
            return true;
        }
        return false;
    }

    /**
     * Пользователь переходит на предыдущую страницу.
     * В случае успешного перехода вернет true.
     *
     * @param text Пользовательский запрос.
     * @return boolean
     */
    protected _oldPage(text: string): boolean {
        if (this.isOld(text)) {
            this.thisPage--;
            if (this.thisPage < 0) {
                this.thisPage = 0;
            }
            return true;
        }
        return false;
    }

    /**
     * Возвращает новый массив с учетом текущего положения.
     *
     * @param elements Элемент для обработки.
     * @param text Пользовательский запрос.
     * @return any[]
     * @api
     */
    public nav(elements: any[] = null, text: string = ''): any[] {
        const showElements: object[] = [];
        if (elements) {
            this.elements = elements;
        }
        this._nextPage(text);
        this._oldPage(text);
        const start = this.thisPage * this.maxElement;
        for (let i = start; i < (start + this.maxElement); i++) {
            if (typeof this.elements[i] !== 'undefined') {
                showElements.push(this.elements[i]);
            }
        }
        return showElements;
    }

    /**
     * Пользователь выбирает определенный элемент списка на нужной странице.
     *
     * @param elements Элемент для обработки.
     * @param text Пользовательский запрос.
     * @param key Поиск элемента по ключу массива. Если null, тогда подразумевается что передан массив из строк.
     * @param thisPage Текущая страница.
     * @return any
     * @api
     */
    public selectedElement(elements: any[] = null, text: string = '', key: string[] | string = null, thisPage: number = null) {
        if (thisPage !== null) {
            this.thisPage = thisPage;
        }
        if (elements) {
            this.elements = elements;
        }

        let number: number = null;
        const data = text.match(/(\d)/umi);
        if (data) {
            number = +data[0][0];
        }

        const start: number = this.thisPage * this.maxElement;
        let index: number = 1;
        let selectElement: object = null;
        let maxPercent: number = 0;
        for (let i = start; i < (start + this.maxElement); i++) {
            if (typeof this.elements[i] !== 'undefined') {
                if (index == number) {
                    return this.elements[i];
                }
                if (key == null) {
                    const r = Text.textSimilarity(this.elements[i].toString(), text, 75);
                    if (r.status && r.percent > maxPercent) {
                        selectElement = this.elements[i];
                    }
                } else {
                    if (typeof key === 'object') {
                        key.forEach((k) => {
                            if (this.elements[i][k]) {
                                const r = Text.textSimilarity(this.elements[i][k], text, 75);
                                if (r.status && r.percent > maxPercent) {
                                    selectElement = this.elements[i];
                                }
                            }
                        })
                    } else {
                        if (this.elements[i][key]) {
                            const r = Text.textSimilarity(this.elements[i][key], text, 75);
                            if (r.status && r.percent > maxPercent) {
                                selectElement = this.elements[i];
                            }
                        }
                    }
                }
                index++;
                if (maxPercent > 90) {
                    return selectElement;
                }
            }
        }
        return selectElement;
    }

    /**
     * Возвращает кнопки для навигации.
     *
     * @param isNumber Использование числовой навигации. Если true, тогда будут отображаться кнопки с числовой навигацией.
     * @return string[]
     * @api
     */
    public getPageNav(isNumber: boolean = false): string[] {
        const maxPage: number = this.getMaxPage();
        if (this.thisPage < 0) {
            this.thisPage = 0;
        }
        if (this.thisPage > maxPage) {
            this.thisPage = maxPage - 1;
        }
        const buttons: string[] = [];
        if (isNumber == false) {
            if (this.thisPage) {
                buttons.push('👈 Назад');
            }
            if ((this.thisPage + 1) < maxPage) {
                buttons.push('Дальше 👉');
            }
        } else {
            let index: number = this.thisPage - 2;
            if (index < 0) {
                index = 0;
            }
            let count: number = 0;
            for (let i = index; i < maxPage; i++) {
                if (i == this.thisPage) {
                    buttons.push(`[${i + 1}]`);
                } else {
                    buttons.push(`${i + 1}`);
                }
                count++;
                if (count > 4) {
                    break;
                }
            }
        }
        return buttons;
    }

    /**
     * Возвращает информацию о текущей позиции пользователя.
     *
     * @return string
     * @api
     */
    public getPageInfo(): string {
        if ((typeof this.elements[this.thisPage * this.maxElement] === 'undefined') || this.thisPage < 0) {
            this.thisPage = 0;
        }
        let pageInfo: string = (this.thisPage + 1) + ' страница из ';
        const maxPage: number = this.getMaxPage();
        if (maxPage > 1) {
            pageInfo += maxPage;
        } else {
            pageInfo = '';
        }
        return pageInfo;
    }

    /**
     * Возвращает максимальное количество страниц.
     *
     * @param elements Элемент для обработки.
     * @return number
     * @api
     */
    public getMaxPage(elements: any[] = null): number {
        if (elements) {
            this.elements = elements;
        }
        if (typeof this.elements === 'object') {
            const countEl: number = this.elements.length;
            let maxPage: number = Math.floor(countEl / this.maxElement);
            if (countEl % this.maxElement) {
                maxPage++;
            }
            return maxPage;
        }
        return 0;
    }
}
