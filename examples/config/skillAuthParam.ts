import { IAppParam } from '../../src';

export default function (): IAppParam {
    return {
        intents: [
            {
                name: 'by',
                slots: ['пока'],
            },
            {
                name: 'replay',
                slots: ['повтор', 'еще раз'],
            },
            {
                name: 'auth',
                slots: ['регистр', 'авториз'],
            },
        ],
    };
}
