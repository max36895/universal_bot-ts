# API Reference

Данный справочник содержит описание всех публичных классов, методов и интерфейсов фреймворка umbot. Для начала работы
смотрите раздел 'Быстрый старт'.

## Основные классы

### BotController

Основной класс для управления логикой приложения. Предоставляет базовый функционал для обработки пользовательских запросов,
управления состоянием и взаимодействия с различными платформами.

#### Свойства

| Свойство            | Тип                                                  | Описание                                                                                                                              |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| text                | string                                               | Текст ответа пользователю                                                                                                             |
| tts                 | string \| null                                       | Текст для озвучки (на голосовых платформах, если `null` — может быть автоматически подставлен из `text`)                              |
| buttons             | Buttons                                              | Компонент кнопок (инициализируется лениво через getter)                                                                               |
| card                | Card                                                 | Компонент карточек/галерей (инициализируется лениво через getter)                                                                     |
| nlu                 | Nlu                                                  | Данные NLU (инициализируется лениво через getter)                                                                                     |
| sound               | Sound                                                | Звуковые эффекты (инициализируется лениво через getter)                                                                               |
| userId              | string \| number \| null                             | Идентификатор пользователя                                                                                                            |
| userToken           | string \| null                                       | Токен авторизации пользователя (если платформа его предоставляет)                                                                     |
| userMeta            | unknown \| null                                      | Доп. информация о пользователе (зависит от платформы)                                                                                 |
| messageId           | number \| string \| null                             | ID сообщения (часто используется для определения “первого” сообщения)                                                                 |
| userCommand         | string \| null                                       | Команда пользователя в нижнем регистре                                                                                                |
| originalUserCommand | string \| null                                       | Оригинальная команда пользователя                                                                                                     |
| payload             | object \| string \| null \| undefined                | Дополнительные параметры запроса (payload)                                                                                            |
| userData            | TUserData                                            | Данные пользователя (БД или локальное хранилище, в зависимости от `setAppConfig`)                                                     |
| state               | TPlatformState \| null                               | Локальное хранилище платформы (если платформа поддерживает и включено `isLocalStorage`)                                               |
| isAuth              | boolean                                              | Флаг “нужно запросить авторизацию” (поддержка зависит от платформы)                                                                   |
| userEvents          | IUserEvent \| null                                   | События пользователя (авторизация/оценка), если платформа присылает                                                                   |
| isScreen            | boolean                                              | Есть ли экран у пользователя (если платформа сообщает)                                                                                |
| isEnd               | boolean                                              | Завершить диалог/сессию (поддержка зависит от платформы)                                                                              |
| skipAutoReply       | boolean                                              | Если `true`, фреймворк не будет пытаться “авто-отправить” ответ (актуально для платформ, где вы сами отправляете сообщения через API) |
| requestObject       | Record<string, unknown> \| string \| unknown \| null | Оригинальный объект запроса от платформы                                                                                              |
| thisIntentName      | string \| null                                       | Имя шага/интента, которое нужно сохранить как “следующий шаг”                                                                         |
| oldIntentName       | string \| null                                       | Имя предыдущего шага/интента (из `userData.oldIntentName` или из `state.oldIntentName`)                                               |
| emotion             | string \| null                                       | Эмоция ответа (если платформа поддерживает)                                                                                           |
| appeal              | 'official' \| 'no_official' \| null                  | Стиль обращения (если платформа поддерживает)                                                                                         |
| isSendRating        | boolean                                              | Запросить у пользователя оценку (если платформа поддерживает)                                                                         |

#### Методы

| Метод  | Параметры                                                         | Возвращаемое значение | Описание                                                                        |
| ------ | ----------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------- |
| action | intentName: string \| null, isCommand?: boolean, isStep?: boolean | void                  | Ваш основной обработчик. Вызывается фреймворком (переопределяется в наследнике) |
| run    | -                                                                 | void \| Promise<void> | Запуск обработки запроса (вызывается фреймворком; вручную обычно не вызывают)   |

