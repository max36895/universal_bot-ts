import { AppContext, UsersData, isFile, unlink } from '../../src';

import { FileAdapter, MongoAdapter, T_ALISA } from '../../src/plugins';

interface IData {
    userId?: string;
    meta?: string;
    data?: Record<string, unknown>;
}

const FILE_NAME = 'UsersData.json';
const MONGO_TIMEOUT = 3000; // 3 секунды для операций с MongoDB
const appContext = new AppContext();

describe('Db file connect', () => {
    let data: Record<string, Record<string, unknown>>;
    const userData = new UsersData(appContext);

    beforeEach(() => {
        const fileAdapter = new FileAdapter();
        fileAdapter.init(appContext);
        appContext.platformParams.utm_text = '';
        appContext.appConfig.json = __dirname;
        data = {
            userId1: {
                userId: 'userId1',
                meta: 'user meta 1',
                data: {
                    name: 'user 1',
                },
            },
            userId2: {
                userId: 'userId2',
                meta: 'user meta 2',
                data: {
                    name: 'user 2',
                },
            },
            userId3: {
                userId: 'userId3',
                meta: 'user meta 3',
                data: {
                    name: 'user 3',
                },
            },
            userId13: {
                userId: 'userId13',
                meta: 'user meta 1',
                data: {
                    name: 'user 3',
                },
            },
        };
        appContext.saveFileData(FILE_NAME, data);
    });
    afterEach(() => {
        userData.destroy();
    });

    it('Where string', async () => {
        let query = '`userId`="userId1"';
        let uData = (await userData.where(query)).data as Record<string, unknown>[];
        expect(uData.length === 1).toBe(true);
        expect(uData[0]).toEqual(data.userId1);

        query = '`userId`="userId13" AND `meta`="user meta 1"';
        uData = (await userData.where(query)).data as Record<string, unknown>[];
        expect(uData.length === 1).toBe(true);
        expect(uData[0]).toEqual(data.userId13);

        query = '`meta`="user meta 1"';
        uData = (await userData.where(query)).data as Record<string, unknown>[];
        expect(uData.length === 2).toBe(true);
        expect(uData[0]).toEqual(data.userId1);
        expect(uData[1]).toEqual(data.userId13);

        query = '`userId`="NotFound"';
        expect((await userData.where(query)).status).toBe(false);
    });
    it('Where object', async () => {
        let query: IData = {
            userId: 'userId1',
        };
        let uData = (await userData.where(query)).data as Record<string, unknown>[];
        expect(uData.length === 1).toBe(true);
        expect(uData[0]).toEqual(data.userId1);

        query = {
            userId: 'userId13',
            meta: 'user meta 1',
        };
        uData = (await userData.where(query)).data as Record<string, unknown>[];
        expect(uData.length === 1).toBe(true);
        expect(uData[0]).toEqual(data.userId13);

        query = {
            meta: 'user meta 1',
        };
        uData = (await userData.where(query)).data as Record<string, unknown>[];
        expect(uData.length === 2).toBe(true);
        expect(uData[0]).toEqual(data.userId1);
        expect(uData[1]).toEqual(data.userId13);

        query = {
            userId: 'NotFound',
        };
        expect((await userData.where(query)).status === false).toBe(true);
    });

    it('Where one', async () => {
        let query = '`userId`="userId1"';
        expect(await userData.whereOne(query)).toBe(true);
        expect(userData.data).toEqual(data.userId1.data);

        query = '`userId`="userId13" AND `meta`="user meta 1"';
        expect(await userData.whereOne(query)).toBe(true);
        expect(userData.data).toEqual(data.userId13.data);

        query = '`userId`="NotFound"';
        expect(await userData.whereOne(query)).toBe(false);
    });
    it('Where one Object', async () => {
        let query: IData = {
            userId: 'userId1',
        };
        expect(await userData.whereOne(query)).toBe(true);
        expect(userData.data).toEqual(data.userId1.data);

        query = {
            userId: 'userId13',
            meta: 'user meta 1',
        };
        expect(await userData.whereOne(query)).toBe(true);
        expect(userData.data).toEqual(data.userId13.data);

        query = {
            userId: 'NotFound',
        };
        expect(await userData.whereOne(query)).toBe(false);
    });

    it('Delete data', async () => {
        const query = '`userId`="userId1"';
        userData.userId = 'userId1';
        expect(await userData.remove()).toBe(true);

        expect(await userData.whereOne(query)).toBe(false);
    });

    it('Update data', async () => {
        const query = '`meta`="meta"';
        expect(await userData.whereOne(query)).toBe(false);
        userData.userId = 'userId1';
        userData.meta = 'meta';
        expect(await userData.update()).toBe(true);

        expect(await userData.whereOne(query)).toBe(true);
    });

    it('Save data', async () => {
        const query = '`meta`="meta"';
        expect(await userData.whereOne(query)).toBe(false);
        userData.userId = 'userId5';
        userData.meta = 'meta';
        userData.data = { name: 'user 5' };
        expect(await userData.save()).toBe(true);
        expect(await userData.whereOne(query)).toBe(true);
        expect(userData.userId === 'userId5').toBe(true);
        expect(userData.data).toEqual({ name: 'user 5' });
    });

    it('Delete file db', () => {
        expect(isFile(__dirname + '/' + FILE_NAME)).toBe(true);
        unlink(__dirname + '/' + FILE_NAME);
        expect(isFile(__dirname + '/' + FILE_NAME)).toBe(false);
    });
});

