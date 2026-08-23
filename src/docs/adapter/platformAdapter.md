# Создание адаптера платформы (Platform Adapter)

Адаптер платформы — это мост между сырым JSON/XML запросом от внешней платформы и унифицированным контроллером
`BotController`. Ваша задача: распарсить входящие данные, наполнить контроллер, обработать UI-компоненты (кнопки,
картинки, звуки) и сформировать ответ строго по контракту конкретной платформы.

Адаптер наследуется от базового класса BasePlatformAdapter<TQuery> (из `umbot/plugins`).

## Инициализация и идентификация платформы

Когда на сервер приходит запрос, фреймворк перебирает все подключенные адаптеры и спрашивает: «Это твой запрос?».

### Определение платформы (isPlatformOnQuery)

Вы должны реализовать метод, который по заголовкам или телу запроса понимает, относится ли он к вашей платформе.

**Пример**: Платформа WeChat отправляет специфичный заголовок x-wechat-signature и XML в теле. Telegram отправляет
заголовок x-telegram-bot-api-secret-token.

```ts
isPlatformOnQuery(query: unknown, headers?: Record<string, unknown>): boolean {
    const q = query as Record<string, unknown>;
    // 1. Проверяем заголовки (самый надежный способ)
    if (headers?.['x-wechat-signature']) return true;

    // 2. Фоллбэк: проверяем уникальные поля в теле запроса
    return !!(q.xml_msg || q.specific_wechat_field);
}
```

### Проверка безопасности

Если платформа требует проверки подписи (токена), переопределяйте этот метод. По умолчанию `BasePlatformAdapter` умеет
проверять HMAC SHA256, **но только если оба параметра заданы**:

- `signatureName` — имя поля в заголовке запроса
- `token` — секретный токен в конфигурации

Если хотя бы один из параметров не задан, `isCorrectQuery()` вернет `true` (проверка будет пропущена).

Если стандартной проверки недостаточно (например, платформа использует Ed25519 вместо HMAC SHA256), переопределите метод
`isCorrectQuery` и реализуйте свою логику валидации.

**Примечание:** Если вы получаете ошибки при проверке подписи, убедитесь, что:

1. Поле `signatureName` установлено в классе адаптера
2. Токен зарегистрирован в `appContext.appConfig.tokens[this.platformName].token`

## Парсинг запроса (setQueryData)

Задача: Взять сырой `query` и заполнить поля `controller`. От того, как вы заполните контроллер, зависит корректная
работа бизнес-логики приложения

**Обязательные поля для заполнения:**

- `controller.userId` (string | number) — уникальный ID пользователя.
- `controller.userCommand` (string) — текст команды в нижнем регистре (нужно для поиска команд).
- `controller.originalUserCommand` (string) — оригинальный текст как есть.
- `controller.messageId` (number | string) — ID сообщения (нужно для определения начала диалога).

**Опциональные, но важные поля:**

- `controller.nlu.setNlu(...)` — если платформа присылает NLU/интенты.
- `controller.userMeta` — метаданные (например, есть ли у юзера экран).
- `controller.payload` — дополнительные данные (например, нажатая кнопка).

```ts
setQueryData(query: unknown, controller: BotController): boolean {
    const q = query as Record<string, unknown>;
    if (!q) {
        controller.platformOptions.error = 'Пустой запрос';
        return false;
    }

    controller.requestObject = query; // Сохраняем оригинал
    controller.userId = q.user_id;
    controller.userCommand = ((q.text as string) || '').toLowerCase().trim();
    controller.originalUserCommand = (q.text as string) || '';
    controller.messageId = q.message_id;

    // Если платформа присылает данные о юзере
    if (q.user) {
        controller.nlu.setNlu({ thisUser: { username: (q.user as Record<string, unknown>).name } });
    }

    return true;
}
```

## Работа с UI-компонентами (Кнопки, Карточки, Звуки)

Фреймворк оперирует абстракциями (`IButtonType`, `ICardInfo`). Платформы требуют специфичные форматы. Чтобы превратить
абстракцию в формат платформы, используются функции-процессоры.

### Кнопки

Вам нужно написать функцию, которая принимает массив абстрактных кнопок и возвращает объект, понятный платформе.
Метод `controller.buttons.getButtons(ваш_процессор)` сам вызовет вашу функцию и отдаст результат.

```ts
// 1. Пишем процессор
function myPlatformButtonProcessing(buttons: IButtonType[]): MyPlatformKeyboard {
    return {
        inline_keyboard: buttons.map((btn) => ({
            text: btn.title,
            callback_data: btn.payload ? JSON.stringify(btn.payload) : btn.title,
        })),
    };
}

// 2. Вызываем внутри getContent
const keyboard = controller.buttons.getButtons(myPlatformButtonProcessing);
```

