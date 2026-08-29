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
import type { MongoClient, MongoClientOptions, Db, Document, Filter, OptionalId } from 'mongodb';

/**
 * Тип модуля mongodb, получаемого через ленивую загрузку (`import('mongodb')`).
 */
type TMongoModule = typeof import('mongodb');

/**
 * Интерфейс для сохранения информации работы базы данных
 */
export interface IMongoDbInfo extends IDatabaseInfo {
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
 * Адаптер для работы с базой данных mongodb
 */
export class MongoAdapter extends Base<IMongoDbInfo> {
    /**
     * Формат базы данных
     */
    dbFormat: string = 'mongodb';

    constructor(options?: IAppDB) {
        super(options);
    }

    /**
     * Кэш лениво загруженного модуля mongodb.
     * Загружается только при реальном подключении, чтобы пользователи,
     * которым Mongo не нужен, не обязаны были его устанавливать.
     */
    #mongoModule: TMongoModule | null = null;

    /**
     * Лениво загружает модуль mongodb (один раз) и кэширует его.
     *
     * `mongodb` объявлен как опциональная peer-зависимость: он нужен только тем,
     * кто реально использует `MongoAdapter`. Статический `import` в шапке файла
     * заставил бы Node требовать пакет у всех, кто импортирует `umbot/plugins`,
     * даже при использовании только `FileAdapter`. Поэтому модуль подгружается
     * динамически в момент первого подключения.
     *
     * @returns Загруженный модуль mongodb
     * @throws Если пакет не установлен — понятная ошибка с инструкцией по установке
     * @protected
     */
    protected async _loadMongo(): Promise<TMongoModule> {
        if (this.#mongoModule) {
            return this.#mongoModule;
        }
        try {
            this.#mongoModule = await import('mongodb');
            return this.#mongoModule;
        } catch (err) {
            throw new Error(
                'MongoAdapter: пакет "mongodb" не установлен. Он является опциональной ' +
                    'peer-зависимостью umbot. Установите его командой: npm install mongodb. ' +
                    `Исходная ошибка: ${(err as Error).message}`,
                { cause: err },
            );
        }
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

    /**
     * Формирует опции подключения к MongoDB из конфига приложения.
     * @param mongo Лениво загруженный модуль mongodb
     * @returns Опции клиента MongoDB
     * @protected
     */
    protected _buildConnectOptions(mongo: TMongoModule): MongoClientOptions {
        const dbConfig = this._appContext.appConfig.db!;
        const options: MongoClientOptions = {
            timeoutMS: 3000,
            serverSelectionTimeoutMS: 2000,
            connectTimeoutMS: 2000,
            socketTimeoutMS: 2000,
            maxPoolSize: 50,
            ...dbConfig.options,
            serverApi: {
                version: mongo.ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
                ...(dbConfig.options?.serverApi as object),
            },
        };

        if (dbConfig.user) {
            options.auth = {
                username: dbConfig.user,
                password: dbConfig.pass,
            };
        }
        return options;
    }

    /**
     * Закрывает предыдущее соединение, если оно было сохранено в databaseInfo.
     * Это предотвращает утечку соединений при повторных вызовах connect().
     * @protected
     */
    protected async _closePreviousClient(): Promise<void> {
        const databaseInfo = this._appContext.database.databaseInfo;
        const oldClient = databaseInfo?.mongoClient;
        if (oldClient) {
            await oldClient.close(true).catch(() => {});
            if (databaseInfo) {
                databaseInfo.mongoClient = null;
                databaseInfo.mongoConnect = null;
            }
        }
    }

    /**
     * Выполняет до двух попыток подключения с проверкой живучести соединения.
     * Каждая попытка создаёт НОВЫЙ клиент — после неудачного connect() MongoClient
     * переходит в состояние "closed" и его нельзя переиспользовать.
     * @param mongo Лениво загруженный модуль mongodb
     * @param options Опции подключения
     * @returns Пара {client, connect} при успехе
     * @throws Последняя ошибка, если все попытки провалились
     * @protected
     */
    protected async _attemptConnect(
        mongo: TMongoModule,
        options: MongoClientOptions,
    ): Promise<{ client: MongoClient; connect: MongoClient }> {
        let lastError: Error | null = null;
        for (let tryNum = 0; tryNum < 2; tryNum++) {
            const client = new mongo.MongoClient(this._appContext.appConfig.db!.host, options);
            try {
                const connected = await client.connect();
                // Проверяем подключение сразу после установки
                if (await this.isConnectedWith(client)) {
                    return { client, connect: connected };
                }
                // Соединение видимо "мёртвое" — пробуем ещё раз
                lastError = new Error('Failed to verify database connection');
                await client.close(true).catch(() => {});
            } catch (e) {
                lastError = e as Error;
                await client.close(true).catch(() => {});
                if (tryNum === 0) {
                    // Небольшая пауза перед повторной попыткой
                    await new Promise((resolve) => {
                        setTimeout(resolve, 2000).unref();
                    });
                }
            }
        }
        throw lastError ?? new Error('Failed to connect to MongoDB');
    }

    /**
     * Подключается к MongoDB.
     *
     * Поведение:
     * - При неудачном connect() или «мёртвом» соединении создаёт новый MongoClient
     *   и выполняет до двух попыток подключения.
     * - Живучесть соединения проверяется ping-командой (`isConnectedWith`).
     * - При ошибке пишет причину в error_log и возвращает `false`.
     *
     * @returns `true` — подключение активно, `false` — ошибка подключения.
     */
    public async connect(): Promise<boolean> {
        if (!this._appContext.appConfig.db) {
            this._saveLog(
                'При подключении в базе данных произошли следующие ошибки: ["Отсутствуют данные для подключения!"]',
            );
            return false;
        }
        try {
            const mongo = await this._loadMongo();
            const options = this._buildConnectOptions(mongo);
            await this._closePreviousClient();
            const { client, connect } = await this._attemptConnect(mongo, options);
            if (this._appContext.database.databaseInfo) {
                this._appContext.database.databaseInfo.mongoClient = client;
                this._appContext.database.databaseInfo.mongoConnect = connect;
            } else {
                this._appContext.database.databaseInfo = {
                    mongoClient: client,
                    mongoConnect: connect,
                };
            }
            return true;
        } catch (err) {
            this._saveLog('При подключении в базе данных произошла ошибка:', err as Error);
            return false;
        }
    }

    /**
     * Проверяет, установлено ли соединение, для конкретного клиента.
     *
     * @param client Клиент, у которого проверяем соединение
     */
    protected async isConnectedWith(client: MongoClient): Promise<boolean> {
        try {
            await client.db().command({ ping: 1 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Выполняет UPDATE-запрос.
     * @param updateData Дополнительная информация для запроса. Содержит сам запрос, а также название таблицы и прочие данные.
     */
    public async _update(updateData: IQuery): Promise<boolean> {
        let update = updateData.data;
        let select = updateData.query;
        if (this._appContext.database.databaseInfo) {
            update = this.validate(updateData, update);
            select = this.validate(updateData, select);
            // Удаляем ключи со значением undefined — иначе Mongo запишет BSON-undefined и затирает поле.
            if (update && typeof update === 'object') {
                update = Object.fromEntries(
                    Object.entries(update as Record<string, unknown>).filter(
                        ([, v]) => v !== undefined,
                    ),
                ) as IQueryData;
            }
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
     * @param insertData Дополнительная информация для запроса. Содержит сам запрос, а также название таблицы и прочие данные.
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
     * @param removeData Дополнительная информация для запроса. Содержит сам запрос, а также название таблицы и прочие данные.
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
     * Выполняет this._query напрямую. Метрики времени выполнения не записываются (в отличие от select/insert/update/remove).
     * @param callback функция обработчик
     */
    public async query(callback: TQueryCb<MongoClient, Db>): Promise<unknown | IModelRes> {
        return this._query(callback);
    }

    /**
     * Валидация запросов.
     * Валидирует запрос, приводя его к корректному виду
     * @param {IQuery} query - Запрос для валидации
     * @param {IQueryData | null} element - Элемент данных
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
                    if (element[data] === undefined || element[data] === null) {
                        return;
                    }
                    if (type === 'string') {
                        if (rule.max !== undefined) {
                            element[data] = Text.resize(element[data] as string, rule.max);
                        }
                        element[data] = this.escapeString(element[data] as string);
                    } else {
                        element[data] = +(element[data] as number);
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
            await this._appContext.database.databaseInfo.mongoClient.db().command({ ping: 1 });
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
     * @param errorMsg Текст ошибки
     * @param error Объект ошибки (опционально)
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
     * @param {string} tableName - Имя таблицы
     */
    public async close(tableName: string): Promise<void> {
        await super.close(tableName);
        const dbInfo = this._appContext.database.databaseInfo;
        if (dbInfo?.mongoClient) {
            try {
                await dbInfo.mongoClient.close();
                dbInfo.mongoConnect = null;
                dbInfo.mongoClient = null;
            } catch (err) {
                this._appContext.logError((err as Error).message, {
                    error: err,
                });
            }
        }
    }
}
