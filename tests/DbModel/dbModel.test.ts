import {assert} from 'chai'
import {mmApp, UsersData} from "../../src";

interface IData {
    userId?: string;
    meta?: string;
    data?: any;
}

describe('Db file connect', () => {
    let data: any;
    const userData = new UsersData();

    beforeEach(() => {
        mmApp.params.utm_text = '';
        mmApp.config.json = __dirname;
        data = {
            userId1: {
                userId: 'userId1',
                meta: 'user meta 1',
                data: {
                    name: 'user 1'
                }
            },
            userId2: {
                userId: 'userId2',
                meta: 'user meta 2',
                data: {
                    name: 'user 2'
                }
            },
            userId3: {
                userId: 'userId3',
                meta: 'user meta 3',
                data: {
                    name: 'user 3'
                }
            },
            userId13: {
                userId: 'userId3',
                meta: 'user meta 1',
                data: {
                    name: 'user 3'
                }
            }
        };
        mmApp.saveJson('UsersData.json', data);
    });

    it('Where string', async () => {
        let query = '`userId`="userId1"';
        let uData = await userData.where(query);
        assert.isTrue(uData.length === 1);
        assert.deepStrictEqual(uData[0], data.userId1);

        query = '`userId`="userId3" AND `meta`="user meta 1"';
        uData = await userData.where(query);
        assert.isTrue(uData.length === 1);
        assert.deepStrictEqual(uData[0], data.userId13);

        query = '`meta`="user meta 1"';
        uData = await userData.where(query);
        assert.isTrue(uData.length === 2);
        assert.deepStrictEqual(uData[0], data.userId1);
        assert.deepStrictEqual(uData[1], data.userId13);

        query = '`userId`="NotFound"';
        assert.isTrue(await userData.where(query) === null);
    });
    it('Where object', async () => {
        let query: IData = {
            userId: 'userId1'
        };
        let uData = await userData.where(query);
        assert.isTrue(uData.length === 1);
        assert.deepStrictEqual(uData[0], data.userId1);

        query = {
            userId: 'userId3',
            meta: 'user meta 1'
        };
        uData = await userData.where(query);
        assert.isTrue(uData.length === 1);
        assert.deepStrictEqual(uData[0], data.userId13);

        query = {
            meta: 'user meta 1'
        };
        uData = await userData.where(query);
        assert.isTrue(uData.length === 2);
        assert.deepStrictEqual(uData[0], data.userId1);
        assert.deepStrictEqual(uData[1], data.userId13);

        query = {
            userId: 'NotFound'
        };
        assert.isTrue(await userData.where(query) === null);
    });

    it('Where one', async () => {
        let query = '`userId`="userId1"';
        assert.isTrue(await userData.whereOne(query));
        assert.deepStrictEqual(userData.data, data.userId1.data);

        query = '`userId`="userId3" AND `meta`="user meta 1"';
        assert.isTrue(await userData.whereOne(query));
        assert.deepStrictEqual(userData.data, data.userId13.data);

        query = '`userId`="NotFound"';
        assert.isFalse(await userData.whereOne(query));
    });
    it('Where one Object', async () => {
        let query: IData = {
            userId: 'userId1'
        };
        assert.isTrue(await userData.whereOne(query));
        assert.deepStrictEqual(userData.data, data.userId1.data);

        query = {
            userId: 'userId3',
            meta: 'user meta 1'
        };
        assert.isTrue(await userData.whereOne(query));
        assert.deepStrictEqual(userData.data, data.userId13.data);

        query = {
            userId: 'NotFound'
        };
        assert.isFalse(await userData.whereOne(query));
    });

    it('Delete data', async () => {
        let query = '`userId`="userId1"';
        userData.userId = 'userId1';
        assert.isTrue(await userData.remove());

        assert.isFalse(await userData.whereOne(query));
    });

    it('Update data', async () => {
        let query = '`meta`="meta"';
        assert.isFalse(await userData.whereOne(query));
        userData.userId = 'userId1';
        userData.meta = 'meta';
        assert.isTrue(await userData.update());

        assert.isTrue(await userData.whereOne(query));
    });

    it('Save data', async () => {
        let query = '`meta`="meta"';
        assert.isFalse(await userData.whereOne(query));
        userData.userId = 'userId5';
        userData.meta = 'meta';
        userData.data = {name: 'user 5'};
        assert.isTrue(await userData.save());

        assert.isTrue(await userData.whereOne(query));
        assert.isTrue(userData.userId === 'userId5');
        assert.deepStrictEqual(userData.data, {name: 'user 5'});
    });

    it('MongoDb Save data', async () => {
        mmApp.setIsSaveDb(true);
        mmApp.setConfig({
            db: {
                host: 'mongodb://127.0.0.1:27017/',
                database: 'test'
            }
        });
        const usersData = new UsersData();
        if (await usersData.isConnected()) {
            usersData.userId = 'test';
            usersData.type = UsersData.T_ALISA;
            usersData.data = {};
            usersData.meta = {};
            assert.isTrue(await usersData.save());
            assert.isTrue(await usersData.whereOne({userId: 'test'}));
            usersData.destroy();
        }
    });
    it('MongoDb Update data', async () => {
        mmApp.setIsSaveDb(true);
        mmApp.setConfig({
            db: {
                host: 'mongodb://127.0.0.1:27017/',
                database: 'test'
            }
        });
        const usersData = new UsersData();
        if (await usersData.isConnected()) {
            usersData.userId = 'test';
            usersData.type = UsersData.T_ALISA;
            usersData.data = 'data';
            usersData.meta = {};
            assert.isTrue(await usersData.save());
            assert.isTrue(await usersData.whereOne({data: 'data'}));
            usersData.destroy();
        }
    });
    it('MongoDb Remove data', async () => {
        mmApp.setIsSaveDb(true);
        mmApp.setConfig({
            db: {
                host: 'mongodb://127.0.0.1:27017/',
                database: 'test'
            }
        });
        const usersData = new UsersData();
        if (await usersData.isConnected()) {
            usersData.userId = 'test';
            usersData.type = UsersData.T_ALISA;
            usersData.data = 'data';
            usersData.meta = {};
            assert.isTrue(await usersData.remove());
            assert.isFalse(await usersData.whereOne({userId: 'test'}));
            usersData.destroy();
        }
    });
});
