import {DbControllerModel, IDbControllerResult} from "./DbControllerModel";
import {Sql} from "./Sql";
import {mmApp} from "../../core/mmApp";
import {IQueryData, QueryData} from "./QueryData";
import {fread, is_file} from "../../utils/index";
import {IModelRes} from "./Model";
import {Text} from "../../components/standard/Text";

export class DbController extends DbControllerModel {
    /**
     * Подключение к базе данных.
     */
    private _db: Sql;

    constructor() {
        super();
        if (mmApp.isSaveDb) {
            this._db = new Sql();
        } else {
            this._db = null;
        }
    }

    /**
     * Выполнение запроса на сохранения записи.
     * Обновление записи происходит в том случае, если запись присутствует в таблице.
     * Иначе будет добавлена новая запись.
     *
     * @param {QueryData} queryData Данные для сохранения записи
     * @param {boolean} isNew В любом случае выполнить добавление записи
     * @return {Promise<any>}
     * @api
     */
    public async save(queryData: QueryData, isNew: boolean = false): Promise<any> {
        if (isNew) {
            queryData.setData({...queryData.getData(), ...queryData.getQuery()});
            return await this.insert(queryData);
        }
        if (await this.isSelected(queryData.getQuery())) {
            return await this.update(queryData);
        } else {
            queryData.setData({...queryData.getData(), ...queryData.getQuery()});
            return await this.insert(queryData);
        }
    }

    /**
     * Наличие записи в таблице
     *
     * @param {IQueryData} query Запрос
     * @return {Promise<boolean>}
     */
    public async isSelected(query: IQueryData): Promise<boolean> {
        const select = await this.select(query, true);
        return (select && select.status);
    }

