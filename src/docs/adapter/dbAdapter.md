# Адаптеры баз данных (DB Adapters)

Фреймворк umbot не знает, используете вы SQL, NoSQL или файловую систему. Он оперирует абстрактными объектами IQuery и IQueryData. Ваша задача как разработчика адаптера — написать "транслятор", который превращает эти абстракции в реальные запросы к вашей СУБД.

## Архитектура: Template Method

Базовый класс `BaseDbAdapter` (из `umbot/plugins`) берет на себя рутину:

- Замер времени выполнения запросов (метрики EMetric.DB_SELECT, DB_INSERT и т.д.).
- Управление жизненным циклом (вызов connect при старте).
- Обертки над вашими методами (публичные `select`, `insert` вызывают ваши `_select`, `_insert`).

### Почему мы переопределяем \_select, а не select?

Публичные методы (`select`, `insert`, `update`, `remove`) в `BaseDbAdapter` уже написаны. Они оборачивают ваши внутренние методы (`_select`, `_insert`), чтобы замерять время выполнения и логировать метрики. Если вы переопределите select(), вы сломаете сбор метрик и логику повторных подключений. Вы всегда реализуете только методы с подчеркиванием.

## Обязательный контракт (что нужно реализовать)

Наследуемся от `BaseDbAdapter` и реализуем:

1. connect(): Promise<boolean> — Устанавливаете соединение с БД.
2. isConnected(): Promise<boolean> — Проверяете, живо ли соединение (например, делаете ping БД).
3. \_select(selectData: IQuery, where: IQueryData | null, isOne: boolean): Promise<IModelRes> — Поиск.
4. \_insert(insertData: IQuery): Promise<boolean> — Добавление.
5. \_update(updateData: IQuery): Promise<boolean> — Обновление.
6. \_remove(removeData: IQuery): Promise<boolean> — Удаление.
7. destroy(): Promise<void> — Закрываете пул соединений при остановке приложения.

## Форматы данных (Шпаргалка):

### Вход (IQuery): То, что фреймворк передает вам.

Это объект, который фреймворк передает в ваши методы \_select, \_insert и т.д.

```ts
{
  tableName: 'UsersData',       // Имя таблицы/коллекции
  primaryKeyName: 'userId',     // Первичный ключ
  query: { userId: '123' },     // Условия WHERE (может быть null)
  data: { name: 'John' },       // Данные для SET (может быть null)
  rules: [{ name: ['name'], type: 'string', max: 50 }] // Правила валидации
}
```

### Условия и данные (IQueryData)

Формат query и data внутри IQuery.
Важно: Значения могут быть не только примитивами, но и объектами с операторами. Фреймворк не навязывает конкретный диалект (например, $gt для Mongo или > для SQL). Адаптер сам решает, как интерпретировать эти операторы.

```ts
// Простое условие (равенство)
{ userId: '123', platform: 'alisa' }

// Условие с оператором (адаптер должен сам распарсить это в SQL `age > 18` или Mongo `$gt`)
{ age: { $gt: 18 }, status: 'active' }
```

### Выходные данные (IModelRes)

То, что вы обязаны вернуть из метода `_select`.

```ts
// Успех (даже если ничего не найдено, status должен быть true, а data - пустым массивом или null)
{ status: true, data: { userId: '123', name: 'John' } }
{ status: true, data: [] }

// Ошибка (сбой подключения, синтаксическая ошибка и т.д.)
{ status: false, error: 'Connection timeout' }
```

Для методов `_insert`, `_update`, `_remove` вы возвращаете просто boolean (true при успехе, false при ошибке).

## Критические нюансы (Скрытые контракты)

### 1. Валидация данных

В базовом классе `BaseDbAdapter` нет встроенного метода `validate()`.
Однако в `MongoAdapter` он реализован для валидации данных по правилам модели (`IModelRules`).

Если вы хотите, чтобы ваш адаптер также валидировал данные (обрезал строки по `max`,
приводил типы), реализуйте метод `validate()` в своём классе:

```ts
public validate(query: IQuery, element: IQueryData | null): IQueryData {
    if (!element) return {};

    const rules = query.rules;
    if (rules) {
        rules.forEach((rule) => {
            rule.name.forEach((fieldName) => {
                if (rule.type === 'string' || rule.type === 'text') {
                    if (rule.max !== undefined) {
                        element[fieldName] = Text.resize(element[fieldName] as string, rule.max);
                    }
                    element[fieldName] = this.escapeString(element[fieldName] as string);
                } else if (rule.type === 'integer' || rule.type === 'int') {
                    element[fieldName] = +(element[fieldName] as number);
                }
            });
        });
    }
    return element;
}
```

Затем вызывайте его в `_insert()` и `_update()`:

```ts
public async _insert(insertData: IQuery): Promise<boolean> {
    const validData = this.validate(insertData, insertData.data);
    // ... выполнение запроса с validData
}
```

**Примечание**: Валидация в модели (`Model.validate()`) и в адаптере (`validate()`) — это разные вещи.
Модель валидирует свои данные перед сохранением, а адаптер валидирует данные по правилам `IModelRules`
перед выполнением запроса к БД.

