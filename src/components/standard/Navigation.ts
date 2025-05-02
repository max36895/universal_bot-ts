import { ITextSimilarity, Text } from '../../utils/standard/Text';

/**
 * Тип элементов, по которым будет происходить навигация
 */
export type TElementType = Record<string, string> | number | string | any;
/**
 * Тип ключей для поиска по объектам
 */
export type TKeys = string | string[];

/**
 * Класс отвечающий за навигацию по элементам меню или списка.
 * @typeParam ElementType тип элементов, по которым будет происходить навигация
 * @class Navigation
 */
export class Navigation<ElementType = TElementType> {
    /**
     * Список стандартных команд навигации вперед
     */
    public STANDARD_NEXT_TEXT: string[] = ['дальше', 'вперед'];
    /**
     * Стандартные команды навигации назад
     */
    public STANDARD_OLD_TEXT: string[] = ['назад'];

    /**
     * Использование стандартных команд навигации
     * Если true, тогда используются стандартные команды.
     */
    public isUsedStandardText: boolean;
    /**
     * Массив с возможными командами для навигации вперед.
     * Стоит использовать в том случае, если есть необходимость дополнить список существующих команд для навигации вперед
     */
    public nextText: string[];
    /**
     * Массив с возможными командами для навигации назад.
     * Стоит использовать в том случае, если есть необходимость дополнить список существующих команд для навигации назад
     */
    public oldText: string[];
    /**
     * Массив элементов для обработки.
     */
    public elements: ElementType[];
    /**
     * Максимальное количество отображаемых элементов.
     * @defaultValue 5
     */
    public maxVisibleElements: number;
    /**
     * Текущая страница. Рекомендуется получать это значение после завершения всех операция.
     * @defaultValue 0
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
     * Определяет желание пользователя двигаться вперед.
     *
     * @param {string} text Пользовательский запрос.
     * @return boolean
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
     * Определяет желание пользователя двигаться назад.
     *
     * @param {string} text Пользовательский запрос.
     * @return boolean
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
     * Валидация введенной страницы
     *
     * @param maxPage
     * @private
     */
    protected _validatePage(maxPage?: number): void {
        if (typeof maxPage === 'undefined') {
            maxPage = this.getMaxPage();
        }
        if (this.thisPage >= maxPage) {
            this.thisPage = maxPage - 1;
        }
        if (this.thisPage < 0) {
            this.thisPage = 0;
        }
    }

    /**
     * Определяет желание пользователя перейти на определенную страницу.
     * В случае успешного определения вернет true.
     *
     * @param {string} text Пользовательский запрос.
     * @return boolean
     */
    public numberPage(text: string): boolean {
        const data = text.match(/((-|)\d) страни/imu);
        if (data) {
            this.thisPage = +data[1] - 1;
            this._validatePage();
            return true;
        }
        return false;
    }

    /**
     * Осуществляет переход на следующую страницу.
     * В случае успешного перехода вернет true.
     *
     * @param {string} text Пользовательский запрос.
     * @return boolean
     */
    protected _nextPage(text: string): boolean {
        if (this.isNext(text)) {
            this.thisPage++;
            this._validatePage();
            return true;
        }
        return false;
    }

    /**
     * Осуществляет переход на предыдущую страницу.
     * В случае успешного перехода вернет true.
     *
     * @param {string} text Пользовательский запрос.
     * @return boolean
     */
    protected _oldPage(text: string): boolean {
        if (this.isOld(text)) {
            this.thisPage--;
            this._validatePage();
            return true;
        }
        return false;
    }

