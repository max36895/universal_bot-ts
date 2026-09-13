import { HELP_INTENT_NAME, IAppParam, WELCOME_INTENT_NAME } from 'umbot';

export default function (): IAppParam {
    return {
        // Переданный массив intents заменяет встроенные welcome/help,
        // поэтому они указаны явно со слотами по умолчанию.
        intents: [
            {
                name: WELCOME_INTENT_NAME,
                slots: ['привет', 'здравст'],
            },
            {
                name: HELP_INTENT_NAME,
                slots: ['помощь', 'что ты умеешь'],
            },
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
