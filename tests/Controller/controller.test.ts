import { MyController } from './MyController';
import { mmApp } from '../../src';

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
                slots: ['start', 'go'],
            },
            {
                name: 'by',
                slots: ['by'],
                is_pattern: true,
            },
        ];
        mmApp.params.intents = intents;
        expect(uController.testIntents()).toEqual(intents);
        expect(uController.testIntent('test') === null).toBe(true);
        expect(uController.testIntent('start') === 'start').toBe(true);
        expect(uController.testIntent('go') === 'start').toBe(true);
        expect(uController.testIntent('by') === 'by').toBe(true);
        expect(uController.testIntent('bye') === 'by').toBe(true);
    });

    it('MyController addCommand minimum params', () => {
        mmApp.params.intents = [];
        mmApp.addCommand('test', ['start']);

        uController.userCommand = 'start';
        uController.run();
        expect(uController.actionName).toEqual('test');

        mmApp.removeCommand('test');
    });

    it('MyController addCommand cb used', () => {
        mmApp.params.intents = [];
        let isUsed = false;
        mmApp.addCommand('cb', ['go'], () => {
            isUsed = true;
        });

        uController.userCommand = 'go cb used';
        uController.run();
        expect(isUsed).toBe(true);
        expect(uController.actionName).toEqual('cb');

        isUsed = false;
        mmApp.removeCommand('cb');
        uController.userCommand = 'go cb removed command';
        uController.run();
        expect(isUsed).toBe(false);
    });

    it('MyController addCommand cb return string', () => {
        mmApp.params.intents = [];
        mmApp.addCommand('text', ['text'], () => {
            return 'test';
        });

        uController.userCommand = 'text case';
        uController.run();
        expect(uController.text).toEqual('test');
        expect(uController.actionName).toEqual('text');

        mmApp.removeCommand('text');
    });
});
