import {MyController} from './MyController';
import {mmApp} from '../../src';

describe('Controller', () => {
    const uController = new MyController();

    it('MyController default intents', () => {
        expect(uController.testIntents()).toEqual(mmApp.params.intents);
        expect(uController.testIntent('привет') === 'welcome').toBe(true);
        expect(uController.testIntent('помощь') === 'help').toBe(true);
        expect(uController.testIntent('test') === null).toBe(true);
        expect(uController.testIntent('start') === null).toBe(true);
        expect(uController.testIntent('go') === null).toBe(true);
        expect(uController.testIntent('by') === null).toBe(true);
    });

    it('MyController null intents', () => {
        mmApp.params.intents = null;
        expect(uController.testIntents()).toEqual([]);
        expect(uController.testIntent('test') === null).toBe(true);
        expect(uController.testIntent('start') === null).toBe(true);
        expect(uController.testIntent('go') === null).toBe(true);
        expect(uController.testIntent('by') === null).toBe(true);
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
        expect(uController.testIntents()).toEqual(intents);
        expect(uController.testIntent('test') === null).toBe(true);
        expect(uController.testIntent('start') === 'start').toBe(true);
        expect(uController.testIntent('go') === 'start').toBe(true);
        expect(uController.testIntent('by') === 'by').toBe(true);
        expect(uController.testIntent('bye') === 'by').toBe(true);
    })
});
