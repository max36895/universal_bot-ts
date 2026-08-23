# Тестирование проекта

## Тестирование на сервере

Перейти в [консоль разработчика](https://dialogs.yandex.ru/developer), и перейти на вкладку тестирования.
Данное действие актуально для Алисы. Для других платформ ссылка вставляется в соответствующую консоль разработчика.

## Локальное тестирование (рекомендуется)

**Не нужно разворачивать сервер для отладки!**

Для тестирования используется тот же код, что и для запуска.
С той лишь разницей, что нужно использовать класс `BotTest` вместо `Bot`.

```ts
import { BotTest } from 'umbot/test';

const bot = new BotTest();
await bot.test(); // запускает интерактивную консоль
```

Запуск будет выглядеть следующим образом:

```bash
node index.js
```

Откроется консоль с Вашим приложением. Для выхода из режима тестирования нужно:

1. Если навык в определенный момент ставит `isEnd` в True (что означает завершение диалога), то необходимо дойти до того
   места сценария, в котором диалог завершается.
2. Вызвать команду exit.

### Тестирование конкретной платформы

По умолчанию `BotTest` использует автоопределение платформы (`'auto'`). Чтобы протестировать конкретную платформу, передайте тип в конструктор:

```ts
import { BotTest } from 'umbot/test';

// Тестирование Telegram
const bot = new BotTest('telegram');
```

```ts
import { BotTest } from 'umbot/test';

// Тестирование Алисы
const bot = new BotTest('alisa');
```

### Параметры тестирования

Класс `BotTest` принимает объект `IBotTestParams` с настройками отображения результатов:

| Параметр      | Тип     | По умолчанию | Описание                                          |
| ------------- | ------- | ------------ | ------------------------------------------------- |
| isShowResult  | boolean | false        | Отображать полный ответ платформы в формате JSON  |
| isShowStorage | boolean | false        | Отображать данные из хранилища (userData и state) |
| isShowTime    | boolean | true         | Отображать время выполнения запроса в мс          |

```ts
const bot = new BotTest();

// Расширенное тестирование с отображением всех данных
await bot.test({
    isShowResult: true, // Показать JSON-ответ платформы
    isShowStorage: true, // Показать данные пользователя и хранилища
    isShowTime: true, // Показать время выполнения
});
```

### Тестирование с настройкой платформы

```ts
import { BotTest } from 'umbot/test';
import { TelegramAdapter } from 'umbot/plugins';

const bot = new BotTest('telegram');

bot.use(new TelegramAdapter('your-token'));
bot.setPlatformParams({
    intents: [
        {
            name: 'greeting',
            slots: ['привет', 'здравствуйте'],
        },
    ],
});

bot.initBotController(MyController);

await bot.test({
    isShowResult: true,
    isShowStorage: true,
});
```

### Автоматизированное тестирование

`BotTest` можно использовать в unit-тестах для проверки логики:

```ts
import { BotTest } from 'umbot/test';
import { MyController } from './MyController';

describe('MyController', () => {
    it('should greet user', async () => {
        const bot = new BotTest();
        bot.initBotController(MyController);

        // Запуск обработки запроса
        const result = await bot.run(
            'alisa',
            JSON.stringify({
                request: { command: 'привет', original_utterance: 'Привет' },
            }),
        );

        // Проверка результата
        expect(result).toBeDefined();
    });
});
```

### Симуляция запроса: `simulate()`

Вместо ручной сборки JSON-запроса платформы можно использовать `simulate()` — метод сам сгенерирует корректный payload для указанной платформы и вызовет `run()`:

```ts
import { BotTest } from 'umbot/test';
import { TelegramAdapter } from 'umbot/plugins';

const bot = new BotTest();
bot.use(new TelegramAdapter());
bot.addCommand('start', ['привет'], (_, ctx) => {
    ctx.text = 'Привет!';
});

// Автоматически сгенерирует Telegram-update и вызовет run()
const res = await bot.simulate('привет', { platform: 'telegram' });
console.log(res.response.text); // 'Привет!'
```

Параметры `simulate(query, options)`:

| Параметр           | Тип                | По умолчанию                                         | Описание                                          |
| ------------------ | ------------------ | ---------------------------------------------------- | ------------------------------------------------- |
| `query`            | `string`           | —                                                    | Текст пользователя                                |
| `options.platform` | `TAppType`         | платформа конструктора или первая зарегистрированная | Платформа, для которой генерируется запрос        |
| `options.userId`   | `string`           | `'test_user'`                                        | ID пользователя                                   |
| `options.count`    | `number`           | `0`                                                  | Номер сообщения (`0` — новый пользователь/сессия) |
| `options.state`    | `object \| string` | `{}`                                                 | Предзаполненное состояние сессии                  |

Метод возвращает ответ платформы — тот же результат, что и `run()`.

### Jest-тесты с полной настройкой

Более детальный пример с настройкой платформы и проверкой ответа:

```ts
import { BotTest } from 'umbot/test';
import { fullPlatforms, T_ALISA } from 'umbot/plugins';
import { MyController } from '../../src/controller/MyController';

describe('MyController', () => {
    let bot: BotTest;

    beforeAll(() => {
        bot = new BotTest();
        bot.use(fullPlatforms);
        bot.setAppConfig({ isLocalStorage: true });
        bot.setPlatformParams({
            welcome_text: 'Привет!',
            intents: [{ name: 'help', slots: ['помощь'] }],
        });
        bot.initBotController(MyController);
    });

    it('handles welcome', async () => {
        const result = await bot.run(
            T_ALISA,
            JSON.stringify({
                version: '1.0',
                session: { message_id: 0, user_id: 'test-user' },
                request: { command: 'привет', original_utterance: 'Привет' },
            }),
        );
        expect(result).toBeDefined();
    });

    it('handles help command', async () => {
        const result = await bot.run(
            T_ALISA,
            JSON.stringify({
                version: '1.0',
                session: { message_id: 1, user_id: 'test-user' },
                request: { command: 'помощь', original_utterance: 'Помощь' },
            }),
        );
        expect(result).toBeDefined();
    });
});
```

### BotTest vs run() — что выбрать?

| Способ                           | Когда использовать                         | Что получаете                                               |
| -------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `bot.test()`                     | Интерактивная отладка в консоли            | Диалог в реальном времени, вводите текст руками             |
| `bot.run(appType, content)`      | Автоматизированные тесты (Jest)            | Программный доступ к результату, можно проверять assertions |
| `bot.setContent()` + `bot.run()` | Тестирование с предустановленным контентом | Удобно для повторяющихся тестов                             |

**Рекомендация:** используйте `bot.run()` для Jest-тестов — это даёт полный контроль над входящими данными и возможность проверять результат.

### Выход из тестирования

Из режима тестирования можно выйти двумя способами:

1. Введите `exit` в консоли
2. Если контроллер установил `this.isEnd = true`, диалог завершится автоматически

### Отображаемая информация

В зависимости от параметров, `BotTest` выводит:

- **Ответ**: текстовый ответ приложения (для голосовых платформ — `response.text`, для чат-ботов — `text`)
- **Ответ в формате платформы** (при `isShowResult: true`): полный JSON-ответ
- **Данные в базе** (при `isShowStorage: true`): содержимое `userData` и `state`
- **Время выполнения** (при `isShowTime: true`): время обработки запроса в миллисекундах

## Идеально для

- Отладки логики
- Замеров скорости
- Автоматизированных unit-тестов
