# Развертывание в продакшене

После того как голосовой навык или чат-бот написан и протестирован локально, его нужно развернуть на сервере, чтобы
платформы могли отправлять ему запросы. В этом руководстве мы рассмотрим полный цикл деплоя: от получения
SSL-сертификата до настройки CI/CD.

## Требования

- Сервер с публичным IP-адресом
- Доменное имя
- SSL-сертификат (обязателен для Алисы, Сбер SmartApp, Маруси, Viber и других платформ)

## Получение SSL-сертификата через acme.sh

### 1. Установите `acme.sh`:

```bash
curl https://get.acme.sh | sh
```

### 2. Выпустите сертификат:

```bash
acme.sh --issue -d example.com -w /var/www/example
```

Где:

- example.com — ваш домен
- /var/www/example — корневая директория сайта (должна быть доступна по HTTP для прохождения проверки)

### 3. Установите сертификат в нужные пути:

```bash
acme.sh --install-cert -d example.com \
  --key-file /etc/ssl/private/example.key \
  --fullchain-file /etc/ssl/certs/example.crt \
  --reloadcmd "sudo systemctl reload nginx"
```

## Настройка nginx

Добавьте в конфигурацию nginx:

```text
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /etc/ssl/certs/example.crt;
    ssl_certificate_key /etc/ssl/private/example.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Перезагрузите nginx:

```bash
sudo systemctl reload nginx
```

## Запуск приложения

Соберите проект:

```bash
npm run build
```

Запустите с помощью pm2 (рекомендуется для продакшена):
Если pm2 не установлен, то установите его:

```bash
npm install -g pm2
```

Запустите сам процесс:

```bash
pm2 start dist/index.js --name "umbot-production"
```

Для того чтобы после перезагрузки сервера приложение было доступно, выполните следующие команды:

```bash
pm2 startup
pm2 save
```

Теперь ваш навык доступен по HTTPS и готов к подключению в консолях разработчика:

- Яндекс.Диалоги
- Сбер Salute
- Маруся для разработчиков
- Telegram BotFather, VK Callback API, Viber Bot Settings и др.

## Варианты запуска

### 1. Встроенный сервер (рекомендуется для простых случаев)

```ts
bot.start('0.0.0.0', 3000);
```

### 2. Интеграция в существующее приложение (Express/Fastify)

См. [Универсальный webhook-обработчик.](https://www.maxim-m.ru/bot/ts-doc/bot/ts-doc/documents/src_docs_platform-integration.md)

## Сборка Docker-образа

При создании проекта через CLI с флагом `--prod` генерируется готовый `Dockerfile`.  
Соберите образ и запустите контейнер, передав токены через переменные окружения:

```bash
docker build -t my-bot .
docker run -p 3000:3000 -e YANDEX_TOKEN=... my-bot
```

## CI/CD

Шаблон .github/workflows/deploy.yml автоматически настраивает:

- Сборку проекта,
- Сборку Docker-образа,
- Деплой на сервер через SSH.

> 🔐 Безопасность: никогда не коммитьте .env в Git. Используйте GitHub Secrets.
