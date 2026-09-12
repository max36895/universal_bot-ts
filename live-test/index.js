#!/usr/bin/env node
'use strict';
/**
 * umbot live-test — консольная проверка работы с настоящими платформами.
 *
 * Режимы:
 *   1) scenarios — прогон сценариев: синтетический входящий запрос «от вашего
 *      тестового пользователя» проходит полный путь фреймворка, и адаптер
 *      отправляет НАСТОЯЩИЕ запросы к API платформы в ваш чат. Каждый
 *      исходящий запрос печатается со статусом и текстом ошибки API.
 *      Для голосовых платформ печатается и проверяется JSON-ответ.
 *   2) webhook — запуск демо-бота как сервера: вы общаетесь с ботом через
 *      саму платформу (кнопки, фото, голосовые — настоящие события).
 *   3) register — регистрация webhook (Telegram, Viber, MAX).
 *
 * Запуск:
 *   node live-test                                    — интерактивное меню
 *   node live-test --platform telegram --mode scenarios
 *   node live-test --platform vk --mode webhook
 *   node live-test --platform telegram --mode register
 *
 * Настройки — в live-test/.env (см. .env.example).
 */
const { PLATFORMS, SCENARIOS } = require('./platforms');
const { createBot } = require('./bot');
const lib = require('./lib');

const { color } = lib;

async function choosePlatform(args) {
    const keys = Object.keys(PLATFORMS);
    if (args.platform && PLATFORMS[args.platform]) {
        return args.platform;
    }
    console.log(color.bold('\nПлатформа:'));
    const answer = await lib.ask(
        'Номер:',
        keys.map((k) => PLATFORMS[k].title),
    );
    const key = keys[Number(answer) - 1];
    if (!key) {
        throw new Error('Неизвестная платформа');
    }
    return key;
}

async function chooseMode(args) {
    const modes = ['scenarios', 'webhook', 'register'];
    if (args.mode && modes.includes(args.mode)) {
        return args.mode;
    }
    console.log(color.bold('\nРежим:'));
    const answer = await lib.ask('Номер:', [
        'Прогон сценариев (реальные запросы к API в ваш тестовый чат)',
        'Webhook-бот (живой диалог через платформу)',
        'Зарегистрировать webhook (Telegram, Viber, MAX)',
    ]);
    const mode = modes[Number(answer) - 1];
    if (!mode) {
        throw new Error('Неизвестный режим');
    }
    return mode;
}

function checkEnv(platform) {
    const missing = platform.env.filter((name) => !process.env[name]);
    if (platform.targetEnv && !process.env[platform.targetEnv]) {
        missing.push(`${platform.targetEnv} (${platform.targetHint})`);
    }
    return missing;
}

function printJournal(journal, logs) {
    if (!journal.length) {
        console.log(color.gray('    исходящих запросов не было'));
    }
    for (const entry of journal) {
        const status = entry.error
            ? color.red(`сеть: ${entry.error}`)
            : entry.apiError
              ? color.red(`${entry.status} ✗ ${entry.apiError}`)
              : color.green(`${entry.status} ✓`);
        console.log(
            `    → ${entry.method} ${entry.url} ${status} ${color.gray(`${entry.ms ?? '?'} мс`)}`,
        );
    }
    for (const log of logs) {
        const text = log.message.length > 400 ? `${log.message.slice(0, 400)}…` : log.message;
        console.log(
            `    ${log.level === 'error' ? color.red('ошибка фреймворка:') : color.yellow('warn:')} ${text}`,
        );
    }
}

/**
 * Прогон одной реплики: синтетический входящий запрос → bot.run.
 * @returns {Promise<boolean>} Успешен ли шаг (нет ошибок API/фреймворка/протокола)
 */
