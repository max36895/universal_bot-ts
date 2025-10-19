/**
 * Модуль для работы с базой данных MongoDB
 *
 * Предоставляет функционал для:
 * - Управления подключением к базе данных
 * - Выполнения запросов
 * - Обработки ошибок и логирования
 *
 * @module models/db/Sql
 */

import { DB } from './DB';
import { IModelRes, TQueryCb } from '../interface';
import { AppContext } from '../../core/AppContext';

/**
 * Класс для работы с базой данных MongoDB
 * Предоставляет методы для управления подключением и выполнения запросов
 *
 * @example
 * ```typescript
 * const sql = new Sql();
 *
 * // Инициализация подключения
 * await sql.standardInit();
 *
 * // Выполнение запроса
 * const result = await sql.query(async (client, db) => {
 *   const collection = db.collection('users');
 *   const users = await collection.find({}).toArray();
 *   return { status: true, data: users };
 * });
 *
 * // Закрытие подключения
 * sql.close();
 * ```
 *
 * @class Sql
 */
export class Sql {
    /**
     * Адрес сервера базы данных
     *
     * @example
     * ```typescript
     * sql.host = 'mongodb://localhost:27017';
     * ```
     */
    public host: string | null = null;

    /**
     * Имя пользователя для аутентификации
     *
     * @example
     * ```typescript
     * sql.user = 'admin';
     * ```
     */
    public user: string | null = null;

    /**
     * Пароль пользователя для аутентификации
     *
     * @example
     * ```typescript
     * sql.pass = 'password';
     * ```
     */
    public pass: string | null = null;

    /**
     * Имя базы данных
     *
     * @example
     * ```typescript
     * sql.database = 'myapp';
     * ```
     */
    public database: string | null = null;

    /**
     * Контекст приложения
     */
    public appContext: AppContext | undefined;

    /**
     * Внутренний объект для работы с базой данных
     */
    private _vDB: DB | undefined;

    /**
     * Создает новый экземпляр класса Sql
     * Инициализирует подключение к базе данных
     *
     * @example
     * ```typescript
     * const sql = new Sql();
     * ```
     */
    public constructor(appContext?: AppContext) {
        this._vDB = appContext?.vDB;
        this.appContext = appContext;
        this.standardInit();
    }

    /**
     * Инициализирует подключение к базе данных из конфигурации
     * Загружает параметры подключения из appContext.config.db
     *
     * @example
     * ```typescript
     * const initialized = await sql.standardInit();
     * if (initialized) {
     *   console.log('Database connection initialized');
     * }
     * ```
     *
     * @returns Promise<boolean> - true если инициализация успешна, false в противном случае
     */
    public async standardInit(): Promise<boolean> {
        if (typeof this.appContext?.appConfig.db !== 'undefined' && this.appContext?.appConfig.db) {
            const config = this.appContext?.appConfig.db;
            if (config.host && config.database) {
                this.initParam(config.host, config.user || '', config.pass || '', config.database);
            } else {
                this._saveLog(
                    'Sql.standardInit(): Не переданы настройки для подключения к Базе Данных!',
                );
                return false;
            }
            try {
                return await this.connect();
            } catch (exception) {
                this._saveLog(`Ошибка при инициализации БД.\n${exception}`);
            }
        }
        return false;
    }

    /**
     * Устанавливает параметры подключения к базе данных
     *
     * @example
     * ```typescript
     * sql.initParam(
     *   'mongodb://localhost:27017',
     *   'admin',
     *   'password',
     *   'myapp'
     * );
     * ```
     *
     * @param host - Адрес сервера базы данных
     * @param user - Имя пользователя
     * @param pass - Пароль пользователя
     * @param database - Имя базы данных
     */
    public initParam(host: string, user: string, pass: string, database: string): void {
        this.host = host;
        this.user = user;
        this.pass = pass;
        this.database = database;
        if (this._vDB) {
            this._vDB.params = {
                host: this.host,
                user: this.user,
                pass: this.pass,
                database: this.database,
            };
        }
    }

    /**
     * Устанавливает соединение с базой данных
     *
     * @example
     * ```typescript
     * const connected = await sql.connect();
     * if (connected) {
     *   console.log('Connected to database');
     * }
     * ```
     *
     * @returns Promise<boolean> - true если подключение успешно, false в противном случае
     */
    public async connect(): Promise<boolean> {
        if (this._vDB && !(await this._vDB.connect())) {
            this._saveLog(`Sql:connect() - Ошибка при подключении к БД.\n${this._vDB.errors[0]}`);
            return false;
        }
        return true;
    }

    /**
     * Проверяет состояние подключения к базе данных
     *
     * @example
     * ```typescript
     * const isAlive = await sql.isConnected();
     * if (isAlive) {
     *   console.log('Database connection is active');
     * }
     * ```
     *
     * @returns Promise<boolean> - true если подключение активно, false в противном случае
     */
    public async isConnected(): Promise<boolean> {
        try {
            if (this._vDB && this._vDB.dbConnect) {
                const client = await this._vDB.dbConnect;
                await client.db().admin().ping();
                return true;
            }
            return false;
        } catch (е) {
            this.appContext?.saveLog('sql.log', `Sql.isConnected(): ${е}`);
            return false;
        }
    }

    /**
     * Закрывает соединение с базой данных
     * Освобождает ресурсы и очищает состояние подключения
     *
     * @example
     * ```typescript
     * sql.close();
     * console.log('Database connection closed');
     * ```
     */
    public close(): void {
        if (this._vDB) {
            this._vDB.destroy();
            this.appContext?.closeDB();
            this._vDB = undefined;
        }
    }

    /**
     * Экранирует специальные символы в строке
     * В текущей реализации просто преобразует значение в строку
     *
     * @example
     * ```typescript
     * const safe = sql.escapeString("O'Connor");
     * console.log(safe); // "O'Connor"
     * ```
     *
     * @param text - Текст для экранирования
     * @returns Экранированная строка
     */
    public escapeString(text: string | number): string {
        return text + '';
    }

    /**
     * Выполняет произвольный запрос к базе данных
     *
     * @example
     * ```typescript
     * const result = await sql.query(async (client, db) => {
     *   const collection = db.collection('users');
     *   const users = await collection.find({}).toArray();
     *   return { status: true, data: users };
     * });
     *
     * if (result) {
     *   console.log('Query result:', result);
     * }
     * ```
     *
     * @param callback - Функция обратного вызова для выполнения запроса
     * @returns Promise с результатом запроса или null в случае ошибки
     */
    public async query(callback: TQueryCb): Promise<any> {
        try {
            if (this._vDB && this._vDB.dbConnect) {
                const client = await this._vDB.dbConnect;
                const db = client.db(this._vDB.params?.database);
                const data: IModelRes = await callback(client, db);
                if (data.status) {
                    return data.data;
                }
                this._saveLog(data.error + '');
                return null;
            } else {
                this._saveLog('Не удалось выполнить запрос.');
                return null;
            }
        } catch (err) {
            this._saveLog(err as string);
            if (this._vDB) {
                this._vDB.dbConnect = null;
            }
            return null;
        }
    }

    /**
     * Сохраняет сообщения об ошибках в лог-файл
     *
     * @param errorMsg - Текст ошибки для сохранения
     * @returns boolean - true если сообщение успешно сохранено, false в противном случае
     * @private
     */
    protected _saveLog(errorMsg: string): boolean {
        if (this.appContext?.saveLog('sql.log', errorMsg)) {
            return true;
        }
        this.appContext?.logWarn('Sql.connect(): Не удалось создать/открыть файл!');
        return false;
    }
}
