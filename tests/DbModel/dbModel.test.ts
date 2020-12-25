import {assert} from 'chai'
import {mmApp} from "../../src/core/mmApp";
import {UsersData} from "../../src/models/UsersData";

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

    it('Where', () => {
        let query = '`userId`="userId1"';
        let uData = userData.where(query);
        assert.isTrue(uData.length === 1);
        assert.deepEqual(uData[0], data.userId1);

        query = '`userId`="userId3" AND `meta`="user meta 1"';
        uData = userData.where(query);
        assert.isTrue(uData.length === 1);
        assert.deepEqual(uData[0], data.userId13);

        query = '`meta`="user meta 1"';
        uData = userData.where(query);
        assert.isTrue(uData.length === 2);
        assert.deepEqual(uData[0], data.userId1);
        assert.deepEqual(uData[1], data.userId13);

        query = '`userId`="NotFound"';
        assert.isTrue(userData.where(query) === null);
    });

    it('Where one', () => {
        let query = '`userId`="userId1"';
        assert.isTrue(userData.whereOne(query));
        assert.deepEqual(userData.data, data.userId1.data);

        query = '`userId`="userId3" AND `meta`="user meta 1"';
        assert.isTrue(userData.whereOne(query));
        assert.deepEqual(userData.data, data.userId13.data);

        query = '`userId`="NotFound"';
        assert.isFalse(userData.whereOne(query));
    });

    it('Delete data', () => {
        let query = '`userId`="userId1"';
        userData.userId = 'userId1';
        assert.isTrue(userData.remove());

        assert.isFalse(userData.whereOne(query));
    });

    it('Update data', () => {
        let query = '`meta`="meta"';
        assert.isFalse(userData.whereOne(query));
        userData.userId = 'userId1';
        userData.meta = 'meta';
        assert.isTrue(userData.update());

        assert.isTrue(userData.whereOne(query));
    });

    it('Save data', () => {
        let query = '`meta`="meta"';
        assert.isFalse(userData.whereOne(query));
        userData.userId = 'userId5';
        userData.meta = 'meta';
        userData.data = {name: 'user 5'};
        assert.isTrue(userData.save());

        assert.isTrue(userData.whereOne(query));
        assert.isTrue(userData.userId === 'userId5');
        assert.deepEqual(userData.data, {name: 'user 5'});
    });
});
