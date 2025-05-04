import { ITextSimilarity, Text } from '../../utils/standard/Text';

/**
 * Тип элементов, по которым будет происходить навигация.
 * Может быть объектом, числом, строкой или любым другим типом.
 * @example
 * ```typescript
 * // Строковые элементы
 * const elements: TElementType[] = ['Элемент 1', 'Элемент 2', 'Элемент 3'];
 *
 * // Объекты
 * const elements: TElementType[] = [
 *   { id: 1, name: 'Элемент 1' },
 *   { id: 2, name: 'Элемент 2' }
 * ];
 * ```
 */
export type TElementType = Record<string, string> | number | string | any;

/**
 * Тип ключей для поиска по объектам.
 * Может быть строкой или массивом строк.
 * @example
 * ```typescript
 * // Одиночный ключ
 * const key: TKeys = 'name';
 *
 * // Массив ключей
 * const keys: TKeys = ['name', 'description'];
 * ```
 */
export type TKeys = string | string[];

/**
 * Класс для навигации по элементам меню или списка.
 * Предоставляет функциональность для:
 * - Постраничной навигации по элементам
 * - Поиска элементов по тексту или номеру
 * - Управления отображением элементов
 * - Обработки команд навигации
 *
 * @typeParam ElementType тип элементов, по которым будет происходить навигация
 * @class Navigation
 *
 * @example
 * ```typescript
 * // Создание экземпляра с максимальным количеством видимых элементов
 * const navigation = new Navigation<{id: number, name: string}>(3);
 *
 * // Инициализация элементов
 * const elements = [
 *   { id: 1, name: 'Элемент 1' },
 *   { id: 2, name: 'Элемент 2' },
 *   { id: 3, name: 'Элемент 3' },
 *   { id: 4, name: 'Элемент 4' }
 * ];
 *
 * // Получение элементов текущей страницы
 * const pageElements = navigation.getPageElements(elements, 'вперед');
 *
 * // Выбор элемента по тексту
 * const selected = navigation.selectedElement(elements, 'Элемент 2', ['name']);
 * ```
 */
export class Navigation<ElementType = TElementType> {
    /**
     * Список стандартных команд навигации вперед.
     * Используется при isUsedStandardText = true
     * @defaultValue ['дальше', 'вперед']
     */
    public STANDARD_NEXT_TEXT: string[] = ['дальше', 'вперед'];

    /**
     * Список стандартных команд навигации назад.
     * Используется при isUsedStandardText = true
     * @defaultValue ['назад']
     */
    public STANDARD_OLD_TEXT: string[] = ['назад'];

    /**
     * Флаг использования стандартных команд навигации.
     * Если true, используются стандартные команды из STANDARD_NEXT_TEXT и STANDARD_OLD_TEXT
     * @defaultValue true
     */
    public isUsedStandardText: boolean;

    /**
     * Массив с возможными командами для навигации вперед.
     * Дополняет или заменяет стандартные команды в зависимости от isUsedStandardText
     * @defaultValue []
     * @example
     * ```typescript
     * navigation.nextText = ['следующая', 'продолжить'];
     * ```
     */
    public nextText: string[];

    /**
     * Массив с возможными командами для навигации назад.
     * Дополняет или заменяет стандартные команды в зависимости от isUsedStandardText
     * @defaultValue []
     * @example
     * ```typescript
     * navigation.oldText = ['предыдущая', 'вернуться'];
     * ```
     */
    public oldText: string[];

    /**
     * Массив элементов для обработки.
     * @defaultValue []
     */
    public elements: ElementType[];

    /**
     * Максимальное количество отображаемых элементов на странице.
     * @defaultValue 5
     */
    public maxVisibleElements: number;

    /**
     * Текущая страница.
     * Рекомендуется получать это значение после завершения всех операций
     * @defaultValue 0
     */
    public thisPage: number;

