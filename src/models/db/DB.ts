import { IAppDB, mmApp } from '../../mmApp';
import { MongoClient, MongoClientOptions, ServerApiVersion } from 'mongodb';

/**
 * Класс отвечающий за подключение и взаимодействие с Базой Данных
 * @class DB
 */
export class DB {
    /**
     * Позволяет установить соединение с MongoDB.
     * От него идет подключение к бд, и выполнение запросов.
     */
    public sql: MongoClient | null;
    /**
     * Подключение к базе данных
     */
    public dbConnect: Promise<MongoClient> | null;
    /**
     * Ошибки при выполнении запросов
     */
    public errors: string[];
    /**
     * Параметры для конфигурации. имеют следующие поля:
     * [
     *  - string host:  Местоположение базы данных
     *  - string user Имя пользователя
     *  - string pass Пароль пользователя
     *  - string database Название базы данных
     * ]
     */
    public params: IAppDB | null;

    /**
     * DB constructor.
     */
    public constructor() {
        this.sql = null;
        this.errors = [];
        this.params = null;
        this.dbConnect = null;
    }

    /**
     * Проверка активности подключения к базе данных
     * @returns Promise<boolean>
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
     * Подключение к базе данных.
     *
     * @return boolean
     */
    public async connect(): Promise<boolean> {
        this.errors = [];
        if (this.params) {
            this.close();
            try {
                const options: MongoClientOptions = {
                    timeoutMS: 3000,
                    serverSelectionTimeoutMS: 2000, // Таймаут на выбор сервера
                    connectTimeoutMS: 2000,
                    socketTimeoutMS: 2000,
                    maxPoolSize: 1,
                    ...mmApp.config.db?.options,
                    serverApi: {
                        version: ServerApiVersion.v1,
                        strict: true,
                        deprecationErrors: true,
                        ...(mmApp.config.db?.options?.serverApi as object),
                    },
                };

                if (this.params.user) {
                    options.auth = {
                        username: this.params.user,
                        password: this.params.pass,
                    };
                }

                this.sql = new MongoClient(this.params.host, options);
                this.dbConnect = this.sql.connect();
                await this.dbConnect;

                // Проверяем подключение сразу после установки
                const isConnected = await this.isConnected();
                if (!isConnected) {
                    throw new Error('Failed to verify database connection');
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
     * Закрытие подключения к базе данных.
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
     * Закрываем подключение к БД
     */
    public async destroy(): Promise<void> {
        await this.close();
    }
}
