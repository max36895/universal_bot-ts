import {BotController} from "../../src";

export class MyController extends BotController {
    constructor() {
        super();
    }

    action(intentName: string) {
    }

    testIntent(text: string) {
        return this._getIntent(text);
    }

    testIntents() {
        return this._intents();
    }
}
