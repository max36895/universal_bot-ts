# Руководство по началу работы с umbot: создание приложения для Алисы, Telegram и VK на TypeScript

В этом руководстве вы узнаете, как быстро создать мультиплатформенное приложение для голосовых навыков и чат‑ботов с помощью фреймворка `umbot` на TypeScript.

## Введение

`umbot` - универсальный фреймворк для разработки голосовых навыков и чат‑ботов для множества платформ. Ключевые возможности:

- Единая кодовая база для всех платформ (Алиса, Маруся, Telegram, VK и др.)
- Встроенное управление состоянием пользователя
- Полная типобезопасность (TypeScript)
- UI‑компоненты: кнопки, карточки, изображения, звуки

## Быстрый старт

### 1. Установка

```bash
npm install umbot
```

### 2. Создание простого навыка

**Базовый вариант (с использованием контроллера)**
Создадим контроллер, в котором опишем логику обработки команд.

```ts
import { Bot, BotController, WELCOME_INTENT_NAME } from 'umbot';
import { fullPlatforms } from 'umbot/plugins';
import { join } from 'node:path';

// Создаем контроллер с логикой навыка
class MyController extends BotController {
    public action(intentName: string | null): void {
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

// Инициализируем приложение
const bot = new Bot();
// Подключаем все доступные платформы
// Если вам нужны только голосовые платформы, используйте voicePlatforms или конкретный адаптер если нужна только одна платформа
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

**Минималистичный вариант (без контроллера)**

Также можно совсем не создавать BotController и решить все задачи с помощью динамического добавления команд.
Обратите внимание на `FALLBACK_COMMAND`, обработчик будет выполнен в том случае, если не удалось найти нужную
команду. Вместо константы можно просто указать "\*", что также равносильно заданию через константу.

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

Базовый класс, предоставляющий доступ к API ответа и состоянию.

#### Работа с текстом

```ts
this.text = 'Ответ пользователю'; // Текст ответа
this.tts = 'Текст для синтеза речи (если отличается от text)'; // TTS версия (опционально)
```

#### Кнопки

```ts
this.buttons
    .addBtn('Простая кнопка')
    .addBtn('Ссылка', 'http://localhost')
    .addBtn('Кнопка с данными', null, {
        action: 'custom',
        value: 123,
    });
```

#### Карточки (изображения)

```ts
this.card.addImage('image.jpg').setTitle('Заголовок').setDescription('Описание');
```

#### Управление состоянием пользователя

```ts
// Для TypeScript, объявите интерфейс и передайте его в BotController
interface IUserState {
    counter?: number;
}
class MyController extends BotController<IUserState> {}

// Внутри controller.userData теперь знает про counter
this.userData.counter = 42;