### Карточки и Изображения (Работа с БД)

Важно: `getImageToken` и `getSoundToken` находятся в `pUtils`, который экспортируется из `umbot/plugins`:

```ts
import { pUtils } from 'umbot/plugins';
import { ImageTokens } from 'umbot';
import { MyPlatformApi } from './MyPlatformApi';

async function myPlatformCardProcessing(cardInfo: ICardInfo, controller: BotController) {
    const elements = [];

    for (const image of cardInfo.images) {
        // Если токена еще нет, загружаем его
        if (!image.imageToken && image.imageDir) {
            image.imageToken = await pUtils.getImageToken(
                image.imageDir,
                'my_platform', // имя платформы
                controller,
                async (model: ImageTokens) => {
                    // 1. Загружаем файл в API платформы
                    const api = new MyPlatformApi(controller.appContext);
                    const uploadResult = await api.uploadImage(image.imageDir);

                    if (uploadResult?.id) {
                        // 2. Сохраняем токен в модель
                        model.imageToken = uploadResult.id;
                        // 3. Сохраняем модель в БД (чтобы в следующий раз не грузить заново)
                        if (await model.save(true)) {
                            return model.imageToken;
                        }
                    }
                    return null;
                },
            );
        }

        if (image.imageToken) {
            elements.push({
                type: 'image',
                photo_id: image.imageToken,
                title: image.title,
                description: image.desc,
            });
        }
    }
    return elements;
}
```

**Важно:** Callback функция (четвертый параметр `getImageToken`) вызывается **ТОЛЬКО при cache miss**, то есть когда:

- Токен еще не был сгенерирован (`!image.imageToken`)
- В базе данных нет сохраненного токена для этого файла

Если токен уже существует и валиден, callback не вызывается - используется кэшированное значение. Это позволяет избежать
лишних сетевых запросов и ускорить работу приложения.

### Звуки и Аудио

Аналогично изображениям, используется утилита `getSoundToken` и модель `SoundTokens`.

```ts
import { pUtils } from 'umbot/plugins';
import { SoundTokens } from 'umbot';

// Внутри процессора звуков:
const audioToken = await pUtils.getSoundToken(
    path,
    'my_platform',
    controller,
    async (model: SoundTokens) => {
        const api = new MyPlatformApi(controller.appContext);
        const res = await api.uploadAudio(path);
        if (res?.id) {
            model.soundToken = res.id;
            if (await model.save(true)) return model.soundToken;
        }
        return null;
    },
);
```

## Управление состояниями (State / Local Storage)

Некоторые платформы (Алиса, SmartApp) умеют хранить состояние диалога на своей стороне. Это позволяет не делать лишних
запросов в БД.

Чтобы поддержать это, нужно реализовать 3 метода:

1. `isLocalStorage(controller)` — возвращает true, если платформа поддерживает локальное хранилище.
2. `getLocalStorage(controller)` — возвращает данные, которые платформа прислала в запросе (обычно лежат в
   controller.state).
3. `setLocalStorage(data, controller)` — вызывается фреймворком, если нужно сохранить данные на стороне платформы (если
   платформа не делает это автоматически через ответ).

Нюанс: В `setQueryData` вы должны указать, в какое поле ответа класть стейт, заполнив
`controller.platformOptions.stateName` (например, 'session_state' или 'user_state_update').

## Формирование ответа (getContent)

**Задача:** Собрать финальный ответ согласно контракту платформы.
Метод принимает `controller` (со всей бизнес-логикой, текстом, кнопками) и `stateData` (данные для локального
хранилища).
Здесь есть две парадигмы ответов:

**Парадигма А:** Webhook-Response (Алиса, SmartApp)
Платформа ждет JSON в теле HTTP-ответа.

```ts
async getContent(controller: BotController, stateData?: Record<string, unknown>): Promise<object> {
    // 1. Собираем UI через наши процессоры
    const buttons = controller.buttons.getButtons(myPlatformButtonProcessing);
    const cards = await controller.card.getCards(myPlatformCardProcessing, controller);

    // 2. Формируем ответ
    const response = {
        text: Text.resize(controller.text, 1024), // ОБЯЗАТЕЛЬНО режьте текст по лимитам!
        tts: controller.tts,
        buttons: buttons,
        card: cards,
        end_session: controller.isEnd
    };

    // 3. Добавляем состояние (если платформа его поддерживает)
    if (controller.platformOptions.stateName && stateData) {
        response[controller.platformOptions.stateName] = stateData;
    }

    return response;
}
```

**Парадигма Б:** API-Call (Telegram, VK, Max)
Платформа ждет, что вы сами отправите ответ через её API, а вебхуку нужно просто вернуть 200 OK.

