'use strict';
/**
 * Описание платформ для live-теста: как подключить адаптер, какие переменные
 * окружения нужны, как собрать синтетический входящий запрос «от вашего
 * тестового пользователя» и как проверить ответ голосовой платформы.
 *
 * Синтетический запрос проходит тот же путь, что и настоящий webhook
 * (bot.run → адаптер → команды → контроллер → адаптер), и адаптер делает
 * НАСТОЯЩИЕ запросы к API платформы в ваш тестовый чат.
 */

let seq = Date.now() % 1_000_000;
const nextId = () => ++seq;

/** Проверка обязательных полей ответа по протоколу. */
function requireFields(obj, rules) {
    const problems = [];
    for (const [pathStr, check, hint] of rules) {
        const value = pathStr.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
        if (!check(value)) {
            problems.push(`${pathStr}: ${hint}`);
        }
    }
    return problems;
}

const isStr = (v) => typeof v === 'string';
const isBool = (v) => typeof v === 'boolean';

function validateButtonsPayload(buttons) {
    const problems = [];
    for (const b of buttons || []) {
        if (!isStr(b.title) || !b.title || b.title.length > 64) {
            problems.push(`buttons[].title "${b.title}": обязателен, до 64 символов`);
        }
        if (b.payload !== undefined && (typeof b.payload !== 'object' || b.payload === null)) {
            problems.push('buttons[].payload: по протоколу — JSON-объект');
        }
    }
    return problems;
}