// Прочитать данные
const counter = this.userData.counter ?? 0;
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
bot.addCommand('greeting', ['привет', 'здравствуй'], (_, controller) => {
    controller.text = 'Здравствуйте!';
});
```

## Лучшие практики

### 1. Структура проекта

```
src/
├── controller/       # Контроллеры с логикой (Если нужно)
├── plugins/          # Дополнительные плагины (Если нужно)
├── utils/            # Вспомогательные функции (Если нужно)
├── config/           # Конфигурация (Если нужно)
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
    public action(intentName: string | null): void {
        // Теперь this.userData типизирован как IGameState
        this.userData.score = 100;
    }
}
```

### 3. Обработка ошибок

```ts
try {
    // Ваша асинхронная логика (запрос к API, работа с БД и т.д.)
    const result = await fetchExternalData();
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

// Сброс состояния — мутируйте, а не переприсваивайте
if (intentName === 'restart') {
    Object.keys(this.userData).forEach((key) => delete this.userData[key]);
    this.text = 'Игра начата заново';
}
```

> **Важно:** не делайте `this.userData = {};` — фреймворк хранит ссылку на объект
> и при полном переприсваивании отслеживание изменений может сломаться.
> Вместо этого мутируйте или удаляйте поля по одному.

## Отладка

### 1. Локальное тестирование

```ts
import { BotTest } from 'umbot/test';
import { fullPlatforms } from 'umbot/plugins';

const bot = new BotTest();
bot.use(fullPlatforms);

// Запускает интерактивный режим в консоли: вы вводите фразы, приложение отвечает
bot.test();
```

### 2. Локальная отладка с реальными платформами (туннель)

Консольный режим `BotTest` не требует сети, но для проверки с реальной платформой нужен вебхук.
Платформы не умеют отправлять запросы на `localhost` — им нужен публичный HTTPS-адрес.
На время разработки поднимите туннель, который пробросит ваш локальный порт в интернет:

```bash
# ngrok
ngrok http 3000

# или cloudflared (Cloudflare Tunnel)
cloudflared tunnel --url http://localhost:3000
```

Инструмент выдаст публичный URL вида `https://xxxx.ngrok-free.app`. Запустите приложение
(`bot.start('localhost', 3000)`) и укажите этот URL в качестве вебхука в консоли разработчика
платформы. После отладки удалите URL и разверните приложение на сервере с HTTPS
(см. «Запуск в production»).

> ⚠️ URL туннеля временный и подходит только для разработки. Не оставляйте продакшн-вебхук
> указывать на туннель.

### 3. Логирование

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

## Запуск в production

Для продакшн‑окружения используйте режим `strict_prod` и настройте webhook.

```ts
bot.setAppMode('strict_prod'); // включает строгие проверки безопасности
bot.start('0.0.0.0', 8080); // запуск HTTP-сервера
```

## Чеклист перед запуском

Убедитесь, что всё выполнено:

- [ ] **Режим `strict_prod`** — включен через `bot.setAppMode('strict_prod')`
- [ ] **intents настроены** — при необходимости `bot.setPlatformParams({ intents: [...] })`. Учтите: переданный массив **заменяет** встроенные интенты `welcome`/`help`, поэтому либо добавьте их в свой список, либо задайте собственные слоты для приветствия и помощи
- [ ] **Токены в .env** — не в коде, не в git. Проверьте `.gitignore`
- [ ] **MongoAdapter вместо FileAdapter** — FileAdapter держит всю таблицу в памяти (риск OOM на больших данных) и рассчитан на один процесс, поэтому не подходит для production
- [ ] **Preload для медиа** — все изображения и звуки предзагружены (иначе первый ответ может превысить 3 сек)
- [ ] **rateLimiter подключен** — `bot.use(rateLimiter())` для защиты от превышения лимитов платформ
- [ ] **error_log настроен** — `bot.setAppConfig({ error_log: './logs' })`
- [ ] **HTTPS настроен** — обязателен для Алисы, Сбера, Viber
- [ ] **Webhook URL зарегистрирован** — в консоли разработчика каждой платформы

## Типичные ошибки

### Команда не срабатывает

**Причина:** Регистр. `controller.userCommand` автоматически приводится к нижнему регистру.

```ts
// ❌ Неправильно — слот с заглавной буквы
bot.addCommand('greet', ['Привет'], (_, bc) => {
    bc.text = 'Привет!';
});

// ✅ Правильно — слот в нижнем регистре
bot.addCommand('greet', ['привет'], (_, bc) => {
    bc.text = 'Привет!';
});
```

### Бот отвечает стандартным текстом на приветствие

**Причина:** Не задан свой `welcome_text` в `setPlatformParams` — фреймворк отвечает placeholder-текстом по умолчанию.

```ts
// ❌ Не настроено — ответит стандартным текстом приветствия
bot.setPlatformParams({ intents: [] });

// ✅ Правильно — свой текст приветствия
bot.setPlatformParams({
    welcome_text: 'Привет! Я могу помочь.',
    intents: [],
});
```

### TypeScript ошибка "Property 'score' does not exist"

**Причина:** Не типизирован `userData`.

```ts
// ❌ Неправильно — TypeScript не знает про score
bot.addCommand('play', ['играть'], (_, bc) => {
    bc.userData.score += 10; // Ошибка!
});

// ✅ Правильно — аннотируем тип
bot.addCommand('play', ['играть'], (_, bc: BotController<MyData>) => {
    bc.userData.score += 10; // OK
});
```

### Данные не сохраняются между запросами

**Причина:** Не подключен DB-adapter и `isLocalStorage: false`.

```ts
import { MongoAdapter } from 'umbot/plugins';

// ❌ Неправильно — данные теряются
bot.setAppConfig({ isLocalStorage: false });

// ✅ Вариант 1: локальное хранилище (для голосовых платформ)
bot.setAppConfig({ isLocalStorage: true });

// ✅ Вариант 2: БД (для чат-ботов)
bot.use(new MongoAdapter({ host: '...', database: '...' }));
bot.setAppConfig({ isLocalStorage: false });
```

### Пустой ответ вместо "Не поняла"

**Причина:** Используете `BotController` вместо `BaseBotController`. Автоматическая установка `empty_text` работает только через `BaseBotController`. Если вы наследуетесь от `BotController` напрямую, задайте `this.text` в `action()`. Адаптеры не придумывают ответ: Алиса и Маруся сохранят пустые поля и запишут предупреждение, а чат-платформы не станут отправлять недопустимое пустое сообщение.

Подробнее об этом механизме — в разделе [«Порядок диспетчера»](https://www.maxim-m.ru/bot/ts-doc/documents/umbot_v-3.1_.src_docs_GUIDE.html#порядок-диспетчера) в GUIDE.md.

```ts
// Решение: вручную обрабатывайте default-case в action()
public action(intentName: string | null): void {
    switch (intentName) {
        case WELCOME_INTENT_NAME:
            this.text = 'Привет!';
            break;
        default:
            if (!this.text) this.text = 'Не поняла. Скажите "помощь".';
    }
}
```

## 🔐 Безопасность и защита от ReDoS

При использовании регулярных выражений в командах (`addCommand(..., isPattern: true)`) или интентах, фреймворк проверяет их на потенциальные ReDoS‑уязвимости.

⚠️ **По умолчанию (`appMode: 'dev'`) небезопасные RegExp всё равно регистрируются!**  
Это сделано для гибкости в разработке, но порой **недопустимо в production**.

✅ **Рекомендация для production включить строгую проверку**:

```ts
const bot = new Bot();
bot.setAppMode('strict_prod'); // ← обязательно включите!
```

При `setAppMode('strict_prod')` любая потенциально опасная RegExp будет отклонена при регистрации, а попытка её использовать вызовет ошибку в логах.

⚠️ Если вы используете slots с RegExp, убедитесь, что ваши выражения:

- не содержат вложенных квантификаторов ((a+)+);
- не используют .\* без якорей;
- ограничены по длине ({1,10} вместо \*).

## Часто задаваемые вопросы

### Как добавить поддержку новой платформы?

Достаточно создать адаптер для нужной платформы согласно [документации по созданию адаптера платформы](https://www.maxim-m.ru/bot/ts-doc/documents/umbot_v-3.1_.src_docs_adapter_platformAdapter.html) и после подключить его к приложению.
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
ALISA_TOKEN=your-alisa-token
MARUSIA_TOKEN=your-marusia-token
MAX_TOKEN=your-max-token

DB_HOST=localhost
DB_USER=user
DB_PASSWORD=password
DB_NAME=bot_db
```

> `YANDEX_TOKEN` для Алисы устарел и сохранён только для обратной совместимости — используйте `ALISA_TOKEN` (при обоих заданных приоритет у него).

> ⚠️ **Не коммитьте `.env` в git!** Он уже добавлен в шаблонный `.gitignore` при генерации через CLI,
> но если создаёте файл вручную — проверьте, что он в исключениях.

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

Больше вопросов и ответов можно найти в [разделе FAQ](https://www.maxim-m.ru/bot/ts-doc/documents/umbot_v-3.1_.src_docs_FAQ.html).
