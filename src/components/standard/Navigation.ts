import {Text} from "./Text";

/**
 * Класс отвечающий за корректную навигацию по элементам меню.
 * @class Navigation
 */
export class Navigation {
    public STANDARD_NEXT_TEXT: string[] = ['дальше', 'вперед'];
    public STANDARD_OLD_TEXT: string[] = ['назад'];

    /**
     * Использование стандартных команд навигации
     * Если true, тогда используются стандартные команды.
     */
    public isUsedStandardText: boolean;
    /**
     * Массив с возможными командами для навигации вперед.
     */
    public nextText: string[];
    /**
     * Массив с возможными командами для навигации назад.
     */
    public oldText: string[];
    /**
     * Массив элементов для обработки.
     */
    public elements: any[];
    /**
     * (default 5) Максимальное количество отображаемых элементов.
     */
    public maxVisibleElements: number;
    /**
     * (default 0) Текущая страница. Рекомендуется получать это значение после завершения всех операция.
     */
    public thisPage: number;

    /**
     * Navigation constructor.
     * @param {number} maxVisibleElements Максимально количество отображаемых элементов.
     */
    public constructor(maxVisibleElements: number = 5) {
        this.isUsedStandardText = true;
        this.nextText = [];
        this.oldText = [];
        this.elements = [];
        this.maxVisibleElements = maxVisibleElements;
        this.thisPage = 0;
    }

    /**
     * Пользователь хочет двигаться дальше по массиву.
     *
     * @param {string} text Пользовательский запрос.
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
     * @param {string} text Пользовательский запрос.
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
     * @param {string} text Пользовательский запрос.
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
     * Переходим на следующую страницу.
     * В случае успешного перехода вернет true.
     *
     * @param {string} text Пользовательский запрос.
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
     * Переходим на предыдущую страницу.
     * В случае успешного перехода вернет true.
     *
     * @param {string} text Пользовательский запрос.
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
     * Возвращаем новый массив с учетом текущего положения.
     *
     * @param {any[]} elements Элемент для обработки.
     * @param {string} text Пользовательский запрос.
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
        const start: number = this.thisPage * this.maxVisibleElements;
        const end: number = start + this.maxVisibleElements;
        for (let i = start; i < end; i++) {
            if (typeof this.elements[i] !== 'undefined') {
                showElements.push(this.elements[i]);
            }
        }
        return showElements;
    }

    /**
     * Выбор определенного элемента списка на нужной странице.
     *
     * @param {any[]} elements Элемент для обработки.
     * @param {string} text Пользовательский запрос.
     * @param {string[] | string} key Поиск элемента по ключу массива. Если null, тогда подразумевается, что передан массив из строк.
     * @param {number} thisPage Текущая страница.
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

        const start: number = this.thisPage * this.maxVisibleElements;
        let index: number = 1;
        let selectElement: object = null;
        let maxPercent: number = 0;
        const end: number = start + this.maxVisibleElements;
        for (let i = start; i < end; i++) {
            if (typeof this.elements[i] !== 'undefined') {
                if (index === number) {
                    return this.elements[i];
                }
                if (key === null) {
                    const r = Text.textSimilarity(this.elements[i] + '', text, 75);
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
     * Возвращаем кнопки с навигацией.
     *
     * @param {boolean} isNumber Использование числовой навигации. Если true, тогда будут отображаться кнопки с числовой навигацией.
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
        if (isNumber === false) {
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
            if (index === 1) {
                buttons.push('1');
            } else if (index) {
                buttons.push('1 ...');
            }
            for (let i = index; i < maxPage; i++) {
                if (i === this.thisPage) {
                    buttons.push(`[${i + 1}]`);
                } else {
                    buttons.push(`${i + 1}`);
                }
                count++;
                if (count > 4) {
                    if (i === maxPage - 2) {
                        buttons.push(`${maxPage}`);
                    } else if (i < maxPage - 2) {
                        buttons.push(`... ${maxPage}`);
                    }
                    break;
                }
            }
        }
        return buttons;
    }

    /**
     * Возвращаем информацию о текущей позиции.
     *
     * @return string
     * @api
     */
    public getPageInfo(): string {
        if ((typeof this.elements[this.thisPage * this.maxVisibleElements] === 'undefined') || this.thisPage < 0) {
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
     * Возвращаем максимальное количество страниц.
     *
     * @param {any[]} elements Элемент для обработки.
     * @return number
     * @api
     */
    public getMaxPage(elements: any[] = null): number {
        if (elements) {
            this.elements = elements;
        }
        if (typeof this.elements === 'object') {
            const countEl: number = this.elements.length;
            let maxPage: number = Math.floor(countEl / this.maxVisibleElements);
            if (countEl % this.maxVisibleElements) {
                maxPage++;
            }
            return maxPage;
        }
        return 0;
    }
}
