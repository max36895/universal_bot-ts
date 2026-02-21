import { Base } from '../Base/Base';
import {
    IModelRes,
    TQueryCb,
    IQueryData,
    IQuery,
    Text,
    AppContext,
    IDatabaseInfo,
    IAppDB,
} from '../../../index';
import {
    MongoClient,
    MongoClientOptions,
    ServerApiVersion,
    Db,
    Document,
    Filter,
    OptionalId,
} from 'mongodb';

/**
 * Интерфейс для сохранения информации работы базы данных
 */
interface IMongoDbInfo extends IDatabaseInfo {
    /**
     * Клиент подключения
     */
    mongoClient: MongoClient | null;
    /**
     * Само подключение
     */
    mongoConnect: MongoClient | null;
}

/**
 * Адаптер для работы с базой данной mongodb
 */
export class Adapter extends Base<IMongoDbInfo> {
    /**
     * Формат базы данных
     */
    dbFormat: string = 'mongodb';

    constructor(options?: IAppDB) {
        super(options);
    }

    /**
     * Метод инициализации плагина.
     * Вызывается один раз при подключении через `bot.use()`.
     * @param appContext Контекст приложения
     */
    init(appContext: AppContext): void {
        if (this._dbOptions) {
            appContext.appConfig.db ??= { host: '', user: '', pass: '', database: '' };
            appContext.appConfig.db.options =
                this._dbOptions.options || appContext.appConfig.db?.options;
            appContext.appConfig.db.host = this._dbOptions.host || appContext.appConfig.db?.host;
            appContext.appConfig.db.user = this._dbOptions.user || appContext.appConfig.db?.user;
            appContext.appConfig.db.pass = this._dbOptions.pass || appContext.appConfig.db?.pass;
            appContext.appConfig.db.database =
                this._dbOptions.database || appContext.appConfig.db?.database;
        }
        super.init(appContext);
    }

