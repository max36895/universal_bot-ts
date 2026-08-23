# API Reference

Данный справочник содержит описание всех публичных классов, методов и интерфейсов фреймворка umbot. Для начала работы
смотрите раздел 'Быстрый старт'.

## Основные классы

### BotController

Основной класс для управления логикой приложения. Предоставляет базовый функционал для обработки пользовательских запросов,
управления состоянием и взаимодействия с различными платформами.

#### Свойства

| Свойство            | Тип                                                      | Описание                                                                                                                              |
| ------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| text                | string                                                   | Текст ответа пользователю                                                                                                             |
| tts                 | string \| null                                           | Текст для озвучки (на голосовых платформах, если `null` — может быть автоматически подставлен из `text`)                              |
| buttons             | Buttons                                                  | Компонент кнопок (инициализируется лениво через getter)                                                                               |
| card                | Card                                                     | Компонент карточек/галерей (инициализируется лениво через getter)                                                                     |
| nlu                 | Nlu                                                      | Данные NLU (инициализируется лениво через getter)                                                                                     |
| sound               | Sound                                                    | Звуковые эффекты (инициализируется лениво через getter)                                                                               |
| userId              | string \| number \| null                                 | Идентификатор пользователя                                                                                                            |
| userToken           | string \| null                                           | Токен авторизации пользователя (если платформа его предоставляет)                                                                     |
| userMeta            | unknown \| null                                          | Доп. информация о пользователе (зависит от платформы)                                                                                 |
| messageId           | number \| string \| null                                 | ID сообщения (часто используется для определения “первого” сообщения)                                                                 |
| userCommand         | string \| null                                           | Команда пользователя в нижнем регистре                                                                                                |
| originalUserCommand | string \| null                                           | Оригинальная команда пользователя                                                                                                     |
| payload             | Record\<string, unknown\> \| string \| null \| undefined | Дополнительные параметры запроса (payload)                                                                                            |
| userData            | TUserData                                                | Данные пользователя (БД или локальное хранилище, в зависимости от `setAppConfig`)                                                     |
| state               | TPlatformState \| null                                   | Локальное хранилище платформы (если платформа поддерживает и включено `isLocalStorage`)                                               |
| isAuth              | boolean                                                  | Флаг “нужно запросить авторизацию” (поддержка зависит от платформы)                                                                   |
| userEvents          | IUserEvent \| null                                       | События пользователя (авторизация/оценка), если платформа присылает                                                                   |
| isScreen            | boolean                                                  | Есть ли экран у пользователя (если платформа сообщает)                                                                                |
| isEnd               | boolean                                                  | Завершить диалог/сессию (поддержка зависит от платформы)                                                                              |
| skipAutoReply       | boolean                                                  | Если `true`, фреймворк не будет пытаться “авто-отправить” ответ (актуально для платформ, где вы сами отправляете сообщения через API) |
| requestObject       | Record<string, unknown> \| string \| unknown \| null     | Оригинальный объект запроса от платформы                                                                                              |
| thisIntentName      | string \| null                                           | Имя шага/интента, которое нужно сохранить как “следующий шаг”                                                                         |
| oldIntentName       | string \| null                                           | Имя предыдущего шага/интента (из `userData.oldIntentName` или из `state.oldIntentName`)                                               |
| emotion             | string \| null                                           | Эмоция ответа (если платформа поддерживает)                                                                                           |
| appeal              | 'official' \| 'no_official' \| null                      | Стиль обращения (если платформа поддерживает)                                                                                         |
| isSendRating        | boolean                                                  | Запросить у пользователя оценку (если платформа поддерживает)                                                                         |
| appContext          | AppContext                                               | Контекст приложения (конфиг, реестры, логгер)                                                                                         |

#### Методы

| Метод  | Параметры                                                         | Возвращаемое значение | Описание                                                                        |
| ------ | ----------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------- |
| action | intentName: string \| null, isCommand?: boolean, isStep?: boolean | void                  | Ваш основной обработчик. Вызывается фреймворком (переопределяется в наследнике) |
| run    | -                                                                 | void \| Promise<void> | Запуск обработки запроса (вызывается фреймворком; вручную обычно не вызывают)   |

### Bot

Основной класс-оркестратор. Управляет жизненным циклом, middleware, регистрацией команд и запуском сервера.

#### Методы