    /**
     * Выполнение запроса на обновление записи в таблице
     *
     * @param {QueryData} updateQuery Данные для обновления записи
     * @return {Promise<any>}
     * @api
     */
    public async update(updateQuery: QueryData): Promise<any> {
        let update = updateQuery.getData();
        let select = updateQuery.getQuery();
        if (mmApp.isSaveDb) {
            update = this.validate(update);
            select = this.validate(select);
            if (this.primaryKeyName) {
                return !!await this._db.query(async (client, db) => {
                    let res: IModelRes = {
                        status: false
                    };
                    const collection = db.collection(this.tableName);
                    const result = new Promise((resolve) => {
                        collection.updateOne(select, {$set: update}, (err, result) => {
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
        } else {
            const data = this.getFileData();
            if (select) {
                let idVal = select[this.primaryKeyName];
                if (idVal !== undefined) {
                    if (typeof data[idVal] !== 'undefined') {
                        data[idVal] = update;
                        mmApp.saveJson(`${this.tableName}.json`, data);
                    }
                    return true;
                }
            }
        }
        return null;
    }

    /**
     * Выполнение запроса на добавление записи в таблицу
     *
     * @param {QueryData} insertQuery Данные для добавления записи
     * @return {Promise<any>}
     * @api
     */
    public async insert(insertQuery: QueryData): Promise<any> {
        let insert = insertQuery.getData();
        if (mmApp.isSaveDb) {
            insert = this.validate(insert);
            if (this.primaryKeyName) {
                return !!await this._db.query(async (client, db) => {
                    let res: IModelRes = {
                        status: false
                    };
                    const collection = db.collection(this.tableName);
                    const result = new Promise((resolve) => {
                        collection.insertOne(insert, (err, result) => {
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
        } else {
            const data = this.getFileData();
            if (insert) {
                const idVal = insert[this.primaryKeyName];
                if (idVal) {
                    data[idVal] = insert;
                    mmApp.saveJson(`${this.tableName}.json`, data);
                    return true;
                }
            }
        }
        return null;
    }

    /**
     * Выполнение запроса на удаление записи в таблице
     *
     * @param {QueryData} removeQuery Данные для удаления записи
     * @return {Promise<boolean>}
     * @api
     */
    public async remove(removeQuery: QueryData): Promise<boolean> {
        let remove = removeQuery.getQuery();
        if (mmApp.isSaveDb) {
            remove = this.validate(remove);
            return !!await this._db.query(async (client, db) => {
                let res: IModelRes = {
                    status: false
                };
                const collection = db.collection(this.tableName);

                const result = new Promise((resolve) => {
                    collection.deleteOne(remove, (err, result) => {
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
        } else {
            const data = this.getFileData();
            if (remove) {
                let idVal = remove[this.primaryKeyName];
                if (idVal !== undefined) {
                    if (typeof data[idVal] !== 'undefined') {
                        delete data[idVal];
                        mmApp.saveJson(`${this.tableName}.json`, data);
                    }
                    return true;
                }
            }
        }
        return false;
    }


    /**
     * Получение всех значений из файла. Актуально если глобальная константа mmApp.isSaveDb равна false.
     *
     * @return {any}
     * @api
     */
    public getFileData(): any {
        const path = mmApp.config.json;
        const fileName = this.tableName;
        const file = `${path}/${fileName}.json`;
        if (is_file(file)) {
            return JSON.parse(fread(file));
        } else {
            return {};
        }
    }

    /**
     * Выполнение произвольного запроса к таблице
     *
     * @param {Function} callback Запрос, который необходимо выполнить
     * @return {any}
     * @api
     */
    public query(callback: Function): any {
        if (mmApp.isSaveDb) {
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
    public validate(element: IQueryData): IQueryData {
        if (mmApp.isSaveDb) {
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
                                element[data] = Text.resize(this[data], rule.max);
                            }
                            element[data] = this.escapeString(this[data]);
                        } else {
                            element[data] = +this[data];
                        }
                    })
                })
            }
        }
        return element;
    }

    /**
     * Выполнение запроса на поиск записей в таблице
     *
     * @param {IQueryData} where Данные для поиска значения
     * @param {boolean} isOne Вывести только 1 запись.
     * @return {Promise<IModelRes>}
     */
    public async select(where: IQueryData, isOne: boolean = false): Promise<IModelRes> {
        if (mmApp.isSaveDb) {
            return await this._db.query(async (client, db) => {
                let res: IModelRes = {
                    status: false
                };
                const collection = db.collection(this.tableName);
                const result = new Promise((resolve) => {
                    const callback = (err, results) => {
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
                        return res
                    };
                    if (isOne) {
                        collection.findOne(where, callback);
                    } else {
                        collection.find(where).toArray(callback);
                    }
                });
                return await result;
            });
        } else {
            let result = null;
            const content = this.getFileData();
            for (const key in content) {
                if (content.hasOwnProperty(key)) {
                    let isSelected = null;

                    for (const data in where) {
                        isSelected = content[key][data] === where[data];
                        if (isSelected === false) {
                            break;
                        }
                    }

                    if (isSelected) {
                        if (isOne) {
                            result = content[key];
                            return {
                                status: true,
                                data: result
                            };
                        }
                        if (result === null) {
                            result = [];
                        }
                        result.push(content[key]);
                    }
                }
            }
            if (result) {
                return {
                    status: true,
                    data: result
                };
            }
        }
        return {
            status: false,
            error: 'Не удалось получить данные'
        };
    }

    /**
     * Приводим полученный результат к требуемому типу.
     * В качестве результата должен вернуться объект вида:
     * {
     *    key: value
     * }
     * где key - порядковый номер поля(0, 1... 3), либо название поля. Рекомендуется использовать имя поля. Важно чтобы имя поля было указано в rules, имена не входящие в rules будут проигнорированы.
     * value - значение поля.
     *
     * @param {IModelRes} res Результат выполнения запроса
     * @return {IDbControllerResult}
     */
    public getValue(res: IModelRes): IDbControllerResult {
        if (res && res.status) {
            return res.data;
        }
        return null;
    }


    /**
     * Удаление подключения к БД
     */
    public destroy() {
        if (mmApp.isSaveDb) {
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
        if (mmApp.isSaveDb) {
            return this._db.escapeString(text);
        }
        return text + '';
    }

    /**
     * Проверка подключения к Базе Данных.
     * При использовании БД, проверяется статус подключения.
     * Если удалось подключиться, возвращается true, в противном случае false.
     * При сохранении данных в файл, всегда возвращается true.
     *
     * @return {Promise<boolean>}
     */
    public async isConnected(): Promise<boolean> {
        if (mmApp.isSaveDb) {
            return await this._db.isConnected();
        }
        return true;
    }
}