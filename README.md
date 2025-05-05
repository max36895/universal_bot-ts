# umbot

Универсальный движок для разработки чат-ботов и голосовых навыков с единой бизнес-логикой для различных платформ.

[![npm version](https://badge.fury.io/js/umbot.svg)](https://badge.fury.io/js/umbot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)]()
[![Templates](https://img.shields.io/badge/Templates-3+-green)]()
[![Security](https://img.shields.io/badge/Security-A+-red)]()

## 📖 Документация

Подробная документация доступна в следующих разделах:

### Основная документация

-   [API Reference](src/docs/api-reference.md) - Подробное описание всех классов, методов и интерфейсов
-   [Быстрый старт](src/docs/getting-started.md) - Подробное описание, для быстрого старта проекта
-   [Интеграция с платформами](src/docs/platform-integration.md) - Руководство по интеграции с различными платформами

## 📚 Навигация по документации

-   [Быстрый старт](src/docs/getting-started.md)
-   [Интеграция с платформами](src/docs/platform-integration.md)
-   [Примеры](examples/README.md)
-   [FAQ](src/docs/getting-started.md#часто-задаваемые-вопросы)
-   [API](https://www.maxim-m.ru/bot/ts-doc/index.html)

### Полезные ссылки

-   📚 [Официальная документация](https://www.maxim-m.ru/bot/ts-doc/index.html)
-   📢 [Telegram канал](https://t.me/joinchat/AAAAAFM8AcuniLTwBLuNsw)
-   💬 [Telegram группа](https://t.me/mm_universal_bot)
-   🐛 [Issues на GitHub](https://github.com/max36895/universal_bot-ts/issues)

## 📖 Описание

Движок позволяет создать навык для `Яндекс.Алиса`, `Маруси`, `Сбер(SmartApp)`, а также бота для `VK`, `Viber` или
`Telegram`, с идентичной логикой. Вы можете использовать один и тот же код бизнес-логики для всех платформ, что
значительно упрощает разработку и поддержку.

Для использования собственной платформы укажите своё значение в `mmApp.appType`. По умолчанию установлено значение
`alisa`.

## 📚 Основные возможности

### Поддерживаемые платформы

| Платформа                  | Идентификатор      | Статус               |
| -------------------------- | ------------------ | -------------------- |
| Яндекс.Алиса               | `alisa`            | ✅ Полная поддержка  |
| Маруся                     | `marusia`          | ✅ Полная поддержка  |
| Сбер SmartApp              | `smart_app`        | ✅ Полная поддержка  |
| Telegram                   | `telegram`         | ✅ Полная поддержка  |
| VK                         | `vk`               | ✅ Полная поддержка  |
| Viber                      | `viber`            | ✅ Полная поддержка  |
| Пользовательские платформы | `user_application` | ✅ Базовая поддержка |

### Ключевые особенности

-   ✨ Единый код для всех платформ
-   🔄 Автоматическая конвертация форматов сообщений
-   💾 Встроенное управление состоянием
-   🎨 Богатые возможности UI (кнопки, карточки, галереи)
-   🔊 Поддержка голосового ввода/вывода
-   🚀 **Простота разработки** - TypeScript из коробки, автодополнение в IDE

## 🎯 Примеры использования

### Эхо-бот

#### Точка входа в приложение (index.ts)

```typescript
import { Bot } from 'umbot';
import { EchoController } from './EchoController';
import { IncomingMessage, ServerResponse } from 'http';

const bot = new Bot();

// Инициализация основных параметров
bot.initParams({
    json: __dirname + '/data', // Директория для хранения данных
    error_log: __dirname + '/logs', // Директория для логов
    isLocalStorage: true, // Использовать локальное хранилище
});

// Инициализация контроллера
const logic = new EchoController();
bot.initBotController(logic);

// Экспорт обработчика для serverless
module.exports = async (req: IncomingMessage, res: ServerResponse) => {
    bot.start(req, res);
};
```

#### Логика приложения (EchoController.ts)

```typescript
import { BotController, WELCOME_INTENT_NAME } from 'umbot';

export class EchoController extends BotController {
    public action(intentName: string): void {
        if (intentName === WELCOME_INTENT_NAME) {
            this.text = 'Привет! Я буду повторять за тобой.';
            return;
        }
        this.text = `Вы сказали: ${this.userCommand}`;
    }
}
```

## 🚀 Быстрый старт

### Установка

#### Вариант 1: Через Git

```bash
# Клонирование репозитория в папку u_bot
git clone https://github.com/max36895/universal_bot-ts.git u_bot
cd u_bot
npm install
```

#### Вариант 2: Через npm

```bash
npm install umbot
```

### Запуск проекта

#### 1. Создание package.json

Минимальная конфигурация package.json:

```json
{
    "name": "my-umbot-project",
    "description": "Описание вашего проекта",
    "main": "index.js",
    "scripts": {
        "start": "node ./dist/index.js",
        "build": "rm -rf dist/ && tsc"
    },
    "dependencies": {
        "umbot": "*"
    }
}
```

#### 2. Установка зависимостей

```bash
npm install
```

#### 3. Разработка логики приложения

Создайте структуру проекта:

```
my-bot/
  ├── src/
  │   └── controller/
  │       └── MyController.ts
  ├── package.json
  └── index.ts
```

##### Создание простого бота

1. Контроллер бота (src/controller/MyController.ts):

```typescript
import { BotController, WELCOME_INTENT_NAME } from 'umbot';

export class MyController extends BotController {
    public action(intentName: string): void {
        switch (intentName) {
            case WELCOME_INTENT_NAME:
                this.text = 'Привет! Я новый бот на umbot 👋';
                this.buttons.addBtn('Помощь');
                break;

            case 'help':
                this.text =
                    'Я умею:\n' +
                    '- Отвечать на приветствие\n' +
                    '- Показывать кнопки\n' +
                    '- Запоминать пользователей';
                break;

            default:
                this.text = 'Извините, я вас не понял 🤔\nСкажите "помощь" для списка команд';
                break;
        }
    }
}
```

2. Точка входа (index.ts):

```typescript
import { Bot } from 'umbot';
import { MyController } from './src/controller/MyController';
import { IncomingMessage, ServerResponse } from 'http';

const bot = new Bot();

// Конфигурация команд
bot.initConfig({
    intents: [
        {
            name: 'help',
            slots: ['помощь', 'что ты умеешь'],
        },
    ],
});

// Основные параметры
bot.initParams({
    json: __dirname + '/data', // Директория для хранения данных
    error_log: __dirname + '/logs', // Директория для логов
    isLocalStorage: true, // Использовать локальное хранилище
    welcome_text: 'Привет! Я новый бот', // Текст приветствия
});

// Инициализация логики
const controller = new MyController();
bot.initBotController(controller);

// Экспорт обработчика для serverless
module.exports = async (req: IncomingMessage, res: ServerResponse) => {
    bot.start(req, res);
};
```

##### Работа с кнопками

```typescript
import { BotController } from 'umbot';

export class ButtonController extends BotController {
    public action(intentName: string): void {
        switch (intentName) {
            case 'showButtons':
                // Добавление кнопок
                this.text = 'Выберите действие:';
                this.buttons.addBtn('Кнопка 1').addBtn('Кнопка 2', 'https://example.com'); // Кнопка с URL
                break;

            default:
                this.text = 'Скажите "покажи кнопки"';
                break;
        }
    }
}
```

##### Динамическое добавление команд

```typescript
import { mmApp, BotController } from 'umbot';

// Простая команда со словами-триггерами
mmApp.addCommand(
    'greeting',
    ['привет', 'здравствуй'],
    (userCommand: string, botController?: BotController) => {
        if (botController) {
            botController.text = 'Здравствуйте!';
        }
    },
);

// Команда с регулярными выражениями
mmApp.addCommand(
    'numbers',
    ['\\b\\d{3}\\b'], // Числа от 100 до 999
    (userCommand: string, botController?: BotController) => {
        if (botController) {
            botController.text = `Вы ввели число: ${userCommand}`;
        }
    },
    true, // isPattern = true для регулярных выражений
);

// Удаление команды по имени
mmApp.removeCommand('greeting');
```

Важные замечания:

-   При `isPattern: true` строки в `slots` интерпретируются как регулярные выражения
-   Без `isPattern` (или `isPattern: false`) происходит поиск точного совпадения слов
-   Callback-функция может возвращать строку (она станет ответом) или void
-   В callback доступен весь функционал `BotController`

#### 4. Сборка проекта

Соберите проект следующей командой

```bash
npm run build
```

#### 5. Запуск

Запустите сервер:

```bash
npm start
```

На данный момент поддерживается запуск через стандартную библиотеку `http`, но можно использовать любое удобное решение.

# Запуск приложения

Для запуска приложения загрузите его на свой сервер, и по необходимости установите ssl сертификат

# Конфигурация токенов и чувствительных данных

Для безопасного хранения токенов и других чувствительных данных, вы можете использовать два подхода:

1. Прямая передача в конфигурации:

```typescript
bot.initParams({
    telegram_token: 'your-telegram-token',
    vk_token: 'your-vk-token',
});
bot.initConfig({
    db: {
        host: 'localhost',
        user: 'user',
        password: 'password',
        database: 'bot_db',
    },
});
```

2. Использование .env файла:

```typescript
bot.initConfig({
    env: './.env',
});
```

Пример содержимого .env файла:

```text
TELEGRAM_TOKEN=your-telegram-token
VK_TOKEN=your-vk-token
VIBER_TOKEN=your-viber-token
YANDEX_TOKEN=your-alisa-token
MARUSIA_TOKEN=your-marusia-token
SMARTAPP_TOKEN=your-smartapp-token

DB_HOST=localhost
DB_USER=user
DB_PASSWORD=password
DB_NAME=bot_db
```

Вы можете комбинировать оба подхода - значения из .env файла имеют приоритет над значениями, указанными в конфигурации.

## Установка SSL сертификата

Для работы некоторых приложений, необходимо иметь ssl сертификат. Поэтому необходимо его получить. Для этого можно
воспользоваться acme.

### Установка acme.sh

```bash
curl https://get.acme.sh | sh
```

### Использование и установка сертификата для сайта

```bash
acme.sh --issue -d {{domain}} -w {{domain dir}}
```

1. domain - Название домена (example.com)
2. domain dir - Директория, в которой находится сайт

```bash
acme.sh --install-cert -d {{domain}} --key-file {{key file}} --fullchain-file {{cert file}} --reloadcmd "service nginx reload"
```

1. domain - Название домена (example.com)
2. key file - Директория, в которой хранится ключ сертификата
3. cert file - Директория, в которой сохранится сертификат

## Важно!

После получения сертификата, перезапустите сервер. Для ngnix - `sudo service nginx reload`

# 🛠 Инструменты разработчика

-   [CLI](./cli/README.md) команды
-   Шаблоны проектов: [тут](./examples/README.md)

## Полезные ссылки

-   [Создание навыка "Я никогда не"](https://www.maxim-m.ru/article/sozdanie-navyika-ya-nikogda-ne)
-   [Примеры проектов](./examples/README.md)
-   [Список изменений](./CHANGELOG.md)

# Тестирование проекта

Протестировать приложение можно 2 способами:

1. Загрузив проект на сервер (Актуально для Алисы и сбера).
2. Через консоль, средствами движка (локально).

## Тестирование на сервере

Перейти в [консоль разработчика](https://dialogs.yandex.ru/developer), и перейти на вкладку тестирования.
Данное действие актуально для Алисы. Для других платформ ссылка вставляется в соответствующую консоль разработчика.

## Тестирование в консоли

Для тестирования используется тот же код, что и для запуска.
С той лишь разницей, что нужно использовать класс `BotTest` вместо `Bot`.
Запуск будет выглядеть следующим образом:

```bash
npm run test
node index.js
```

Откроется консоль с Вашим приложением. Для выхода из режима тестирования нужно:

1. Если навык в определенный момент ставит `isEnd` в True (Что означает завершение диалога), то необходио дойти до того
   места сценария, в котором диалог завершается.
2. Вызвать команду exit.

Помимо ответов, можно вернуть время обработки команд и состояние хранилища.

# 📝 Лицензия

MIT License. См. [LICENSE](./LICENSE) для деталей.

# 🤝 Поддержка

Если у вас есть вопросы или предложения:

-   📧 Email: maximco36895@yandex.ru
-   💬 [Telegram группа](https://t.me/mm_universal_bot)
-   🐛 [Issues на GitHub](https://github.com/max36895/universal_bot-ts/issues)
