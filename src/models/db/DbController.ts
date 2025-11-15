/**
 * Модуль контроллера для работы с данными
 *
 * Предоставляет унифицированный интерфейс для:
 * - Работы с различными источниками данных (MongoDB, файлы)
 * - Выполнения CRUD операций
 * - Валидации данных
 * - Управления подключениями
 */

import { DbControllerModel } from './DbControllerModel';
import { IQueryData, QueryData } from './QueryData';
import { IModelRes, IModelRules, IDbControllerResult, TKey, TQueryCb } from '../interface';
import { DbControllerFile } from './DbControllerFile';
import { DbControllerMongoDb } from './DbControllerMongoDb';
import { AppContext, EMetric } from '../../core/AppContext';

/**
 * Контроллер для работы с данными
 * Автоматически выбирает подходящий источник данных на основе конфигурации приложения
 *
 * @example
 * ```typescript
 * // Создание контроллера
 * const controller = new DbController();
 *
 * // Настройка правил и имени таблицы
 * controller.setRules([
 *   { name: ['username'], type: 'string', max: 50 }
 * ]);
 * controller.tableName = 'users';
 *
 * // Выполнение запросов
 * const result = await controller.select({ username: 'John' });
 * ```
 *
 * @class DbController
 * @extends DbControllerModel
 * @see DbControllerFile
 * @see DbControllerMongoDb
 */
export class DbController extends DbControllerModel {
    /**
     * Внутренний контроллер для работы с конкретным источником данных.
     * Может быть либо DbControllerFile, либо DbControllerMongoDb
     */
    private _controller: DbControllerFile | DbControllerMongoDb;

    /**
     * Создает новый экземпляр контроллера
     * Выбирает подходящий источник данных на основе конфигурации приложения
     *
     * @example
     * ```typescript
     * const controller = new DbController();
     * ```
     */
    constructor(appContext?: AppContext) {
        super(appContext);
        if (appContext?.isSaveDb) {
            this._controller = new DbControllerMongoDb(appContext);
        } else {
            this._controller = new DbControllerFile(appContext);
        }
    }

    /**
     * Устанавливает правила валидации для модели
     *
     * @example
     * ```typescript
     * controller.setRules([
     *   { name: ['username'], type: 'string', max: 50 },
     *   { name: ['age'], type: 'integer' }
     * ]);
     * ```
     *
     * @param rules - Массив правил валидации
     */
    public setRules(rules: IModelRules[]): void {
        super.setRules(rules);
        this._controller.setRules(rules);
    }

    /**
     * Устанавливает имя первичного ключа таблицы
     *
     * @example
     * ```typescript
     * controller.primaryKeyName = 'id';
     * ```
     *
     * @param primaryKey - Имя первичного ключа
     */
    public set primaryKeyName(primaryKey: TKey) {
        this._primaryKeyName = primaryKey;
        this._controller.primaryKeyName = primaryKey;
    }

    /**
     * Возвращает имя первичного ключа таблицы
     *
     * @example
     * ```typescript
     * const keyName = controller.primaryKeyName;
     * ```
     *
     * @returns Имя первичного ключа
     */
    public get primaryKeyName(): TKey {
        return this._controller.primaryKeyName;
    }

    /**
     * Устанавливает имя таблицы
     *
     * @example
     * ```typescript
     * controller.tableName = 'users';
     * ```
     *
     * @param tableName - Имя таблицы
     */
    public set tableName(tableName: string) {
        super.tableName = tableName;
        this._controller.tableName = tableName;
    }

    /**
     * Возвращает имя таблицы
     *
     * @example
     * ```typescript
     * const table = controller.tableName;
     * ```
     *
     * @returns Имя таблицы
     */
    public get tableName(): string {
        return this._controller.tableName;
    }

    /**
     * Сохраняет запись в источник данных
     * Если запись существует - обновляет, иначе создает новую
     *
     * @example
     * ```typescript
     * const queryData = new QueryData();
     * queryData.setData({ username: 'John', age: 25 });
     * await controller.save(queryData);
     * ```
     *
     * @param queryData - Данные для сохранения
     * @param isNew - Флаг создания новой записи
     * @returns Promise с результатом операции
     */
    public async save(queryData: QueryData, isNew: boolean = false): Promise<any> {
        const start = performance.now();
        const res = await this._controller.save(queryData, isNew);
        this._appContext?.logMetric(EMetric.DB_SAVE, performance.now() - start, {
            tableName: this.tableName,
            isNew: isNew,
        });
        return res;
    }