async function runOne(ctx, title, update) {
    const { bot, platform, journal, logs } = ctx;
    journal.length = 0;
    logs.length = 0;
    console.log(`\n${color.bold('▶')} ${title}`);
    let result;
    try {
        result = await bot.run(ctx.appType, update);
    } catch (error) {
        console.log(color.red(`    исключение: ${error instanceof Error ? error.message : error}`));
        return { ok: false, result: null };
    }
    let ok = true;
    if (platform.kind === 'voice') {
        const text = JSON.stringify(result, null, 2);
        console.log(
            color
                .gray(text.length > 1500 ? `${text.slice(0, 1500)}\n…` : text)
                .replace(/^/gm, '    '),
        );
        const problems = platform.validate(result);
        if (problems.length) {
            ok = false;
            problems.forEach((p) => console.log(color.red(`    протокол ✗ ${p}`)));
        } else {
            console.log(color.green('    протокол ✓ обязательные поля на месте'));
        }
    }
    if (platform.kind === 'chat' && result && typeof result === 'object') {
        // Ответ телом webhook (приветствие Viber, webhook-reply Telegram).
        console.log(color.gray(`    тело ответа webhook: ${JSON.stringify(result)}`));
    }
    printJournal(journal, logs);
    if (journal.some((e) => e.error || e.apiError) || logs.some((l) => l.level === 'error')) {
        ok = false;
    }
    return { ok, result };
}

/**
 * Как настоящая голосовая платформа, возвращает сохранённый навыком state
 * в следующем запросе (session_state/application_state/user_state_update).
 */
function carryState(update, previous) {
    if (!previous || !update.state) {
        return update;
    }
    const map = {
        session_state: 'session',
        application_state: 'application',
        user_state_update: 'user',
    };
    for (const [field, key] of Object.entries(map)) {
        if (previous[field] !== undefined) {
            update.state[key] = previous[field];
        }
    }
    return update;
}

async function runScenarios(ctx) {
    const { platform } = ctx;
    const target = process.env[platform.targetEnv] || 'live-user';
    const results = [];
    let messageId = 0;
    let previous = null;
    for (const scenario of SCENARIOS) {
        const update = carryState(
            platform.message(target, scenario.say, messageId++, process.env),
            previous,
        );
        const run = await runOne(ctx, `«${scenario.say}» — ${color.gray(scenario.expect)}`, update);
        previous = run.result;
        results.push({ name: scenario.say, ok: run.ok });
    }
    for (const [name, build] of Object.entries(platform.extra || {})) {
        const run = await runOne(ctx, `событие ${name}`, build(target));
        results.push({ name, ok: run.ok });
    }
    if (platform.kind === 'voice' && ctx.platformKey !== 'smartapp') {
        const ping = platform.message(target, 'ping', messageId++, process.env);
        ping.request.command = '';
        const run = await runOne(ctx, 'health-check ping', ping);
        results.push({ name: 'ping', ok: run.ok });
    }
    console.log(color.bold('\nИтог:'));
    for (const r of results) {
        console.log(`  ${r.ok ? color.green('✓') : color.red('✗')} ${r.name}`);
    }
    if (platform.kind === 'chat') {
        console.log(
            color.gray(
                '\nПроверьте и глазами в приложении платформы: сообщения, кнопки, картинки,' +
                    ' голосовое. Нажатие кнопки «Нажми меня» проверяется в webhook-режиме.',
            ),
        );
    }
    return results.every((r) => r.ok);
}

async function runWebhook(ctx) {
    const host = process.env.LIVE_HOST || '0.0.0.0';
    const port = Number(process.env.LIVE_PORT || 3000);
    // Входящее событие и тело ответа — чтобы видеть весь круг «платформа → бот → платформа».
    ctx.bot.use(async (controller, next) => {
        console.log(
            `\n${color.bold('←')} ${controller.appType} user=${controller.userId} ` +
                `event=${controller.eventType} текст=«${controller.originalUserCommand ?? ''}»`,
        );
        await next();
    });
    const run = ctx.bot.run.bind(ctx.bot);
    ctx.bot.run = async (...args) => {
        const result = await run(...args);
        const body = typeof result === 'string' ? result : JSON.stringify(result);
        console.log(
            color.gray(
                `  тело ответа webhook: ${body.length > 800 ? `${body.slice(0, 800)}…` : body}`,
            ),
        );
        return result;
    };
    ctx.bot.start(host, port);
    console.log(color.bold(`\nWebhook-бот ${ctx.platform.title} слушает http://${host}:${port}/`));
    console.log(
        'Направьте webhook платформы на ваш публичный HTTPS-адрес, проксируемый на этот порт.\n' +
            'Напишите боту «помощь». Входящие события и исходящие запросы печатаются ниже. Ctrl+C — выход.',
    );
    // Печатаем журнал периодически: запросы идут из обработчиков вебхука.
    setInterval(() => {
        if (ctx.journal.length || ctx.logs.length) {
            printJournal(ctx.journal.splice(0), ctx.logs.splice(0));
        }
    }, 500).unref?.();
    await new Promise(() => {});
}

