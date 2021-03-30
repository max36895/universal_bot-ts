import {IAppParam} from "../../src/core";

export default function (): IAppParam {
    return {
        telegram_token: '',
        intents: [
            {
                name: 'by',
                slots: [
                    'пока',
                ]
            },
            {
                name: 'replay',
                slots: [
                    'повтор',
                    'еще раз'
                ]
            },
            {
                name: 'auth',
                slots: [
                    'регистр',
                    'авториз'
                ]
            },
        ]
    };
}