    /**
     * Проверяет наличие записи в таблице
     *
     * @example
     * ```typescript
     * const exists = await controller.isSelected({ id: 1 });
     * if (exists) {
     *   console.log('Record found');
     * }
     * ```
     *
     * @param query - Условия поиска
     * @returns Promise<boolean> - true если запись найдена
     */
    public async isSelected(query: IQueryData | null): Promise<boolean> {
        return !!(await this._controller.selectOne(query))?.status;
    }

    /**
     * Обновляет существующую запись в источнике данных
     *
     * @example
     * ```typescript
     * const queryData = new QueryData();
     * queryData.setQuery({ id: 1 });
     * queryData.setData({ username: 'John' });
     * await controller.update(queryData);
     * ```
     *
     * @param updateQuery - Данные для обновления
     * @returns Promise с результатом операции
     */
    public async update(updateQuery: QueryData): Promise<any> {
        const start = performance.now();
        const res = await this._controller.update(updateQuery);
        this._appContext?.logMetric(EMetric.DB_UPDATE, performance.now() - start, {
            tableName: this.tableName,
        });
        return res;
    }

    /**
     * Добавляет новую запись в источник данных
     *
     * @example
     * ```typescript
     * const queryData = new QueryData();
     * queryData.setData({ username: 'John', age: 25 });
     * await controller.insert(queryData);
     * ```
     *
     * @param insertQuery - Данные для добавления
     * @returns Promise с результатом операции
     */
    public async insert(insertQuery: QueryData): Promise<any> {
        const start = performance.now();
        const res = await this._controller.insert(insertQuery);
        this._appContext?.logMetric(EMetric.DB_INSERT, performance.now() - start, {
            tableName: this.tableName,
        });
        return res;
    }

    /**
     * Удаляет запись из источника данных
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
        const start = performance.now();
        const res = await this._controller.remove(removeQuery);
        this._appContext?.logMetric(EMetric.DB_REMOVE, performance.now() - start, {
            tableName: this.tableName,
        });
        return res;
    }

    /**
     * Выполняет произвольный запрос к источнику данных
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
     * @param callback - Функция обратного вызова для выполнения запроса
     * @returns Результат выполнения запроса
     */
    public query(callback: TQueryCb): any {
        const start = performance.now();
        const res = this._controller.query(callback);
        this._appContext?.logMetric(EMetric.DB_QUERY, performance.now() - start, {
            tableName: this.tableName,
            query: callback,
        });
        return res;
    }

    /**
     * Выполняет валидацию данных
     *
     * @example
     * ```typescript
     * const validated = controller.validate({
     *   username: 'John',
     *   age: 25
     * });
     * ```
     *
     * @param element - Данные для валидации
     * @returns Валидированные данные
     */
    public validate(element: IQueryData | null): IQueryData {
        return this._controller.validate(element);
    }

    /**
     * Выполняет поиск записей в источнике данных
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
        const start = performance.now();
        const res = await this._controller.select(where, isOne);
        this._appContext?.logMetric(EMetric.DB_SELECT, performance.now() - start, {
            tableName: this.tableName,
        });
        return res;
    }

    /**
     * Преобразует результат запроса в требуемый формат
     *
     * @example
     * ```typescript
     * const result = await controller.select({ id: 1 });
     * const value = controller.getValue(result);
     * console.log(value.username); // John
     * ```
     *
     * @param res - Результат выполнения запроса
     * @returns Объект с данными или null
     */
    public getValue(res: IModelRes): IDbControllerResult | null {
        return this._controller.getValue(res);
    }

    /**
     * Закрывает соединение с источником данных
     *
     * @example
     * ```typescript
     * controller.destroy();
     * ```
     */
    public destroy(): void {
        this._controller.destroy();
    }

    /**
     * Экранирует специальные символы в строке
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
        return this._controller.escapeString(text);
    }

    /**
     * Проверяет состояние подключения к источнику данных
     *
     * @example
     * ```typescript
     * const isConnected = await controller.isConnected();
     * if (isConnected) {
     *   // Выполнение операций с данными
     * }
     * ```
     *
     * @returns Promise<boolean> - true если подключение активно
     */
    public async isConnected(): Promise<boolean> {
        return this._controller.isConnected();
    }
}
