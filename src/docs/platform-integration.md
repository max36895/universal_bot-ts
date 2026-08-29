# Интеграция с платформами

## Поддерживаемые платформы

Фреймворк `umbot` обеспечивает единое API для разработки голосовых навыков и чат-ботов на всех ведущих российских и международных платформах.

### Сравнение с аналогами

| Возможность                           | `umbot` | Jovo | SaluteJS |                     Нативный SDK                     |
| :------------------------------------ | :-----: | :--: | :------: | :--------------------------------------------------: |
| Алиса + Маруся + Сбер                 |   ✅    |  ❌  |    ❌    | Требуется ручная маршрутизация и дублирование логики |
| Единая бизнес-логика                  |   ✅    |  ✅  |    ❌    |                          ❌                          |
| Поддержка Telegram / VK / Viber       |   ✅    |  ✅  |    ❌    | Требуется ручная маршрутизация и дублирование логики |
| TypeScript «из коробки»               |   ✅    |  ✅  |    ✅    |                  ⚠️ Зависит от sdk                   |

> Сильная сторона `umbot` — полный российский стек голосовых ассистентов (Алиса, Маруся, Сбер SmartApp) в одном коде.
> Jovo сфокусирован на мультиплатформенных чат-ботах и не интегрирован с российскими голосовыми платформами. Нативные
> SDK (telegraf, alice-sdk, vk-io) ориентированы на одну платформу и требуют дублирования логики при
> мультиплатформенности. Актуальные списки поддерживаемых платформ см. в их официальных документациях.

### Список платформ

| Платформа              | Идентификатор | Статус              |
| ---------------------- | ------------- | ------------------- |
| Яндекс.Алиса           | `alisa`       | ✅ Полная поддержка |
| Маруся                 | `marusia`     | ✅ Полная поддержка |
| Сбер SmartApp          | `smart_app`   | ✅ Полная поддержка |
| Telegram               | `telegram`    | ✅ Полная поддержка |
| VK                     | `vk`          | ✅ Полная поддержка |
| MAX                    | `max_app`     | ✅ Полная поддержка |
| Viber                  | `viber`       | ✅ Полная поддержка |
| Любая другая платформа | `...`         | ✅ Через адаптеры   |

Выбор платформы происходит автоматически в зависимости от запроса, который пришел в приложение, главное не забыть
подключить адаптеры для платформ.
Также есть возможность явно указать какая именно платформа используется:

```ts
const bot = new Bot('max_app');
```

## Общие требования

### Требования к серверу

- HTTPS с валидным SSL-сертификатом
- Стабильное время ответа (рекомендуется < 3 секунд)
- Поддержка webhook URL
- Node.js 20.19+ и TypeScript 5+

### Базовая настройка

```ts
import { Bot } from 'umbot';
import { fullPlatforms } from 'umbot/plugins';

const bot = new Bot();
bot.use(fullPlatforms); // Подключаем все доступные платформы
bot.setPlatformParams({
    // Параметры платформы
    welcome_text: 'Привет!', // Текст приветствия
    help_text: 'Я умею...', // Текст помощи
    intents: [],
});
bot.setAppConfig({
    // Общие параметры
    json: './data', // Директория для JSON данных
    error_log: './logs', // Директория для логов
    isLocalStorage: true, // Использование локального хранилища
});
bot.start('localhost', 3000); // Запуск приложения
```

## Создание навыков для Алисы

### Требования

