# Архитектура расширений: Плагины и Адаптеры

В `umbot` нет жесткого разделения на "адаптеры" и "плагины" на уровне ядра. Всё, что расширяет функционал, реализует интерфейс `IPlugin` (или `IPluginFn`) и подключается через `bot.use()`. Адаптеры для БД и Платформ — это просто специализированные плагины, наследующие базовые классы.

## Как это работает:

При вызове `bot.use(entity)` фреймворк проверяет тип сущности. Если это класс, он вызывает `entity.init(appContext, bot)`. Контекст (`AppContext`) — это синглтон-хаб, где хранятся состояния, токены, реестры команд и подключенные модули.

## Типы расширений:

1. Функциональные плагины (i18n, NLU, кастомные RegExp). Регистрируются в `appContext.plugins`.
2. Кастомные плагины. Регистрируются в `appContext.plugins` под любым вашим ключом. Вы вызываете их вручную из своего кода.
3. Адаптеры БД (Mongo, File). Регистрируются в `appContext.database.adapter`.
4. Платформенные адаптеры (Telegram, Alisa, VK). Регистрируются в `appContext.platforms`.

## Как написать свой функциональный плагин

Вам не нужно наследоваться от базовых классов. Достаточно реализовать функцию или объект и поместить его в нужный слот `appContext.plugins`.

### Вариант 1: Функция-плагин (рекомендуется)

```ts
import { Bot, AppContext, createPlugin } from 'umbot';

const myI18nPlugin = createPlugin((appContext: AppContext, bot: Bot) => {
    // Регистрируем плагин в слоте 'i18n'
    appContext.plugins['i18n'] = (key: string, ...params: unknown[]) => {
        return `Перевод для: ${key}`;
    };

    // Возвращаем функцию очистки ресурсов (опционально)
    return () => {
        // Освобождение ресурсов при уничтожении плагина
        console.log('i18n plugin destroyed');
    };
});

const bot = new Bot();
bot.use(myI18nPlugin);
```

> `createPlugin()` автоматически выставляет маркер `isPlugin = true`. Без него `bot.use()` воспримет функцию как middleware, а не как плагин. Если по какой-то причине не используете хелпер — выставьте флаг вручную: `myI18nPlugin.isPlugin = true`.

### Вариант 2: Класс-плагин

```ts
import { Bot, AppContext, IPlugin } from 'umbot';

class MyI18nPlugin implements IPlugin {
    init(appContext: AppContext, bot: Bot): void {
        appContext.plugins['i18n'] = (key: string, ...params: unknown[]) => {
            return `Перевод для: ${key}`;
        };
    }

    destroy(bot: Bot): void {
        // Освобождение ресурсов
        console.log('i18n plugin destroyed');
    }
}

const bot = new Bot();
bot.use(new MyI18nPlugin());
```

## Сигнатуры системных плагинов

Для корректной работы системных плагинов соблюдайте их сигнатуры:

| Плагин | Сигнатура                                                                     | Описание                                    |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------- |
| i18n   | (key: string, ...params: unknown[]) => string                                 | Локализация текста                          |
| nlu    | (text: string, platformNlu: INlu, platform: string, request: unknown) => INlu | Обработка естественного языка               |
| regExp | () => RegExpConstructor                                                       | Кастомная реализация RegExp (например, re2) |

### Пример i18n плагина

Фреймворк вызывает слот с одним аргументом — текущим `controller.text` в роли `key`
(дополнительные параметры сигнатуры зарезервированы на будущее).

```ts
const i18nPlugin = createPlugin((appContext) => {
    const translations: Record<string, string> = {
        hello: 'Привет',
        bye: 'Пока',
    };

    appContext.plugins['i18n'] = (key: string) => {
        return translations[key] || key;
    };
});

bot.use(i18nPlugin);
```

### Пример NLU плагина

```ts
const nluPlugin = createPlugin((appContext) => {
    appContext.plugins['nlu'] = (
        text: string,
        platformNlu: INlu,
        platform: string,
        request: unknown,
    ) => {
        // Обогащаем NLU данными из внешнего сервиса
        return {
            ...platformNlu,
            intents: {
                ...platformNlu.intents,
                custom_intent: { slots: [] },
            },
        };
    };
});

bot.use(nluPlugin);
```

## Как написать свой уникальный плагин (Кастомный)

Вы можете создать плагин для любых задач (кэширование, работа с внешним API, логика бизнес-правил) и зарегистрировать его под своим именем.

```ts
// 1. Создаем и регистрируем плагин
const myCustomCachePlugin = createPlugin((appContext: AppContext) => {
    const cache = new Map<string, unknown>();

    // Регистрируем под своим уникальным ключом.
    // Значение должно быть либо функцией, либо объектом с методом getData.
    appContext.plugins['myCustomCache'] = {
        getData(operation: unknown, key: unknown, value?: unknown): unknown {
            if (operation === 'set') {
                cache.set(String(key), value);
                return true;
            }
            if (operation === 'get') {
                return cache.get(String(key));
            }
            return undefined;
        },
    };
});

bot.use(myCustomCachePlugin);

// 2. Обращаемся к нему из своего кода (например, в команде или контроллере)
bot.addCommand('save_data', ['сохрани'], (text, controller) => {
    // Получаем доступ к нашему плагину через appContext.
    // Реестр типизирован общим AnyPluginData, поэтому сужаем тип до своей реализации.
    const cache = controller.appContext.plugins['myCustomCache'] as
        { getData: (...args: unknown[]) => unknown } | undefined;
    if (cache) {
        cache.getData('set', 'last_command', text);
        controller.text = 'Данные сохранены в кастомный кэш!';
    }
});
```

## Жизненный цикл плагина

1. **Инициализация:** При вызове `bot.use(plugin)` вызывается `plugin.init(appContext, bot)`.
2. **Работа:** Плагин регистрирует свои обработчики в `appContext.plugins`.
3. **Уничтожение:** При вызове `bot.clearUse()` или завершении приложения вызывается `plugin.destroy(bot)`.

Важно: Метод destroy используется для освобождения ресурсов (закрытие соединений, отписка от событий, очистка таймеров). Если ваш плагин не создает ресурсов, метод можно не реализовывать.
