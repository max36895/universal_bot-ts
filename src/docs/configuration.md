# Конфигурация и безопасность
## Хранение токенов
Для безопасного хранения токенов и других чувствительных данных, вы можете использовать два подхода:

### Вариант 1: `.env` (рекомендуется)

```ts
bot.setAppConfig({ env: './.env' });
```

Пример файла `.env`:
```env
TELEGRAM_TOKEN=your-telegram-token
VK_TOKEN=your-vk-token
VK_CONFIRMATION_TOKEN=your-vk-confirmation-token
VIBER_TOKEN=your-viber-token
YANDEX_TOKEN=your-alisa-token
MARUSIA_TOKEN=your-marusia-token
DB_HOST=localhost
DB_USER=bot_user
DB_PASSWORD=secure_password
DB_NAME=bot_database
```
> Важно! 
> Никогда не коммитьте .env файлы в Git
> Используйте разные токены для разработки и продакшена

### Вариант 2: Прямая передача в коде
```typescript
bot.setPlatformParams({
  telegram_token: 'your-telegram-token',
  vk_token: 'your-vk-token',
});

bot.setAppConfig({
  db: {
    host: 'localhost',
    user: 'bot_user',
    password: 'secure_password',
    database: 'bot_database',
  },
});
```
Вы можете комбинировать оба подхода - значения из .env файла имеют приоритет над значениями, указанными в конфигурации.

Рекомендуется хранить чувствительные данных в `.env` файле.