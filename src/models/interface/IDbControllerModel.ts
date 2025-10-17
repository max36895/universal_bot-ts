/**
 * Модуль интерфейсов для работы с базой данных
 *
 * Определяет основные типы и интерфейсы для:
 * - Управления подключением к MongoDB
 * - Выполнения CRUD операций
 * - Обработки результатов запросов
 * - Валидации данных
 *
 * @module models/interface/IDbControllerModel
 */

import { IModelRes, IModelRules } from './IModel';
import { IQueryData, QueryData } from '../db/QueryData';
import { Db, MongoClient } from 'mongodb';
import { AppContext } from '../../core';

/**
 * Тип ключа для идентификации записей в базе данных
 *
 * @example
 * ```typescript
 * const key: TKey = 'user_id'; // строковый ключ
 * const key: TKey = 123; // числовой ключ
 * const key: TKey = null; // отсутствие ключа
 * ```
 */
export type TKey = string | number | null;

/**
 * Интерфейс для хранения результата запроса к базе данных
 * Позволяет обращаться к результатам как по строковым, так и по числовым ключам
 *
 * @example
 * ```typescript
 * const result: IDbControllerResult<User> = {
 *   'user_1': { id: 1, name: 'John' },
 *   2: { id: 2, name: 'Jane' }
 * };
 * ```
 *
 * @template TValue - Тип значения, хранимого в результате
 */
export interface IDbControllerResult<TValue = unknown> {
    /**
     * Результат запроса, доступный по строковым ключам
     */
    [keyStr: string]: TValue;

    /**
     * Результат запроса, доступный по числовым ключам
     */
    [keyInt: number]: TValue;
}

/**
 * Тип функции обратного вызова для выполнения запросов к базе данных
 *
 * @example
 * ```typescript
 * const queryCallback: TQueryCb = async (client, db) => {
 *   const collection = db.collection('users');
 *   const result = await collection.find({}).toArray();
 *   return { status: true, data: result };
 * };
 * ```
 *
 * @param client - Клиент MongoDB для выполнения запросов
 * @param db - Экземпляр базы данных MongoDB
 * @returns Promise с результатом выполнения запроса
 */
export type TQueryCb = (client: MongoClient, db: Db) => Promise<IModelRes>;

/**
 * Тип для хранения состояния данных
 * Позволяет хранить произвольные данные с ключами типа string или number
 *
 * @example
 * ```typescript
 * const state: TStateData = {
 *   'current_user': { id: 1, name: 'John' },
 *   'last_update': new Date(),
 *   'settings': { theme: 'dark', notifications: true }
 * };
 * ```
 */
export type TStateData = Record<string | number, any>;

/**
 * Интерфейс контроллера базы данных
 * Определяет методы для работы с MongoDB и управления данными
 *
 * @example
 * ```typescript
 * class UserController implements IDbControllerModel {
 *   tableName = 'users';
 *   primaryKeyName = 'user_id';
 *
 *   async selectOne(query: IQueryData) {
 *     // Реализация выборки пользователя
 *   }
 *
 *   async save(data: QueryData, isNew: boolean) {
 *     // Реализация сохранения пользователя
 *   }
 * }
 * ```
 */
export interface IDbControllerModel {
    /**
     * Имя коллекции в базе данных
     *
     * @example
     * ```typescript
     * tableName = 'users';
     * tableName = 'products';
     * ```
     */
    tableName: string;

    /**
     * Имя поля, используемого как первичный ключ
     *
     * @example
     * ```typescript
     * primaryKeyName = '_id';
     * primaryKeyName = 'user_id';
     * ```
     */
    primaryKeyName: TKey;

    /**
     * Устанавливает контекст приложения
     * @param appContext
     */
    setAppContext(appContext: AppContext): void;

    /**
     * Устанавливает правила валидации для модели
     *
     * @example
     * ```typescript
     * setRules([
     *   { name: ['username'], type: 'string', max: 50 },
     *   { name: ['age'], type: 'integer' }
     * ]);
     * ```
     *
     * @param rules - Массив правил валидации
     */
    setRules(rules: IModelRules[]): void;

    /**
     * Извлекает значение из результата запроса к базе данных
     *
     * @example
     * ```typescript
     * const result = getValue({ status: true, data: { id: 1, name: 'John' } });
     * // result = { id: 1, name: 'John' }
     * ```
     *
     * @param res - Результат запроса к базе данных
     * @returns Извлеченное значение или null
     */
    getValue(res: IModelRes): IDbControllerResult | null;

    /**
     * Выполняет запрос на выборку данных из базы
     *
     * @example
     * ```typescript
     * const result = await select(
     *   { where: { age: { $gt: 18 } } },
     *   false
     * );
     * ```
     *
     * @param select - Параметры запроса
     * @param isOne - Флаг выборки одного элемента
     * @returns Promise с результатом запроса
     */
    select(select: IQueryData | null, isOne: boolean): Promise<IModelRes>;

    /**
     * Вставляет новые данные в базу
     *
     * @example
     * ```typescript
     * const result = await insert({
     *   data: { name: 'John', age: 25 }
     * });
     * ```
     *
     * @param insertData - Данные для вставки
     * @returns Результат операции вставки
     */
    insert(insertData: QueryData): any;

    /**
     * Обновляет существующие данные в базе
     *
     * @example
     * ```typescript
     * const result = await update({
     *   where: { id: 1 },
     *   data: { age: 26 }
     * });
     * ```
     *
     * @param updateData - Данные для обновления
     * @returns Результат операции обновления
     */
    update(updateData: QueryData): any;

    /**
     * Сохраняет данные в базу (вставка или обновление)
     *
     * @example
     * ```typescript
     * const result = await save(
     *   { data: { id: 1, name: 'John' } },
     *   true // новый элемент
     * );
     * ```
     *
     * @param saveData - Данные для сохранения
     * @param isNew - Флаг нового элемента
     * @returns Promise с результатом операции
     */
    save(saveData: QueryData, isNew: boolean): Promise<any>;

    /**
     * Удаляет данные из базы
     *
     * @example
     * ```typescript
     * const result = await remove({
     *   where: { id: 1 }
     * });
     * ```
     *
     * @param removeData - Данные для удаления
     * @returns Результат операции удаления
     */
    remove(removeData: QueryData): any;

    /**
     * Выполняет произвольный запрос к базе данных
     *
     * @example
     * ```typescript
     * const result = await query(async (client, db) => {
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
    query(callback: TQueryCb): any;

    /**
     * Выбирает один элемент из базы данных
     *
     * @example
     * ```typescript
     * const user = await selectOne({
     *   where: { id: 1 }
     * });
     * ```
     *
     * @param query - Параметры запроса
     * @returns Promise с результатом запроса или null
     */
    selectOne(query: IQueryData | null): Promise<IModelRes | null>;

    /**
     * Экранирует специальные символы в строке
     *
     * @example
     * ```typescript
     * const safe = escapeString("O'Connor"); // O\'Connor
     * ```
     *
     * @param str - Строка для экранирования
     * @returns Экранированная строка
     */
    escapeString(str: string | number): string;

    /**
     * Проверяет состояние подключения к базе данных
     *
     * @example
     * ```typescript
     * const connected = await isConnected();
     * if (connected) {
     *   // выполнить операции с базой
     * }
     * ```
     *
     * @returns Promise с результатом проверки
     */
    isConnected(): Promise<boolean>;

    /**
     * Закрывает подключение к базе данных
     *
     * @example
     * ```typescript
     * destroy();
     * ```
     */
    destroy(): void;
}
