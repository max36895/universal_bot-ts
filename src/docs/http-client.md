# 🌐 Кастомизация HTTP-слоя

Начиная с версии `2.1.0`, вы можете заменить встроенный `fetch` на любой совместимый HTTP-клиент через
`AppContext.httpClient`. Это позволяет добавлять retry-логику, таймауты, tracing, моки в тестах и т.д.

## 🎯 Зачем это нужно?

- ⏱️ **Таймауты** - ограничение времени запросов
- 🔄 **Retry-логика** - повторные попытки при ошибках
- 🕵️ **Tracing** - трассировка запросов
- 🧪 **Моки** - подмена в тестах

## 💻 Пример использования

```ts
const bot = new Bot('alisa');
const ctx = bot.getAppContext();

ctx.httpClient = async (input, init) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(input, { ...init, signal: controller.signal });
        clearTimeout(id);
        return res;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
};

bot.start();
```