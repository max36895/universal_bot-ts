import {assert} from 'chai'
import {MyController} from "./MyController";
import {mmApp} from "../../src/core/mmApp";


describe('Controller', () => {
    const uController = new MyController();

    it('MyController default intents', () => {
        assert.deepEqual(uController.testIntents(), mmApp.params.intents);
        assert.isTrue(uController.testIntent('привет') === 'welcome');
        assert.isTrue(uController.testIntent('помощь') === 'help');
        assert.isTrue(uController.testIntent('test') === null);
        assert.isTrue(uController.testIntent('start') === null);
        assert.isTrue(uController.testIntent('go') === null);
        assert.isTrue(uController.testIntent('by') === null);
    });

    it('MyController null intents', () => {
        mmApp.params.intents = null;
        assert.deepEqual(uController.testIntents(), []);
        assert.isTrue(uController.testIntent('test') === null);
        assert.isTrue(uController.testIntent('start') === null);
        assert.isTrue(uController.testIntent('go') === null);
        assert.isTrue(uController.testIntent('by') === null);
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
        assert.isTrue(uController.testIntent('test') === null);
        assert.isTrue(uController.testIntent('start') === 'start');
        assert.isTrue(uController.testIntent('go') === 'start');
        assert.isTrue(uController.testIntent('by') === 'by');
        assert.isTrue(uController.testIntent('bye') === 'by');
    })
});