    /**
     * Создает экземпляр класса Navigation.
     * @param {number} maxVisibleElements Максимальное количество отображаемых элементов на странице
     * @example
     * ```typescript
     * // Создание с 3 элементами на странице
     * const navigation = new Navigation(3);
     *
     * // Создание с 10 элементами на странице
     * const navigation = new Navigation(10);
     * ```
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
     * Проверяет наличие команд навигации вперед в тексте
     *
     * @param {string} text Пользовательский запрос
     * @return {boolean} true если обнаружена команда навигации вперед
     * @example
     * ```typescript
     * const isNext = navigation.isNext('покажи дальше'); // true
     * const isNext = navigation.isNext('вернись назад'); // false
     * ```
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
     * Проверяет наличие команд навигации назад в тексте
     *
     * @param {string} text Пользовательский запрос
     * @return {boolean} true если обнаружена команда навигации назад
     * @example
     * ```typescript
     * const isOld = navigation.isOld('вернись назад'); // true
     * const isOld = navigation.isOld('покажи дальше'); // false
     * ```
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
     * Валидация текущей страницы.
     * Проверяет и корректирует значение thisPage в пределах допустимого диапазона
     *
     * @param {number} maxPage Максимальное количество страниц
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
     * Ищет в тексте указание конкретной страницы в формате "N страница"
     *
     * @param {string} text Пользовательский запрос
     * @return {boolean} true если обнаружено указание страницы
     * @example
     * ```typescript
     * const isNumberPage = navigation.numberPage('покажи 2 страницу'); // true
     * const isNumberPage = navigation.numberPage('следующая страница'); // false
     * ```
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
     * Проверяет команду навигации вперед и обновляет thisPage
     *
     * @param {string} text Пользовательский запрос
     * @return {boolean} true если переход выполнен
     * @private
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
     * Проверяет команду навигации назад и обновляет thisPage
     *
     * @param {string} text Пользовательский запрос
     * @return {boolean} true если переход выполнен
     * @private
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
     * Возвращает массив элементов текущей страницы.
     * Обрабатывает команды навигации и возвращает элементы в пределах maxVisibleElements
     *
     * @param {ElementType[]} elements Массив элементов для обработки
     * @param {string} text Пользовательский запрос
     * @return {ElementType[]} Массив элементов текущей страницы
     * @example
     * ```typescript
     * const elements = [
     *   { id: 1, name: 'Элемент 1' },
     *   { id: 2, name: 'Элемент 2' },
     *   { id: 3, name: 'Элемент 3' },
     *   { id: 4, name: 'Элемент 4' }
     * ];
     *
     * // Получение элементов первой страницы
     * const pageElements = navigation.getPageElements(elements);
     * // [{ id: 1, name: 'Элемент 1' }, { id: 2, name: 'Элемент 2' }]
     *
     * // Переход на следующую страницу
     * const nextPageElements = navigation.getPageElements(null, 'вперед');
     * // [{ id: 3, name: 'Элемент 3' }, { id: 4, name: 'Элемент 4' }]
     * ```
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
     * Выбор элемента из списка по тексту или номеру.
     * Поддерживает поиск по тексту с учетом схожести и выбор по номеру
     *
     * @param {ElementType[]} elements Массив элементов для обработки
     * @param {string} text Пользовательский запрос
     * @param {TKeys} keys Ключи для поиска по объектам
     * @param {number} thisPage Текущая страница
     * @return {ElementType | null} Выбранный элемент или null
     * @example
     * ```typescript
     * const elements = [
     *   { id: 1, name: 'Элемент 1' },
     *   { id: 2, name: 'Элемент 2' }
     * ];
     *
     * // Выбор по номеру
     * const selected = navigation.selectedElement(elements, 'выбери 1');
     * // { id: 1, name: 'Элемент 1' }
     *
     * // Выбор по тексту
     * const selected = navigation.selectedElement(elements, 'Элемент 2', ['name']);
     * // { id: 2, name: 'Элемент 2' }
     * ```
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
     * Возвращает массив команд навигации.
     * Формирует список доступных команд для навигации по страницам
     *
     * @param {boolean} isNumber Включить команды с номерами страниц
     * @return {string[]} Массив команд навигации
     * @example
     * ```typescript
     * // Получение базовых команд
     * const commands = navigation.getPageNav();
     * // ['дальше', 'вперед', 'назад']
     *
     * // Получение команд с номерами страниц
     * const commands = navigation.getPageNav(true);
     * // ['дальше', 'вперед', 'назад', '1 страница', '2 страница']
     * ```
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
     * Возвращает информацию о текущей странице.
     * Формирует строку с информацией о текущей позиции
     *
     * @return {string} Информация о текущей странице
     * @example
     * ```typescript
     * const info = navigation.getPageInfo();
     * // "Страница 1 из 3"
     * ```
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
     * Вычисляет количество страниц на основе количества элементов
     *
     * @param {ElementType[]} elements Массив элементов
     * @return {number} Максимальное количество страниц
     * @example
     * ```typescript
     * const elements = [
     *   { id: 1, name: 'Элемент 1' },
     *   { id: 2, name: 'Элемент 2' },
     *   { id: 3, name: 'Элемент 3' }
     * ];
     *
     * const maxPage = navigation.getMaxPage(elements);
     * // 2 (при maxVisibleElements = 2)
     * ```
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
