# API Reference

## Основные классы

### BotController

Основной класс для управления логикой бота. Предоставляет базовый функционал для обработки пользовательских запросов,
управления состоянием и взаимодействия с различными платформами.

#### Свойства

| Свойство            | Тип                      | Описание                                         |
| ------------------- | ------------------------ | ------------------------------------------------ |
| text                | string                   | Текст ответа бота                                |
| tts                 | string \| null           | Текст для преобразования в речь                  |
| buttons             | Buttons                  | Управление кнопками интерфейса                   |
| card                | Card                     | Управление карточками и галереями                |
| nlu                 | Nlu                      | Обработка естественного языка                    |
| sound               | Sound                    | Управление звуковыми эффектами                   |
| userId              | string \| number \| null | Идентификатор пользователя                       |
| userToken           | string \| null           | Токен авторизации пользователя                   |
| userCommand         | string \| null           | Текущая команда пользователя (в нижнем регистре) |
| originalUserCommand | string \| null           | Оригинальная команда пользователя                |
| userData            | TUserData                | Пользовательские данные                          |
| isAuth              | boolean                  | Статус авторизации                               |
| isScreen            | boolean                  | Наличие экрана у пользователя                    |
| isEnd               | boolean                  | Флаг завершения сессии                           |
| isSend              | boolean                  | Статус отправки запроса к API                    |

#### Методы

| Метод  | Параметры                                       | Возвращаемое значение | Описание                       |
| ------ | ----------------------------------------------- | --------------------- | ------------------------------ |
| action | intentName: string \| null, isCommand?: boolean | void                  | Обработка команды пользователя |
| run    | -                                               | void                  | Запуск обработки запроса       |

## Компоненты

### Buttons

Компонент для работы с кнопками интерфейса.

#### Методы

| Метод  | Параметры                                 | Возвращаемое значение | Описание            |
| ------ | ----------------------------------------- | --------------------- | ------------------- |
| addBtn | text: string, url?: string, payload?: any | Buttons               | Добавление кнопки   |
| clear  | -                                         | void                  | Очистка всех кнопок |

### Card

Компонент для работы с карточками и галереями.

#### Методы

| Метод     | Параметры                                                | Возвращаемое значение | Описание               |
| --------- | -------------------------------------------------------- | --------------------- | ---------------------- |
| addImage  | imageToken: string, title?: string, description?: string | Card                  | Добавление изображения |
| addHeader | text: string                                             | Card                  | Добавление заголовка   |
| addFooter | text: string                                             | Card                  | Добавление подвала     |

### Sound

Компонент для работы со звуками.

#### Методы

| Метод    | Параметры          | Возвращаемое значение | Описание                      |
| -------- | ------------------ | --------------------- | ----------------------------- |
| addSound | soundToken: string | Sound                 | Добавление звука              |
| addTts   | text: string       | Sound                 | Добавление текста для озвучки |

## Интерфейсы

### IAppConfig

Конфигурация приложения.

```typescript
interface IAppConfig {
    error_log?: string; // Путь к директории логов
    json?: string; // Путь к директории JSON
    db?: IAppDB; // Конфигурация базы данных
    isLocalStorage?: boolean; // Использование локального хранилища
}
```

### IAppParam

Параметры приложения для различных платформ.

```typescript
interface IAppParam {
    viber_token?: string | null; // Токен Viber
    telegram_token?: string | null; // Токен Telegram
    vk_token?: string | null; // Токен VK
    marusia_token?: string | null; // Токен Маруси
    yandex_token?: string | null; // Токен Яндекса
    welcome_text?: string | string[]; // Текст приветствия
    help_text?: string | string[]; // Текст помощи
    intents?: IAppIntent[] | null; // Массив интентов
}
```

### IUserData

Интерфейс для хранения пользовательских данных.

```typescript
interface IUserData {
    oldIntentName?: string; // Название предыдущего интента
    [key: string]: unknown; // Дополнительные данные
}
```

## Константы

### Типы платформ

