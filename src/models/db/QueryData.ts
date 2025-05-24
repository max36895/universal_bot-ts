/**
 * Модуль для работы с данными запросов к базе данных
 *
 * Предоставляет интерфейсы и классы для:
 * - Формирования параметров запросов
 * - Парсинга строк запросов
 * - Управления данными для вставки и обновления
 *
 * @module models/db/QueryData
 */

/**
 * Интерфейс для хранения данных запроса к базе данных
 * Позволяет задавать произвольные поля и их значения
 *
 * @example
 * ```typescript
 * const query: IQueryData = {
 *   id: 1,                    // Поиск по id = 1
 *   name: 'John',            // Поиск по name = 'John'
 *   age: { $gt: 18 },        // Поиск по age > 18
 *   city: { $in: ['Moscow', 'St. Petersburg'] } // Поиск по city в списке
 * };
 * ```
 */
export interface IQueryData {
    /**
     * Произвольные поля запроса
     * Ключ - название поля в базе данных
     * Значение - условие для поиска или значение для обновления
     *
     * @example
     * ```typescript
     * {
     *   'user_id': 123,           // Точное совпадение
     *   'status': 'active',       // Точное совпадение
     *   'age': { $gt: 18 },       // Больше чем
     *   'tags': { $in: ['a', 'b'] } // В списке значений
     * }
     * ```
     */
    [key: string]: string | number | any;
}

/**
 * Класс для управления данными запросов к базе данных
 * Позволяет хранить и манипулировать параметрами запросов и данными для обновления
 *
 * @example
 * ```typescript
 * // Создание запроса для поиска пользователей
 * const query = new QueryData(
 *   { age: { $gt: 18 }, status: 'active' },
 *   null
 * );
 *
 * // Создание запроса для обновления данных
 * const update = new QueryData(
 *   { id: 1 },
 *   { name: 'John', age: 25 }
 * );
 * ```
 */
export class QueryData {
    /**
     * Параметры запроса для поиска данных
     * Содержит условия фильтрации и поиска
     *
     * @example
     * ```typescript
     * this._query = {
     *   id: 1,
     *   status: 'active'
     * };
     * ```
     */
    protected _query: IQueryData | null = null;

    /**
     * Данные для вставки или обновления
     * Содержит поля и их новые значения
     *
     * @example
     * ```typescript
     * this._data = {
     *   name: 'John',
     *   age: 25,
     *   status: 'active'
     * };
     * ```
     */
    protected _data: IQueryData | null = null;

    /**
     * Создает новый экземпляр QueryData
     *
     * @param query - Параметры запроса для поиска
     * @param data - Данные для вставки/обновления
     *
     * @example
     * ```typescript
     * const queryData = new QueryData(
     *   { id: 1 },
     *   { name: 'John' }
     * );
     * ```
     */
    constructor(query: IQueryData | null = null, data: IQueryData | null = null) {
        this.setQuery(query);
        this.setData(data);
    }

    /**
     * Парсит строку запроса в объект IQueryData
     * Поддерживает формат `field=value` с возможностью экранирования
     *
     * @example
     * ```typescript
     * const query = QueryData.getQueryData('`id`=1 `name`="John Doe"');
     * // Результат: { id: 1, name: 'John Doe' }
     * ```
     *
     * @param str - Строка запроса для парсинга
     * @returns Объект с параметрами запроса или null
     */
    public static getQueryData(str: string): IQueryData | null {
        if (str) {
            const datas = str.matchAll(/((`[^`]+`)=(("[^"]+")|([^ ]+)))/gim);
            const regData: IQueryData = {};
            let data = datas.next();
            while (!data.done) {
                let val: string | number = data.value[3].replace(/"/g, '');
                if (!isNaN(+val)) {
                    val = +val;
                }
                regData[data.value[2].replace(/`/g, '')] = val;
                data = datas.next();
            }
            return regData;
        }
        return null;
    }

    /**
     * Получает текущие параметры запроса
     *
     * @example
     * ```typescript
     * const query = queryData.getQuery();
     * console.log(query); // { id: 1, status: 'active' }
     * ```
     *
     * @returns Текущие параметры запроса или null
     */
    public getQuery(): IQueryData | null {
        return this._query;
    }

    /**
     * Устанавливает новые параметры запроса
     *
     * @example
     * ```typescript
     * queryData.setQuery({ id: 1, status: 'active' });
     * ```
     *
     * @param query - Новые параметры запроса
     */
    public setQuery(query: IQueryData | null): void {
        this._query = query;
    }

    /**
     * Получает текущие данные для вставки/обновления
     *
     * @example
     * ```typescript
     * const data = queryData.getData();
     * console.log(data); // { name: 'John', age: 25 }
     * ```
     *
     * @returns Текущие данные или null
     */
    public getData(): IQueryData | null {
        return this._data;
    }

    /**
     * Устанавливает новые данные для вставки/обновления
     *
     * @example
     * ```typescript
     * queryData.setData({ name: 'John', age: 25 });
     * ```
     *
     * @param data - Новые данные для вставки/обновления
     */
    public setData(data: IQueryData | null): void {
        this._data = data;
    }
}
