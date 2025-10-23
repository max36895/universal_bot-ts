# Интеграция с платформами

## Поддерживаемые платформы

Библиотека `umbot` обеспечивает единый API для разработки ботов и голосовых навыков на всех ведущих российских и
международных платформах.

### Сравнение с аналогами

| Возможность                            | `umbot` | Jovo | SaluteJS | Отдельные SDK              |
|----------------------------------------|:-------:|:----:|:--------:|----------------------------|
| Алиса + Маруся + Сбер одновременно     |    ✅    |  ❌   |    ❌     | ❌                          |
| Единая бизнес-логика для всех платформ |    ✅    |  ❌   |    ❌     | ❌                          |
| Поддержка Telegram / VK / Viber        |    ✅    |  ❌   |    ❌     | ⚠️ (только по отдельности) |
| TypeScript «из коробки»                |    ✅    |  ✅   |    ✅     | ⚠️                         |
| Гарантии времени выполнения            |    ✅    |  ❌   |    ⚠️    | ❌                          |

> **`umbot` — единственное решение с полной поддержкой всего российского стека голосовых ассистентов в одном коде.**

### Список платформ

| Платформа           | Идентификатор      | Статус              |
|---------------------|--------------------|---------------------|
| Яндекс.Алиса        | `alisa`            | ✅ Полная поддержка  |
| Маруся              | `marusia`          | ✅ Полная поддержка  |
| Сбер SmartApp       | `smart_app`        | ✅ Полная поддержка  |
| Telegram            | `telegram`         | ✅ Полная поддержка  |
| VK                  | `vk`               | ✅ Полная поддержка  |
| MAX                 | `max_app`          | ✅ Полная поддержка  |
| Viber               | `viber`            | ✅ Полная поддержка  |
| Кастомная платформа | `user_application` | ✅ Базовая поддержка |

Для выбора платформы укажите идентификатор при создании экземпляра:

```ts
const bot = new Bot('alisa'); // или 'marusia', 'smart_app', 'telegram' и т.д.
```

По умолчанию используется `alisa`.

## Общие требования

### Требования к серверу

- HTTPS с валидным SSL-сертификатом
- Стабильное время ответа (рекомендуется < 3 секунд)
- Поддержка webhook URL
- Node.js 16+ и TypeScript 5+

### Базовая настройка

```typescript
import { Bot, T_ALISA } from 'umbot';

const bot = new Bot(T_ALISA);
bot.setPlatformParams({
    // Параметры платформы
    welcome_text: 'Привет!', // Текст приветствия
    help_text: 'Я умею...' // Текст помощи
});
bot.setAppConfig({
    // Общие параметры
    json: './data', // Директория для JSON данных
    error_log: './logs', // Директория для логов
    isLocalStorage: true // Использование локального хранилища
});

bot.initTypeInGet(); // Установка типа платформы из get параметра запроса. Удобно использовать если вы используете для доступа к приложению один url, в котором тип приложения определяется через get параметр
```

## Яндекс.Алиса

### Требования

