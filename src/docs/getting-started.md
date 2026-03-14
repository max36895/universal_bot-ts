# Руководство по началу работы с umbot: создание бота для Алисы, Telegram и VK на TypeScript

В этом руководстве вы узнаете, как быстро создать мультиплатформенного бота или голосовой навык для Алисы, Telegram, VK
и других платформ с помощью umbot на TypeScript. Подходит как для новичков, так и для опытных разработчиков.

## Введение

`umbot` - это универсальный фреймворк для создания чат-ботов и голосовых навыков. Основные преимущества:

- Единый код для всех платформ (Алиса, Маруся, Telegram и др.)
- Встроенное управление состоянием
- Типизация TypeScript из коробки
- Богатые возможности UI

## Быстрый старт

### 1. Установка

```bash
npm install umbot
```

### 2. Создание простого навыка

#### Базовый вариант

Для базового варианта создадим контроллер нашего бота

```ts
import { Bot, BotController, WELCOME_INTENT_NAME } from 'umbot';
import { fullPlatforms } from 'umbot/plugins';
import { join } from 'node:path';

// Создаем контроллер с логикой навыка
class MyController extends BotController {
    public action(intentName: string): void {
        switch (intentName) {
            case WELCOME_INTENT_NAME:
                this.text = 'Привет! Я новый навык.';
                this.buttons.addBtn('Помощь');
                break;

            case 'help':
                this.text = 'Я умею отвечать на команды и показывать кнопки';
                break;

            default:
                this.text = this.userCommand || 'Вы ничего не сказали';
                break;
        }
    }
}

// Инициализируем бота
const bot = new Bot();
bot.use(fullPlatforms);

// Настраиваем команды
bot.setPlatformParams({
    intents: [
        {
            name: 'help',
            slots: ['помощь', 'что ты умеешь'],
        },
    ],
});

// Настраиваем параметры
bot.setAppConfig({
    json: join(__dirname, 'data'),
    error_log: join(__dirname, 'logs'),
    isLocalStorage: true,
});

// Подключаем контроллер
bot.initBotController(MyController);

bot.start('localhost', 3000);
```

#### Минималистичный вариант

Также можно совсем не создавать BotController, и решить все задачи за счет динамического добавления команд.
Также обратите внимание на `FALLBACK_COMMAND`, обработчик будет выполнен в том случае, если не удалось найти нужную
команду. Также можно просто указать "\*", что также равносильно заданию через константу.

```ts
import { Bot, BotController, FALLBACK_COMMAND, HELP_INTENT_NAME, WELCOME_INTENT_NAME } from 'umbot';
import { fullPlatforms } from 'umbot/plugins';
import { join } from 'node:path';

const bot = new Bot()
    .use(fullPlatforms)
    .setAppConfig({
        json: join(__dirname, 'data'),
        error_log: join(__dirname, 'logs'),
        isLocalStorage: true,
    })
    .addCommand(WELCOME_INTENT_NAME, ['привет'], (_: string, bc: BotController) => {
        bc.text = 'Привет! Я новый навык.';
        bc.buttons.addBtn('Помощь');
    })
    .addCommand(HELP_INTENT_NAME, ['помощь'], (_: string, bc: BotController) => {
        bc.text = 'Я умею отвечать на команды и показывать кнопки';
    })
    .addCommand(FALLBACK_COMMAND, [], (_: string, bc: BotController) => {
        bc.text = bc.userCommand || 'Вы ничего не сказали';
    })
    .start('localhost', 3000);
```

## Основные концепции

### BotController

Базовый класс для реализации логики навыка. Предоставляет:

#### Работа с текстом

```ts
this.text = 'Ответ пользователю'; // Текст ответа
this.tts = 'Ответ для озвучки'; // TTS версия (опционально)
```

#### Управление кнопками

```ts
this.buttons
    .addBtn('Кнопка 1') // Простая кнопка
    .addBtn('Ссылка', 'https://...') // Кнопка-ссылка
    .addBtn('Действие', null, {
        // Кнопка с данными
        action: 'custom',
        value: 123,
    });
```

#### Работа с карточками

```ts
this.card
    .addImage('image.jpg') // Добавить изображение
    .setTitle('Заголовок') // Добавить заголовок
    .addDescription('Описание'); // Добавить описание
```

#### Управление состоянием

```ts
// Сохранение данных
this.userData.counter = 42;

// Получение данных
const counter = this.userData.counter || 0;
```

### Обработка команд

#### Через интенты в конфигурации

```ts
bot.setPlatformParams({
    intents: [
        {
            name: 'start_game',
            slots: ['начать игру', 'играть', 'старт'],
        },
    ],
});
```

#### Через прямые команды (Рекомендуемый способ)

```ts
bot.addCommand('greeting', ['привет', 'здравствуй'], (cmd, controller) => {
    controller.text = 'Здравствуйте!';
});
```

