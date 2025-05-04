/**
 * Модуль контроллера для работы с MongoDB
 *
 * Предоставляет функциональность для:
 * - Подключения к MongoDB и управления соединением
 * - Выполнения CRUD операций с данными
 * - Валидации данных перед сохранением
 * - Безопасного экранирования строк
 *
 * @module models/db/DbControllerMongoDb
 */

import { DbControllerModel } from './DbControllerModel';
import { Sql } from './Sql';
import { mmApp } from '../../mmApp';
import { IQueryData, QueryData } from './QueryData';
import { IModelRes, TQueryCb } from '../interface';
import { Text } from '../../utils/standard/Text';
import { Db, Document, Filter, OptionalId } from 'mongodb';

/**
 * Контроллер для работы с данными в MongoDB
 * Реализует базовые операции CRUD для MongoDB с поддержкой валидации и безопасности
 *
 * @example
 * ```typescript
 * // Создание контроллера
 * const controller = new DbControllerMongoDb();
 * controller.tableName = 'users';
 *
 * // Добавление записи
 * const queryData = new QueryData();
 * queryData.setData({ id: 1, name: 'John' });
 * await controller.insert(queryData);
 *
 * // Поиск записей
 * const result = await controller.select({ name: 'John' });
 * ```
 *
 * @class DbControllerMongoDb
 * @extends DbControllerModel
 */
export class DbControllerMongoDb extends DbControllerModel {
    /**
     * Подключение к базе данных MongoDB
     * Инициализируется только если mmApp.isSaveDb равно true
     *
     * @private
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
     * Обновляет существующую запись в MongoDB
     *
     * @example
     * ```typescript
     * const queryData = new QueryData();
     * queryData.setQuery({ id: 1 });
     * queryData.setData({ name: 'John' });
     * await controller.update(queryData);
     * ```
     *
     * @param updateQuery - Данные для обновления
     * @returns Promise с результатом операции
     */
    public async update(updateQuery: QueryData): Promise<any> {
        let update = updateQuery.getData();
        let select = updateQuery.getQuery();
        if (this._db) {
            update = this.validate(update);
            select = this.validate(select);
            if (this.primaryKeyName) {
                return !!(await this._db.query(async (client: any, db: Db) => {
                    try {
                        const collection = db.collection(this.tableName);
                        const result = await collection.updateOne(select as Filter<Document>, {
                            $set: update as Document,
                        });
                        return {
                            status: true,
                            data: result.modifiedCount,
                        };
                    } catch (err) {
                        return {
                            status: false,
                            error: err instanceof Error ? err.message : 'Unknown error',
                        };
                    }
                }));
            }
        }
        return null;
    }

    /**
     * Добавляет новую запись в MongoDB
     *
     * @example
     * ```typescript
     * const queryData = new QueryData();
     * queryData.setData({ id: 1, name: 'John' });
     * await controller.insert(queryData);
     * ```
     *
     * @param insertQuery - Данные для добавления
     * @returns Promise с результатом операции
     */
    public async insert(insertQuery: QueryData): Promise<any> {
        let insert = insertQuery.getData();
        if (this._db) {
            insert = this.validate(insert);
            if (this.primaryKeyName) {
                return !!(await this._db.query(async (client: any, db: Db) => {
                    try {
                        const collection = db.collection(this.tableName);
                        const result = await collection.insertOne(insert as OptionalId<Document>);
                        return {
                            status: true,
                            data: result.insertedId,
                        };
                    } catch (err) {
                        return {
                            status: false,
                            error: err instanceof Error ? err.message : 'Unknown error',
                        };
                    }
                }));
            }
        }
        return null;
    }

