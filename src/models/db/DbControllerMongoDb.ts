import {DbControllerModel} from './DbControllerModel';
import {Sql} from './Sql';
import {mmApp} from '../../mmApp';
import {IQueryData, QueryData} from './QueryData';
import {IModelRes} from '../interface';
import {Text} from '../../utils/standard/Text';

/**
 * Контроллер, позволяющий работать с данными, хранящимися в базе данных. А именно поддерживает работу с MongoDb
 */
export class DbControllerMongoDb extends DbControllerModel {
    /**
     * Подключение к базе данных.
     */
    private _db: Sql | null;

    constructor() {
        super();
        if (mmApp.isSaveDb) {
            this._db = new Sql();
        } else {
            this._db = null;
        }
    }

    /**
     * Выполнение запроса на обновление записи в источнике данных
     *
     * @param {QueryData} updateQuery Данные для обновления записи
     * @return {Promise<Object>}
     * @api
     */
    public async update(updateQuery: QueryData): Promise<any> {
        let update = updateQuery.getData();
        let select = updateQuery.getQuery();
        if (this._db) {
            update = this.validate(update);
            select = this.validate(select);
            if (this.primaryKeyName) {
                return !!await this._db.query(async (client: any, db: any) => {
                    let res: IModelRes = {
                        status: false
                    };
                    const collection = db.collection(this.tableName);
                    const result = new Promise((resolve) => {
                        collection.updateOne(select, {$set: update}, (err: string, result: any) => {
                            if (err) {
                                res = {status: false, error: err};
                                resolve(res);
                                return res;
                            }
                            res = {
                                status: true,
                                data: result.modifiedCount
                            };

                            resolve(res);
                            return res;
                        });
                    });
                    return await result;
                });
            }
        }
        return null;
    }

    /**
     * Выполнение запроса на добавление записи в источник данных
     *
     * @param {QueryData} insertQuery Данные для добавления записи
     * @return {Promise<Object>}
     * @api
     */
    public async insert(insertQuery: QueryData): Promise<any> {
        let insert = insertQuery.getData();
        if (this._db) {
            insert = this.validate(insert);
            if (this.primaryKeyName) {
                return !!await this._db.query(async (client: any, db: any) => {
                    let res: IModelRes = {
                        status: false
                    };
                    const collection = db.collection(this.tableName);
                    const result = new Promise((resolve) => {
                        collection.insertOne(insert, (err: any, result: any) => {
                            if (err) {
                                res = {status: false, error: err};
                                resolve(res);
                                return res
                            }
                            res = {
                                status: true,
                                data: result.insertedId
                            };
                            resolve(res);
                            return res;
                        });
                    });
                    return await result;
                });
            }
        }
        return null;
    }

    /**
     * Выполнение запроса на удаление записи в источнике данных
     *
     * @param {QueryData} removeQuery Данные для удаления записи
     * @return {Promise<boolean>}
     * @api
     */
    public async remove(removeQuery: QueryData): Promise<boolean> {
        let remove = removeQuery.getQuery();
        if (this._db) {
            remove = this.validate(remove);
            return !!await this._db.query(async (client: any, db: any) => {
                let res: IModelRes = {
                    status: false
                };
                const collection = db.collection(this.tableName);

                const result = new Promise((resolve) => {
                    collection.deleteOne(remove, (err: any, result: any) => {
                        if (err) {
                            res = {status: false, error: err};
                            resolve(res);
                            return res;
                        }
                        res = {
                            status: true,
                            data: result.deletedCount
                        };
                        resolve(res);
                        return res;
                    });
                });
                return await result;
            });
        }
        return false;
    }

    /**
     * Выполнение произвольного запроса к источнику данных
     *
     * @param {Function} callback Запрос, который необходимо выполнить
     * @return {Object|Object[]}
     * @api
     */
    public query(callback: Function): any {
        if (this._db) {
            return this._db.query(callback);
        }
        return null;
    }

    /**
     * Валидация значений полей для таблицы.
     *
     * @param {IQueryData} element
     * @api
     */
    public validate(element: IQueryData | null): IQueryData {
        if (!element) {
            return {};
        }
        const rules = this._rules;
        if (rules) {
            rules.forEach((rule) => {
                let type = 'number';
                switch (rule.type) {
                    case 'string':
                    case 'text':
                        type = 'string';
                        break;
                    case 'int':
                    case 'integer':
                    case 'bool':
                        type = 'number';
                        break;
                }
                rule.name.forEach((data) => {
                    if (type === 'string') {
                        if (typeof rule.max !== 'undefined') {
                            // @ts-ignore
                            element[data] = Text.resize(this[data], rule.max);
                        }
                        // @ts-ignore
                        element[data] = this.escapeString(this[data]);
                    } else {
                        // @ts-ignore
                        element[data] = +this[data];
                    }
                })
            })
        }
        return element;
    }

    /**
     * Выполнение запроса на поиск записей в источнике данных
     *
     * @param {IQueryData | null} where Данные для поиска значения
     * @param {boolean} isOne Вывести только 1 запись.
     * @return {Promise<IModelRes>}
     */
    public async select(where: IQueryData | null, isOne: boolean = false): Promise<IModelRes> {
        if (this._db) {
            return await this._db.query(async (client: any, db: any) => {
                let res: IModelRes = {
                    status: false
                };
                const collection = db.collection(this.tableName);
                const result = new Promise((resolve) => {
                    const callback = (err: any, results: any) => {
                        if (err) {
                            res = {status: false, error: err};
                            resolve(res);
                            return res;
                        }
                        res = {
                            status: true,
                            data: results
                        };
                        if (!results) {
                            res.status = false;
                        }
                        resolve(res);
                        return res;
                    };
                    if (isOne) {
                        collection.findOne(where, callback);
                    } else {
                        collection.find(where).toArray(callback);
                    }
                });
                return await result;
            });
        }
        return {
            status: false,
            error: 'Не удалось получить данные'
        };
    }

    /**
     * Удаление подключения к БД
     */
    public destroy() {
        if (this._db) {
            this._db.close();
            this._db = null;
        }
    }

    /**
     * Декодирование текста(Текст становится приемлемым и безопасным для sql запроса).
     *
     * @param {string | number} text Исходный текст.
     * @return string
     * @api
     */
    public escapeString(text: string | number): string {
        if (this._db) {
            return this._db.escapeString(text);
        }
        return text + '';
    }

    /**
     * Проверка подключения к источнику данных.
     * При использовании БД, проверяется статус подключения.
     * Если удалось подключиться, возвращается true, в противном случае false.
     * При сохранении данных в файл, всегда возвращается true.
     *
     * @return {Promise<boolean>}
     */
    public async isConnected(): Promise<boolean> {
        if (this._db) {
            return await this._db.isConnected();
        }
        return false;
    }
}