```typescript
type TAppType =
    | 'alisa' // Яндекс.Алиса
    | 'vk' // ВКонтакте
    | 'telegram' // Telegram
    | 'viber' // Viber
    | 'marusia' // Маруся
    | 'smart_app' // Сбер SmartApp
    | 'user_application'; // Пользовательское приложение
```

### Стандартные интенты

```typescript
const WELCOME_INTENT_NAME = 'welcome'; // Интент приветствия
const HELP_INTENT_NAME = 'help'; // Интент помощи
```

## Примеры использования

### Базовый контроллер

```typescript
import { BotController, WELCOME_INTENT_NAME } from 'umbot';

class MyController extends BotController {
    public action(intentName: string | null): void {
        switch (intentName) {
            case WELCOME_INTENT_NAME:
                this.text = 'Привет! Чем могу помочь?';
                this.buttons.addBtn('Помощь').addBtn('О приложении');
                break;

            case 'about':
                this.text = 'Это пример бота на umbot';
                this.card.addHeader('О приложении').addImage('image_token').addFooter('Версия 1.0');
                break;

            default:
                this.text = 'Извините, я вас не понял';
                break;
        }
    }
}
```

### Работа с командами

```typescript
import { Bot } from 'umbot';

const bot = new Bot();

// Добавление простой команды
bot.addCommand('greeting', ['привет', 'здравствуй']);

// Добавление команды с колбэком
bot.addCommand(
    'numbers',
    ['\\b\\d{3}\\b'],
    (userCommand, botController) => {
        if (botController) {
            botController.text = `Вы ввели число: ${userCommand}`;
        }
    },
    true,
);
```

### Работа с состоянием

```typescript
interface GameData extends IUserData {
    score: number;
    level: number;
    example?: string;
    result?: number | string;
    isGame?: boolean;
}

class GameController extends BotController<GameData> {
    public action(intentName: string | null): void {
        // Инициализация данных при первом запуске
        if (!this.userData.score) {
            this.userData = {
                score: 0,
                level: 1,
            };
        }

        // Обработка команд
        switch (intentName) {
            case 'addScore':
                this.userData.score += 10;
                this.text = `Ваш счет: ${this.userData.score}`;
                break;
        }
    }
}
```

### Работа с кнопками

```typescript
class ButtonController extends BotController {
    public action(intentName: string | null): void {
        switch (intentName) {
            case 'showButtons':
                // Добавление кнопок
                this.buttons.addBtn('Помощь').addBtn('Назад').addBtn('Выход');
                this.text = 'Выберите действие:';
                break;
        }
    }
}
```

### Работа с карточками

```typescript
class CardController extends BotController {
    public action(intentName: string | null): void {
        switch (intentName) {
            case 'showCard':
                // Создание карточки
                this.card
                    .addHeader('Заголовок карточки')
                    .addImage('image_token', 'Описание изображения')
                    .addFooter('Подвал карточки');
                this.text = 'Вот ваша карточка:';
                break;
        }
    }
}
```

### Работа с NLU

```typescript
class NluController extends BotController {
    public action(intentName: string | null): void {
        // Получение интента из NLU
        const nluIntent = this.nlu.getIntent();
        if (nluIntent) {
            this.text = `Распознанный интент: ${nluIntent}`;
        } else {
            this.text = 'Не удалось распознать интент';
        }
    }
}
```

### Работа с авторизацией

```typescript
class AuthController extends BotController {
    public action(intentName: string | null): void {
        // Проверка авторизации
        if (this.isAuth) {
            this.text = 'Вы авторизованы';
            this.userToken = this.userToken || 'default_token';
        } else {
            this.text = 'Требуется авторизация';
            this.isAuth = true;
        }
    }
}
```

### Работа с оценкой

```typescript
class RatingController extends BotController {
    public action(intentName: string | null): void {
        // Проверка оценки
        if (this.isSendRating) {
            this.text = 'Спасибо за оценку!';
            this.isSendRating = false;
        } else {
            this.text = 'Пожалуйста, оцените наш сервис';
            this.isSendRating = true;
        }
    }
}
```
