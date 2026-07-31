# JSON-формат конфигурации umbot

> Полное описание формата JSON для генератора umbot-проектов.
> На основе этого описания можно построить генератор для любой платформы (Telegram, Alisa и т.д.).

---

## Быстрый старт

Если вы скачали JSON-файл из [визуального редактора](https://umbot.dev), выполните три шага:

1. Установите [Node.js](https://nodejs.org) (версия 20+)
2. Положите скачанный `flow.json` в любую папку
3. Выполните в терминале:

```bash
npx umbot create from-flow flow.json --output ./my-bot
```

Готовый TypeScript-проект появится в папке `my-bot`. Установите зависимости и запустите:

```bash
cd my-bot
npm install
npm run dev
```

Подробнее о CLI: [документация umbot CLI](https://www.maxim-m.ru/bot/ts-doc/documents/umbot_v-3.0_.cli_README.html)

---

## Структура документа

```json
{
    "schemaVersion": "1.0",
    "name": "my-bot",
    "version": "1.0.0",
    "description": "Описание бота",
    "platforms": ["telegram", "alisa"],
    "database": { "type": "file", "config": {} },
    "mode": "dev",
    "isLocalStorage": true,
    "nodes": [],
    "edges": [],
    "fallback": { "text": "Не понял" },
    "welcome": { "text": "Привет! Я бот.", "buttons": [] },
    "helpText": { "text": "Справка по боту" },
    "variables": { "userName": "Имя пользователя", "score": "Счёт игрока" }
}
```

| Поле             | Тип      | Описание                                                                                                    |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `schemaVersion`  | string   | Версия формата. По умолчанию `"1.0"`.                                                                       |
| `name`           | string   | Имя проекта (используется в package.json и заголовке).                                                      |
| `version`        | string   | Версия проекта (semver).                                                                                    |
| `description`    | string   | Описание бота.                                                                                              |
| `platforms`      | string[] | Платформы: `"telegram"`, `"alisa"`, `"marusia"`, `"vk"`, `"smart_app"`, `"max_app"`, `"viber"`.             |
| `database`       | object   | Конфигурация БД (см. ниже).                                                                                 |
| `mode`           | string   | `"dev"` / `"prod"` / `"strict_prod"`.                                                                       |
| `isLocalStorage` | boolean  | Сохранять userData в localStorage (для тестов).                                                             |
| `nodes`          | array    | Все узлы графа (команды, шаги, условия, действия, ответы).                                                  |
| `edges`          | array    | Связи между узлами.                                                                                         |
| `fallback`       | object   | Ответ на нераспознанный ввод: `{ "text": "..." }`.                                                          |
| `welcome`        | object   | Приветственное сообщение: `{ "text": "...", "buttons": [] }`.                                               |
| `helpText`       | object   | Текст справки (опционально): `{ "text": "..." }`.                                                           |
| `variables`      | object   | Зарегистрированные переменные: `{ "name": "comment", ... }`. Ключ — имя переменной, значение — комментарий. |

---

## Архитектура umbot: 2 типа обработчиков

В umbot **только 2 типа обработчиков**:

1. **`bot.addCommand(name, slots, handler)`** — реагирует на слова-триггеры (слоты).
2. **`bot.addStep(name, handler)`** — активируется через `ctrl.thisIntentName = 'stepName'`.

**Действия, условия, ответы — это INLINE КОД внутри обработчиков**. Standalone блоки (response/action/condition), подключённые через edges, генерируются как отдельные `addStep`.

---

## Типы узлов (Nodes)

### Command Node

Команда — реагирует на слова-триггеры.

```json
{
    "type": "command",
    "id": "node_123",
    "name": "greeting",
    "slots": ["привет", "здравствуй"],
    "isPattern": false,
    "saveTo": "userName",
    "actions": [],
    "conditions": [],
    "response": {
        "text": "Привет, {{userName}}!",
        "tts": "Привет!",
        "emotion": "good",
        "isEnd": false,
        "buttons": [],
        "card": null,
        "sounds": []
    }
}
```

| Поле         | Тип             | Обязательно | Описание                                  |
| ------------ | --------------- | ----------- | ----------------------------------------- |
| `type`       | `"command"`     | да          | Тип узла                                  |
| `id`         | string          | да          | Уникальный ID                             |
| `name`       | string          | да          | Имя команды (в генерируемом коде)         |
| `slots`      | string[]        | да          | Слова-триггеры (без учёта регистра)       |
| `isPattern`  | boolean         | нет         | Если `true`, слоты — регулярные выражения |
| `saveTo`     | string          | нет         | Сохранить ввод в userData                 |
| `varComment` | string          | нет         | Комментарий к переменной                  |
| `actions`    | ActionBlock[]   | нет         | Инлайн-действия                           |
| `conditions` | FlowCondition[] | нет         | Инлайн-условия                            |
| `response`   | FlowResponse    | да          | Настройки ответа                          |

### Step Node

Шаг — запрашивает ввод и сохраняет его.

```json
{
    "type": "step",
    "id": "node_456",
    "name": "ask_name",
    "prompt": {
        "text": "Как вас зовут?",
        "tts": "",
        "emotion": "",
        "buttons": [],
        "card": null
    },
    "saveTo": "userName",
    "saveAs": "original",
    "actions": [],
    "conditions": []
}
```

| Поле         | Тип                           | Обязательно | Описание                             |
| ------------ | ----------------------------- | ----------- | ------------------------------------ |
| `type`       | `"step"`                      | да          | Тип узла                             |
| `id`         | string                        | да          | Уникальный ID                        |
| `name`       | string                        | да          | Имя шага (для thisIntentName)        |
| `prompt`     | FlowPrompt                    | да          | Текст вопроса, TTS, кнопки, карточка |
| `saveTo`     | string                        | да          | Поле в userData для сохранения       |
| `saveAs`     | `"original"` \| `"lowercase"` | нет         | Регистр сохраняемого ввода           |
| `varComment` | string                        | нет         | Комментарий к переменной             |
| `actions`    | ActionBlock[]                 | нет         | Инлайн-действия                      |
| `conditions` | FlowCondition[]               | нет         | Инлайн-условия                       |

> Навигация между шагами осуществляется через edges (связи), а не через поле `next`.

### Condition Node (блок условия)

Условие — проверяет переменную и ведёт по веткам True/False через edges.

```json
{
    "type": "condition",
    "id": "node_789",
    "name": "check_age",
    "variable": "age",
    "operator": "gte",
    "value": 18
}
```

| Поле       | Тип            | Описание                                              |
| ---------- | -------------- | ----------------------------------------------------- |
| `type`     | `"condition"`  | Тип узла                                              |
| `id`       | string         | Уникальный ID                                         |
| `name`     | string         | Имя узла (для thisIntentName)                         |
| `variable` | string         | Имя переменной из userData                            |
| `operator` | string         | Оператор сравнения (см. таблицу ниже)                 |
| `value`    | string\|number | Значение для сравнения (может быть именем переменной) |

> responseTrue/responseFalse не хранятся в standalone condition узле — они задаются через branch_true/branch_false edges.

**Операторы:**

| Оператор     | Код                             | Описание                  |
| ------------ | ------------------------------- | ------------------------- |
| `eq`         | `a === b`                       | Равно                     |
| `neq`        | `a !== b`                       | Не равно                  |
| `gt`         | `Number(a) > Number(b)`         | Больше                    |
| `gte`        | `Number(a) >= Number(b)`        | Больше или равно          |
| `lt`         | `Number(a) < Number(b)`         | Меньше                    |
| `lte`        | `Number(a) <= Number(b)`        | Меньше или равно          |
| `contains`   | `String(a).includes(String(b))` | Содержит                  |
| `isEmpty`    | `!a \|\| a === ''`              | Пусто / не определено     |
| `isNotEmpty` | `!!a && a !== ''`               | Не пусто                  |
| `isSayTrue`  | `Text.isSayTrue(String(a))`     | Пользователь сказал «да»  |
| `isSayFalse` | `Text.isSayFalse(String(a))`    | Пользователь сказал «нет» |
| `isUrl`      | `Text.isUrl(String(a))`         | Пользователь ввёл URL     |

> Операторы isSayTrue, isSayFalse, isUrl требуют импорта `Text` из `umbot/utils`.

### Action Node (блок действия)

Действие — выполняет код (установка переменных, числа, HTTP).

```json
{
    "type": "action",
    "id": "node_101",
    "name": "generate_numbers",
    "actions": [
        { "type": "random_number", "field": "num1", "min": 1, "max": 10 },
        { "type": "set_variable", "field": "answer", "value": "num1 + num2" },
        {
            "type": "http_request",
            "url": "https://api.com",
            "method": "GET",
            "saveResponseTo": "data"
        }
    ],
    "text": "Ваше число: {{num1}}",
    "buttons": []
}
```

| Поле      | Тип           | Описание                                              |
| --------- | ------------- | ----------------------------------------------------- |
| `type`    | `"action"`    | Тип узла                                              |
| `id`      | string        | Уникальный ID                                         |
| `name`    | string        | Имя узла (для thisIntentName)                         |
| `actions` | ActionBlock[] | Блоки действий                                        |
| `text`    | string        | Текст после выполнения действий (поддерживает `{{}}`) |
| `buttons` | FlowButton[]  | Кнопки после выполнения действий                      |

### Response Node (блок ответа)

Ответ — показывает текст, кнопки, карточки без запроса ввода.

```json
{
    "type": "response",
    "id": "node_202",
    "name": "show_help",
    "response": {
        "text": "Это справка.",
        "tts": "Справка по боту.",
        "isEnd": false,
        "buttons": [{ "title": "Назад", "type": "action" }],
        "card": null,
        "sounds": []
    }
}
```

### End Node

Завершает диалог.

```json
{ "type": "end", "id": "node_303" }
```

---

## Типы данных

### FlowResponse

```json
{
    "text": "Текст ответа",
    "tts": "Текст для озвучки",
    "emotion": "good",
    "isEnd": false,
    "shuffleButtons": false,
    "buttons": [],
    "card": null,
    "sounds": []
}
```

### FlowPrompt

```json
{
    "text": "Текст вопроса",
    "tts": "",
    "emotion": "",
    "shuffleButtons": false,
    "buttons": [],
    "card": null
}
```

### FlowButton

```json
{
    "title": "Текст кнопки",
    "type": "action",
    "targetNodeId": "node_id",
    "url": "https://..."
}
```

| Поле             | Описание                                           |
| ---------------- | -------------------------------------------------- |
| `type: "action"` | Кнопка-действие. `targetNodeId` — ID шага/команды. |
| `type: "link"`   | Кнопка-ссылка. `url` — URL.                        |

### FlowCard

```json
{
    "type": "gallery",
    "title": "Заголовок",
    "images": [
        {
            "src": "https://example.com/photo.jpg",
            "title": "Название",
            "description": "Описание",
            "button": { "title": "Купить", "type": "action", "targetNodeId": "..." }
        }
    ]
}
```

| `type`    | Описание                         |
| --------- | -------------------------------- |
| `single`  | Одно изображение                 |
| `list`    | Список изображений (вертикально) |
| `gallery` | Горизонтальная прокрутка         |

### ActionBlock

```json
{ "type": "set_variable", "field": "name", "value": "userName", "fieldComment": "Имя пользователя" }
{ "type": "random_number", "field": "num", "min": 1, "max": 100, "fieldComment": "Случайное число" }
{ "type": "http_request", "url": "https://api.com", "method": "GET", "headers": "{ \"Auth\": \"token\" }", "body": "{\"key\": \"{{var}}\"}", "saveResponseTo": "data" }
```

| Поле             | Тип    | Описание                                                |
| ---------------- | ------ | ------------------------------------------------------- |
| `type`           | string | `"set_variable"` / `"random_number"` / `"http_request"` |
| `field`          | string | Имя переменной в userData                               |
| `fieldComment`   | string | Комментарий к переменной (отображается в UI)            |
| `value`          | string | Выражение для set_variable (поддерживает `{{var}}`)     |
| `min`            | number | Минимум для random_number (по умолчанию 1)              |
| `max`            | number | Максимум для random_number (по умолчанию 10)            |
| `url`            | string | URL для http_request (поддерживает `{{var}}`)           |
| `method`         | string | HTTP метод: `"GET"` / `"POST"`                          |
| `headers`        | string | Заголовки как JSON строка                               |
| `body`           | string | Тело запроса как JSON строка (поддерживает `{{var}}`)   |
| `saveResponseTo` | string | Сохранить ответ в userData                              |

### FlowCondition

```json
{
    "variable": "score",
    "operator": "gte",
    "value": 100,
    "responseTrue": { "text": "Победа!", "buttons": [] },
    "responseFalse": { "text": "Попробуйте снова.", "buttons": [] }
}
```

> Применяется для inline conditions в command/step. Standalone condition узлы используют edges.

### ConditionResponse

```json
{ "text": "Текст", "buttons": [], "targetNodeId": "step_id" }
```

---

## Связи (Edges)

```json
{
    "from": "source_node_id",
    "to": "target_node_id",
    "type": "next",
    "label": ""
}
```

| Тип            | Описание                 |
| -------------- | ------------------------ |
| `next`         | Последовательный переход |
| `branch_true`  | Ветка «да» от условия    |
| `branch_false` | Ветка «нет» от условия   |
| `slot_match`   | Совпадение слота         |

### Паттерны связей

```
Command → Step (next)
Step → Condition (next)
Condition → Response (branch_true)
Condition → Response (branch_false)
Response → Step (next)  — для циклов
Command → Response (next) — Response генерируется как addStep
Command → Action (next) — Action генерируется как addStep
Command → Condition (next) — Condition генерируется как addStep
```

---

## Подстановка переменных

**В JSON:** `{{variableName}}`
**В сгенерированном коде:** `` `${ctrl.userData.variableName}` ``

```
"Привет, {{userName}}!"  →  setText(ctrl, `Привет, ${ctrl.userData.userName}!`)
```

> Переменные работают в: text (response/prompt), body (http_request), value (set_variable).

---

## База данных

```json
{
    "type": "file",
    "config": { "filePath": "./data" }
}
```

| Тип     | Описание          | Генерируемый код                                                                  |
| ------- | ----------------- | --------------------------------------------------------------------------------- |
| `file`  | Файловое хранение | `import { FileAdapter } from 'umbot/plugins'; bot.use(new FileAdapter());`        |
| `mongo` | MongoDB           | `import { MongoAdapter } from 'umbot/plugins'; bot.use(new MongoAdapter({...}));` |
| `none`  | Без БД            | Не импортирует адаптер                                                            |

---

## Как генерируется код

### Паттерн 1: Простая команда

**JSON:**

```json
{
    "type": "command",
    "name": "greeting",
    "slots": ["привет"],
    "response": { "text": "Привет!" }
}
```

**Генерируемый код:**

```typescript
bot.addCommand('greeting', ['привет'], (cmd, ctrl) => {
    setText(ctrl, 'Привет!');
});
```

### Паттерн 2: Шаг с сохранением

**JSON:**

```json
[
    {
        "type": "command",
        "name": "start",
        "slots": ["начать"],
        "response": { "text": "Как вас зовут?" }
    },
    {
        "type": "step",
        "name": "enterName",
        "prompt": { "text": "Как вас зовут?" },
        "saveTo": "userName"
    }
]
```

**Генерируемый код:**

```typescript
bot.addCommand('start', ['начать'], (cmd, ctrl) => {
    setText(ctrl, 'Как вас зовут?');
    ctrl.thisIntentName = 'enterName';
});
bot.addStep('enterName', (ctrl) => {
    setText(ctrl, `Приятно познакомиться, ${ctrl.userData.userName}!`);
    ctrl.userData.name = ctrl.userCommand ?? '';
});
```

### Паттерн 3: Условие (switch-case)

**JSON:**

```json
{
    "type": "condition",
    "name": "check",
    "variable": "score",
    "operator": "gte",
    "value": 100
}
```

**Генерируемый код:**

```typescript
bot.addStep('check', (ctrl) => {
    const condVar = ctrl.userData.score;
    const condVal = 100;
    const numA = Number(condVar);
    const numB = Number(condVal);
    const useNum = !isNaN(numA) && !isNaN(numB);
    let result = false;
    switch ('gte') {
        case 'gte':
            result = useNum ? numA >= numB : false;
            break;
        // ... другие операторы
    }
    if (result) {
        setText(ctrl, 'Вы победили!');
    }
    if (!result) {
        setText(ctrl, `Счёт: ${ctrl.userData.score}`);
    }
});
```

### Паттерн 4: Картинки (галерея)

**JSON:**

```json
{
    "type": "command",
    "name": "gallery",
    "slots": ["галерея"],
    "response": {
        "text": "Выберите:",
        "card": {
            "type": "gallery",
            "images": [
                { "src": "https://example.com/1.jpg", "title": "iPhone", "description": "999₽" }
            ]
        }
    }
}
```

**Генерируемый код:**

```typescript
bot.addCommand('gallery', ['галерея'], (cmd, ctrl) => {
    setText(ctrl, 'Выберите:');
    ctrl.card.addImage('https://example.com/1.jpg', 'iPhone', '999₽');
});
```

### Паттерн 5: Кнопки

**JSON:**

```json
{
    "type": "command",
    "name": "menu",
    "slots": ["меню"],
    "response": {
        "text": "Выберите:",
        "buttons": [{ "title": "Помощь", "type": "action", "targetNodeId": "help_step" }]
    }
}
```

**Генерируемый код:**

```typescript
bot.addCommand('menu', ['меню'], (cmd, ctrl) => {
    setText(ctrl, 'Выберите:');
    ctrl.buttons.addBtn('Помощь');
    ctrl.thisIntentName = '__menu_handler__';
});
```

### Паттерн 6: isEnd — закрыть диалог

**JSON:**

```json
{
    "type": "command",
    "name": "bye",
    "slots": ["пока"],
    "response": { "text": "До свидания!", "isEnd": true }
}
```

**Генерируемый код:**

```typescript
bot.addCommand('bye', ['пока'], (cmd, ctrl) => {
    setText(ctrl, 'До свидания!');
    ctrl.isEnd = true;
});
```

### Паттерн 7: TTS (озвучка)

**JSON:**

```json
{
    "type": "command",
    "name": "tts_demo",
    "slots": ["озвучь"],
    "response": { "text": "Текст на экране", "tts": "Текст для озвучки" }
}
```

**Генерируемый код:**

```typescript
bot.addCommand('tts_demo', ['озвучь'], (cmd, ctrl) => {
    setText(ctrl, 'Текст на экране');
    setTTS(ctrl, 'Текст для озвучки');
});
```

### Паттерн 8: HTTP-запрос

**JSON:**

```json
{
    "type": "action",
    "name": "fetch_data",
    "actions": [
        {
            "type": "http_request",
            "url": "https://api.example.com/data",
            "method": "GET",
            "saveResponseTo": "apiResult"
        }
    ],
    "text": "Получено: {{apiResult}}"
}
```

**Генерируемый код:**

```typescript
bot.addStep('fetch_data', async (ctrl) => {
    const response = await fetch('https://api.example.com/data');
    ctrl.userData.apiResult = await response.json();
    setText(ctrl, `Получено: ${ctrl.userData.apiResult}`);
});
```

### Паттерн 9: Случайное число

**JSON:**

```json
{
    "type": "action",
    "name": "roll",
    "actions": [{ "type": "random_number", "field": "dice", "min": 1, "max": 6 }],
    "text": "Выпало: {{dice}}"
}
```

**Генерируемый код:**

```typescript
bot.addStep('roll', (ctrl) => {
    ctrl.userData.dice = rand(1, 6);
    setText(ctrl, `Выпало: ${ctrl.userData.dice}`);
});
```

### Паттерн 10: Установка переменной

**JSON:**

```json
{
    "type": "action",
    "name": "set_score",
    "actions": [{ "type": "set_variable", "field": "score", "value": "0" }]
}
```

**Генерируемый код:**

```typescript
bot.addStep('set_score', (ctrl) => {
    ctrl.userData.score = 0;
});
```

### Паттерн 11: Standalone response блок (через edge)

**JSON:**

```json
{ "type": "response", "name": "show_help", "response": { "text": "Это справка." } }
```

**Генерируемый код:**

```typescript
bot.addStep('show_help', (ctrl) => {
    setText(ctrl, 'Это справка.');
});
```

### Паттерн 12: HTTP body с переменными

**JSON:**

```json
{
    "type": "http_request",
    "url": "https://api.com",
    "method": "POST",
    "body": "{\"user\": \"{{userName}}\", \"score\": \"{{score}}\"}",
    "saveResponseTo": "result"
}
```

**Генерируемый код:**

```typescript
// body передаётся как template literal вместо JSON.parse
const response = await fetch('https://api.com', {
    method: 'POST',
    body: `{"user": "${ctrl.userData.userName}", "score": "${ctrl.userData.score}"}`,
});
ctrl.userData.result = await response.json();
```

---

## Импорты (генерируются условно)

```typescript
import { Bot, FALLBACK_COMMAND } from 'umbot';
import { fullPlatforms, telegram, ... } from 'umbot/plugins';
import { setText } from './utils';                    // всегда
import { setText, setTTS } from './utils';            // только при наличии TTS
import { rand } from 'umbot/utils';                   // только при random_number
import { Text } from 'umbot/utils';                   // только при isSayTrue/isSayFalse/isUrl
import { FileAdapter } from 'umbot/plugins';           // только при database.type === 'file'
import { MongoAdapter } from 'umbot/plugins';          // только при database.type === 'mongo'
```

| Условие                         | Импорт                                          |
| ------------------------------- | ----------------------------------------------- |
| Есть TTS у любого узла          | `import { setText, setTTS } from './utils'`     |
| Нет TTS                         | `import { setText } from './utils'`             |
| Есть random_number действия     | `import { rand } from 'umbot/utils'`            |
| Есть isSayTrue/isSayFalse/isUrl | `import { Text } from 'umbot/utils'`            |
| database.type === 'file'        | `import { FileAdapter } from 'umbot/plugins'`   |
| database.type === 'mongo'       | `import { MongoAdapter } from 'umbot/plugins'`  |
| 7 платформ                      | `import { fullPlatforms } from 'umbot/plugins'` |
| Менее 7 платформ                | `import { telegram, ... } from 'umbot/plugins'` |

---

## Валидация имён

- **Имена узлов (name)** — санитизируются в валидные JS-идентификаторы через `sanitizeIdentifier()`:
    - Пробелы и спецсимволы → `_`
    - Кириллица сохраняется (Unicode)
    - Имена, начинающиеся с цифры → префикс `_`
- **Имена переменных (saveTo, field)** — имена, начинающиеся с цифры, оборачиваются в скобки: `ctrl.userData['123field']`
- **Package name** — начинается с буквы, валидный npm identifier