## Лучшие практики

### 1. Структура проекта

```
src/
├── controllers/      # Контроллеры с логикой (Если необходимо)
├── plugins/          # Дополнительные плагины (Если необходимо)
├── utils/            # Вспомогательные функции (Если необходимо)
├── config/           # Конфигурация (Если необходимо)
└── index.ts          # Точка входа
```

### 2. Типизация пользовательских данных

```ts
interface IGameState {
    score: number;
    level: number;
    lastAction?: string;
}

class GameController extends BotController<IGameState> {
    public action(intentName: string): void {
        // Теперь this.userData типизирован как IGameState
        this.userData.score = 100;
    }
}
```

### 3. Обработка ошибок

```ts
try {
    const result = await this.processUserInput();
    this.text = `Успешно: ${result}`;
} catch (error) {
    console.error('Ошибка:', error);
    this.text = 'Извините, произошла ошибка';
}
```

### 4. Работа с состоянием

```ts
// Проверка первого запуска
if (!this.userData.initialized) {
    this.userData.initialized = true;
    this.userData.score = 0;
}

// Сброс состояния
if (intentName === 'restart') {
    this.userData = {};
    this.text = 'Игра начата заново';
}
```

## Отладка

### 1. Локальное тестирование

```ts
import { BotTest } from 'umbot';
import { fullPlatforms } from 'umbot/plugins';

const bot = new BotTest();
bot.use(fullPlatforms);

// Запускает интерактивный режим в консоли: вы вводите фразы, бот отвечает
bot.test();
```

### 2. Логирование

```ts
// В контроллере
console.log('Данные:', this.userData);
console.log('Команда:', this.userCommand);

// В конфигурации
bot.setAppConfig({
    error_log: './logs',
});
bot.setAppMode('dev');
```

### 🔐 Безопасность и ReDoS

Фреймворк автоматически проверяет регулярные выражения на потенциальные ReDoS-уязвимости при вызове
`addCommand(..., isPattern: true)`.

⚠️ **По умолчанию (`strictMode: false`) небезопасные RegExp всё равно регистрируются!**  
Это сделано для гибкости в разработке, но порой **недопустимо в production**.

✅ **Рекомендация для production включить строгую проверку**:

```ts
const bot = new Bot();
bot.setAppMode('strict_prod'); // ← обязательно включите!
```

При appMode = strict_prod любая потенциально опасная RegExp будет отклонена, а её использование вызовет ошибку в
логах.

⚠️ Если вы используете slots с RegExp, убедитесь, что ваши выражения:

- не содержат вложенных квантификаторов ((a+)+);
- не используют .\* без якорей;
- ограничены по длине ({1,10} вместо \*).

## Часто задаваемые вопросы

### Как добавить поддержку новой платформы?

Достаточно создать адаптер для нужной платформы согласно документации, и после подключить его к приложению.
Если все сделано верно, то при получении запроса от новой платформы, фреймворк корректно отработает запрос, и вернет
данные в нужном для платформы виде.

### Как добавить ключи таким образом, чтобы можно было загрузить код в репозиторий?

Достаточно сохранить чувствительные данные в .env файл, передав путь к нему:

```ts
bot.setAppConfig({
    env: './.env', // путь до файла
});
```

Пример содержимого .env файла:

```text
TELEGRAM_TOKEN=your-telegram-token
VK_TOKEN=your-vk-token
VK_CONFIRMATION_TOKEN=your-vk-confirmation-token
VIBER_TOKEN=your-viber-token
YANDEX_TOKEN=your-alisa-token
MARUSIA_TOKEN=your-marusia-token

DB_HOST=localhost
DB_USER=user
DB_PASSWORD=password
DB_NAME=bot_db
```

Если все необходимые токены лежат в `process.env`, то можно в свойство `env` передать значение `local`.

```ts
bot.setAppConfig({
    env: 'local', // Получить данные из process.env
});
```

### Как сохранять данные между сессиями?

Данные в `this.userData` автоматически сохраняются между сессиями. Выберите способ хранения через параметр
`isLocalStorage`:

```ts
bot.setAppConfig({
    isLocalStorage: true, // Данные хранятся на стороне платформы
    // или
    isLocalStorage: false, // данные хранятся в вашей БД
});
```

### Как добавить кнопки быстрых ответов?

```ts
this.buttons.addBtn('Да').addBtn('Нет').addBtn('Не знаю');
```

### Как работать с изображениями?

```ts
this.card
    .addImage('image1.jpg', 'Заголовок 1', 'Описание 1')
    .addImage('image2.jpg', 'Заголовок 2', 'Описание 2')
    .setTitle('Галерея изображений');
```

Больше вопросов и ответов можно найти [тут](https://www.maxim-m.ru/bot/ts-doc/documents/FAQ)
