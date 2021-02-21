import {BotController} from "../../src";

export class MyController extends BotController {
    constructor() {
        super();
    }

    action(intentName: string) {
    }

    testIntent(text: string) {
        return BotController._getIntent(text);
    }

    testIntents() {
        return BotController._intents();
    }
}
