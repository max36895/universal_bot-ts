# umbot

`umbot` — это первая в своём роде TypeScript-библиотека для разработки чат-ботов и голосовых навыков с единой
бизнес-логикой под все ведущие российские платформы: `Яндекс.Алиса`, `Маруся`, `Сбер SmartApp`, а также `Telegram`,
`VK`, `MAX` и `Viber`.

В отличие от большинства решений, требующих отдельной реализации под каждую платформу, umbot абстрагирует различия в
форматах запросов и ответов, предоставляя разработчику единый, предсказуемый интерфейс. Это позволяет писать логику один
раз — и запускать её везде.

[![npm version](https://badge.fury.io/js/umbot.svg)](https://badge.fury.io/js/umbot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)]()
[![Security](https://img.shields.io/badge/Security-A+-green)]()
[![Supported Platforms](https://img.shields.io/badge/Platforms-7+-green)](#поддерживаемые-платформы)

---

## 💡 Почему `umbot`?

> Больше не нужно писать три версии одного навыка.  
> Больше не нужно разбираться в JSON-форматах Алисы, Сбера и Маруси.  
> Ваша логика — одна. Платформы — любые.

**Ключевые преимущества:**

- ✅ **Алиса + Маруся + Сбер SmartApp + ...** — одновременно, без костылей
- ⚡ **Гарантированное время обработки ≤1 сек** (оставляет минимум 2 сек на вашу логику)
- 🔒 Безопасная обработка регулярных выражений с защитой от ReDoS
- 💾 Встроенное состояние, кэширование медиа, кнопки, карточки — «из коробки»
- 🛠 TypeScript, CLI, автодополнение, 80%+ покрытие тестами

`umbot` — пишешь один раз, запускаешь везде.

## 🎯 Для кого `umbot`?

- Команды, поддерживающие навыки на Алисе, Сбере и Марусе одновременно
- Корпорации с внутренними мессенджерами
- Разработчики, уставшие от дублирования кода

---

## 🧩 Поддерживаемые платформы

| Платформа          | Идентификатор      |        Статус        |
| ------------------ | ------------------ | :------------------: |
| Яндекс.Алиса       | `alisa`            | ✅ Полная поддержка  |
| Маруся             | `marusia`          | ✅ Полная поддержка  |
| Сбер SmartApp      | `smart_app`        | ✅ Полная поддержка  |
| Telegram           | `telegram`         | ✅ Полная поддержка  |
| VK                 | `vk`               | ✅ Полная поддержка  |
| Max                | `max_app`          | ✅ Полная поддержка  |
| Viber              | `viber`            | ✅ Полная поддержка  |
| **Ваша платформа** | `user_application` | ✅ Базовая поддержка |

> 💡 **Нужна своя платформа?**  
> Просто укажите `user_application` в `appType` и реализуйте обработку входящих/исходящих сообщений под ваш формат.  
> Это позволяет интегрировать `umbot` в любую внутреннюю систему или корпоративный мессенджер.

---

## 🚀 Быстрый старт

Установите библиотеку:

```bash
npm install umbot
```

Создайте проект за одну команду:

```bash
npx umbot create echo
```

Поправьте файлы нужным вам образом.
Например:

```typescript
// index.ts
import { Bot } from 'umbot';
import { EchoController } from './EchoController';

const bot = new Bot()
    .setAppConfig({ json: './data', isLocalStorage: true })
    .initBotController(new EchoController())
    .start('localhost', 3000);
```

```typescript
// EchoController.ts
import { BotController, WELCOME_INTENT_NAME } from 'umbot';

export class EchoController extends BotController {
    public action(intentName: string): void {
        if (intentName === WELCOME_INTENT_NAME) {
            this.text = 'Привет! Я повторяю за вами.';
        } else {
            this.text = `Вы сказали: ${this.userCommand}`;
        }
    }
}
```

👉 [Подробное руководство по запуску](src/docs/getting-started.md)

## 📚 Документация

Подробная документация доступна в следующих разделах:

- [Быстрый старт](src/docs/getting-started.md) - Подробное описание, для быстрого старта проекта
- [API Reference](src/docs/api-reference.md) - Подробное описание всех классов, методов и интерфейсов
- [Поддерживаемые платформы](src/docs/platform-integration.md) - Руководство по интеграции с различными платформами
- [Конфигурация и безопасность](src/docs/configuration.md)
- [Кастомизация HTTP-клиента](src/docs/http-client.md)
- [Производительность и гарантии](src/docs/performance-and-guarantees.md)
- [Тестирование](src/docs/testing.md)
- [Развертывание](src/docs/deployment.md)
- [FAQ](src/docs/getting-started.md#часто-задаваемые-вопросы)

### Полезные ссылки

- 📚 [Официальная документация](https://www.maxim-m.ru/bot/ts-doc/index.html)
- 📢 [Telegram канал](https://t.me/joinchat/AAAAAFM8AcuniLTwBLuNsw)
- 💬 [Telegram группа](https://t.me/mm_universal_bot)
- 📦 [npm package](https://www.npmjs.com/package/umbot)
- [Создание навыка "Я никогда не"](https://www.maxim-m.ru/article/sozdanie-navyika-ya-nikogda-ne)
- [Примеры проектов](./examples/README.md)
- [Список изменений](./CHANGELOG.md)

## 🛠 Инструменты разработчика

- [CLI](./cli/README.md) команды

## 📝 Лицензия

MIT License. См. [LICENSE](./LICENSE) для деталей.

## 🤝 Поддержка

Если у вас есть вопросы или предложения:

- 📧 Email: maximco36895@yandex.ru
- 🐛 [Issues на GitHub](https://github.com/max36895/universal_bot-ts/issues)
