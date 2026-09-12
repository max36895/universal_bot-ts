'use strict';
/**
 * Демо-бот live-теста: каждая команда проверяет одну возможность фреймворка
 * (текст, кнопки, payload-действие, карточки, голос, звуки, шаги, события).
 * Один и тот же бот используется и в прогоне сценариев, и в webhook-режиме.
 */
const path = require('node:path');
const { TMP_DIR } = require('./lib');

const REPO_URL = 'https://github.com/max36895/universal_bot-ts';

const HELP_TEXT =
    'umbot live-test. Команды: «текст», «кнопки», «карточка», «галерея», ' +
    '«голос», «звук», «шаг», «помощь». Любая другая фраза — fallback.';

/**
 * Создаёт бота с одной платформой и демо-командами.
 * @param {object} opts
 * @param {object} opts.core Модуль umbot
 * @param {object} opts.plugins Модуль umbot/plugins
 * @param {object} opts.platform Описание платформы из platforms.js
 * @param {object} opts.env Переменные окружения
 * @param {string[]} opts.images Пути к тестовым картинкам
 * @param {object} opts.logger Логгер umbot
 * @returns {object} Экземпляр Bot
 */
function createBot({ core, plugins, platform, env, images, logger }) {
    const { Bot, BotController } = core;

    class LiveController extends BotController {
        action() {
            // Вся логика — в обработчиках команд ниже.
        }
    }

    const bot = new Bot();
    bot.setLogger(logger);
    bot.initBotController(LiveController);
    // env не задаём: без него umbot сам тихо подхватывает токены из process.env.
    bot.setAppConfig({
        json: path.join(TMP_DIR, 'db'),
        error_log: path.join(TMP_DIR, 'logs'),
        // Как в сгенерированных CLI-проектах: на голосовых платформах данные —
        // в state платформы, на чатах — в БД (FileAdapter ниже).
        isLocalStorage: true,
    });
    const adapter = platform.adapter({ plugins, env });
    bot.use(adapter);
    bot.use(new plugins.FileAdapter());
    // Событийные обработчики — только для событий, которые платформа умеет выставлять.
    const supports = (event) => (adapter.supportedEvents ?? []).includes(event);
    platform.configure?.(bot.getAppContext(), env);

    const imageUrl = env.LIVE_IMAGE_URL;
    // SmartApp показывает картинки только по URL — локальные файлы не загружает.
    const pickImage = (i) => (platform.kind === 'voice' && imageUrl ? imageUrl : images[i]);

    bot.addCommand(
        'live_help',
        ['помощь', 'help', 'start', '/start', 'начать', 'старт'],
        (_t, ctx) => {
            ctx.text = HELP_TEXT;
        },
    );
    if (supports('start')) {
        bot.addEvent('start', (ctx) => {
            ctx.text = `Привет! Событие start (addEvent) сработало. ${HELP_TEXT}`;
        });
    }

    bot.addCommand('live_text', ['текст'], (_t, ctx) => {
        ctx.text = 'Проверка текста: umbot live-test ✓';
    });

    bot.addCommand('live_buttons', ['кнопки'], (_t, ctx) => {
        ctx.text = 'Проверка кнопок. Нажмите «Нажми меня» — должен сработать addAction.';
        // Строковый payload: Telegram/VK/MAX — callback, Viber — ActionBody,
        // Алиса/Маруся — {command}, SmartApp — server_action.
        ctx.buttons.addBtn('Нажми меня', null, 'live_action', { style: 'success' });
        ctx.buttons.addLink('Открыть репозиторий', REPO_URL);
    });
    bot.addAction('live_action', (_t, ctx) => {
        ctx.text = 'Кнопка с payload сработала (addAction) ✓';
        if (ctx.api?.can?.('answerCallback')) {
            // Снимаем «часики» кнопки (Telegram/VK/MAX).
            ctx.platformOptions.callbackNotificationText = 'Готово ✓';
        }
    });

    bot.addCommand('live_card', ['карточка'], (_t, ctx) => {
        ctx.text = 'Карточка с одной картинкой:';
        ctx.card.addOneImage(pickImage(0), 'Заголовок карточки', 'Описание карточки', 'Подробнее');
    });

    bot.addCommand('live_gallery', ['галерея', 'карусель'], (_t, ctx) => {
        ctx.text = 'Набор картинок:';
        ctx.card.title = 'Каталог live-test';
        for (let i = 0; i < 3; i++) {
            ctx.card.addImage(
                pickImage(i),
                `Товар ${i + 1}`,
                `Описание товара ${i + 1}`,
                'Подробнее',
            );
        }
    });

    bot.addCommand('live_voice', ['голос'], (_t, ctx) => {
        ctx.text = 'Сейчас должен прозвучать синтез речи.';
        ctx.tts = 'Привет! Это проверка голоса в чате через Яндекс Спичкит.';
    });

    bot.addCommand('live_sound', ['звук'], (_t, ctx) => {
        ctx.text = 'Стандартный звук победы.';
        ctx.tts = 'Победа! #game_win#';
    });

    bot.addCommand('live_step', ['шаг'], (_t, ctx) => {
        ctx.text = 'Проверка шагов (addStep). Как тебя зовут?';
        ctx.thisIntentName = 'live_ask_name';
    });
    bot.addStep('live_ask_name', (ctx) => {
        ctx.text = `Приятно познакомиться, ${ctx.originalUserCommand}! Шаги работают ✓`;
    });

    if (supports('photo')) {
        bot.addEvent('photo', (ctx) => {
            ctx.text = 'Получил фото (addEvent photo) ✓';
        });
    }

    bot.addCommand('*', [], (_t, ctx) => {
        ctx.text = `Не понял «${ctx.originalUserCommand}» (fallback ✓). Напишите «помощь».`;
    });

    return bot;
}

module.exports = { createBot, HELP_TEXT };
