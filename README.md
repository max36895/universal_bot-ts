Универсальное приложение для создания навыков и ботов
=====================================================

Документация
------------
Документация: [u-bot-ts](https://www.maxim-m.ru/bot/ts-doc/index.html). Получить информации о работе приложения можно в [телеграм канале](https://t.me/joinchat/AAAAAFM8AcuniLTwBLuNsw) или [группе](https://t.me/mm_universal_bot).
Также можно прочитать [статью, в которой рассказано как создать навык "Я никогда не"](https://www.maxim-m.ru/article/sozdanie-navyika-ya-nikogda-ne)

### Создание документации
Для создания документации, установите typedoc. 
```bash
 npm install typedoc -g
```
После чего выполните команду:
```bash
npm run doc
```

Описание
--------
Движок позволяет создать навык для Яндекс.Алиса, Маруси, Сбер(SmartApp), бота для vk, viber или telegram, с идентичной логикой.
Типы доступных приложений в дальнейшем будут дополняться.

При необходимости есть возможность создать приложение со своим типом бота.
Тип приложения устанавливается в `mmApp.appType`, по умолчанию используется alisa.

Установка и запуск
------
## Установка
Склонируйте репозиторий с приложением, например в папку u_bot
```bash
git clone https://github.com/max36895/universal_bot-ts.git u_bot
```

## Запуск
1. Установите зависимости.
```bash
npm i
```
2. Напишите логику приложения.
3. Соберите проект.
```bash
npm run build
```
3. Запустите. Для запуска, в директории приложения создайте package.json со следующим содержимым:
```json
{
  "name": "Название Вашего приложения",
  "description": "Описание",
  "main": "index.js (Путь к индексному файлу)",
  "scripts": {
    "start": "micro",
    "build": "rm -rf dist/ && tsc"
  },
  "dependencies": {
    "micro": "^9.3.4"
  }
}
```
После, запустите сервер командой:
```bash
npm start
``` 
На данный момент поддерживается запуск через `micro`.

Тесты
------------
Для запуска тестов воспользуйтесь 1 из способов:
1. Сборка проекта и запуск тестов. В таком случае происходит сборка движка + запускаются тесты.
```bash
npm run bt
```
2. Запуск тестов. В таком случае, запустятся только тесты, но важно учесть, чтобы движок был собран.
```bash
npm test
```

# SSL
Для работы некоторых приложений, необходимо иметь ssl сертификат. Поэтому необходимо его получить. Для этого можно воспользоваться acme.
## Установка acme.sh
```bash
curl https://get.acme.sh | sh
```
## Использование и установка сертификата для сайта
```bash
acme.sh --issue -d {{domain}} -w {{domain dir}}
```
1. domain - Название домена (example.com)
2. domain dir - Директория, в которой находится сайт

```bash
acme.sh --install-cert -d {{domain}} --key-file {{key file}} --fullchain-file {{cert file}} --reloadcmd "service nginx reload"
```
1. domain - Название домена (example.com)
2. key file - Директория, в которой хранится ключ сертификата
3. cert file - Директория, в которой сохранится сертификат

## Важно!
После получения сертификата, перезапустите сервер. Для ngnix - `sudo service nginx reload`

# Ngrok
Используется для локального тестирование навыка. Актуально в том случае, когда разработчику необходимо протестировать работу приложения в локальной сети.
## Установка
Смотрите на сайте [ngrok](https://ngrok.com/download)
## Запуск
```bash
ngrok http --host-header=rewrite <domain>:port
```
1. domain - локальный адрес сайта. Важно сайт должен быть доступен на машине! (Прописан в файле hosts)
2. port - Порт для подключения. Для бесплатного аккаунта нельзя использовать 443 порт

После успешного запуска, скопируйте полученную ссылку с https, и вставить в консоль разработчика.

# Тестирование Вашего проекта
Протестировать приложение можно 2 способами:
1. Через ngrok (Актуально для Алисы).
2. Через консоль (локально).
## Тестирование через Ngroc
Для тестирование через ngrok, необходимо скачать программу, а также запустить её.
После полученную ссылку с https, вставить в [консоль разработчика](https://dialogs.yandex.ru/developer), и перейти на вкладку тестирования.
Данное действие актуально только для Алисы. Для других платформ ссылка вставляется в соответствующую консоль разработчика.

## Тестирование в консоли
Для тестирования используется тот же код что и для запуска. С той лишь разнице, что нужно вызывать метод test вместо run + не нужно запускать micro.
После запустите приложение. 
```bash
node index.js
```
Откроется консоль с Вашим приложением. Для выхода из режима тестирования нужно:
1. Если навык в определенный момент ставит `isEnd` в True (Что означает завершение диалога), то нужно дойти до того места сценария, в котором диалог завершается.
2. Вызвать команду exit.

Помимо ответов, можно вернуть время обработки команд и состояние хранилища.

Помощь и поддержка проекта
------
Любая помощь и поддержка приветствуется.
Если будут найдены различные ошибки или предложения по улучшению, то смело пишите на почту: maximco36895@yandex.ru