- Аккаунт разработчика в [Яндекс.Диалоги](https://dialogs.yandex.ru/developer)
- HTTPS endpoint для webhook
- Время ответа < 3 секунд

### Настройка

1. Создайте навык в консоли Яндекс.Диалоги
2. Получите OAuth токен в [Яндекс.OAuth](https://oauth.yandex.ru) если он необходим. Токен нужен для загрузки аудио или
   изображений.
3. Настройте параметры в коде:

```ts
bot.setPlatformParams({
    isAuthUser: true, // Для работы с авторизацией
    intents: [],
});
bot.use(new AlisaAdapter('YOUR_OAUTH_TOKEN')); // Способ 1: токен в конструкторе (приоритет выше)
// bot.setAppConfig({                         // Способ 2: токен в конфиге (альтернатива, если не передан в конструкторе)
//     tokens: {
//         alisa: {
//             token: 'YOUR_OAUTH_TOKEN',
//         },
//     },
// });
```

### Особенности

- Поддержка авторизации пользователей
- Локальное хранилище данных
- Встроенная система синтеза речи
- Поддержка карточек и галерей

### Пример контроллера

```ts
class AlisaController extends BotController {
    public action(intentName: string | null): void {
        if (intentName === WELCOME_INTENT_NAME) {
            // Проверка авторизации
            if (!this.userToken) {
                this.isAuth = true;
                this.text = 'Для продолжения необходима авторизация';
                return;
            }

            // Работа с авторизованным пользователем
            this.text = `Привет, ${this.nlu.getUserName()?.first_name || 'пользователь'}!`;
            this.tts = 'Привет! Рад вас видеть снова!';

            // Добавление карточки
            this.card.addImage('image_token', 'Добро пожаловать', 'Описание', 'Кнопка');

            // Добавление кнопок
            this.buttons.addBtn('Помощь').addBtn('Начать игру');
        }
    }
}
```

## Создание бота для Telegram

### Требования

- Бот, созданный через [@BotFather](https://t.me/botfather)
- HTTPS webhook URL
- Поддержка Telegram Bot API

### Настройка

1. Получите токен у @BotFather
2. Настройте webhook URL (через метод `setWebhook` Telegram Bot API; в поле `secret_token`
   укажите произвольный секрет — он понадобится для проверки запросов)
3. Настройте параметры в коде:

```ts
bot.use(new TelegramAdapter('YOUR_BOT_TOKEN')); // Способ 1: токен в конструкторе (приоритет выше)
// bot.setAppConfig({                           // Способ 2: токен в конфиге (альтернатива)
//     tokens: {
//         telegram: {
//             token: 'YOUR_BOT_TOKEN',
//         },
//     },
// });
```

> **Проверка подлинности запросов.** Если при регистрации webhook вы задали `secret_token`,
> передайте его же в `appConfig.tokens.telegram.webhookSecret` — тогда адаптер будет проверять
> заголовок `x-telegram-bot-api-secret-token` и отклонять запросы не от Telegram.
> Без `webhookSecret` проверка не выполняется (например, для локальной отладки).

### Особенности

- Богатый набор UI элементов
- Поддержка файлов и медиа
- Inline кнопки и клавиатура

### Пример контроллера

```ts
class TelegramController extends BotController {
    public action(intentName: string | null): void {
        if (intentName === WELCOME_INTENT_NAME) {
            this.text = 'Привет! Я Telegram бот на umbot';

            // Добавление inline кнопок
            this.buttons
                .addBtn('Веб-сайт', 'http://localhost')
                .addBtn('Помощь', null, { command: 'help' });

            // Отправка изображения
            this.card.addImage('image_url', ' ', 'Описание изображения');
        }
    }
}
```

## Создание бота для VK

### Требования

- Группа ВКонтакте
- Права администратора группы
- Включены сообщения сообщества

### Настройка

1. Создайте группу ВКонтакте
2. Получите ключ доступа в настройках группы (управление сообществом → работа с API; портал для разработчиков — [dev.vk.com](https://dev.vk.com/ru))
3. Настройте Callback API
4. Настройте параметры в коде:

```ts
bot.use(
    new VkAdapter('YOUR_BOT_TOKEN', {
        vk_confirmation_token: 'YOUR_CONFIRMATION_TOKEN',
        vk_secret_key: 'YOUR_SECRET_KEY', // опционально: для проверки подлинности запросов
        vk_api_version: '5.199',
    }),
); // Способ 1: токен и опции в конструкторе (приоритет выше)
// bot.setAppConfig({                             // Способ 2: токен в конфиге (альтернатива)
//     tokens: {
//         vk: {
//             token: 'YOUR_BOT_TOKEN',
//             confirmation_token: 'YOUR_CONFIRMATION_TOKEN',
//             secret_key: 'YOUR_SECRET_KEY',
//             api_version: '5.199',
//         },
//     },
// });
```

> **Примечание:** В конструкторе `VkAdapter` ключи передаются с префиксом `vk_`
> (`vk_confirmation_token`, `vk_secret_key`, `vk_api_version`), а в `appConfig.tokens.vk` — без префикса
> (`confirmation_token`, `secret_key`, `api_version`). Оба формата валидны и фреймворком поддерживаются.

### Особенности

- Поддержка карусели сообщений
- Клавиатура сообщений
- Работа с вложениями
- Интеграция с VK API

### Пример контроллера

```ts
class VKController extends BotController {
    public action(intentName: string | null): void {
        if (intentName === WELCOME_INTENT_NAME) {
            this.text = 'Привет! Я бот ВКонтакте';

            // Добавление клавиатуры
            this.buttons.addBtn('Меню').addBtn('Помощь').addBtn('О нас', 'https://vk.ru/group');

            // Отправка карусели
            this.card
                .addImage('photo_token_1', 'Товар 1', '100 руб.')
                .addImage('photo_token_2', 'Товар 2', '200 руб.');
        }
    }
}
```

## Создание бота для Max

### Требования

- Требуется верифицированный профиль организации/ИП

### Настройка

1. Перейдите в профиль вашей организации на [платформе](https://business.max.ru/self)
2. В разделе Чат-боты нажмите Создать
3. Заполните данные в настройках бота (его карточке) и нажмите Создать

```ts
bot.use(new MaxAdapter('YOUR_BOT_TOKEN')); // Способ 1: токен в конструкторе (приоритет выше)
// bot.setAppConfig({                         // Способ 2: токен в конфиге (альтернатива)
//     tokens: {
//         max_app: {
//             token: 'YOUR_BOT_TOKEN',
//         },
//     },
// });
```

> **Проверка подлинности запросов.** MAX передаёт секрет заголовком `x-max-bot-api-secret`.
> Чтобы адаптер проверял его, задайте секрет вторым аргументом конструктора
> (`new MaxAdapter('TOKEN', { secret: 'YOUR_SECRET' })`) или в
> `appConfig.tokens.max_app.webhookSecret`. Без секрета проверка не выполняется.

### Особенности

- Поддержка карусели сообщений
- Клавиатура сообщений
- Работа с вложениями
- Интеграция с MAX API

### Пример контроллера

```ts
class MaxController extends BotController {
    public action(intentName: string | null): void {
        if (intentName === WELCOME_INTENT_NAME) {
            this.text = 'Привет! Я бот в Max';

            // Добавление клавиатуры
            this.buttons
                .addBtn('Меню')
                .addBtn('Помощь')
                .addBtn('О нас', 'https://dev.max.ru/docs/chatbots/bots-create');

            // Отправка карусели
            this.card
                .addImage('photo_token_1', 'Товар 1', '100 руб.')
                .addImage('photo_token_2', 'Товар 2', '200 руб.');
        }
    }
}
```

## Создание бота для Viber

### Требования

- Учётная запись бота, созданная в [Viber Admin Panel](https://partners.viber.com/)
- HTTPS webhook URL
- Имя отправителя (sender), совпадающее с именем бота в Viber

### Настройка

1. Создайте бота в [Viber Admin Panel](https://partners.viber.com/) и скопируйте токен бота
2. Укажите webhook URL на вашем сервере. Адаптер сам отвечает `200` на служебное событие `webhook`, которое Viber присылает при регистрации вебхука — без этого вебхук не зарегистрируется
3. Настройте параметры в коде:

```ts
bot.use(
    new ViberAdapter('YOUR_BOT_TOKEN', {
        viber_sender: 'YOUR_BOT_NAME', // обязательно: имя бота в Viber
    }),
); // Способ 1: токен и опции в конструкторе (приоритет выше)
// bot.setAppConfig({                           // Способ 2: токен в конфиге (альтернатива)
//     tokens: {
//         viber: {
//             token: 'YOUR_BOT_TOKEN',
//             sender: 'YOUR_BOT_NAME',
//         },
//     },
// });
```

> **Примечание:** Подлинность запросов Viber подтверждает заголовком `x-viber-content-signature` — адаптер проверяет его автоматически. Формат API описан в [документации Viber для разработчиков](https://developers.viber.com/).

### Особенности

- Текст сообщения до 7000 символов
- Кнопки — rich-media (RichMedia): адаптер отправляет до 6 кнопок; `Columns`/`Rows` каждой кнопки задают её размер в
  сетке, а не число карточек
- Звуки и TTS платформой не поддерживаются

### Пример контроллера

```ts
class ViberController extends BotController {
    public action(intentName: string | null): void {
        if (intentName === WELCOME_INTENT_NAME) {
            this.text = 'Привет! Я бот в Viber';

            // Добавление кнопок
            this.buttons.addBtn('Помощь').addBtn('О нас', 'https://example.com');
        }
    }
}
```

## Создание навыка для Маруси

### Требования

- Аккаунт разработчика VK
- HTTPS endpoint
- Поддержка протокола Маруси

### Настройка

1. Создайте навык в [консоли разработчика Маруси](https://marusia.vk.com/) (документация по навыкам — [vk.com/dev/marusia_skill_docs](https://vk.com/dev/marusia_skill_docs))
2. Получите токен для загрузки медиа
3. Настройте параметры:

```ts
bot.use(new MarusiaAdapter('YOUR_BOT_TOKEN')); // Способ 1: токен в конструкторе (приоритет выше)
bot.setAppConfig({
    isLocalStorage: true,
    // tokens: {                              // Способ 2: токен в конфиге (альтернатива)
    //     marusia: {
    //         token: 'YOUR_BOT_TOKEN',
    //     },
    // },
});
```

### Особенности

- Поддержка голосового ввода/вывода
- Локальное хранилище
- Карточки и галереи

### Пример контроллера

```ts
class MarusiaController extends BotController {
    public action(intentName: string | null): void {
        if (intentName === WELCOME_INTENT_NAME) {
            this.text = 'Привет! Я навык для Маруси';
            this.tts = 'Привет! Я готова помочь вам';

            // Добавление карточки
            this.card.addImage('image_token', 'Добро пожаловать', 'Выберите действие');

            // Добавление кнопок
            this.buttons.addBtn('Начать').addBtn('Помощь');
        }
    }
}
```

## Создание навыка для Сбер SmartApp

### Требования

- Аккаунт разработчика Сбера
- HTTPS endpoint
- Поддержка SmartApp протокола

### Настройка

1. Создайте приложение в [портале разработчика Сбера](https://developers.sber.ru/)
2. Настройте параметры:

```ts
bot.use(new SmartAppAdapter()); // Токен не нужен — аутентификация через Sber-экосистему
bot.setAppConfig({
    isLocalStorage: true,
});
```

> **Почему нет токена?** SmartApp использует встроенную аутентификацию платформы Сбербанка — приложение проходит проверку через экосистему Сбера при регистрации, отдельный API-токен не требуется.

### Особенности

- Поддержка Canvas App
- Встроенные сценарии
- Богатый UI
- Интеграция с экосистемой Сбера

### Пример контроллера

```ts
class SmartAppController extends BotController {
    public action(intentName: string | null): void {
        if (intentName === WELCOME_INTENT_NAME) {
            this.text = 'Привет! Я SmartApp на umbot';

            // Добавление карточки
            this.card.addImage('image_token', 'Добро пожаловать', 'Выберите действие');

            // Добавление кнопок
            this.buttons.addBtn('Начать').addBtn('Помощь');
        }
    }
}
```

## Пользовательские платформы

### Настройка

```ts
const bot = new Bot();
bot.use(new MyAdapter()); // Задаем кастомный адаптер
```

### Создание адаптера

```ts
// MyAdapter.ts
import { BasePlatformAdapter, TContent } from 'umbot/plugins';

class MyAdapter extends BasePlatformAdapter {
    /**
     * Уникальное имя платформы
     */
    platformName: string = 'my_platform';

    /**
     * Возвращает признак того, соответствует ли запрос текущей платформе или нет
     * @param query - Тело запроса
     * @param headers - HTTP-заголовки
     */
    isPlatformOnQuery(query: unknown, headers?: Record<string, unknown>): boolean {
        const q = query as Record<string, unknown>;
        return !!(q.data && (q.data as Record<string, unknown>).messageCount !== undefined);
    }

    /**
     * Обработка полученного запроса. В данном методе необходимо настроить botController необходимыми данными
     * @param query - Запрос от платформы
     * @param controller - Контроллер приложения
     */
    setQueryData(query: unknown, controller: BotController): boolean | Promise<boolean> {
        if (this.appContext) {
            if (query) {
                let content: Record<string, unknown>;
                if (typeof query === 'string') {
                    content = JSON.parse(query);
                } else {
                    content = query as Record<string, unknown>;
                }

                const data = content.data as Record<string, unknown> | undefined;

                controller.requestObject = content;
                controller.userId = content.userId as string;
                controller.userCommand = ((data?.text as string) || '').toLowerCase();
                controller.originalUserCommand = (data?.text as string) || '';
                controller.messageId = data?.messageCount as number;

                if (content.store) {
                    controller.state = content.store as Record<string, unknown>;
                }

                controller.isScreen = false;

                return true;
            } else {
                controller.platformOptions.error = 'MyAdapter:init(): Отправлен пустой запрос!';
            }
        } else {
            console.error('Не указан контекст приложения!');
        }
        return false;
    }

    /**
     * Возвращает результат, который будет отправлен платформе.
     * @param controller
     */
    getContent(controller: BotController): TContent {
        return {
            text: controller.text,
            tts: controller.tts,
        };
    }

    /**
     * Возвращает демо результат запроса, который будет приходить от платформы
     * @param query Запрос пользователя
     * @param userId Идентификатор пользователя
     * @param count Порядковый номер запроса
     * @param state Данные из локального хранилища
     */
    getQueryExample(
        query: string,
        userId: string,
        count: number,
        state: Record<string, unknown> | string,
    ): Record<string, unknown> {
        return {
            userId,
            data: {
                text: query.toLowerCase(),
                messageCount: count,
            },
            store: state,
        };
    }
}
```

## Подводные камни по платформам

### Алиса

- **Жёсткое время ответа.** Фреймворк сам следит за временем обработки: при ответе дольше 2000 мс
  пишется предупреждение, дольше 2900 мс — ошибка. Таймауты самой платформы проверяйте в её актуальной
  документации. Используйте `Preload` для медиа.
- **Лимит state Алисы: 1 КБ.** Если данные больше или не сериализуются, поле state не отправляется и прежнее состояние не очищается. Для больших данных используйте адаптер базы данных.
- **Пустой ответ не дополняется фреймворком.** Пустой `text` допустим по документации, когда заполнен `tts`. Если разработчик оставил пустыми оба поля, umbot сохранит их как есть и запишет предупреждение: эмпирически такой ответ может приниматься, но документация Алисы не гарантирует этот сценарий.
- **`isScreen = false` на колонках.** Кнопки и карточки не отображаются. Проверяйте `this.isScreen` перед `this.card.addImage(...)`.
- **Health check (ping).** Яндекс периодически шлёт `ping`. Фреймворк автоматически отвечает `pong`.
- **Удаление полей.** `delete this.userData.foo` не работает — платформа вернёт старое значение. Используйте `this.userData.foo = null`.

### Telegram

- **Нет локального хранилища.** `isLocalStorage: true` не работает — нужна БД для `userData`.
- **TTS через SpeechKit.** Для озвучки нужен `appConfig.tokens.telegram.speech_kit_token`. Без него `controller.tts` игнорируется.
- **Разметка выключена по умолчанию.** `parse_mode` передаётся только при явном `telegram_parse_mode`. При включённом HTML/MarkdownV2 разработчик отвечает за экранирование динамических данных.
- **Проактивная отправка.** `bot.send(userId, text, T_TELEGRAM)` работает (в отличие от голосовых платформ).

```ts
import { TelegramAdapter, T_FORMAT_MARKDOWN, escapeMarkdownV2 } from 'umbot/plugins';

// Вариант 1: обычный текст без parse_mode
const botPlain = new Bot().use(new TelegramAdapter('TOKEN'));

// Вариант 2: Явно MarkdownV2 (фреймворк не экранирует — разработчик отвечает за валидность)
const botMd = new Bot().use(
    new TelegramAdapter('TOKEN', {
        telegram_parse_mode: T_FORMAT_MARKDOWN,
    }),
);

// Безопасная вставка пользовательского ввода в MarkdownV2
const userName = escapeMarkdownV2('Иван. Петров');
ctx.text = `*Пользователь:* ${userName}`;
```

### VK

- **Два токена.** Бот-токен + `vk_confirmation_token` (для подтверждения вебхука при первичной настройке).
- **Секретный ключ.** Опционально: укажите `vk_secret_key` в конструкторе адаптера или `VK_SECRET_KEY` в `.env` для проверки подлинности каждого запроса от VK Callback API. Если секретный ключ включён в настройках группы, VK присылает поле `secret` в теле каждого события — адаптер сверяет его с сохранённым значением.
- **Нет локального хранилища.** `isLocalStorage: true` не работает — нужна БД для `userData`.
- **Группировка кнопок.** Кнопки с одинаковым `options._group` окажутся в одной строке.
- **Цвет кнопок.** `options.color: 'primary' | 'secondary' | 'positive' | 'negative'`.

### Viber

- **Sender name обязателен.** Должен совпадать с именем бота в Viber.
- **Звуки не поддерживаются.** `controller.tts` игнорируется.
- **Нет локального хранилища.** `isLocalStorage: true` не работает — нужна БД для `userData`.

### Max

- **Нет локального хранилища.** `isLocalStorage: true` не работает — нужна БД для `userData`.
- **TTS через SpeechKit.** Для озвучки нужен `appConfig.tokens.max_app.speech_kit_token`
  (или переменная окружения `SPEECH_KIT_TOKEN`).

### SmartApp (Сбер)

- **Без токена.** Аутентификация через Sber-экосистему.
- **Эмоции.** `controller.emotion = 'radost'` (22 варианта).
- **Rating flow.** `controller.isSendRating = true` запускает оценку навыка.

## Итог

Как видно из примеров выше, код контроллера для всех платформ выглядит практически одинаково.  
Вы пишете логику один раз, используя универсальные методы `this.text`, `this.buttons`, `this.card` и т.д.  
Фреймворк сам определяет, от какой платформы пришёл запрос, и автоматически преобразует ваш ответ в нужный формат.

Вам **не нужно** вручную проверять `this.appType` и писать разный код для Алисы, Telegram или VK —  
адаптеры платформ сделают это за вас. Единственное исключение — редкие случаи, когда требуется  
платформозависимое поведение (например, генерация UTM-меток в ссылках). Для таких ситуаций вы всегда можете  
явно обратиться к `this.appType` и добавить дополнительную логику.

Благодаря такому подходу вы можете сосредоточиться на бизнес-логике вашего приложения, а не на деталях реализации под каждую платформу. Один код — работает везде.

## 🌐 Универсальный webhook-обработчик

Если вы используете Express, Fastify или любой другой HTTP-фреймворк — вы можете интегрировать `umbot` через метод
`webhookHandle`.

### Пример для Express

```ts
import express from 'express';
import { Bot } from 'umbot';
import { fullPlatforms } from 'umbot/plugins';

const app = express();
app.use(express.json({ type: '*/*' })); // важно для Алисы/Сбера

// Инициализация приложения
const bot = new Bot();
bot.use(fullPlatforms);
bot.setAppConfig({
    json: './data',
    error_log: './logs',
    isLocalStorage: true,
    env: 'local',
});

// Подключение webhook-обработчика
app.post('/webhook', async (req, res) => {
    try {
        await bot.webhookHandle(req, res);
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(3000, () => {
    console.log('Сервер запущен на http://localhost:3000/webhook');
});
```

## Активные рассылки (метод `send`)

Начиная с версии 3.0.0, фреймворк поддерживает **активную отправку сообщений** — то есть навык(если поддерживает) или бот может инициировать диалог с пользователем без входящего запроса.

> ⚠️ **Важно**: не все платформы поддерживают эту функцию.
> Например, Алиса и Маруся **не позволяют** отправлять сообщения без запроса.
> Telegram, VK и MAX — **поддерживают**.
> Поддержка функционала зависит от используемой платформы.

### Пример использования

```ts
import { T_TELEGRAM } from 'umbot/plugins';

// Отправка сообщения пользователю в Telegram
const result = await bot.send('123456789', 'Привет! Это рассылка.', T_TELEGRAM);
```

## Лучшие практики

### Безопасность

- Храните токены в переменных окружения
- Используйте HTTPS
- Проверяйте подпись запросов
- Валидируйте входящие данные

### Разработка

- Используйте TypeScript
- Следуйте принципам SOLID
- Пишите тесты
- Ведите документацию