const PLATFORMS = {
    telegram: {
        title: 'Telegram',
        kind: 'chat',
        env: ['TELEGRAM_TOKEN'],
        targetEnv: 'LIVE_TELEGRAM_CHAT_ID',
        targetHint:
            'ID вашего чата с ботом (напишите боту и узнайте chat.id, например через @userinfobot)',
        adapter: ({ plugins, env }) => new plugins.TelegramAdapter(env.TELEGRAM_TOKEN),
        configure: (appContext, env) => {
            if (env.TELEGRAM_WEBHOOK_SECRET) {
                appContext.appConfig.tokens.telegram.webhookSecret = env.TELEGRAM_WEBHOOK_SECRET;
            }
        },
        message: (target, text) => ({
            update_id: nextId(),
            message: {
                message_id: nextId(),
                from: { id: Number(target), is_bot: false, first_name: 'Live', username: 'live' },
                chat: { id: Number(target), type: 'private' },
                date: Math.floor(Date.now() / 1000),
                text,
            },
        }),
    },
    vk: {
        title: 'VK',
        kind: 'chat',
        env: ['VK_TOKEN'],
        targetEnv: 'LIVE_VK_USER_ID',
        targetHint:
            'ваш числовой id VK; предварительно напишите сообществу, чтобы оно могло отвечать',
        adapter: ({ plugins, env }) =>
            new plugins.VkAdapter(env.VK_TOKEN, {
                vk_confirmation_token: env.VK_CONFIRMATION_TOKEN,
                vk_secret_key: env.VK_SECRET_KEY,
            }),
        message: (target, text) => ({
            type: 'message_new',
            group_id: 1,
            event_id: `live-${nextId()}`,
            object: {
                message: {
                    id: nextId(),
                    date: Math.floor(Date.now() / 1000),
                    from_id: Number(target),
                    peer_id: Number(target),
                    text,
                },
                client_info: { keyboard: true, inline_keyboard: true, carousel: true },
            },
        }),
    },
    max: {
        title: 'MAX',
        kind: 'chat',
        env: ['MAX_TOKEN'],
        targetEnv: 'LIVE_MAX_USER_ID',
        targetHint: 'ваш user_id в MAX; предварительно нажмите «Начать» у бота',
        adapter: ({ plugins, env }) =>
            new plugins.MaxAdapter(
                env.MAX_TOKEN,
                env.MAX_WEBHOOK_SECRET ? { secret: env.MAX_WEBHOOK_SECRET } : undefined,
            ),
        message: (target, text) => ({
            update_type: 'message_created',
            timestamp: Date.now(),
            message: {
                sender: { user_id: Number(target), first_name: 'Live' },
                recipient: { user_id: Number(target) },
                body: { mid: `live-${nextId()}`, seq: nextId(), text },
            },
        }),
        extra: {
            bot_started: (target) => ({
                update_type: 'bot_started',
                timestamp: Date.now(),
                user: { user_id: Number(target), first_name: 'Live' },
                payload: 'live_deeplink',
            }),
        },
    },
    viber: {
        title: 'Viber',
        kind: 'chat',
        env: ['VIBER_TOKEN'],
        targetEnv: 'LIVE_VIBER_USER_ID',
        targetHint:
            'ваш Viber id; вы должны быть подписаны на бота (иначе send_message отклоняется)',
        adapter: ({ plugins, env }) =>
            new plugins.ViberAdapter(env.VIBER_TOKEN, {
                viber_sender: env.VIBER_SENDER || 'umbot live-test',
            }),
        message: (target, text) => ({
            event: 'message',
            timestamp: Date.now(),
            message_token: nextId(),
            sender: { id: String(target), name: 'Live Test', api_version: 8 },
            message: { type: 'text', text },
        }),
        extra: {
            conversation_started: (target) => ({
                event: 'conversation_started',
                timestamp: Date.now(),
                type: 'open',
                user: { id: String(target), name: 'Live Test', api_version: 8 },
                subscribed: false,
            }),
        },
    },
    alisa: {
        title: 'Алиса',
        kind: 'voice',
        env: [],
        optionalEnv: ['ALISA_TOKEN', 'ALISA_SKILL_ID'],
        adapter: ({ plugins, env }) => new plugins.AlisaAdapter(env.ALISA_TOKEN || undefined),
        message: (_target, text, messageId, env) => ({
            meta: {
                locale: 'ru-RU',
                timezone: 'Europe/Moscow',
                client_id: 'ru.yandex.searchplugin/7.16 (live-test)',
                interfaces: { screen: {}, payments: {}, account_linking: {} },
            },
            session: {
                message_id: messageId,
                session_id: 'live-session',
                skill_id: env.ALISA_SKILL_ID || 'live-skill',
                user_id: 'live-user',
                application: { application_id: 'LIVE-APPLICATION' },
                new: messageId === 0,
            },
            request: {
                command: text.toLowerCase(),
                original_utterance: text,
                type: 'SimpleUtterance',
                nlu: { tokens: text.toLowerCase().split(/\s+/), entities: [], intents: {} },
            },
            state: { session: {}, application: {} },
            version: '1.0',
        }),
        validate: (res) => [
            ...requireFields(res, [
                ['version', (v) => v === '1.0', 'обязательно "1.0"'],
                ['response.text', isStr, 'обязательная строка'],
                ['response.end_session', isBool, 'обязательный boolean'],
            ]),
            ...(res?.response?.text?.length > 1024 ? ['response.text: максимум 1024'] : []),
            ...(!res?.response?.text && !res?.response?.tts
                ? ['response.text пуст: допустимо только при заполненном tts']
                : []),
            ...validateButtonsPayload(res?.response?.buttons),
        ],
    },
    marusia: {
        title: 'Маруся',
        kind: 'voice',
        env: [],
        optionalEnv: ['MARUSIA_TOKEN'],
        note: 'С 20.12.2024 VK прекратил создание и поддержку пользовательских скиллов Маруси.',
        adapter: ({ plugins, env }) => new plugins.MarusiaAdapter(env.MARUSIA_TOKEN || undefined),
        message: (_target, text, messageId) => ({
            meta: {
                locale: 'ru_RU',
                timezone: 'Europe/Moscow',
                client_id: 'MailRu-VC/1.0',
                interfaces: { screen: {} },
            },
            session: {
                message_id: messageId,
                session_id: 'live-session',
                skill_id: 'live-skill',
                user_id: 'live-user',
                application: { application_id: 'live-app', application_type: 'mobile' },
                new: messageId === 0,
            },
            request: {
                command: text.toLowerCase(),
                original_utterance: text,
                type: 'SimpleUtterance',
                nlu: { tokens: text.toLowerCase().split(/\s+/), entities: [] },
            },
            state: { session: {} },
            version: '1.0',
        }),
        validate: (res) => [
            ...requireFields(res, [
                ['version', (v) => v === '1.0', 'обязательно "1.0"'],
                [
                    'response.text',
                    (v) => isStr(v) && v.length > 0,
                    'обязательна и не должна быть пустой',
                ],
                ['response.end_session', isBool, 'обязательный boolean'],
                ['session.session_id', isStr, 'обязательно'],
                ['session.user_id', isStr, 'обязательно'],
                ['session.message_id', (v) => v !== undefined, 'обязательно'],
            ]),
            ...validateButtonsPayload(res?.response?.buttons),
            ...(res?.response?.card && res.response.card.type === 'ImageGallery'
                ? ['card.type ImageGallery: в протоколе Маруси нет']
                : []),
        ],
    },
    smartapp: {
        title: 'SmartApp (Сбер)',
        kind: 'voice',
        env: [],
        adapter: ({ plugins }) => new plugins.SmartAppAdapter(),
        message: (_target, text, messageId) => ({
            messageName: 'MESSAGE_TO_SKILL',
            sessionId: 'live-session',
            messageId,
            uuid: { userId: 'live-user', userChannel: 'B2C', sub: 'live-sub' },
            payload: {
                device: {
                    platformType: 'ANDROID',
                    surface: 'SBERBOX',
                    capabilities: { screen: { available: true } },
                },
                app_info: { projectId: 'live', applicationId: 'live', appversionId: 'live' },
                character: { id: 'sber', name: 'Сбер', gender: 'male', appeal: 'official' },
                intent: '',
                projectName: 'live-test',
                new_session: messageId === 0,
                message: {
                    original_text: text,
                    normalized_text: text.toLowerCase(),
                    tokenized_elements_list: [],
                },
            },
        }),
        validate: (res) =>
            requireFields(res, [
                ['messageName', (v) => v === 'ANSWER_TO_USER', 'ожидается ANSWER_TO_USER'],
                ['sessionId', (v) => v !== undefined, 'обязательно'],
                ['uuid', (v) => v && typeof v === 'object', 'обязательно'],
                ['payload.items', Array.isArray, 'обязательный массив'],
                ['payload.finished', isBool, 'обязательный boolean'],
                ['payload.pronounceText', isStr, 'строка'],
            ]),
    },
};

/**
 * Сценарии прогона: реплики пользователя и что проверяется.
 * Команды и обработчики — в bot.js (единый демо-бот для обоих режимов).
 */
const SCENARIOS = [
    { say: 'помощь', expect: 'список команд' },
    { say: 'текст', expect: 'простой текст' },
    {
        say: 'кнопки',
        expect: 'текст + кнопка с payload + кнопка-ссылка (у Telegram — style success)',
    },
    { say: 'карточка', expect: 'одна картинка из локального файла (загрузка на платформу)' },
    { say: 'галерея', expect: 'несколько картинок: медиагруппа / карусель / ItemsList' },
    {
        say: 'голос',
        expect: 'на чатах — голосовое через SpeechKit (нужен SPEECH_KIT_TOKEN), на голосовых — tts',
    },
    {
        say: 'звук',
        expect: 'стандартный звук платформы (голосовые) / очищенный текст в синтез (чаты)',
    },
    { say: 'шаг', expect: 'вопрос имени (addStep)' },
    {
        say: 'Иван',
        expect: 'ответ шага: «Приятно познакомиться, Иван» (сохранение шага между запросами)',
    },
    { say: 'абракадабра', expect: 'fallback' },
];

module.exports = { PLATFORMS, SCENARIOS };
