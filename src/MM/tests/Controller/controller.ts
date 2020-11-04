import {assert} from 'chai'
import {MyController} from "./MyController";
import {mmApp} from "../../bot/core/mmApp";


describe('Controller', () => {
    const uController = new MyController();

    it('MyController default intents', () => {
        assert.deepEqual(uController.testIntents(), mmApp.params.intents);
        assert.isTrue(uController.testIntent('привет') === 'welcome');
        assert.isTrue(uController.testIntent('помощь') === 'help');
        assert.isNull(uController.testIntent('test'));
        assert.isNull(uController.testIntent('start'));
        assert.isNull(uController.testIntent('go'));
        assert.isNull(uController.testIntent('by'));
    });

    it('MyController null intents', () => {
        mmApp.params.intents = null;
        assert.deepEqual(uController.testIntents(), []);
        assert.isNull(uController.testIntent('test'));
        assert.isNull(uController.testIntent('start'));
        assert.isNull(uController.testIntent('go'));
        assert.isNull(uController.testIntent('by'));
    });

    it('MyController user intents', () => {
        const intents = [
            {
                name: 'start',
                slots: [
                    'start',
                    'go'
                ]
            },
            {
                name: 'by',
                slots: [
                    'by'
                ],
                is_pattern: true
            }
        ];
        mmApp.params.intents = intents;
        assert.deepEqual(uController.testIntents(), intents);
        assert.isNull(uController.testIntent('test'));
        assert.isTrue(uController.testIntent('start') === 'start');
        assert.isTrue(uController.testIntent('go') === 'start');
        assert.isTrue(uController.testIntent('by') === 'by');
        assert.isTrue(uController.testIntent('bye') === 'by');
    })
});