| Метод                    | Параметры                                                                                                                                            | Возвращаемое значение         | Описание                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| setAppConfig             | config: Partial\<IAppConfig\>                                                                                                                        | Bot                           | Установка конфигурации приложения                           |
| setAppMode               | mode: TAppMode (`'dev' \| 'prod' \| 'strict_prod'`)                                                                                                  | Bot                           | Установка режима работы                                     |
| setPlatformParams        | params: IAppParam                                                                                                                                    | Bot                           | Установка параметров платформы                              |
| initBotController        | controller: TBotControllerClass                                                                                                                      | Bot                           | Подключение класса контроллера                              |
| addCommand               | commandName: string, slots: TSlots, cb: (userCommand: string, bc: BotController) => void \| string \| Promise\<void \| string\>, isPattern?: boolean | Bot                           | Регистрация команды                                         |
| removeCommand            | commandName: string                                                                                                                                  | Bot                           | Удаление команды по имени                                   |
| clearCommands            | -                                                                                                                                                    | Bot                           | Удаление всех команд                                        |
| addStep                  | stepName: string, handler: IStepParam['cb']                                                                                                          | Bot                           | Регистрация шага (цепочки диалога)                          |
| removeStep               | stepName: string                                                                                                                                     | Bot                           | Удаление шага по имени                                      |
| clearSteps               | -                                                                                                                                                    | Bot                           | Удаление всех шагов                                         |
| addForm                  | formName: string, options: IAddFormOptions                                                                                                           | Bot                           | Регистрация многошаговой формы с валидацией полей           |
| removeForm               | formName: string                                                                                                                                     | Bot                           | Удаление формы и всех её шагов                              |
| use                      | fn: MiddlewareFn \| platform: TAppType, fn: MiddlewareFn \| plugin: TPlugin                                                                          | Bot                           | Подключение middleware или плагина                          |
| clearUse                 | -                                                                                                                                                    | Bot                           | Удаление всех плагинов и middleware                         |
| setCustomCommandResolver | resolver: TCommandResolver                                                                                                                           | Bot                           | Установка кастомного резолвера команд                       |
| setCommandGroupMode      | mode: TCommandGroupMode                                                                                                                              | Bot                           | Режим группировки RegExp                                    |
| setPlatformResolver      | resolver: TPlatformResolver                                                                                                                          | Bot                           | Установка функции определения платформы                     |
| setLogger                | logger: ILogger \| null                                                                                                                              | Bot                           | Установка кастомного логгера (null — отключить)             |
| getAppContext            | -                                                                                                                                                    | AppContext                    | Получение контекста приложения                              |
| setContent               | content: TBotContent (`object \| string \| null`)                                                                                                    | void                          | Установка содержимого запроса (для тестирования)            |
| run                      | appType?: TAppType \| null, content?: string \| object \| null, auth?: TBotAuth                                                                      | Promise\<TRunResult\>         | Обработка входящего запроса                                 |
| webhookHandle            | req: IncomingMessage, res: ServerResponse, responseCb?: TBotResponseCb                                                                               | Promise\<void\>               | Обработчик HTTP-запроса (для Express/Fastify интеграции)    |
| start                    | hostname?: string, port?: number, responseCb?: TBotResponseCb                                                                                        | Server                        | Запуск HTTP-сервера (возвращает экземпляр Server)           |
| close                    | -                                                                                                                                                    | Promise\<void\>               | Остановка HTTP-сервера и очистка ресурсов                   |
| send                     | userId: string \| number, controllerOrText: BotController \| string, platform: TAppType                                                              | Promise\<unknown \| boolean\> | Отправка сообщения пользователю (для платформ с поддержкой) |

## Компоненты

### Buttons

Компонент для работы с кнопками интерфейса.

#### Методы

| Метод         | Параметры                                                                                       | Возвращаемое значение | Описание                                                |
| ------------- | ----------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------- |
| addBtn        | title: string \| null, url?: string \| null, payload?: TButtonPayload, options?: IButtonOptions | this                  | Добавление кнопки                                       |
| addLink       | title: string \| null, url?: string, payload?: TButtonPayload, options?: IButtonOptions         | this                  | Добавление кнопки-ссылки                                |
| getButtons    | buttonProcessing: TButtonProcessing                                                             | T \| null             | Получение массива кнопок, адаптированного под платформу |
| getButtonJson | buttonProcessing: TButtonProcessing                                                             | string \| null        | JSON-представление кнопок для платформы                 |
| clear         | -                                                                                               | void                  | Очистка всех кнопок                                     |