- Аккаунт разработчика в [Яндекс.Диалоги](https://dialogs.yandex.ru/developer)
- HTTPS endpoint для webhook
- Время ответа < 3 секунд

### Настройка

1. Создайте навык в консоли Яндекс.Диалоги
2. Получите OAuth токен в [Яндекс.OAuth](https://oauth.yandex.ru). Не обязательно.
3. Настройте параметры в коде:

```typescript
bot.setPlatformParams({
    yandex_token: 'YOUR_OAUTH_TOKEN',
    y_isAuthUser: true, // Для работы с авторизацией
});
```

### Особенности

- Поддержка авторизации пользователей
- Локальное хранилище данных
- Встроенная система озвучки текста
- Поддержка карточек и галерей

### Пример контроллера

```typescript
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
            this.card.add('image_token', 'Добро пожаловать', 'Описание', 'Кнопка');

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

```typescript
bot.setPlatformParams({
    telegram_token: 'YOUR_BOT_TOKEN',
});
```

### Особенности

- Богатый набор UI элементов
- Поддержка файлов и медиа
- Inline кнопки и клавиатура
- Групповые чаты

### Пример контроллера

```typescript
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

```typescript
bot.setPlatformParams({
    vk_token: 'YOUR_GROUP_TOKEN',
    vk_confirmation_token: 'YOUR_CONFIRMATION_TOKEN',
    vk_api_version: 'v5.131',
});
```

### Особенности

- Поддержка карусели сообщений
- Клавиатура сообщений
- Работа с вложениями
- Интеграция с VK API

### Пример контроллера

```typescript
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

```typescript
bot.setPlatformParams({
    marusia_token: 'YOUR_TOKEN',
    isLocalStorage: true,
});
```

### Особенности

- Поддержка голосового ввода/вывода
- Локальное хранилище
- Карточки и галереи
- Интеграция с VK Mini Apps

### Пример контроллера

```typescript
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

```typescript
bot.setPlatformParams({
    isLocalStorage: true,
});
```

### Особенности

- Поддержка Canvas App
- Встроенные сценарии
- Богатый UI
- Интеграция с экосистемой Сбера

### Пример контроллера

```typescript
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

## Viber

### Требования

- Аккаунт Viber для бизнеса
- HTTPS webhook
- Public Account

### Настройка

1. Создайте Public Account
2. Получите токен в настройках
3. Настройте параметры:

```typescript
bot.setPlatformParams({
    viber_token: 'YOUR_TOKEN',
    viber_sender: 'Bot Name',
    viber_api_version: 1,
});
```

### Особенности

- Rich Media Messages
- Клавиатура сообщений
- Поддержка различных типов контента
- Tracking Events

### Пример контроллера

```typescript
class ViberController extends BotController {
    public action(intentName: string | null): void {
        if (intentName === WELCOME_INTENT_NAME) {
            this.text = 'Привет! Я Viber бот';

            // Добавление клавиатуры
            this.buttons
                .addBtn('Меню')
                .addBtn('Сайт', 'https://example.com')
                .addBtn('Связаться с нами');

            // Отправка Rich Media
            this.card.addImage('image_token', 'Добро пожаловать', 'Выберите действие');
        }
    }
}
```

## Пользовательские платформы

### Настройка

```typescript
const bot = new Bot('user_application');
bot.run(CustomPlatformAdapter); // Задаем кастомный адаптен
```

### Создание адаптера

```typescript
import { TemplateTypeModel, Buttons } from 'umbot';

class CustomPlatformAdapter extends TemplateTypeModel {
    /**
     * Получение ответа, который отправится пользователю. В случае с Алисой, Марусей и Сбер, возвращается json. С остальными типами, ответ отправляется непосредственно на сервер.
     *
     * @return {Promise<Object|string>}
     */
    public async getContext(): Promise<Object | string> {
        return {
            text: this.controller.text,
            tts: this.controller.tts,
            buttons: this.controller.buttons.getButtons(Buttons.T_ALISA_BUTTONS), // ипользуем формат для кнопок алисы
        };
    }

    /**
     * Инициализация основных параметров. В случае успешной инициализации, вернет true, иначе false.
     *
     * @param {IVkRequestContent|string} query Запрос пользователя.
     * @param {BotController} controller Ссылка на класс с логикой навык/бота.
     * @return Promise<boolean>
     * @see TemplateTypeModel.init() Смотри тут
     */
    public async init(
        query: string | IVkRequestContent,
        controller: BotController,
    ): Promise<boolean> {
        let content;
        if (typeof query === 'string') {
            content = JSON.parse(query);
        } else {
            content = { ...query };
        }
        if (!this.controller) {
            this.controller = controller;
        }
        this.controller.requestObject = content;

        // Заполняем контроллер пришедшими данными
        const object = content.object;
        this.controller.userId = object.userIf;
        this._appConfig.platformParams.user_id = this.controller.userId;
        this.controller.userCommand = object.text.toLowerCase().trim();
        this.controller.originalUserCommand = object.text.trim();
        this.controller.messageId = object.message.id;
        this.controller.payload = object.message.payload || null;

        return true;
    }
}
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
