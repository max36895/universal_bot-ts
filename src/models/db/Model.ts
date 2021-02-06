import {mmApp} from "../../core";
import {IModelRules} from "../interface/IModel";
import {Text} from "../../components/standard/Text";
import {Sql} from "./Sql";
import {fread, is_file} from "../../utils";

export interface IModelRes {
    /**
     * Статус выполнения
     */
    status: boolean;
    /**
     * Ошибки, возникшие при выполнении
     */
    error?: string;
    /**
     * Полученный результат
     */
    data?: any;
}

/**
 * @class Model
 *
 * Абстрактный класс для моделей. Все Модели, взаимодействующие с бд наследуют его.
 */
export abstract class Model {
    /**
     * Стартовое значение для индекса.
     */
    public startIndex = 0;
    /**
     * Подключение к базе данных.
     */
    private _db: Sql;

    /**
     * Правила для обработки полей. Где 1 - Элемент это название поля, 2 - Элемент тип поля, max - Максимальная длина.
     *
     * @return IModelRules[]
     * [
     *  - string|array 0: Название поля.
     *  - string 1: Тип поля (text, string, integer, ...).
     *  - int max: Максимальная длина строки.
     * ]
     */
    public abstract rules(): IModelRules[];

    /**
     * Массив с полями таблицы, где ключ это название поля, а значение краткое описание.
     * Для уникального ключа использовать значение ID.
     *
     * @return object
     */
    public abstract attributeLabels(): object;

    /**
     * Название таблицы/файла с данными.
     *
     * @return string
     */
    public abstract tableName(): string;