    /**
     * Удаляет запись из MongoDB
     *
     * @example
     * ```typescript
     * const queryData = new QueryData();
     * queryData.setQuery({ id: 1 });
     * await controller.remove(queryData);
     * ```
     *
     * @param removeQuery - Данные для удаления
     * @returns Promise<boolean> - true если удаление успешно
     */
    public async remove(removeQuery: QueryData): Promise<boolean> {
        let remove = removeQuery.getQuery();
        if (this._db) {
            remove = this.validate(remove);
            return !!(await this._db.query(async (client: any, db: Db) => {
                try {
                    const collection = db.collection(this.tableName);
                    const result = await collection.deleteOne(remove as Filter<Document>);
                    return {
                        status: true,
                        data: result.deletedCount,
                    };
                } catch (err) {
                    return {
                        status: false,
                        error: err instanceof Error ? err.message : 'Unknown error',
                    };
                }
            }));
        }
        return false;
    }

    /**
     * Выполняет произвольный запрос к MongoDB
     *
     * @example
     * ```typescript
     * const result = await controller.query(async (client, db) => {
     *   const collection = db.collection('users');
     *   return await collection.aggregate([
     *     { $match: { age: { $gt: 18 } } },
     *     { $group: { _id: '$city', count: { $sum: 1 } } }
     *   ]).toArray();
     * });
     * ```
     *
     * @param callback - Функция обратного вызова с доступом к клиенту и базе данных
     * @returns Результат выполнения запроса или null если нет подключения
     */
    public query(callback: TQueryCb): any {
        if (this._db) {
            return this._db.query(callback);
        }
        return null;
    }

    /**
     * Выполняет валидацию данных перед сохранением
     * Проверяет типы данных и применяет правила валидации
     *
     * @example
     * ```typescript
     * const validated = controller.validate({
     *   id: 1,
     *   name: 'John',
     *   age: '25'
     * });
     * // Результат: { id: 1, name: 'John', age: 25 }
     * ```
     *
     * @param element - Данные для валидации
     * @returns Валидированные данные
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
                            element[data] = Text.resize(element[data] as string, rule.max);
                        }
                        element[data] = this.escapeString(element[data] as string);
                    } else {
                        element[data] = +element[data];
                    }
                });
            });
        }
        return element;
    }

    /**
     * Выполняет поиск записей в MongoDB
     *
     * @example
     * ```typescript
     * // Поиск одной записи
     * const one = await controller.select({ id: 1 }, true);
     *
     * // Поиск нескольких записей
     * const many = await controller.select({ age: { $gt: 18 } });
     * ```
     *
     * @param where - Условия поиска
     * @param isOne - Флаг выборки одной записи
     * @returns Promise с результатом запроса
     */
    public async select(where: IQueryData | null, isOne: boolean = false): Promise<IModelRes> {
        if (this._db) {
            return await this._db.query(async (client: any, db: Db) => {
                try {
                    const collection = db.collection(this.tableName);
                    let results;
                    if (isOne) {
                        results = await collection.findOne((where as Filter<Document>) || {});
                    } else {
                        results = await collection
                            .find((where as Filter<Document>) || {})
                            .toArray();
                    }
                    return {
                        status: !!results,
                        data: results,
                    };
                } catch (err) {
                    return {
                        status: false,
                        error: err instanceof Error ? err.message : 'Unknown error',
                    };
                }
            });
        }
        return {
            status: false,
            error: 'Не удалось получить данные',
        };
    }

    /**
     * Уничтожает подключение к MongoDB
     *
     * @example
     * ```typescript
     * controller.destroy();
     * ```
     */
    public destroy(): void {
        if (this._db) {
            this._db.close();
            this._db = null;
        }
    }

    /**
     * Экранирует специальные символы в строке
     * Делает строку безопасной для использования в запросах
     *
     * @example
     * ```typescript
     * const safe = controller.escapeString("O'Connor");
     * ```
     *
     * @param text - Текст для экранирования
     * @returns Экранированная строка
     */
    public escapeString(text: string | number): string {
        if (this._db) {
            return this._db.escapeString(text);
        }
        return text + '';
    }

    /**
     * Проверяет состояние подключения к MongoDB
     *
     * @example
     * ```typescript
     * const isConnected = await controller.isConnected();
     * if (isConnected) {
     *   // Выполнение операций с базой данных
     * }
     * ```
     *
     * @returns Promise<boolean> - true если подключение активно
     */
    public async isConnected(): Promise<boolean> {
        if (this._db) {
            return await this._db.isConnected();
        }
        return false;
    }
}