```ts
async getContent(controller: BotController): Promise<string> {
    // 1. Если ответ еще не отправлен (флаг skipAutoReply)
    if (!controller.skipAutoReply) {
        const api = new MyPlatformApi(controller.appContext);

        // Собираем все UI-компоненты
        const keyboard = controller.buttons.getButtons(myPlatformButtonProcessing);
        const attachments = await controller.card.getCards(myPlatformCardProcessing, controller);
        const sounds = await controller.sound.getSounds(controller.tts, mySoundProcessing, controller);

        // Передаем их в API платформы (формат зависит от самой платформы)
        await api.sendMessage(controller.userId, Text.resize(controller.text, 4096), {
            keyboard,
            attachments, // Пример для Discord/VK
            audio: sounds // Пример
        });
    }

    // 3. Возвращаем заглушку для вебхука
    return 'ok';
}
```

> Возвращаемое значение из getContent пойдет в тело HTTP-ответа на вебхук. Если платформа требует специфичный JSON-ответ
> на сам факт получения вебхука (даже если вы уже отправили сообщение через API) — верните этот JSON. Если платформа
> принимает любой статус 200 OK — просто верните строку 'ok' или пустой объект.

### Тестовый набор данных (getQueryExample)

Для локального тестирования через `BotTest` определите метод `getQueryExample`.
Этот метод эмулирует запрос от платформы, позволяя проверить работу приложения до деплоя.

**Важно:** Формат возвращаемого объекта должен точно соответствовать структуре запроса,
которую вы парсите в `setQueryData`.

```ts
// Для тестирования через BotTest
getQueryExample(
    query: string,
    userId: string,
    count: number,
    state: Record<string, unknown> | string,
): Record<string, unknown> {
    // Возвращаем объект в формате ВАШЕЙ платформы
    // Этот же формат будет парситься в setQueryData
    return {
        message: {
            sender: { user_id: userId },
            body: {
                text: query,
                seq: count,
            },
        },
        state: state,
    };
}
```

## Рекомендации и оптимизации (Не обязательно, но желательно)

### Служебные запросы и shortcut-ответы (`sendInInit`)

Некоторые платформы присылают служебные запросы, на которые нужно ответить
заготовленным ответом, **не проходя бизнес-логику приложения**:

- **Алиса** периодически шлёт `ping` для проверки доступности навыка;
- **VK** при первичной настройке вебхука присылает `confirmation` — нужно
  вернуть строку-подтверждение;
- **SmartApp** может присылать healthcheck-запросы.

Чтобы не запускать middleware/commands/action для таких запросов, в `setQueryData`
установите `controller.platformOptions.sendInInit` — фреймворк проверит это поле
**сразу после** `setQueryData` и, если оно заполнено, вернёт его как ответ,
пропустив всю дальнейшую обработку.

```ts
setQueryData(query, controller) {
    // ... обычная обработка ...

    // Яндекс прислал ping?
    if (query.request.original_utterance === 'ping') {
        controller.platformOptions.sendInInit = {
            version: '1.0',
            response: { text: 'pong' },
        };
        return true; // важно вернуть true — иначе запрос будет отклонён
    }
    return true;
}
```

Формат значения sendInInit: string | object | null:

- object — будет отправлен в тело HTTP-ответа как JSON (для Алисы, SmartApp — это структура { version, response, ... }).
- string — будет отправлен как plain text (для VK confirmation).
- null / undefined — обычная обработка (по умолчанию).

### Лимиты платформы (Rate Limit)

Если у платформы есть жесткий лимит запросов в секунду (например, 30 req/sec у Telegram/Max), укажите это в классе
адаптера. Фреймворк автоматически подключит встроенный `rateLimiter`.

```ts
export class MyPlatformAdapter extends BasePlatformAdapter {
    limit = 30; // Сообщаем фреймворку о лимите
}
```

Для того чтобы лимит начал работать, **необходимо явно подключить middleware rateLimiter**:

```ts
import { Bot } from 'umbot';
import { rateLimiter } from 'umbot/middleware';
import { TelegramAdapter } from 'umbot/plugins';

const bot = new Bot();
bot.use(new TelegramAdapter('YOUR_TOKEN'));
bot.use(rateLimiter());
```

Только после этого фреймворк будет использовать значение `limit` из адаптера для ограничения количества запросов.

### Соблюдение таймаутов

У Алисы документированный лимит ответа — 4,5 секунды; у других платформ он отличается. В BasePlatformAdapter уже вшита проверка времени: если ваш
getContent выполняется слишком долго, фреймворк сам запишет ошибку/предупреждение в логи. Просто не делайте тяжелых
синхронных операций внутри getContent.
