import {
    HELP_INTENT_NAME,
    HELP_INTENT_SLOTS,
    IAppParam,
    WELCOME_INTENT_NAME,
    WELCOME_INTENT_SLOTS,
} from 'umbot';

/**
 * Параметры демо-приложения: тексты приветствия/помощи и интенты.
 *
 * Демонстрирует:
 * - `welcome_text` / `help_text` — запасные тексты для стандартных интентов;
 * - собственные интенты (`menu`, `favorite`) — срабатывают без регистрации
 *   команд, их обрабатывает `CoffeeController.action()`.
 *
 * ⚠️ Важно: `setPlatformParams` заменяет массив `intents` целиком, поэтому
 * встроенные интенты `welcome` и `help` нужно явно добавить обратно —
 * иначе фреймворк перестанет распознавать «привет» и «помощь».
 */
export default function appParams(): IAppParam {
    return {
        welcome_text:
            'Добро пожаловать в кофейню «У Бота»! Скажите «помощь», чтобы узнать, что я умею.',
        help_text: 'Я показываю меню, принимаю заказы и запоминаю любимый напиток.',
        empty_text: 'Я вас не понимаю. Скажите «помощь», чтобы узнать мои команды.',
        intents: [
            { name: WELCOME_INTENT_NAME, slots: [...WELCOME_INTENT_SLOTS] },
            { name: HELP_INTENT_NAME, slots: [...HELP_INTENT_SLOTS] },
            { name: 'menu', slots: ['меню', 'карта', 'карту'] },
            { name: 'favorite', slots: ['любимый', 'мой напиток'] },
        ],
    };
}