### Card

Компонент для работы с карточками и галереями.

#### Методы

| Метод          | Параметры                                                                      | Возвращаемое значение | Описание                                                         |
| -------------- | ------------------------------------------------------------------------------ | --------------------- | ---------------------------------------------------------------- |
| addImage       | image: string \| null, title?: string, desc?: string, button?: TButton \| null | this                  | Добавление изображения/элемента (4-й параметр — кнопка элемента) |
| addOneImage    | image: string \| null, title?: string, desc?: string, button?: TButton \| null | this                  | Заменяет текущую карточку одним изображением                     |
| setTitle       | text: string                                                                   | this                  | Добавление заголовка                                             |
| setDescription | text: string                                                                   | this                  | Добавление описания                                              |
| addButton      | button: TButton                                                                | this                  | Добавление кнопки к элементу карточки                            |
| clear          | -                                                                              | void                  | Очистка карточки                                                 |

### Sound

Компонент для работы со звуками. Поддерживает стандартные звуки платформ (Алиса, Маруся) и пользовательские аудиофайлы.

#### Свойства

| Свойство            | Тип      | Описание                                                      |
| ------------------- | -------- | ------------------------------------------------------------- |
| sounds              | ISound[] | Массив пользовательских звуков                                |
| isUsedStandardSound | boolean  | Использовать стандартные звуки платформы (по умолчанию: true) |

#### Методы

| Метод     | Параметры                                                                                     | Возвращаемое значение | Описание                                              |
| --------- | --------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------- |
| getSounds | text: string \| null, soundProcessing: TSoundProcessing\<TResult\>, controller: BotController | Promise\<TResult\>    | Получение текста со встроенными звуками для платформы |

## Интерфейсы

### IAppConfig

Конфигурация приложения.

```ts
interface IAppConfig {
    error_log?: string; // Путь к директории логов
    json?: string; // Путь к директории JSON
    db?: IAppDB; // Конфигурация базы данных
    isLocalStorage?: boolean; // Использование локального хранилища
    env?: string; // Путь к .env файлу или 'local' для process.env
    tokens?: ITokenPlatform; // Токены платформ (telegram, vk и др.)
}
```

### IAppParam

Параметры приложения.

```ts
interface IAppParam {
    isAuthUser?: boolean; // Требуется ли авторизация пользователя
    welcome_text?: string | string[]; // Текст приветствия
    help_text?: string | string[]; // Текст помощи
    empty_text?: string | string[]; // Текст при отсутствии подходящих команд
    intents: IAppIntent[] | null; // Массив интентов
    utm_text?: string | null; // UTM-метка для ссылок
}
```

### IUserData

Интерфейс для хранения пользовательских данных.

```ts
interface IUserData {
    oldIntentName?: string | null; // Название предыдущего интента (null при сбросе)
    [key: string]: unknown; // Дополнительные данные
}
```

## Константы

### Стандартные интенты

```ts
const WELCOME_INTENT_NAME = 'welcome'; // Интент приветствия
const HELP_INTENT_NAME = 'help'; // Интент помощи
const FALLBACK_COMMAND = '*'; // Команда-заглушка (вызывается при отсутствии совпадений)
```

## Типы и утилиты

### Middleware

```ts
// Функция для обработки следующего шага в цепочке middleware
type MiddlewareNext = () => Promise<void>;

// Функция промежуточной обработки
type MiddlewareFn = (ctx: BotController, next: MiddlewareNext) => void | Promise<void>;
```

### Команды и шаги

```ts
// Параметры зарегистрированной команды
interface ICommandParam<TBotController extends BotController = BotController> {
    slots?: TSlots; // Триггеры активации (строки или RegExp)
    isPattern?: boolean; // Интерпретировать slots как RegExp
    cb: (
        userCommand: string,
        botController: TBotController,
    ) => void | string | Promise<void | string>;
    regExp?: RegExp; // Скомпилированное RegExp (заполняется автоматически)
    isRegExpString: boolean; // Флаг строкового RegExp
}

// Параметры шага (цепочки диалога)
interface IStepParam<TBotController extends BotController = BotController> {
    stepName: string; // Уникальное имя шага
    cb: (botController: TBotController) => void | Promise<void> | false;
}

// Тип слотов команды
type TSlots = (string | RegExp)[];

// Кастомный резолвер команд
type TCommandResolver = (
    userCommand: string,
    commands: Map<string, ICommandParam>,
) => string | null | Promise<string | null>;
```

