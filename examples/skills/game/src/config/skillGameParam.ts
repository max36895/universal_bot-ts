import { IAppParam } from 'umbot';

export default function (): IAppParam {
    return {
        telegram_token: '',
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
                name: 'game',
                slots: ['игра', 'начать игру'],
            },
        ],
    };
}
