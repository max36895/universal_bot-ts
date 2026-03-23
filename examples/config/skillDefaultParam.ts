import { IAppParam } from 'umbot';

export default function (): IAppParam {
    return {
        intents: [
            {
                name: 'by',
                slots: ['пока'],
            },
            {
                name: 'bigImage',
                slots: ['картинка', 'изображен'],
            },
            {
                name: 'list',
                slots: ['список', 'галер'],
            },
            {
                name: 'save',
                slots: ['сохрани', 'save'],
            },
        ],
    };
}