### Формы (`addForm`)

Многошаговая форма — обёртка над шагами: каждое поле становится отдельным шагом, ответы собираются в объект и передаются в `onComplete`.

```ts
// Одно поле формы
interface IAddFormField<TBotController extends BotController = BotController> {
    name: string; // Ключ поля в объекте ответов
    prompt: string | ((ctx: TBotController) => string); // Вопрос пользователю
    // true — принято; false — повторить prompt; string — текст ошибки пользователю
    validate?: (value: string) => boolean | string | Promise<boolean | string>;
}

// Параметры addForm
interface IAddFormOptions<TBotController extends BotController = BotController> {
    fields: IAddFormField<TBotController>[]; // Поля, обрабатываются последовательно
    onComplete: (ctx: TBotController, answers: Record<string, string>) => void | Promise<void>; // Вызывается после заполнения всех полей
    cancelText?: string; // Текст при отмене (по умолчанию 'Форма отменена.')
    cancelCommands?: string[]; // Команды отмены (по умолчанию ['отмена', 'cancel'])
}
```

```ts
bot.addForm('registration', {
    fields: [
        { name: 'name', prompt: 'Как вас зовут?' },
        {
            name: 'email',
            prompt: 'Укажите email',
            validate: (v) => /\S+@\S+/.test(v) || 'Некорректный email',
        },
    ],
    onComplete: (ctx, answers) => {
        ctx.text = `Спасибо, ${answers.name}! Мы записали ваш email: ${answers.email}`;
    },
});
```

> `removeForm('registration')` удаляет форму и все её внутренние шаги. Имена шагов формы имеют префикс `__form_<имя>_`, поэтому `removeForm('user')` удалит и форму `user_2` — используйте уникальные имена.

### Утилиты для кнопок

```ts
// Создание интерактивной кнопки
getButton(
    appContext: AppContext,
    title: string | null,
    url: string | null,
    payload: TButtonPayload | null,
    options?: IButtonOptions
): IButtonType | null

// Создание кнопки-ссылки
getLinkButton(
    appContext: AppContext,
    title: string | null,
    url: string | null,
    payload: TButtonPayload | null,
    options?: IButtonOptions
): IButtonType | null
```

### Утилита для изображений

```ts
// Создание изображения для карточки
getImage(
    appContext: AppContext,
    image: string | null,
    title: string,
    desc?: string,
    button?: TButton | null,
    isToken?: boolean
): IImageType | null
```

### Результат выполнения

```ts
// Результат обработки запроса
type TRunResult = object | string;
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
bot.addCommand('greeting', ['привет', 'здравствуй'], (_, bc) => 'Привет!');

// Добавление команды с колбэком
bot.addCommand(
    'numbers',
    ['\\b\\d{3}\\b'],
    (userCommand, botController) => {
        botController.text = `Вы ввели число: ${userCommand}`;
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
        // Получение интента из NLU (например, 'YANDEX.CONFIRM')
        const nluIntent = this.nlu.getIntent('YANDEX.CONFIRM');
        if (nluIntent) {
            // nluIntent — объект INluIntent со свойством slots
            this.text = `Найдены слоты: ${JSON.stringify(nluIntent.slots)}`;
        } else {
            this.text = 'Интент не найден';
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

## Дополнительные классы

### AppContext

Контекст приложения — синглтон-хранилище конфигурации, реестров и подключенных модулей.

#### Основные свойства

| Свойство         | Тип                                                                               | Описание                                           |
| ---------------- | --------------------------------------------------------------------------------- | -------------------------------------------------- |
| `appConfig`      | `IAppConfig`                                                                      | Текущая конфигурация                               |
| `platformParams` | `IAppParam`                                                                       | Параметры платформы                                |
| `platforms`      | `Record<TAppType, IPlatformAdapter>`                                              | Реестр подключенных платформ                       |
| `database`       | `{ adapter?: IDatabaseAdapter, databaseInfo?: unknown, isSendConnect?: boolean }` | Подключенный DB-адаптер и информация о подключении |
| `commands`       | `Map<string, ICommandParam>`                                                      | Реестр команд                                      |
| `steps`          | `Map<string, IStepParam>`                                                         | Реестр шагов                                       |
| `httpClient`     | `THttpClient`                                                                     | HTTP-клиент (кастомизируемый)                      |
| `plugins`        | `Record<string, unknown>`                                                         | Реестр плагинов                                    |

#### Методы

| Метод                           | Описание                   |
| ------------------------------- | -------------------------- |
| `log(...args)`                  | Логирование                |
| `logError(msg, meta?)`          | Логирование ошибок         |
| `logWarn(msg, meta?)`           | Логирование предупреждений |
| `logMetric(name, value, label)` | Логирование метрик         |

### Navigation

Компонент для постраничной навигации по спискам и меню.

```ts
import { Navigation } from 'umbot';

