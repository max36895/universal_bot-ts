# Руководство по началу работы с umbot

## Введение

umbot - это универсальный фреймворк для создания чат-ботов и голосовых навыков. Основные преимущества:

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

```typescript
import { Bot, BotController, WELCOME_INTENT_NAME } from 'umbot';

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
                this.text = 'Извините, я вас не понял';
                break;
        }
    }
}

// Инициализируем бота
const bot = new Bot();

// Настраиваем команды
bot.setAppConfig({
    intents: [
        {
            name: 'help',
            slots: ['помощь', 'что ты умеешь'],
        },
    ],
});

// Настраиваем параметры
bot.setPlatformParams({
    json: __dirname + '/data',
    error_log: __dirname + '/logs',
    isLocalStorage: true,
});

// Подключаем контроллер
const controller = new MyController();
bot.initBotController(controller);

bot.start('localhost', 3000);
```

## Основные концепции

### BotController

Базовый класс для реализации логики навыка. Предоставляет:

1. **Работа с текстом**

```typescript
this.text = 'Ответ пользователю'; // Текст ответа
this.tts = 'Ответ для озвучки'; // TTS версия (опционально)
```

2. **Управление кнопками**

```typescript
this.buttons
    .addBtn('Кнопка 1') // Простая кнопка
    .addBtn('Ссылка', 'https://...') // Кнопка-ссылка
    .addBtn('Действие', null, {
        // Кнопка с данными
        action: 'custom',
        value: 123,
    });
```

3. **Работа с карточками**

```typescript
this.card
    .addImage('image.jpg') // Добавить изображение
    .addTitle('Заголовок') // Добавить заголовок
    .addDescription('Описание'); // Добавить описание
```

4. **Управление состоянием**

```typescript
// Сохранение данных
this.userData.counter = 42;

// Получение данных
const counter = this.userData.counter || 0;
```

### Обработка команд

1. **Через интенты в конфигурации**

```typescript
bot.setAppConfig({
    intents: [
        {
            name: 'start_game',
            slots: ['начать игру', 'играть', 'старт'],
        },
    ],
});
```

2. **Через прямые команды**

```typescript
bot.addCommand('greeting', ['привет', 'здравствуй'], (cmd, controller) => {
    controller.text = 'Здравствуйте!';
});
```

## Лучшие практики

### 1. Структура проекта

```
src/
├── controllers/        # Контроллеры с логикой
├── types/             # TypeScript типы
├── utils/             # Вспомогательные функции
├── config/            # Конфигурация
└── index.ts          # Точка входа
```

### 2. Типизация пользовательских данных

```typescript
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

```typescript
try {
    const result = await this.processUserInput();
    this.text = `Успешно: ${result}`;
} catch (error) {
    console.error('Ошибка:', error);
    this.text = 'Извините, произошла ошибка';
}
```

### 4. Работа с состоянием

```typescript
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

```typescript
import { BotTest } from 'umbot';

const bot = new BotTest();
bot.initBotController(new MyController());

// Запуск тестирования
bot.test();
```

### 2. Логирование

```typescript
// В контроллере
console.log('Данные:', this.userData);
console.log('Команда:', this.userCommand);

// В конфигурации
bot.setPlatformParams({
    error_log: './logs',
    isDevMode: true,
});
```

## Часто задаваемые вопросы

### Как добавить поддержку новой платформы?

Достаточно указать соответствующий токен в параметрах:

```typescript
bot.setPlatformParams({
    telegram_token: 'YOUR_TOKEN', // Для Telegram
    vk_token: 'YOUR_TOKEN', // Для VK
    viber_token: 'YOUR_TOKEN', // Для Viber
});
```

А также сказать самой библиотеке, какая платформа используется:

```typescript
const bot = new Bot(T_VK);
```

### Как добавить ключи таким образом, чтобы можно было загрузить код в репозиторий?

Достаточно сохранить чувствительные данные в .env файл, передав путь к нему:

```typescript
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

### Как сохранять данные между сессиями?

Данные в `this.userData` автоматически сохраняются между сессиями. Выберите способ хранения через параметр
`isLocalStorage`:

```typescript
bot.setPlatformParams({
    isLocalStorage: true, // Файловое хранилище
    // или
    isLocalStorage: false, // База данных
});
```

### Как добавить кнопки быстрых ответов?

```typescript
this.buttons.addBtn('Да').addBtn('Нет').addBtn('Не знаю');
```

### Как работать с изображениями?

```typescript
this.card.addImage('image.jpg', 'Заголовок', 'Описание').addTitle('Галерея изображений');
```