## Компоненты

### Buttons

Компонент для работы с кнопками интерфейса.

#### Методы

| Метод   | Параметры                                     | Возвращаемое значение | Описание                 |
| ------- | --------------------------------------------- | --------------------- | ------------------------ |
| addBtn  | text: string, url?: string, payload?: unknown | Buttons               | Добавление кнопки        |
| addLink | text: string, url?: string, payload?: unknown | Buttons               | Добавление кнопки-ссылки |
| clear   | -                                             | void                  | Очистка всех кнопок      |

### Card

Компонент для работы с карточками и галереями.

#### Методы

| Метод          | Параметры                                                                               | Возвращаемое значение | Описание                                                         |
| -------------- | --------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------- |
| addImage       | image: string \| null, title?: string, desc?: string, button?: string \| object \| null | Card                  | Добавление изображения/элемента (4-й параметр — кнопка элемента) |
| addOneImage    | image: string \| null, title?: string, desc?: string, button?: string \| object \| null | Card                  | Заменяет текущую карточку одним изображением                     |
| setTitle       | text: string                                                                            | Card                  | Добавление заголовка                                             |
| setDescription | text: string                                                                            | Card                  | Добавление описания                                              |
| addButton      | button: string \| object                                                                | Card                  | Добавление кнопки к элементу карточки                            |
| clear          | -                                                                                       | void                  | Очистка карточки                                                 |

### Sound

Компонент для работы со звуками.

#### Методы

| Метод    | Параметры          | Возвращаемое значение | Описание         |
| -------- | ------------------ | --------------------- | ---------------- |
| addSound | soundToken: string | Sound                 | Добавление звука |

## Интерфейсы

### IAppConfig

Конфигурация приложения.

```ts
interface IAppConfig {
    error_log?: string; // Путь к директории логов
    json?: string; // Путь к директории JSON
    db?: IAppDB; // Конфигурация базы данных
    isLocalStorage?: boolean; // Использование локального хранилища
}
```

### IAppParam

Параметры приложения.

```ts
interface IAppParam {
    welcome_text?: string | string[]; // Текст приветствия
    help_text?: string | string[]; // Текст помощи
    intents?: IAppIntent[] | null; // Массив интентов
}
```

### IUserData

Интерфейс для хранения пользовательских данных.

```ts
interface IUserData {
    oldIntentName?: string; // Название предыдущего интента
    [key: string]: unknown; // Дополнительные данные
}
```

## Константы

### Стандартные интенты

```ts
const WELCOME_INTENT_NAME = 'welcome'; // Интент приветствия
const HELP_INTENT_NAME = 'help'; // Интент помощи
```

## Примеры использования

### Базовый контроллер

```ts
import { BotController, WELCOME_INTENT_NAME } from 'umbot';

class MyController extends BotController {
    public action(intentName: string | null): void {
        switch (intentName) {
            case WELCOME_INTENT_NAME:
                this.text = 'Привет! Чем могу помочь?';
                this.buttons.addBtn('Помощь').addBtn('О приложении');
                break;

            case 'about':
                this.text = 'Это пример приложения на umbot';
                this.card.setTitle('О приложении').addImage('image_token');
                break;

            default:
                this.text = 'Извините, я вас не понял';
                break;
        }
    }
}
```

### Работа с командами

```ts
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

```ts
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

```ts
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

```ts
class CardController extends BotController {
    public action(intentName: string | null): void {
        switch (intentName) {
            case 'showCard':
                // Создание карточки
                this.card
                    .setTitle('Заголовок карточки')
                    .addImage('image_token', ' ', 'Описание изображения');
                this.text = 'Вот ваша карточка:';
                break;
        }
    }
}
```

### Работа с NLU

```ts
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

```ts
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

```ts
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
