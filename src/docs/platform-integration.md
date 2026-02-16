# Интеграция с платформами

## Поддерживаемые платформы

Фреймворк `umbot` обеспечивает единое API для разработки ботов и голосовых навыков на всех ведущих российских и
международных платформах.

### Сравнение с аналогами

| Возможность                            | `umbot` | Jovo | SaluteJS |                    Отдельные SDK                     |
| :------------------------------------- | :-----: | :--: | :------: | :--------------------------------------------------: |
| Алиса + Маруся + Сбер одновременно     |   ✅    |  ❌  |    ❌    | Требуется ручная маршрутизация и дублирование логики |
| Единая бизнес-логика для всех платформ |   ✅    |  ❌  |    ❌    |                          ❌                          |
| Поддержка Telegram / VK / Viber        |   ✅    |  ❌  |    ❌    | Требуется ручная маршрутизация и дублирование логики |
| TypeScript «из коробки»                |   ✅    |  ✅  |    ✅    |                          ⚠️                          |
| Гарантии времени выполнения            |   ✅    |  ❌  |    ⚠️    |                          ❌                          |

> **`umbot` — Одно из решений с полной поддержкой всего российского стека голосовых ассистентов в одном коде.**

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

Выбор платформы происходит автоматически в зависимости от запроса, который пришел в приложение.
Также есть возможность явно указать какая именно платформа используется:

```ts
const bot = new Bot();
```

## Общие требования

### Требования к серверу

- HTTPS с валидным SSL-сертификатом
- Стабильное время ответа (рекомендуется < 3 секунд)
- Поддержка webhook URL
- Node.js 20.0+ и TypeScript 5+

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
});
bot.setAppConfig({
    // Общие параметры
    json: './data', // Директория для JSON данных
    error_log: './logs', // Директория для логов
    isLocalStorage: true, // Использование локального хранилища
});
bot.start(); // Запуск приложения
```

## Яндекс.Алиса

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
});
bot.use(new AlisaAdapter('YOUR_OAUTH_TOKEN')); // Указывыем токен в адаптере
bot.setAppConfig({
    tokens: {
        alisa: {
            token: 'YOUR_OAUTH_TOKEN',
        },
    },
}); // Указываем токен через настройку приложения
```

### Особенности

