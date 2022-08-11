export interface IQueryData {
    /**
     * key - название поля БД. В качестве значения выступает значение для данного поля.
     */
    [key: string]: string | number | any
}

/**
 * Вспомогательный класс, хранящий данные для запросов к базе данных.
 */
export class QueryData {
    /**
     * Запрос, по которому осуществляется поиск.
     */
    protected _query: IQueryData | null = null;
    /**
     * Данные, которые будут добавлены/обновлены в БД.
     */
    protected _data: IQueryData | null = null;

    constructor(query: IQueryData | null = null, data: IQueryData | null = null) {
        this.setQuery(query);
        this.setData(data);
    }

    /**
     * Получение корректных данных для запроса из строки.
     *
     * @param {string} str Строка для парсинга запроса.
     * @return {IQueryData}
     */
    public static getQueryData(str: string): IQueryData | null {
        if (str) {
            const datas = str.matchAll(/((`[^`]+`)=(("[^"]+")|([^ ]+)))/gmi);
            if (datas) {
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
        }
        return null;
    }

    /**
     * Получение данных для выполнения запроса.
     * @return {IQueryData}
     */
    public getQuery(): IQueryData | null {
        return this._query;
    }

    /**
     * Установка данных для получения запроса
     * @param {IQueryData} query
     */
    public setQuery(query: IQueryData | null) {
        this._query = query;
    }

    /**
     * Получение данных, которые необходимо добавить/обновить.
     * @return {IQueryData}
     */
    public getData(): IQueryData | null {
        return this._data;
    }

    /**
     * Установить данные, которые будет добавлены/обновлены
     * @param {IQueryData} data
     */
    public setData(data: IQueryData | null) {
        this._data = data;
    }
}
