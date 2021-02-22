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
    protected _query: IQueryData;
    /**
     * Данные, которые будут добавлены/обновлены в БД.
     */
    protected _data: IQueryData;

    constructor(query: IQueryData = null, data: IQueryData = null) {
        this.setQuery(query);
        this.setData(data);
    }

    /**
     * Получение корректных данных для запроса из строки.
     *
     * @param {string} str Строка для парсинга запроса.
     * @return {IQueryData}
     */
    public static getQueryData(str: string): IQueryData {
        if (str) {
            const datas = str.matchAll(/((`[^`]+`)=(("[^"]+")|([^ ]+)))/gmi);
            if (datas) {
                const regData: IQueryData = {};
                let data = datas.next();
                while (!data.done) {
                    let val = data.value[3].replace(/"/g, '');
                    if (!isNaN(val - 0)) {
                        val -= 0;
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
    public getQuery(): IQueryData {
        return this._query;
    }

    /**
     * Установка данных для получения запроса
     * @param {IQueryData} query
     */
    public setQuery(query: IQueryData) {
        this._query = query;
    }

    /**
     * Получение данных, которые необходимо добавить/обновить.
     * @return {IQueryData}
     */
    public getData(): IQueryData {
        return this._data;
    }

    /**
     * Установить данные, которые будет добавлены/обновлены
     * @param {IQueryData} data
     */
    public setData(data: IQueryData) {
        this._data = data;
    }
}