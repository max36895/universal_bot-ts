# umbot

`umbot` — это один из TypeScript-фреймворков для разработки чат-ботов и голосовых навыков с единой бизнес-логикой под
все
ведущие российские платформы и не только: `Яндекс.Алиса`, `Маруся`, `Сбер SmartApp`, а также `Telegram`,`VK`, `MAX` и
`Viber`.

В отличие от большинства решений, требующих отдельной реализации под каждую платформу, `umbot` абстрагирует различия в
форматах запросов и ответов, предоставляя разработчику единый, предсказуемый интерфейс. Это позволяет писать логику один
раз — и запускать её везде.

Фреймворк следует [SemVer](https://semver.org/) . Breaking changes возможны только в MAJOR-версиях.

[![npm version](https://badge.fury.io/js/umbot.svg)](https://badge.fury.io/js/umbot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)]()
[![Security](https://img.shields.io/badge/Security-A+-green)]()
[![Supported Platforms](https://img.shields.io/badge/Platforms-7+-green)](# Поддерживаемые платформы)

---

## 💡 Почему `umbot`?

> Больше не нужно писать несколько версий одного приложения.  
> Больше не нужно разбираться в JSON-форматах Алисы, Сбера, Маруси, Telegram и Max.  
> Ваша логика — одна. Платформы — любые.

**Ключевые преимущества:**

- ✅ **Алиса + Маруся + Сбер SmartApp + ...** — одновременно, без костылей
- ⚡ В типичных сценариях (до 1 000 команд) внутренняя обработка `umbot` занимает в среднем < 30 мс. (Оставляет минимум
  2.5 сек на вашу логику).
  При первичной загрузке медиафайлов время может превысить 1 секунду — рекомендуется использовать `Preload`
- 🔒 Безопасная обработка регулярных выражений с защитой от ReDoS
- 💾 Встроенное состояние, кэширование медиа, кнопки, карточки — «из коробки»
- 🛠 TypeScript, CLI, автодополнение, 80%+ покрытие тестами

`umbot` — пишешь один раз, запускаешь везде.

### Чем `umbot` отличается от других решений?

Большинство фреймворков (например, `telegraf`, `alice-sdk` и тд) ориентированы **только на одну платформу**. Чтобы
запустить бота и в Алисе, и в Telegram, приходится:

- писать **две (или больше) версии логики**,
- поддерживать **разные форматы ответов**,
- дублировать **обработку состояний, кнопок, медиа**.

`umbot` решает эту проблему:  
**одна бизнес-логика** для всех платформ,  
**единый API** для кнопок, карточек, голоса и текста,  
**автоматическая адаптация** под формат каждой платформы "под капотом".

Это особенно ценно, если вы уже поддерживаете навык на Алисе и хотите быстро выйти в Telegram или VK — без переписывания
или существенных доработок кода.

## Для кого `umbot`?

- Команды, поддерживающие навыки на Алисе, Сбере, Марусе, Вк и тд одновременно
- Команды, которые пишут код под 1 платформу, где запрос инициирует пользователь(Алиса, Маруся или что-то свое).
- Команды, которые пишут под 1 платформу, и думают о том, чтобы когда-то выйти и на другие платформы
- Корпорации с внутренними мессенджерами
- Разработчики, уставшие от дублирования кода

---

## Поддерживаемые платформы

| Платформа          | Идентификатор |        Статус        |
| ------------------ | ------------- | :------------------: |
| Яндекс.Алиса       | `alisa`       | ✅ Полная поддержка  |
| Маруся             | `marusia`     | ✅ Полная поддержка  |
| Сбер SmartApp      | `smart_app`   | ✅ Полная поддержка  |
| Telegram           | `telegram`    | ✅ Полная поддержка  |
| VK                 | `vk`          | ✅ Полная поддержка  |
| Max                | `max_app`     | ✅ Полная поддержка  |
| Viber              | `viber`       | ✅ Полная поддержка  |
| **Ваша платформа** | `...`         | ✅ За счет адаптеров |

> 💡 **Нужна своя платформа?**  
> Просто создайте свой адаптер согласно документации для нужной платформы и подключите его к приложению.  
> Это позволяет интегрировать `umbot` в любую внутреннюю систему, корпоративный мессенджер или поддержать любую другую
> платформу, например `whatsapp`.

---

## 🚀 Быстрый старт

Установите фреймворк:

```bash
npm install umbot
```

Создайте и запустите проект за четыре команды:

```bash
npx umbot create echo
cd echo
npm i
npm run start
```

Поправьте файлы нужным вам образом.
Например:

```ts
// index.ts
import { Bot } from 'umbot';
import { EchoController } from './EchoController';

const bot = new Bot()
    .setAppConfig({ json: './data', isLocalStorage: true })
    .initBotController(new EchoController())
    .start('localhost', 3000);
```

```ts
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

Протестируйте приложение, и в случае необходимости опубликуйте его.

👉 [Подробное руководство по запуску](https://www.maxim-m.ru/bot/ts-doc/documents/src_docs_getting-started)

## 📚 Документация

Подробная документация доступна в следующих разделах:

- [Быстрый старт](https://www.maxim-m.ru/bot/ts-doc/documents/src_docs_getting-started) - Подробное описание, для
  быстрого старта проекта
- [API Reference](https://www.maxim-m.ru/bot/ts-doc/documents/src_docs_api-reference) - Подробное описание всех классов,
  методов и интерфейсов
- [Поддерживаемые платформы](https://www.maxim-m.ru/bot/ts-doc/documents/src_docs_platform-integration) - Руководство по
  интеграции с различными платформами
- [Конфигурация и безопасность](https://www.maxim-m.ru/bot/ts-doc/documents/src_docs_configuration)
- [Кастомизация HTTP-клиента](https://www.maxim-m.ru/bot/ts-doc/documents/src_docs_http-client)
- [Производительность и гарантии](https://www.maxim-m.ru/bot/ts-doc/documents/src_docs_performance-and-guarantees)
- [Тестирование](https://www.maxim-m.ru/bot/ts-doc/documents/src_docs_testing)
- [Развертывание](https://www.maxim-m.ru/bot/ts-doc/documents/src_docs_deployment)
- [Middleware](https://www.maxim-m.ru/bot/ts-doc/documents/src_docs_middleware)
- [FAQ](https://www.maxim-m.ru/bot/ts-doc/documents/src_docs_getting-started#часто-задаваемые-вопросы)

### Полезные ссылки

- 📚 [Официальная документация](https://www.maxim-m.ru/bot/ts-doc/index.html)
- 📢 [Telegram канал](https://t.me/joinchat/AAAAAFM8AcuniLTwBLuNsw)
- 💬 [Telegram группа](https://t.me/mm_universal_bot)
- 📦 [npm package](https://www.npmjs.com/package/umbot)
- [Создание навыка "Я никогда не"](https://www.maxim-m.ru/article/sozdanie-navyika-ya-nikogda-ne)
- [Примеры проектов](https://github.com/max36895/universal_bot-ts/tree/main/examples.md)
- [Список изменений](https://github.com/max36895/universal_bot-ts/blob/main/CHANGELOG.md)
- [Что ждать в следующем релизе](https://www.maxim-m.ru/bot/ts-doc/documents/src_docs_next-release)

## 🛠 Инструменты разработчика

- [CLI](https://www.maxim-m.ru/bot/ts-doc/documents/cli_README) команды

## Рекомендации

### re2

Фреймворк поддерживает работу с re2. За счет использования данной библиотеки, можно добиться существенного ускорения
обработки регулярных выражений, а также добиться сокращения по потреблению памяти. По памяти потребление уменьшается
примерно в 3-7 раз, а время выполнения уменьшается в среднем в 2-15 раз.
Для корректной установки на window нужно следовать [инструкции](https://github.com/nodejs/node-gyp#on-windows),
установив python3.13, а также инструменты visual studio. Установка на linux или mac происходит сильно проще.
Установка:

```bash
npm install --save re2@latest
```

Дальше фреймворк сам определит установлен re2 или нет, и в случае если он установлен, все регулярные выражения будут
обрабатываться через него.

### Хранение данных пользователей

Не рекомендуется использовать в релизной версии приложения файловую базу данных, так как данный подход может привести к
падению приложения, при большом количестве записей. Связано это с тем, что в файловой базе данных, данные хранятся в
оперативной памяти.
Для корректного сохранения данных в БД укажите:

1. Подключите готовый адаптер(например MongoAdapter), или создайте свой(`bot.use(new MyAdapter())`)
2. Укажите данные для подключения к базе данных `bot.setAppConfig({db:{...}})`, либо в конструкторе при подключении
   адаптера к приложению

## 📝 Лицензия

MIT License. См. [LICENSE](./LICENSE) для деталей.

## 🤝 Поддержка

Если у вас есть вопросы или предложения:

- 📧 Email: maximco36895@yandex.ru
- 🐛 [Issues на GitHub](https://github.com/max36895/universal_bot-ts/issues)
