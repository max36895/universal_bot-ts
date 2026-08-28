# umbot-demo — «Кофейня-бот»

Эталонный демо-проект на фреймворке [umbot](https://github.com/max36895/universal_bot-ts): один законченный бот-бариста, который показывает, как выглядят команды, многошаговая форма, `userData`, кнопки, карточки, NLU и middleware в настоящем приложении.

## Быстрый старт

```bash
git clone https://github.com/max36895/universal_bot-ts.git
cd universal_bot-ts/examples/umbot-demo
npm install
npm run dev
```

После запуска вводите команды прямо в терминале: «меню», «заказать», «любимый», «помощь». Выход — `exit`.

> ⚠️ **Временно:** демо использует локальную версию фреймворка (`"umbot": "file:../.."`),
> потому что релиз `3.1.0` ещё не опубликован. Перед `npm install` выполните
> `npm run build` в корне репозитория. После выхода `3.1.0` зависимость можно
> заменить на `"umbot": "^3.1.0"` из npm.

## Пример консольной сессии (`npm run dev`)

```text
Для выхода введите 'exit'

Ответ: > Добро пожаловать в кофейню «У Бота»! Я бариста и с радостью приму ваш заказ.
Ваш запрос: > заказать
Ответ: > Что будете пить? У нас есть кофе, чай и какао.
Ваш запрос: > кофе
Ответ: > Какой объём: маленький, средний или большой?
Ваш запрос: > средний
Ответ: > На чьё имя готовить?
Ваш запрос: > Иван
Ответ: > Заказ принят: средний кофе для Иван!
Данные в базе > {"favorite":"кофе","history":[{"drink":"кофе","size":"средний","name":"Иван","ts":1787923201386}]}
Ваш запрос: > любимый
Ответ: > Ваш любимый напиток — кофе. Закажем?
```

## Какая фича umbot где показана

| Фича                                        | Где смотреть                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| Команды (`addCommand`) и слоты              | `src/index.ts` — `createCoffeeBot`: команды `order` и fallback                |
| Fallback на нераспознанный ввод             | `src/index.ts` — `FALLBACK_COMMAND`                                           |
| Интенты без команд (`action()`)             | `src/config/appParams.ts` + `src/controller/CoffeeController.ts` — `action()` |
| Многошаговая форма (`addForm`)              | `src/index.ts` — форма `order` (напиток → объём → имя) с валидацией           |
| Шаги диалога (`addStep`)                    | `src/index.ts` — шаг `confirm_favorite`                                       |
| Типизированный `userData` через `Bot<T>`    | `src/types/ICoffeeUserData.ts`, `src/server.ts`                               |
| Состояние: история заказов, любимый напиток | `src/controller/CoffeeController.ts` — `showFavorite`                         |
| Кнопки (`buttons.addBtn`)                   | `CoffeeController.showWelcome`, `showHelp`, форма заказа                      |
| Карточка-галерея (`card.addImage`)          | `CoffeeController.showMenu`                                                   |
| NLU: подтверждение (`YANDEX.CONFIRM`)       | `src/index.ts` — шаг `confirm_favorite`                                       |
| NLU: извлечение числа («закажу два кофе»)   | `CoffeeController.extractCount`                                               |
| Middleware (`rateLimiter`, `requestId`)     | `src/index.ts` — `bot.use(...)`                                               |
| Файловая БД (`FileAdapter`)                 | `src/index.ts`, `src/config/appConfig.ts`                                     |
| Консольный режим (`BotTest`)                | `src/dev.ts`                                                                  |
| Webhook-режим (`Bot.start`)                 | `src/server.ts`                                                               |
| Тесты через `BotTest.simulate`              | `tests/coffee.test.ts` (Алиса + Telegram)                                     |

## Команды бота

| Команда    | Что делает                                                         |
| ---------- | ------------------------------------------------------------------ |
| «привет»   | Приветствие с кнопками (срабатывает и на первое сообщение)         |
| «меню»     | Карточка-галерея напитков                                          |
| «заказать» | Форма заказа; если есть любимый напиток — сначала спросит «да/нет» |
| «любимый»  | Покажет любимый напиток из `userData`                              |
| «помощь»   | Список команд                                                      |
| остальное  | Дружелюбный fallback с подсказкой                                  |

## Запуск и тесты

| Команда         | Что делает                                                      |
| --------------- | --------------------------------------------------------------- |
| `npm run dev`   | Консольный режим: `BotTest` + `bot.test()` — без токенов и сети |
| `npm start`     | Webhook-сервер на `localhost:3000` для реальных платформ        |
| `npm test`      | Jest-тесты через `BotTest.simulate()` (Алиса и Telegram)        |
| `npm run build` | Компиляция TypeScript в `dist/`                                 |
| `npm run lint`  | Проверка ESLint                                                 |

## Подключение реальных платформ

1. Запустите webhook-режим: `npm start` (порт можно переопределить переменной `PORT`).
2. Передайте токены через переменные окружения — фреймворк подхватит их автоматически:

    | Платформа   | Переменная                                           |
    | ----------- | ---------------------------------------------------- |
    | Telegram    | `TELEGRAM_TOKEN`                                     |
    | Алиса       | `ALISA_TOKEN` (или `YANDEX_TOKEN`)                   |
    | VK          | `VK_TOKEN`, `VK_CONFIRMATION_TOKEN`, `VK_SECRET_KEY` |
    | Viber       | `VIBER_TOKEN`                                        |
    | MAX         | `MAX_TOKEN`                                          |
    | Маруся      | `MARUSIA_TOKEN`                                      |
    | TTS в чатах | `SPEECH_KIT_TOKEN`                                   |

    Пример: `TELEGRAM_TOKEN=*** npm start`.

3. Укажите платформе публичный URL вебхука (например, через туннель), который ведёт на `localhost:3000`.

Токены не храните в коде и конфиге — только в переменных окружения (файл `.env` в `.gitignore`).

## Документация

- Руководство: [`src/docs/GUIDE.md`](../../src/docs/GUIDE.md)
- Справочник API: [`src/docs/api-reference.md`](../../src/docs/api-reference.md)
- Тестирование: [`src/docs/testing.md`](../../src/docs/testing.md)
- Сгенерированная TypeDoc-документация: папка [`docs/`](../../docs) в корне репозитория