_Зачем тогда в `IQuery` передаются `rules`?_
Они нужны вам для **маппинга типов** специфичных для вашей СУБД. Например, если вы пишете SQL-адаптер, вы можете использовать `rules`, чтобы понять, что поле с `type: 'object'` нужно сериализовать в JSON-строку перед вставкой, а `max: 150` использовать для динамического создания `VARCHAR(150)`.

### 2. Хранение подключения (Connection Pool)

Чтобы не создавать новое подключение к БД на каждый запрос, фреймворк предоставляет синглтон-хранилище.
При успешном `connect()` вы должны сохранить пул соединений в `this._appContext.database.databaseInfo`.

```ts
async connect(): Promise<boolean> {
    const pool = await createMyDbPool(this._dbOptions);
    // Сохраняем пул, чтобы использовать его в _select/_insert
    this._appContext.database.databaseInfo = { myDbPool: pool };
    return true;
}
```

### 3. Произвольные запросы (\_query)

Если разработчику приложения нужно выполнить "сырой" SQL-запрос или агрегацию, он использует метод `model.query(callback)`.
В `BaseDbAdapter` публичный `query` просто вызывает `_query`. По умолчанию `_query` возвращает `null`. Если вы хотите поддержать кастомные запросы, переопределите `_query`, передав в callback ваше подключение.

### 4. Обработка ошибок

Не бросайте исключения (`throw new Error`) из методов `_select`, `_insert`, `_update`, `_remove`.
Фреймворк ожидает, что вы сами обработаете ошибки внутри метода и вернете `false` или `{ status: false, error: ... }`.

## Универсальный пример реализации (Псевдокод)

```ts
import { BaseDbAdapter } from 'umbot/plugins';
import { IQuery, IQueryData, IModelRes, TQueryCb } from 'umbot';

export class MyCustomDbAdapter extends BaseDbAdapter {
    async connect(): Promise<boolean> {
        try {
            // 1. Создаем пул соединений
            const pool = await myDbDriver.connect(this._dbOptions);
            // 2. Сохраняем его в контекст
            this._appContext.database.databaseInfo = { pool };
            return true;
        } catch (err) {
            return false;
        }
    }

    async isConnected(): Promise<boolean> {
        const pool = this._appContext.database.databaseInfo?.pool;
        return pool ? await pool.ping() : false;
    }

    async _select(
        selectData: IQuery,
        where: IQueryData | null,
        isOne: boolean,
    ): Promise<IModelRes> {
        const pool = this._appContext.database.databaseInfo?.pool;
        if (!pool) return { status: false, error: 'No DB connection' };

        try {
            // 1. Парсим абстрактные условия where в SQL/NoSQL запрос
            const sqlQuery = this.buildSelectQuery(selectData.tableName, where, isOne);

            // 2. Выполняем запрос
            const result = await pool.execute(sqlQuery);

            // 3. Возвращаем в формате IModelRes
            return { status: true, data: result };
        } catch (err) {
            // Не бросаем исключение, а возвращаем статус false
            return { status: false, error: (err as Error).message };
        }
    }

    async _insert(insertData: IQuery): Promise<boolean> {
        const pool = this._appContext.database.databaseInfo?.pool;
        if (!pool) return false;

        try {
            // Валидация (так как в BaseDbAdapter её нет, используем свою)
            const validData = this.validate(insertData, insertData.data);
            const sqlQuery = this.buildInsertQuery(insertData.tableName, validData);
            await pool.execute(sqlQuery);
            return true;
        } catch (err) {
            return false;
        }
    }

    // Переопределяем _query, чтобы поддержать сырые запросы от разработчика
    public async _query(callback: TQueryCb): Promise<unknown> {
        const pool = this._appContext.database.databaseInfo?.pool;
        if (pool) {
            // Передаем пул в callback разработчика
            return await callback(pool, pool);
        }
        return null;
    }

    async destroy(): Promise<void> {
        const pool = this._appContext.database.databaseInfo?.pool;
        if (pool) await pool.close();
    }

    // --- Вспомогательные методы ---

    // Своя валидация
    private validate(query: IQuery, data: IQueryData | null): IQueryData {
        if (!data) return {};
        // Здесь можно пройтись по query.rules и обрезать строки по max
        return data;
    }

    // Транслятор IQueryData в SQL (упрощенно)
    private buildSelectQuery(table: string, where: IQueryData | null, isOne: boolean): string {
        let sql = `SELECT * FROM ${table}`;
        if (where) {
            const conditions = Object.keys(where).map((key) => {
                const val = where[key];
                // Поддержка операторов
                if (typeof val === 'object' && val !== null && val.$gt !== undefined) {
                    return `${key} > ${val.$gt}`;
                }
                return `${key} = '${val}'`;
            });
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        if (isOne) sql += ' LIMIT 1';
        return sql;
    }

    private buildInsertQuery(table: string, data: IQueryData): string {
        // ... логика формирования INSERT
        return '';
    }
}
```
