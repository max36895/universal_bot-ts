/**
 * Модуль для работы с подключением к базе данных MongoDB
 *
 * Предоставляет функционал для:
 * - Установки и управления соединением с MongoDB
 * - Конфигурации параметров подключения
 * - Обработки ошибок при работе с базой данных
 *
 * @module models/db/DB
 */

import { MongoClient, MongoClientOptions, ServerApiVersion } from 'mongodb';
import { AppContext, IAppDB } from '../../core/AppContext';

/**
 * Класс для управления подключением к базе данных MongoDB
 *
 * @example
 * ```typescript
 * const db = new DB();
 *
 * // Настройка параметров подключения
 * db.params = {
 *   host: 'mongodb://localhost:27017',
 *   user: 'admin',
 *   pass: 'password',
 *   database: 'myapp'
 * };
 *
 * // Подключение к базе данных
 * const connected = await db.connect();
 * if (connected) {
 *   // Выполнение операций с базой данных
 *   const isAlive = await db.isConnected();
 *   console.log('Database connection is alive:', isAlive);
 * }
 *
 * // Закрытие соединения
 * await db.close();
 * ```
 *
 * @class DB
 */
export class DB {
    /**
     * Клиент MongoDB для выполнения запросов
     * Используется для установки соединения и выполнения операций с базой данных
     *
     * @example
     * ```typescript
     * if (db.sql) {
     *   const collection = db.sql.db().collection('users');
     *   const users = await collection.find({}).toArray();
     * }
     * ```
     */
    public sql: MongoClient | null;

    /**
     * Promise для отслеживания процесса подключения
     * Позволяет дождаться завершения установки соединения
     *
     * @example
     * ```typescript
     * if (db.dbConnect) {
     *   await db.dbConnect; // Ожидание завершения подключения
     * }
     * ```
     */
    public dbConnect: Promise<MongoClient> | null;

    /**
     * Массив ошибок, возникших при работе с базой данных.
     * Содержит сообщения об ошибках подключения и выполнения запросов
     *
     * @example
     * ```typescript
     * if (db.errors.length > 0) {
     *   console.error('Database errors:', db.errors);
     * }
     * ```
     */
    public errors: string[];

    /**
     * Параметры конфигурации подключения к базе данных
     *
     * @example
     * ```typescript
     * db.params = {
     *   host: 'mongodb://localhost:27017', // Адрес сервера
     *   user: 'admin',                     // Имя пользователя
     *   pass: 'password',                  // Пароль
     *   database: 'myapp'                  // Имя базы данных
     * };
     * ```
     */
    public params: IAppDB | null;

    /**
     * Контекст приложения
     * @protected
     */
    protected appContext: AppContext | undefined;

    /**
     * Создает новый экземпляр класса DB.
     * Инициализирует все необходимые свойства
     */
    public constructor(appContext?: AppContext) {
        this.sql = null;
        this.errors = [];
        this.params = null;
        this.dbConnect = null;
        this.appContext = appContext;
    }

    /**
     * Проверяет активность подключения к базе данных
     * Выполняет ping-запрос к серверу для проверки соединения
     *
     * @example
     * ```typescript
     * const isAlive = await db.isConnected();
     * if (isAlive) {
     *   console.log('Database connection is active');
     * } else {
     *   console.error('Database connection is lost');
     * }
     * ```
     *
     * @returns Promise<boolean> - true если соединение активно, false в противном случае
     */
    public async isConnected(): Promise<boolean> {
        try {
            if (!this.sql) {
                return false;
            }
            // Пингуем базу данных для проверки подключения
            await this.sql.db().admin().ping();
            return true;
        } catch (err) {
            this.errors.push((err as Error).message);
            return false;
        }
    }

    /**
     * Устанавливает соединение с базой данных MongoDB
     * Настраивает параметры подключения и создает клиент
     *
     * @example
     * ```typescript
     * const connected = await db.connect();
     * if (connected) {
     *   console.log('Successfully connected to database');
     * } else {
     *   console.error('Failed to connect:', db.errors);
     * }
     * ```
     *
     * @returns Promise<boolean> - true если подключение успешно установлено, false в противном случае
     */
    public async connect(): Promise<boolean> {
        this.errors = [];
        if (this.params) {
            await this.close();
            try {
                const options: MongoClientOptions = {
                    timeoutMS: 3000,
                    serverSelectionTimeoutMS: 2000, // Таймаут на выбор сервера
                    connectTimeoutMS: 2000,
                    socketTimeoutMS: 2000,
                    maxPoolSize: 1,
                    ...this.appContext?.appConfig.db?.options,
                    serverApi: {
                        version: ServerApiVersion.v1,
                        strict: true,
                        deprecationErrors: true,
                        ...(this.appContext?.appConfig.db?.options?.serverApi as object),
                    },
                };

                if (this.params.user) {
                    options.auth = {
                        username: this.params.user,
                        password: this.params.pass,
                    };
                }

                this.sql = new MongoClient(this.params.host, options);

                const connect = async (): Promise<boolean> => {
                    if (!this.sql) {
                        return false;
                    }
                    this.dbConnect = this.sql.connect();
                    await this.dbConnect;

                    // Проверяем подключение сразу после установки
                    return await this.isConnected();
                };

                if (!(await connect())) {
                    await new Promise((resolve) => {
                        setTimeout(resolve, 2000);
                    });
                    if (!(await connect())) {
                        throw new Error('Failed to verify database connection');
                    }
                }

                return true;
            } catch (err) {
                this.errors.push((err as Error).message);
                this.dbConnect = null;
                this.sql = null;
                return false;
            }
        } else {
            this.errors.push('Отсутствуют данные для подключения!');
        }
        return false;
    }

    /**
     * Закрывает активное соединение с базой данных
     * Освобождает ресурсы и очищает состояние подключения
     *
     * @example
     * ```typescript
     * await db.close();
     * console.log('Database connection closed');
     * ```
     */
    public async close(): Promise<void> {
        if (this.sql) {
            try {
                await this.sql.close();
            } catch (err) {
                this.errors.push((err as Error).message);
            }
            this.sql = null;
            this.dbConnect = null;
        }
    }

    /**
     * Алиас для метода close().
     * Используется для унификации интерфейса с другими компонентами
     *
     * @example
     * ```typescript
     * await db.destroy();
     * ```
     */
    public async destroy(): Promise<void> {
        await this.close();
    }
}