const nav = new Navigation(5); // 5 элементов на странице
const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Получение элементов текущей страницы
const page = nav.getPageElements(elements);

// Навигация по командам
nav.getPageElements(elements, 'дальше'); // следующая страница
nav.getPageElements(elements, 'назад'); // предыдущая страница

// Поиск элемента
const item = nav.selectedElement(elements, 'iPhone', ['title']);
```

#### Методы Navigation

| Метод             | Параметры                                                                         | Возвращаемое значение | Описание                                                                      |
| ----------------- | --------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| `getPageElements` | `elements: T[]`, `text?: string`                                                  | `T[]`                 | Элементы текущей страницы (мутирует `thisPage` при "дальше"/"назад")          |
| `selectedElement` | `elements: T[]`, `text: string`, `keys?: string \| string[]`, `thisPage?: number` | `T \| null`           | Поиск элемента по значению (по номеру или по похожести текста)                |
| `getPageNav`      | `isNumber?: boolean`                                                              | `string[]`            | Подписи кнопок пагинации: `['👈 Назад', 'Дальше 👉']` или `['1', '[2]', '3']` |
| `getPageInfo`     | -                                                                                 | `string`              | Информация о текущей странице: `"N страница из M"` (или пустая строка)        |
| `getMaxPage`      | `elements?: T[] \| null`                                                          | `number`              | Количество страниц                                                            |
| `numberPage`      | `text: string`                                                                    | `boolean`             | Распознать команду вида `"2 страница"` и перейти                              |

#### Свойства

| Свойство             | Тип      | Описание                           |
| -------------------- | -------- | ---------------------------------- |
| `thisPage`           | `number` | Номер текущей страницы (0-indexed) |
| `maxVisibleElements` | `number` | Максимум элементов на странице     |

### Preload

Предзагрузка медиаресурсов на серверы платформ.

```ts
import { Preload } from 'umbot/preload';
import { T_ALISA, T_TELEGRAM } from 'umbot/plugins';

const preload = new Preload(bot.getAppContext());

// Загрузка изображений
await Promise.all(preload.loadImages(['./img.jpg'], [T_ALISA]));

// Загрузка звуков
await Promise.all(preload.loadSounds(['./sound.mp3'], [T_ALISA]));

// Telegram требует ID получателя
await Promise.all(preload.loadImages(['./img.jpg'], [T_TELEGRAM], { telegramUseId: 123 }));
```

#### Методы Preload

| Метод          | Параметры                                              | Возвращаемое значение       | Описание                                                                      |
| -------------- | ------------------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------- |
| `loadImages`   | `paths: string[]`, `platforms: TAppType[]`, `options?` | `Promise<string \| null>[]` | Загрузить изображения (разрешается токеном изображения или `null` при ошибке) |
| `loadSounds`   | `paths: string[]`, `platforms: TAppType[]`, `options?` | `Promise<string \| null>[]` | Загрузить звуки (разрешается токеном звука или `null` при ошибке)             |
| `removeImages` | `paths: string[]`, `platforms: TAppType[]`             | `Promise<boolean>[]`        | Удалить изображения                                                           |
| `removeSounds` | `paths: string[]`, `platforms: TAppType[]`             | `Promise<boolean>[]`        | Удалить звуки                                                                 |

### ILogger

Интерфейс кастомного логгера. Все методы опциональны.

```ts
interface ILogger {
    log?(...args: unknown[]): void;
    error?(message: string, meta?: Record<string, unknown>): void;
    warn?(message: string, meta?: Record<string, unknown>): void;
    metric?(name: string, value: unknown, labels?: Record<string, unknown>): void;
    maskSecrets?: boolean; // По умолчанию true в strict_prod
}
```

### IPlugin / IPluginFn

Интерфейсы для расширений фреймворка.

```ts
// Класс-плагин
interface IPlugin {
    init: (appContext: AppContext, bot: Bot) => void;
    destroy: (bot: Bot) => void | Promise<void>;
}