    public async connect(): Promise<boolean> {
        const errors = [];
        let mongoClient: MongoClient | null = null;
        let mongoConnect: MongoClient | null = null;
        if (this._appContext.appConfig.db) {
            try {
                const options: MongoClientOptions = {
                    timeoutMS: 3000,
                    serverSelectionTimeoutMS: 2000, // Тайм-аут на выбор сервера
                    connectTimeoutMS: 2000,
                    socketTimeoutMS: 2000,
                    maxPoolSize: 1,
                    ...this._appContext.appConfig.db.options,
                    serverApi: {
                        version: ServerApiVersion.v1,
                        strict: true,
                        deprecationErrors: true,
                        ...(this._appContext.appConfig.db.options?.serverApi as object),
                    },
                };

                if (this._appContext.appConfig.db.user) {
                    options.auth = {
                        username: this._appContext.appConfig.db.user,
                        password: this._appContext.appConfig.db.pass,
                    };
                }

                mongoClient = new MongoClient(this._appContext.appConfig.db.host, options);
                const connect = async (): Promise<boolean> => {
                    if (!mongoClient) {
                        return false;
                    }
                    // Проверяем, есть ли активное соединение перед закрытием
                    await mongoClient.close(true);
                    mongoConnect = await mongoClient.connect();
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
                errors.push((err as Error).message);
                // mongoConnect = null;
                mongoClient = null;
                this._saveLog('При подключении в базе данных произошла ошибка:', err as Error);
                return false;
            }
        } else {
            errors.push('Отсутствуют данные для подключения!');
        }
        if (this._appContext.database.databaseInfo) {
            this._appContext.database.databaseInfo.mongoClient = mongoClient;
            this._appContext.database.databaseInfo.mongoConnect = mongoConnect;
        } else {
            this._appContext.database.databaseInfo = {
                mongoClient,
                mongoConnect,
            };
        }
        if (errors.length > 0) {
            this._saveLog(
                `При подключении в базе данных произошли следующие ошибки: ${JSON.stringify(errors)}`,
            );
            return false;
        }
        return true;
    }

    /**
     * Выполняет UPDATE-запрос.
     * @param updateData Дополнительная информация для запроса. Содержит сам запроса, а также название таблицы и прочие данные.
     */
    public async _update(updateData: IQuery): Promise<boolean> {
        let update = updateData.data;
        let select = updateData.query;
        if (this._appContext.database.databaseInfo) {
            update = this.validate(updateData, update);
            select = this.validate(updateData, select);
            if (updateData.primaryKeyName) {
                return !!(await this.query(async (_client, db: Db) => {
                    try {
                        const collection = db.collection(updateData.tableName);
                        const result = await collection.updateOne(select as Filter<Document>, {
                            $set: update as Document,
                        });
                        return {
                            status: true,
                            data: { modifiedCount: result.modifiedCount },
                        };
                    } catch (err) {
                        return {
                            status: false,
                            error: err as Error,
                        };
                    }
                }));
            }
        }
        return false;
    }

    /**
     * Выполняет INSERT-запрос.
     * @param insertData Дополнительная информация для запроса. Содержит сам запроса, а также название таблицы и прочие данные.
     */
    public async _insert(insertData: IQuery): Promise<boolean> {
        let insert = insertData.data;
        if (this._appContext.database.databaseInfo) {
            insert = this.validate(insertData, insert);
            if (insertData.primaryKeyName) {
                return !!(await this.query(async (_client, db: Db) => {
                    try {
                        const collection = db.collection(insertData.tableName);
                        const result = await collection.insertOne(insert as OptionalId<Document>);
                        return {
                            status: true,
                            data: { insertedId: result.insertedId },
                        };
                    } catch (err) {
                        return {
                            status: false,
                            error: err instanceof Error ? err : 'Unknown error',
                        };
                    }
                }));
            }
        }
        return false;
    }

    /**
     * Выполняет DELETE-запрос.
     * @param removeData Дополнительная информация для запроса. Содержит сам запроса, а также название таблицы и прочие данные.
     */
    public async _remove(removeData: IQuery): Promise<boolean> {
        let remove = removeData.query;
        if (this._appContext.database.databaseInfo) {
            remove = this.validate(removeData, remove);
            return !!(await this.query(async (_client: MongoClient, db: Db) => {
                try {
                    const collection = db.collection(removeData.tableName);
                    const result = await collection.deleteOne(remove as Filter<Document>);
                    return {
                        status: true,
                        data: { deletedCount: result.deletedCount },
                    };
                } catch (err) {
                    return {
                        status: false,
                        error: err instanceof Error ? err : 'Unknown error',
                    };
                }
            }));
        }
        return false;
    }

    /**
     * Выполняет произвольный запрос через callback.
     *
     * @param callback функция обработчик
     */
    public async _query(callback: TQueryCb<MongoClient, Db>): Promise<unknown | null> {
        const vDB = this._appContext.database.databaseInfo;
        try {
            if (vDB?.mongoConnect) {
                const client = vDB.mongoConnect;
                const db = client.db(this._appContext.appConfig.db?.database);
                const data: IModelRes | boolean = await callback(client, db);
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
            this._saveLog(err as string, err as Error);
            return null;
        }
    }

    /**
     * Выполняет произвольный запрос через callback.
     *
     * Внутри себя вызывает this._query, основное отличие в том, что в данном методе пишутся метрики.
     * @param callback функция обработчик
     */
    public async query(callback: TQueryCb<MongoClient, Db>): Promise<unknown | IModelRes> {
        return this._query(callback);
    }

    /**
     * Валидация запросов.
     * Валидирует запрос, приводя его к корректному виду
     * @param query
     * @param element
     */
    public validate(query: IQuery, element: IQueryData | null): IQueryData {
        if (!element) {
            return {};
        }
        const rules = query.rules;
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
                        if (rule.max !== undefined) {
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
     * Выполняет SELECT-запрос.
     * @param selectData Дополнительная информация для запроса. Содержит информацию о таблице и структуре.
     * @param where Сам запрос
     * @param isOne Определяет нужно ли вернуть только 1 найденную запись, либо отдать все доступные данные.
     */
    public async _select(
        selectData: IQuery,
        where: IQueryData | null,
        isOne: boolean = false,
    ): Promise<IModelRes> {
        if (this._appContext.database.databaseInfo) {
            return (await this.query(async (_client, db: Db) => {
                try {
                    const collection = db.collection(selectData.tableName);
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
                        data: results as IModelRes['data'],
                    };
                } catch (err) {
                    return {
                        status: false,
                        error: err as Error,
                    };
                }
            })) as IModelRes;
        }
        return {
            status: false,
            error: 'Не удалось получить данные',
        };
    }

    /**
     * Проверяет, установлено ли соединение с БД.
     */
    public async isConnected(): Promise<boolean> {
        if (!this._appContext.database.databaseInfo) {
            return false;
        }
        try {
            if (!this._appContext.database.databaseInfo.mongoClient) {
                return false;
            }
            // Пингуем базу данных для проверки подключения
            await this._appContext.database.databaseInfo.mongoClient.db().admin().ping();
            return true;
        } catch (err) {
            this._appContext.logError((err as Error).message, {
                error: err,
            });
            return false;
        }
    }

    /**
     * Сохранение логов
     * @param errorMsg
     * @param error
     * @protected
     */
    protected _saveLog(errorMsg: string, error?: Error): void {
        this._appContext?.logError(`MongoDB: ${errorMsg}`, {
            error,
        });
    }

    /**
     * Закрывает все подключения к БД.
     * Все процессы завершаются, и происходит сохранение данных.
     */
    public async destroy(): Promise<void> {
        return this.close('');
    }

    /**
     * Закрывает подключение к определенной таблице.
     * В MongoDB нет концепции "закрытия таблицы". Метод close() закрывает всё соединение с базой.
     * @param tableName
     */
    public async close(tableName: string): Promise<void> {
        super.close(tableName);
        if (this._appContext.database.databaseInfo) {
            try {
                await (this._appContext.database.databaseInfo.mongoClient as MongoClient).close();
                this._appContext.database.databaseInfo.mongoConnect = null;
                this._appContext.database.databaseInfo.mongoClient = null;
            } catch (err) {
                this._appContext.logError((err as Error).message, {
                    error: err,
                });
            }
        }
    }
}
