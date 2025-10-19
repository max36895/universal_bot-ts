import { MyController } from './MyController';
import { AppContext } from '../../src';

const appContext = new AppContext();

describe('Controller', () => {
    const uController = new MyController();
    uController.setAppContext(appContext);

    it('MyController default intents', () => {
        expect(uController.testIntents()).toEqual(appContext.platformParams.intents);
        expect(uController.testIntent('привет') === 'welcome').toBe(true);
        expect(uController.testIntent('помощь') === 'help').toBe(true);
        expect(uController.testIntent('test') === null).toBe(true);
        expect(uController.testIntent('start') === null).toBe(true);
        expect(uController.testIntent('go') === null).toBe(true);
        expect(uController.testIntent('by') === null).toBe(true);
    });

    it('MyController null intents', () => {
        appContext.platformParams.intents = null;
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
        appContext.platformParams.intents = intents;
        expect(uController.testIntents()).toEqual(intents);
        expect(uController.testIntent('test') === null).toBe(true);
        expect(uController.testIntent('start') === 'start').toBe(true);
        expect(uController.testIntent('go') === 'start').toBe(true);
        expect(uController.testIntent('by') === 'by').toBe(true);
        expect(uController.testIntent('bye') === 'by').toBe(true);
    });

    it('MyController addCommand minimum params', () => {
        appContext.platformParams.intents = [];
        appContext.addCommand('test', ['start']);

        uController.userCommand = 'start';
        uController.run();
        expect(uController.actionName).toEqual('test');

        appContext.removeCommand('test');
    });

    it('MyController addCommand cb used', () => {
        appContext.platformParams.intents = [];
        let isUsed = false;
        appContext.addCommand('cb', ['go'], () => {
            isUsed = true;
        });

        uController.userCommand = 'go cb used';
        uController.run();
        expect(isUsed).toBe(true);
        expect(uController.actionName).toEqual('cb');

        isUsed = false;
        appContext.removeCommand('cb');
        uController.userCommand = 'go cb removed command';
        uController.run();
        expect(isUsed).toBe(false);
    });

    it('MyController addCommand cb return string', () => {
        appContext.platformParams.intents = [];
        appContext.addCommand('text', ['text'], () => {
            return 'test';
        });

        uController.userCommand = 'text case';
        uController.run();
        expect(uController.text).toEqual('test');
        expect(uController.actionName).toEqual('text');

        appContext.removeCommand('text');
    });
});