describe('Db is MongoDb', () => {
    let usersData: UsersData;
    let isConnected: boolean;

    beforeEach(async () => {
        const mongoAdapter = new MongoAdapter();
        mongoAdapter.init(appContext);
        //appContext.setIsSaveDb(true);
        appContext.setAppConfig({
            db: {
                host: 'mongodb://127.0.0.1:27017/',
                database: 'test',
                options: {
                    timeoutMS: 1000,
                    serverSelectionTimeoutMS: 500, // Таймаут на выбор сервера
                    connectTimeoutMS: 500,
                    socketTimeoutMS: 500,
                },
            },
            tokens: {},
        });
        appContext.setLogger({
            error: () => {
                // если подключения к бд нет, то не нужно писать ошибки в лог
            },
        });
        usersData = new UsersData(appContext);
    }, MONGO_TIMEOUT);

    afterEach(async () => {
        if (usersData) {
            await usersData.destroy();
        }
        appContext.setAppConfig({ db: undefined, tokens: {} });
        //appContext.setIsSaveDb(false);
    }, MONGO_TIMEOUT);

    it(
        'Should handle MongoDB connection',
        async () => {
            const isCon = isConnected ?? (await usersData.isConnected());
            // Если БД недоступна, пропускаем тест
            if (isCon) {
                expect(isCon).toBe(true);
            } else {
                isConnected = false;
            }
        },
        MONGO_TIMEOUT,
    );

    it(
        'MongoDb Save data',
        async () => {
            const isCon = isConnected ?? (await usersData.isConnected());
            // Если БД недоступна, пропускаем тест
            if (isCon) {
                usersData.userId = 'test';
                usersData.platform = T_ALISA;
                usersData.data = {};
                usersData.meta = {};

                expect(await usersData.save()).toBe(true);
                expect(await usersData.whereOne({ userId: 'test' })).toBe(true);
            } else {
                isConnected = false;
            }
        },
        MONGO_TIMEOUT,
    );

    it(
        'MongoDb Update data',
        async () => {
            const isCon = isConnected ?? (await usersData.isConnected());
            // Если БД недоступна, пропускаем тест
            if (isCon) {
                usersData.userId = 'test';
                usersData.platform = T_ALISA;
                usersData.data = 'data';
                usersData.meta = {};

                expect(await usersData.save()).toBe(true);
                expect(await usersData.whereOne({ data: 'data' })).toBe(true);
            } else {
                isConnected = false;
            }
        },
        MONGO_TIMEOUT,
    );

    it(
        'MongoDb Remove data',
        async () => {
            const isCon = isConnected ?? (await usersData.isConnected());
            // Если БД недоступна, пропускаем тест
            if (isCon) {
                usersData.userId = 'test';
                usersData.platform = T_ALISA;
                usersData.data = 'data';
                usersData.meta = {};

                expect(await usersData.remove()).toBe(true);
                expect(await usersData.whereOne({ userId: 'test' })).toBe(false);
            } else {
                isConnected = false;
            }
        },
        MONGO_TIMEOUT,
    );
});