- Поддержка авторизации пользователей
- Локальное хранилище данных
- Встроенная система озвучки текста
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
            this.text = `Привет, ${this.userMeta?.first_name || 'пользователь'}!`;
            this.tts = 'Привет! Рад вас видеть снова!';

            // Добавление карточки
            this.card.addImage('image_token', 'Добро пожаловать', 'Описание', 'Кнопка');

            // Добавление кнопок
            this.buttons.addBtn('Помощь').addBtn('Начать игру');
        }
    }
}
```

## Telegram

### Требования

- Бот, созданный через [@BotFather](https://t.me/botfather)
- HTTPS webhook URL
- Поддержка Telegram Bot API

### Настройка

1. Получите токен у @BotFather
2. Настройте webhook URL
3. Настройте параметры в коде:

```ts
bot.use(new TelegramAdapter('YOUR_BOT_TOKEN')); // Указывыем токен в адаптере
bot.setAppConfig({
    tokens: {
        telegram: {
            token: 'YOUR_BOT_TOKEN',
        },
    },
}); // Указываем токен через настройку приложения
```

### Особенности

- Богатый набор UI элементов
- Поддержка файлов и медиа
- Inline кнопки и клавиатура
- Групповые чаты

### Пример контроллера

```ts
class TelegramController extends BotController {
    public action(intentName: string | null): void {
        if (intentName === WELCOME_INTENT_NAME) {
            this.text = 'Привет! Я Telegram бот на umbot';

            // Добавление inline кнопок
            this.buttons
                .addBtn('Веб-сайт', 'https://example.com')
                .addBtn('Помощь', { command: 'help' });

            // Отправка изображения
            this.card.addImage('image_url', 'Описание изображения');
        }
    }
}
```

## VK

### Требования

- Группа ВКонтакте
- Права администратора группы
- Включенные сообщения сообщества

### Настройка

1. Создайте группу ВКонтакте
2. Получите ключ доступа в настройках группы
3. Настройте Callback API
4. Настройте параметры в коде:

```ts
bot.use(
    new VkAdapter('YOUR_BOT_TOKEN', {
        vk_confirmation_token: 'YOUR_CONFIRMATION_TOKEN',
        vk_api_version: 'v5.131',
    }),
); // Указывыем токен в адаптере
bot.setAppConfig({
    tokens: {
        vk: {
            token: 'YOUR_BOT_TOKEN',
            confirmationToken: 'YOUR_CONFIRMATION_TOKEN',
            apiVersion: 'v5.131',
        },
    },
}); // Указываем токен через настройку приложения
```

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

## Маруся

### Требования

- Аккаунт разработчика VK
- HTTPS endpoint
- Поддержка протокола Маруси

### Настройка

1. Создайте навык в консоли разработчика
2. Получите токен для загрузки медиа
3. Настройте параметры:

```ts
bot.use(new MarusiaAdapter('YOUR_BOT_TOKEN')); // Указывыем токен в адаптере
bot.setAppConfig({
    tokens: {
        marusia: {
            token: 'YOUR_BOT_TOKEN',
        },
    },
}); // Указываем токен через настройку приложения
bot.setAppConfig({
    isLocalStorage: true,
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

## Сбер SmartApp

### Требования

- Аккаунт разработчика Сбера
- HTTPS endpoint
- Поддержка SmartApp протокола

### Настройка

1. Создайте приложение в консоли разработчика
2. Настройте параметры:

```ts
bot.setAppConfig({
    isLocalStorage: true,
});
```

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
     * @param query
     * @param headers
     */
    isPlatformOnQuery(query: object, headers?: Record<string, unknown>): boolean {
        return typeof query.data?.messageCount !== 'undefined';
    }

    /**
     * Обработка полученного запроса. В данном методе необходимо настроить botController, необходимыми данными
     * @param query Запрос от платформы
     * @param controller Контроллер приложения
     */
    setQueryData(query: object | string, controller: BotController): boolean | Promise<boolean> {
        if (this.appContext) {
            if (query) {
                let content: object;
                if (typeof query === 'string') {
                    content = JSON.parse(query);
                } else {
                    content = query;
                }

                controller.requestObject = content;
                controller.userId = content.userId;
                controller.userCommand = content.data.text;
                controller.originalUserCommand = content.data.text;
                controller.messageId = content.data.messageCount;

                if (content.store) {
                    controller.state = content.store;
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

// Инициализация бота (платформа указывается один раз)
const bot = new Bot();
bot.use(fullPlatforms);
bot.setAppConfig({
    json: './data',
    error_log: './logs',
    isLocalStorage: true,
    env: 'local',
});

// Подключение webhook-обработчика
app.post('/webhook', (req, res) => {
    try {
        bot.webhookHandle(req, res);
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

Начиная с версии 3.0.0, фреймворк поддерживает **активную отправку сообщений** — то есть бот может инициировать диалог
с пользователем без входящего запроса.

> ⚠️ **Важно**: не все платформы поддерживают эту функцию.
> Например, Алиса и Маруся **не позволяют** отправлять сообщения без запроса.
> Telegram, VK и MAX — **поддерживают**.
> Поддержка функционала зависит от используемой платформы.

### Пример использования

```ts
// Отправка сообщения пользователю в Telegram
const success = bot.send('123456789', 'Привет! Это рассылка.');
```

## Лучшие практики

### Безопасность

- Храните токены в переменных окружения
- Используйте HTTPS
- Проверяйте подпись запросов
- Валидируйте входящие данные

### Производительность

- Оптимизируйте размер ответов
- Используйте кэширование
- Следите за временем ответа

### Разработка

- Используйте TypeScript
- Следуйте принципам SOLID
- Пишите тесты
- Ведите документацию
