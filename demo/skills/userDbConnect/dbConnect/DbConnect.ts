import {IDbControllerResult, IModelRes,} from '../../../../src/models';
import {DbControllerModel, IQueryData, QueryData} from '../../../../src/models/db';
import {Request} from '../../../../src/api';

export default class DbConnect extends DbControllerModel {

    protected _query: Request;

    constructor() {
        super();
        this._query = new Request();
        this._query.url = 'https://query.ru/query';
    }

    /**
     * Приводим полученный результат из запроса к требуемому виду.
     * В данном случае, ожидаем что полученные данные будут вида:
     * {
     *  'key': 'value'
     * }
     * @param res
     */
    getValue(res: IModelRes): IDbControllerResult {
        return res.data;
    }

    /**
     * Отправляем запрос на добавление данных
     *
     * @param insertData
     */
    insert(insertData: QueryData) {
        this._query.post = {
            type: 'insert',
            table: this.tableName,
            data: insertData
        };
        const res = this._query.send();
        return new Promise<IModelRes>((resolve) => {
            res.then(res => {
                if (res.status) {
                    resolve({
                        status: true,
                        data: res.data
                    });
                } else {
                    resolve({
                        status: false,
                        error: res.err
                    });
                }
            });
        });
    }

    /**
     * Проверяем наличие подключения
     */
    isConnected(): Promise<boolean> {
        return Promise.resolve(true);
    }

    /**
     * Выполняем произвольный запрос
     *
     * @param callback
     */
    query(callback: Function) {
        this._query.post = {
            type: 'query',
            table: this.tableName,
            query: callback
        };
        const res = this._query.send();
        return new Promise<IModelRes>((resolve) => {
            res.then(res => {
                if (res.status) {
                    resolve({
                        status: true,
                        data: res.data
                    });
                } else {
                    resolve({
                        status: false,
                        error: res.err
                    });
                }
            });
        });
    }

    /**
     * Выполняем запрос на удаление данных
     *
     * @param removeData
     */
    remove(removeData: QueryData) {
        this._query.post = {
            type: 'delete',
            table: this.tableName,
            data: removeData
        };
        const res = this._query.send();
        return new Promise<IModelRes>((resolve) => {
            res.then(res => {
                if (res.status) {
                    resolve({
                        status: true,
                        data: res.data
                    });
                } else {
                    resolve({
                        status: false,
                        error: res.err
                    });
                }
            });
        });
    }

    /**
     * Выполняем запрос на сохранение данных.
     * Тут суть в том, что если данных для обновления нет, то будет добавлена новая запись.
     *
     * @param saveData
     * @param isNew
     */
    save(saveData: QueryData, isNew: boolean) {
        this._query.post = {
            type: 'save',
            table: this.tableName,
            data: saveData
        };
        const res = this._query.send();
        return new Promise<IModelRes>((resolve) => {
            res.then(res => {
                if (res.status) {
                    resolve({
                        status: true,
                        data: res.data
                    });
                } else {
                    resolve({
                        status: false,
                        error: res.err
                    });
                }
            });
        });
    }

    /**
     * Отправляем запрос на получение данных
     * @param select
     * @param isOne
     */
    select(select: IQueryData | null, isOne: boolean): Promise<IModelRes> {
        this._query.post = {
            type: 'select',
            table: this.tableName,
            select
        };
        const res = this._query.send();
        return new Promise<IModelRes>((resolve) => {
            res.then(res => {
                if (res.status) {
                    let data: any = res.data;
                    if (isOne) {
                        data = data[0];
                    }
                    resolve({
                        status: true,
                        data
                    });
                } else {
                    resolve({
                        status: false,
                        error: res.err
                    });
                }
            });
        });
    }

    /**
     * Выполняем запрос на обновление данных
     *
     * @param updateData
     */
    update(updateData: QueryData) {
        this._query.post = {
            type: 'update',
            table: this.tableName,
            data: updateData
        };
        const res = this._query.send();
        return new Promise<IModelRes>((resolve) => {
            res.then(res => {
                if (res.status) {
                    resolve({
                        status: true,
                        data: res.data
                    });
                } else {
                    resolve({
                        status: false,
                        error: res.err
                    });
                }
            });
        });
    }
}