    /**
     * Возвращает новый массив данных, с учетом текущей страницы пользователя.
     *
     * @param {Object[]|string[]|number[]} elements Элемент для обработки.
     * @param {string} text Пользовательский запрос.
     * @return ElementType[]
     */
    public getPageElements(
        elements: ElementType[] | null = null,
        text: string = '',
    ): ElementType[] {
        const showElements: ElementType[] = [];
        if (elements) {
            this.elements = elements;
        }
        this._nextPage(text);
        this._oldPage(text);
        const start: number = this.thisPage * this.maxVisibleElements;
        const end: number = start + this.maxVisibleElements;
        if (this.elements.length >= start) {
            for (let i = start; i < end; i++) {
                if (typeof this.elements[i] !== 'undefined') {
                    showElements.push(this.elements[i]);
                }
            }
        }
        return showElements;
    }

    /**
     * Выбор определенного элемента списка на нужной или текущей странице.
     *
     * @param elements Элемент для обработки.
     * @param {string} text Пользовательский запрос.
     * @param {string[] | string} keys Поиск элемента по ключу массива. Если null, тогда подразумевается, что передан массив из строк.
     * @param {number} thisPage Текущая страница. Если в аргумент ничего не передано, то используется текущая страница
     * @return any
     */
    public selectedElement(
        elements: ElementType[] | null = null,
        text: string = '',
        keys: TKeys | null = null,
        thisPage: number | null = null,
    ): ElementType | null {
        if (thisPage !== null) {
            this.thisPage = thisPage;
        }
        if (elements) {
            this.elements = elements;
        }

        let number: number | null = null;
        const data = text.match(/(\d)/imu);
        if (data) {
            number = +data[0][0];
        }

        const start: number = this.thisPage * this.maxVisibleElements;
        let index: number = 1;
        let selectElement: ElementType | null = null;
        let maxPercent: number = 0;
        const end: number = start + this.maxVisibleElements;

        const setMaxElement = (index: number, res: ITextSimilarity): void => {
            if (res.status && res.percent > maxPercent) {
                selectElement = this.elements[index];
                maxPercent = res.percent;
            }
        };

        for (let i = start; i < end; i++) {
            if (typeof this.elements[i] !== 'undefined') {
                if (index === number) {
                    return this.elements[i];
                }

                const elementsTypeof = typeof this.elements[i];

                if (keys === null || elementsTypeof === 'string') {
                    const r = Text.textSimilarity(this.elements[i] + '', text, 75);
                    setMaxElement(i, r);
                } else {
                    if (elementsTypeof === 'object') {
                        if (typeof keys === 'object') {
                            keys.forEach((key) => {
                                const value = (this.elements[i] as any)[key];
                                if (value) {
                                    const r = Text.textSimilarity(value, text, 75);
                                    setMaxElement(i, r);
                                }
                            });
                        } else {
                            const value = (this.elements[i] as any)[keys];
                            if (value) {
                                const r = Text.textSimilarity(value, text, 75);
                                setMaxElement(i, r);
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
     * @param {boolean} isNumber Использование числовой навигации. Если true, тогда будут отображаться кнопки с числовой навигацией.
     * @return string[]
     */
    public getPageNav(isNumber: boolean = false): string[] {
        const maxPage: number = this.getMaxPage();
        this._validatePage(maxPage);
        const buttons: string[] = [];
        if (!isNumber) {
            if (this.thisPage) {
                buttons.push('👈 Назад');
            }
            if (this.thisPage + 1 < maxPage) {
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
     * Возвращает информацию о текущей позиции пользователя.
     *
     * @return string
     */
    public getPageInfo(): string {
        if (
            typeof this.elements[this.thisPage * this.maxVisibleElements] === 'undefined' ||
            this.thisPage < 0
        ) {
            this.thisPage = 0;
        }
        let pageInfo: string = this.thisPage + 1 + ' страница из ';
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
     */
    public getMaxPage(elements: ElementType[] | null = null): number {
        if (elements) {
            this.elements = elements;
        }
        if (typeof this.elements === 'object') {
            const countEl: number = this.elements.length;
            return Math.ceil(countEl / this.maxVisibleElements);
        }
        return 0;
    }
}