    /**
     * Model constructor.
     */
    protected constructor() {
        if (mmApp.isSaveDb) {
            this._db = new Sql();
        } else {
            this._db = null;
        }
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
     * Валидация значений полей для таблицы.
     * @api
     */
    public validate(): void {
        if (mmApp.isSaveDb) {
            const rules = this.rules();
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
                                this[data] = Text.resize(this[data], rule.max);
                            }
                            this[data] = this.escapeString(this[data]);
                        } else {
                            this[data] = +this[data];
                        }
                    })
                })
            }
        }
    }

    /**
     * Возвращаем название уникального ключа таблицы.
     *
     * @return number|string
     */
    protected getId(): string | number {
        const labels = this.attributeLabels();
        let key = null;
        Object.keys(labels).forEach((index) => {
            if (labels[index] === 'id' || labels[index] === 'ID') {
                key = index;
                return index;
            }
        });
        return key;
    }

    /**
     * Инициализация данных для модели.
     *
     * @param data Массив с данными.
     * @api
     */
    public init(data): void {
        let i = this.startIndex;
        const labels = this.attributeLabels();
        Object.keys(labels).forEach((index) => {
            if (mmApp.isSaveDb) {
                this[index] = data[index] || data[i] || '';
            } else {
                this[index] = data[index] || '';
            }
            i++;
        })
    }

    /**
     * Выполнение запроса с поиском по уникальному ключу.
     *
     * @return {Promise<IModelRes | any>}
     * @api
     */
    public async selectOne(): Promise<IModelRes | any> {
        const idName = this.getId();
        if (idName) {
            if (this[idName]) {
                if (mmApp.isSaveDb) {
                    return await this._db.query(async (client, db) => {
                        let res: IModelRes = {
                            status: false
                        };
                        const collection = db.collection(this.tableName());
                        let data = {
                            [idName]: this[idName]
                        };
                        const result = new Promise((resolve) => {
                            collection.findOne(data, (err, result) => {
                                if (err) {
                                    res = {status: false, error: err};
                                    resolve(res);
                                    return res;
                                }
                                res = {
                                    status: true,
                                    data: result
                                };
                                resolve(res);
                                return res;
                            });
                        });
                        return await result;
                    });
                } else {
                    const data = this.getFileData();
                    return data[this[idName]] || null;
                }
            }
        }
        return null;
    }

    /**
     * Сохранение значения в базу данных.
     * Если значение уже есть в базе данных, то данные обновятся. Иначе добавляется новое значение.
     *
     * @param {boolean} isNew Добавить новую запись в базу данных без поиска по ключу.
     * @return {Promise<any>}
     * @api
     */
    public async save(isNew: boolean = false): Promise<any> {
        this.validate();
        if (isNew) {
            return await this.add();
        }
        if (await this.selectOne()) {
            return await this.update();
        } else {
            return await this.add();
        }
    }

    /**
     * Обновление значения в таблице.
     *
     * @return {Promise<any>}
     * @api
     */
    public async update(): Promise<any> {
        if (mmApp.isSaveDb) {
            this.validate();
            const idName = this.getId();
            if (idName) {
                return !!await this._db.query(async (client, db) => {
                    let res: IModelRes = {
                        status: false
                    };
                    const collection = db.collection(this.tableName());
                    let data = {};
                    Object.keys(this.attributeLabels()).forEach((index) => {
                        if (index != idName) {
                            data[index] = this[index];
                        }
                    });
                    const result = new Promise((resolve) => {
                        collection.updateOne({[idName]: this[idName]}, {$set: data}, (err, result) => {
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
            const idName = this.getId();
            if (typeof data[this[idName]] !== 'undefined') {
                const tmp: any = {};
                Object.keys(this.attributeLabels()).forEach((index) => {
                    tmp[index] = this[index];
                });
                data[this[idName]] = tmp;
                mmApp.saveJson(`${this.tableName()}.json`, data);
            }
            return true;
        }
        return null;
    }

    /**
     * Добавление значения в таблицу.
     *
     * @return {Promise<any>}
     * @api
     */
    public async add(): Promise<any> {
        if (mmApp.isSaveDb) {
            this.validate();
            const idName = this.getId();
            if (idName) {
                return !!await this._db.query(async (client, db) => {
                    let res: IModelRes = {
                        status: false
                    };
                    let data = {};
                    Object.keys(this.attributeLabels()).forEach((index) => {
                        if (typeof this[index] !== 'undefined') {
                            data[index] = this[index];
                        }
                    });
                    const collection = db.collection(this.tableName());

                    const result = new Promise((resolve) => {
                        collection.insertOne(data, (err, result) => {
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
            const idName = this.getId();
            const tmp = {};
            Object.keys(this.attributeLabels()).forEach((index) => {
                tmp[index] = this[index];
            });
            data[this[idName]] = tmp;
            mmApp.saveJson(`${this.tableName()}.json`, data);
            return true;
        }
        return null;
    }

    /**
     * Удаление значения из таблицы.
     *
     * @return {Promise<boolean>}
     * @api
     */
    public async remove(): Promise<boolean> {
        if (mmApp.isSaveDb) {
            const idName = this.getId();
            let data = null;
            if (idName) {
                const val = this[idName];
                if (val) {
                    data = {
                        [idName]: val
                    };
                }
            }
            if (data) {
                return !!await this._db.query(async (client, db) => {
                    let res: IModelRes = {
                        status: false
                    };
                    const collection = db.collection(this.tableName());

                    const result = new Promise((resolve) => {
                        collection.deleteOne(data, (err, result) => {
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
        } else {
            const data = this.getFileData();
            const idName = this.getId();
            if (typeof data[this[idName]] !== 'undefined') {
                delete data[this[idName]];
                mmApp.saveJson(`${this.tableName()}.json`, data);
            }
            return true;
        }
        return false;
    }

    /**
     * Выполнение запроса к данным.
     *
     * @param where Запрос к таблице.
     * @param {boolean} isOne Вывести только 1 результат. Используется только при поиске по файлу.
     * @return {Promise<any>}
     * @api
     */
    public async where(where: any = '1', isOne: boolean = false): Promise<any> {
        if (mmApp.isSaveDb) {
            return await this._db.query(async (client, db) => {
                let res: IModelRes = {
                    status: false
                };
                const collection = db.collection(this.tableName());
                if (typeof where === 'string') {
                    where = {};
                }

                const result = new Promise((resolve) => {
                    collection.find(where).toArray((err, results) => {
                        if (err) {
                            res = {status: false, error: err};
                            resolve(res);
                        }
                        res = {
                            status: true,
                            data: results
                        };
                        resolve(res);
                        return res
                    });
                });
                return await result;
            });
        } else {
            if (typeof where === 'string') {
                const datas = where.matchAll(/((`[^`]+`)=(("[^"]+")|([^ ]+)))/gmi);
                const content = this.getFileData();
                if (datas) {
                    let result = null;

                    const regDatas: { key: string, val: string }[] = [];
                    let data = datas.next();
                    while (!data.done) {
                        regDatas.push(
                            {
                                key: data.value[2].replace(/`/g, ''),
                                val: data.value[3].replace(/"/g, '')
                            });
                        data = datas.next();
                    }

                    for (const key in content) {
                        let isSelected = null;

                        for (const regData of regDatas) {
                            isSelected = content[key][regData.key] === regData.val;
                            if (isSelected === false) {
                                break;
                            }
                        }

                        if (isSelected) {
                            if (isOne) {
                                result = content[key];
                                return content[key];
                            }
                            if (result === null) {
                                result = [];
                            }
                            result.push(content[key]);
                        }
                    }
                    if (result) {
                        return result;
                    }
                }
            } else {
                let result = null;
                const content = this.getFileData();
                for (const key in content) {
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
                            return content[key];
                        }
                        if (result === null) {
                            result = [];
                        }
                        result.push(content[key]);
                    }
                }
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }

    /**
     * Выполнение запроса и инициализация переменных в случае успешного запроса.
     *
     * @param where Запрос к таблице.
     * @return {Promise<boolean>}
     * @api
     */
    public async whereOne(where: any = '1'): Promise<boolean> {
        if (mmApp.isSaveDb) {
            return !!await this._db.query(async (client, db) => {
                let res: IModelRes = {
                    status: false
                };
                const collection = db.collection(this.tableName());
                if (typeof where === 'string') {
                    where = {};
                }
                const result = new Promise((resolve) => {
                    collection.findOne(where, (err, result) => {
                        if (err) {
                            res = {status: false, error: err};
                            resolve(res);
                            return res;
                        }

                        res = {
                            status: true,
                            data: result
                        };
                        if (result) {
                            this.init(result);
                        } else {
                            res.status = false;
                        }
                        resolve(res);
                        return res;
                    });
                });
                return await result;
            });
        } else {
            const query = await this.where(where, true);
            if (query) {
                this.init(query);
                return true;
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
        const fileName = this.tableName().replace(/`/g, '');
        const file = `${path}/${fileName}.json`;
        if (is_file(file)) {
            return JSON.parse(fread(file));
        } else {
            return {};
        }
    }

    /**
     * Выполнение произвольного запрос к базе данных.
     *
     * @param {Function} callback Непосредственно запрос к бд.
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
     * Уделение подключения к БД
     */
    public destroy() {
        if (mmApp.isSaveDb) {
            this._db.close();
            this._db = null;
        }
    }
}
