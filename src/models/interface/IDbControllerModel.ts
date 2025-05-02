import { IModelRes, IModelRules } from './IModel';
import { IQueryData, QueryData } from '../db/QueryData';
import { Db, MongoClient } from 'mongodb';

/**
 * Тип ключа для БД
 */
export type TKey = string | number | null;

/**
 * Интерфейс для хранения результата запроса к БД
 * @property {TValue} keyStr - Строка ключа
 * @property {TValue} keyInt - Число ключа
 * @template TValue
 */
export interface IDbControllerResult<TValue = unknown> {
    [keyStr: string]: TValue;

    [keyInt: number]: TValue;
}

/**
 * Интерфейс для абстрактного класса служащего прослойкой между логикой ядра и подключением к БД.
 * @param {MongoClient} client - Клиент MongoDB
 * @param {Db} db - База данных MongoDB
 * @returns {Promise<IModelRes>}
 */
export type TQueryCb = (client: MongoClient, db: Db) => Promise<IModelRes>;

/**
 * Тип для данных состояния
 * @template TKey
 * @template TValue
 */
export type TStateData = Record<string | number, any>;

/**
 * Интерфейс для абстрактного класса служащего прослойкой между логикой ядра и подключением к БД.
 */
export interface IDbControllerModel {
    /**
     * Имя таблицы в БД
     * @type {string}
     */
    tableName: string;

    /**
     * Имя первичного ключа
     * @type {TKey}
     */
    primaryKeyName: TKey;

    /**
     * Установка правил модели
     * @param {IModelRules[]} rules - Массив правил модели
     * @returns {void}
     */
    setRules(rules: IModelRules[]): void;

    /**
     * Получение значения из результата запроса к БД
     * @param {IModelRes} res - Результат запроса к БД
     * @returns {IDbControllerResult | null}
     */
    getValue(res: IModelRes): IDbControllerResult | null;

    /**
     * Выполнение запроса на выборку данных
     * @param {IQueryData | null} select - Данные запроса
     * @param {boolean} isOne - Флаг выборки одного элемента
     * @returns {Promise<IModelRes>}
     */
    select(select: IQueryData | null, isOne: boolean): Promise<IModelRes>;

    /**
     * Вставка данных в БД
     * @param {QueryData} insertData - Данные для вставки
     * @returns {any}
     */
    insert(insertData: QueryData): any;

    /**
     * Обновление данных в БД
     * @param {QueryData} updateData - Данные для обновления
     * @returns {any}
     */
    update(updateData: QueryData): any;

    /**
     * Сохранение данных в БД
     * @param {QueryData} saveData - Данные для сохранения
     * @param {boolean} isNew - Флаг нового элемента
     * @returns {Promise<any>}
     */
    save(saveData: QueryData, isNew: boolean): Promise<any>;

    /**
     * Удаление данных из БД
     * @param {QueryData} removeData - Данные для удаления
     * @returns {any}
     */
    remove(removeData: QueryData): any;

    /**
     * Выполнение запроса к БД
     * @param {TQueryCb} callback - Функция обратного вызова для выполнения запроса
     * @returns {any}
     */
    query(callback: TQueryCb): any;

    /**
     * Выборка одного элемента из БД
     * @param {IQueryData | null} query - Данные запроса
     * @returns {Promise<IModelRes | null>}
     */
    selectOne(query: IQueryData | null): Promise<IModelRes | null>;

    /**
     * Экранирование строки
     * @param {string | number} str - Строка для экранирования
     * @returns {string}
     */
    escapeString(str: string | number): string;

    /**
     * Проверка подключения к БД
     * @returns {Promise<boolean>}
     */
    isConnected(): Promise<boolean>;

    /**
     * Уничтожение подключения к БД
     * @returns {void}
     */
    destroy(): void;
}