// Функция-плагин (рекомендуется)
interface IPluginFn {
    (appContext: AppContext, bot: Bot): void | ((bot: Bot) => void);
    isPlugin: boolean; // ОБЯЗАТЕЛЬНО: myPlugin.isPlugin = true;
}
```

> **Рекомендация:** вместо ручного присваивания `myPlugin.isPlugin = true` используйте хелпер `createPlugin()` — он выставляет флаг автоматически, и забыть его невозможно:
>
> ```ts
> import { createPlugin } from 'umbot';
>
> const myPlugin = createPlugin((appContext, bot) => {
>     // логика инициализации
>     return () => {
>         // логика очистки при уничтожении
>     };
> });
> bot.use(myPlugin);
> ```

### SoundConstants

Константы стандартных звуков и эффектов.

| Константа                 | Описание                      |
| ------------------------- | ----------------------------- |
| `S_AUDIO_GAME_WIN`        | Звук победы                   |
| `S_AUDIO_GAME_LOSS`       | Звук проигрыша                |
| `S_AUDIO_GAME_8_BIT_COIN` | Монетка                       |
| `S_AUDIO_NATURE_RAIN`     | Дождь                         |
| `S_AUDIO_NATURE_SEA`      | Море                          |
| `S_EFFECT_HAMSTER`        | Эффект хомяка (высокий голос) |
| `S_EFFECT_MEGAPHONE`      | Эффект мегафона               |

Полный список — в `src/components/sound/constants.ts`.

### Text

Утилита для работы со строками.

| Метод            | Параметры                                                                                                                                             | Возвращаемое значение | Описание                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------ |
| `Text.resize`    | `text: string \| null`, `size?: number`, `isEllipsis?: boolean`                                                                                       | `string`              | Обрезка строки по длине              |
| `Text.getText`   | `str?: string \| string[]`                                                                                                                            | `string`              | Выбор случайного элемента из массива |
| `Text.isSayText` | `find: string \| RegExp \| (string \| RegExp)[]`, `text: string`, `isPattern?: boolean`, `useDirectRegExp?: boolean`, `customReg?: RegExpConstructor` | `boolean`             | Проверка совпадения слота с текстом  |

## Метрики

Фреймворк собирает метрики времени выполнения ключевых операций. Для включения реализуйте метод `metric()` в логгере.

| Метрика              | Константа               | Что измеряет                        |
| -------------------- | ----------------------- | ----------------------------------- |
| Время запроса        | `EMetric.REQUEST`       | Общее время обработки HTTP-запроса  |
| Начало webhook       | `EMetric.START_WEBHOOK` | Момент начала обработки запроса     |
| Время webhook        | `EMetric.END_WEBHOOK`   | Общее время обработки webhook       |
| Поиск интента        | `EMetric.GET_INTENT`    | Время поиска подходящего интента    |
| Поиск команды        | `EMetric.GET_COMMAND`   | Время поиска подходящей команды     |
| Выполнение action    | `EMetric.ACTION`        | Время выполнения вашего `action()`  |
| Middleware           | `EMetric.MIDDLEWARE`    | Время выполнения middleware-цепочки |
| Запрос к БД (SELECT) | `EMetric.DB_SELECT`     | Время выполнения SELECT             |
| Запрос к БД (INSERT) | `EMetric.DB_INSERT`     | Время выполнения INSERT             |
| Запрос к БД (UPDATE) | `EMetric.DB_UPDATE`     | Время выполнения UPDATE             |
| Запрос к БД (REMOVE) | `EMetric.DB_REMOVE`     | Время выполнения DELETE             |

Пример подключения:

```ts
bot.setLogger({
    metric: (name: string, value: unknown, meta?: Record<string, unknown>) => {
        console.log(`[METRIC] ${name}: ${value}`, meta);
    },
});
```

## Модели

### Model

Базовый класс для работы с данными в БД. Наследуйтесь для создания кастомных моделей (таблиц лидеров, каталогов и т.д.).

```ts
import { Model, IModelState, IModelRules, AppContext } from 'umbot';

interface IScoreState extends IModelState {
    userId: string | null;
    score: number | null;
}

const RULES: IModelRules[] = [
    { name: ['userId'], type: 'string', max: 250 },
    { name: ['score'], type: 'integer' },
];

export class ScoreModel extends Model<IScoreState> {
    public static readonly TABLE_NAME = 'Scores';

