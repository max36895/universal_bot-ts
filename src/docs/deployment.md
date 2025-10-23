# Развертывание в продакшене

## Требования

- Сервер с публичным IP-адресом
- Доменное имя
- SSL-сертификат (обязателен для Яндекс.Алисы, Сбер SmartApp, Маруси, Viber и других платформ)

## Получение SSL-сертификата через acme.sh

1. Установите `acme.sh`:

```bash
curl https://get.acme.sh | sh
```

2. Выпустите сертификат:

```bash
acme.sh --issue -d example.com -w /var/www/example
```

Где:

- example.com — ваш домен
- /var/www/example — корневая директория сайта (должна быть доступна по HTTP для прохождения проверки)

3. Установите сертификат в нужные пути:

```bash
acme.sh --install-cert -d example.com \
  --key-file /etc/ssl/private/example.key \
  --fullchain-file /etc/ssl/certs/example.crt \
  --reloadcmd "sudo systemctl reload nginx"
```

## Настройка nginx

Добавьте в конфигурацию nginx:

```nginx
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

```bash
pm2 start dist/index.js --name "umbot-production"
```

Теперь ваш навык доступен по HTTPS и готов к подключению в консолях разработчика:

- Яндекс.Диалоги
- Сбер Salute
- Маруся для разработчиков
- Telegram BotFather, VK Callback API, Viber Bot Settings и др.