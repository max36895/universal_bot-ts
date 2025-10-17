import { BotController } from '../../src/controller';
import { IAppIntent } from '../../src';

export class MyController extends BotController {
    actionName?: string;

    constructor() {
        super();
    }

    action(intentName: string): void {
        this.actionName = intentName;
    }

    testIntent(text: string): string | null {
        return this._getIntent(text);
    }

    testIntents(): IAppIntent[] {
        return this._intents();
    }
}