    constructor(appContext: AppContext) {
        super(appContext);
        this.state = { userId: null, score: null };
    }

    rules() {
        return RULES;
    }
    attributeLabels() {
        return { userId: 'ID', score: 'Score' };
    }
    tableName() {
        return ScoreModel.TABLE_NAME;
    }
}
```

#### Методы Model

| Метод                   | Описание                                       |
| ----------------------- | ---------------------------------------------- |
| `add()`                 | Вставка новой записи                           |
| `update()`              | Обновление текущей записи                      |
| `remove()`              | Удаление записи                                |
| `whereOne(where?)`      | Поиск одной записи по условиям                 |
| `where(where?, isOne?)` | Поиск записей по условиям                      |
| `query(callback)`       | Сырой запрос к БД                              |
| `save(isNew?)`          | Сохранение (add если isNew=true, иначе update) |

### UsersData

Встроенная модель для хранения `userData`. Обычно не используется напрямую — фреймворк работает с ней автоматически через `controller.userData`.

### ImageTokens / SoundTokens

Встроенные модели для кэширования токенов загруженных медиа. Управляются фреймворком автоматически через `Preload` и компоненты `Card`/`Sound`.

---

## Схема встроенных таблиц БД

Когда вы подключаете `MongoAdapter` или `FileAdapter`, umbot автоматически заводит следующие таблицы (коллекции).

### Таблица: `UsersData`

Хранит состояние между запросами для каждого пользователя на каждой платформе.

| Поле       | Тип                     | Описание                                              |
| ---------- | ----------------------- | ----------------------------------------------------- |
| `userId`   | string \| number        | ID пользователя (primary key)                         |
| `data`     | Record<string, unknown> | Содержимое `ctx.userData` — произвольный JSON         |
| `meta`     | Record<string, unknown> | Метаданные: когда создан, последний запрос, платформа |
| `platform` | string                  | Имя платформы ('telegram', 'alisa', ...)              |

Индексы: по `userId + platform`.

### Таблица: `ImageTokens`

Кэш для изображений, которые нужно загрузить в платформу про их отправке.

| Поле         | Тип    | Описание                                             |
| ------------ | ------ | ---------------------------------------------------- |
| `imageToken` | string | Уникальный ID изображения на платформе (primary key) |
| `path`       | string | Локальный путь или CDN URL оригинала                 |
| `platform`   | string | Имя платформы для которой загружено                  |

Повторное использование одного и того же `path` не перезагружает изображение.

### Таблица: `SoundTokens`

Аналог ImageTokens для аудиофайлов.

| Поле         | Тип    | Описание                                       |
| ------------ | ------ | ---------------------------------------------- |
| `soundToken` | string | Уникальный ID звука на платформе (primary key) |
| `path`       | string | Локальный путь или CDN URL оригинала           |
| `platform`   | string | Имя платформы                                  |

### Пользовательские таблицы

Если вы создаёте свою модель — наследуйте от `Model`:

```ts
import { Model, IModelState, IModelRules, AppContext } from 'umbot';

interface IMyState extends IModelState {
    id: string | null;
    name: string | null;
    age: number | null;
}

const RULES: IModelRules[] = [
    { name: ['name'], type: 'string', max: 200 },
    { name: ['age'], type: 'integer' },
];

class MyTable extends Model<IMyState> {
    constructor(appContext: AppContext) {
        super(appContext);
        this.state = { id: null, name: null, age: null };
    }

    rules() {
        return RULES;
    }

    attributeLabels() {
        return { id: 'ID', name: 'Имя', age: 'Возраст' };
    }

    tableName() {
        return 'my_table';
    }
}
```

> **Обратите внимание:** `tableName()`, `rules()` и `attributeLabels()` — публичные абстрактные методы, переопределять их нужно без модификатора `protected`. Допустимые типы полей в `rules()`: `'text' | 'string' | 'integer' | 'int' | 'date' | 'bool'`. Первичный ключ определяется автоматически по метке `'id'`/`'ID'` в `attributeLabels()`.

### Требования к БД-провайдеру

| Провайдер        | Заметки                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------- |
| **FileAdapter**  | Простой JSON-файл в `./json`. Не потокобезопасен, только для разработки/локальных тестов. |
| **MongoAdapter** | Production-ready. Требует MongoDB >= 5.                                                   |

Все таблицы создаются автоматически на первом запросе.