async function register(ctx) {
    const url = process.env.LIVE_PUBLIC_URL;
    if (!url) {
        throw new Error('Задайте LIVE_PUBLIC_URL — публичный HTTPS-адрес webhook.');
    }
    const { plugins } = ctx;
    const appContext = ctx.bot.getAppContext();
    switch (ctx.platformKey) {
        case 'telegram': {
            const body = { url };
            if (process.env.TELEGRAM_WEBHOOK_SECRET) {
                body.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;
            }
            await appContext.httpClient(
                `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/setWebhook`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                },
            );
            break;
        }
        case 'viber':
            await new plugins.ViberRequest(appContext).setWebhook(url);
            break;
        case 'max':
            await new plugins.MaxRequest(appContext).subscriptions(url, {
                ...(process.env.MAX_WEBHOOK_SECRET
                    ? { secret: process.env.MAX_WEBHOOK_SECRET }
                    : {}),
            });
            break;
        default:
            console.log(
                'Эта платформа настраивается в консоли разработчика:\n' +
                    '  VK — Управление сообществом → Работа с API → Callback API: адрес, код подтверждения (VK_CONFIRMATION_TOKEN), секрет (VK_SECRET_KEY), события message_new и message_event.\n' +
                    '  Алиса — консоль Яндекс.Диалогов → Webhook URL.\n' +
                    '  SmartApp — SmartApp Studio → Webhook.',
            );
            return true;
    }
    printJournal(ctx.journal.splice(0), ctx.logs.splice(0));
    return true;
}

async function main() {
    const args = lib.parseArgs(process.argv.slice(2));
    const envFile = lib.loadEnv();
    const umbot = lib.loadUmbot();
    console.log(
        color.bold('umbot live-test') +
            color.gray(
                ` (${umbot.source}; .env: ${envFile ?? 'не найден, только переменные окружения'})`,
            ),
    );

    const platformKey = await choosePlatform(args);
    const platform = PLATFORMS[platformKey];
    if (platform.note) {
        console.log(color.yellow(`\n⚠ ${platform.note}`));
    }
    const mode = await chooseMode(args);

    const missing = checkEnv(platform).filter((m) => mode !== 'webhook' || !m.startsWith('LIVE_'));
    if (missing.length) {
        console.log(color.red('\nНе заданы переменные:'));
        missing.forEach((m) => console.log(`  - ${m}`));
        process.exitCode = 1;
        return;
    }
    if (platform.optionalEnv) {
        const absent = platform.optionalEnv.filter((n) => !process.env[n]);
        if (absent.length) {
            console.log(
                color.yellow(
                    `\nНе заданы ${absent.join(', ')} — загрузка картинок/звуков на платформу будет пропущена.`,
                ),
            );
        }
    }

    const journal = [];
    const logs = [];
    const bot = createBot({
        core: umbot.core,
        plugins: umbot.plugins,
        platform,
        env: process.env,
        images: lib.prepareImages(),
        logger: lib.makeLogger(logs),
    });
    lib.traceHttp(bot.getAppContext(), journal);

    const ctx = {
        bot,
        platform,
        platformKey,
        appType: { max: 'max_app', smartapp: 'smart_app' }[platformKey] ?? platformKey,
        journal,
        logs,
        plugins: umbot.plugins,
    };

    let ok = true;
    if (mode === 'scenarios') {
        ok = await runScenarios(ctx);
        await bot.close();
    } else if (mode === 'webhook') {
        await runWebhook(ctx);
    } else {
        ok = await register(ctx);
    }
    process.exitCode = ok ? 0 : 1;
}

main().catch((error) => {
    console.error(color.red(`\nОшибка: ${error instanceof Error ? error.message : error}`));
    process.exitCode = 1;
});
