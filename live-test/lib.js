'use strict';
/**
 * Общие утилиты live-теста: загрузка .env и umbot, генерация тестовых
 * картинок, логирование исходящих HTTP-запросов, консольный вывод.
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const readline = require('node:readline/promises');

const TMP_DIR = path.join(__dirname, '.tmp');

const color = {
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    gray: (s) => `\x1b[90m${s}\x1b[0m`,
    bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/**
 * Загружает .env: сначала live-test/.env, затем .env текущей директории.
 * @returns {string|null} Путь к загруженному файлу
 */
function loadEnv() {
    const candidates = [path.join(__dirname, '.env'), path.join(process.cwd(), '.env')];
    for (const file of candidates) {
        if (fs.existsSync(file)) {
            process.loadEnvFile(file);
            return file;
        }
    }
    return null;
}

/**
 * Подключает umbot: установленный пакет (проект с `npm i umbot`) либо
 * собранный dist этого репозитория (`npm run build`).
 * @returns {{core: object, plugins: object, source: string}}
 */
function loadUmbot() {
    try {
        return { core: require('umbot'), plugins: require('umbot/plugins'), source: 'пакет umbot' };
    } catch {
        const dist = path.join(__dirname, '..', 'dist');
        if (!fs.existsSync(path.join(dist, 'index.js'))) {
            throw new Error('Не найден umbot: выполните `npm run build` в корне репозитория.');
        }
        return {
            core: require(path.join(dist, 'index.js')),
            plugins: require(path.join(dist, 'plugins.js')),
            source: 'dist репозитория',
        };
    }
}

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(buf) {
    let crc = 0xffffffff;
    for (const byte of buf) {
        crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
}

/**
 * Создаёт PNG заданного размера с горизонтальным градиентом.
 * 520×320 — пропорции 13:8 (минимум карусели VK 221×136).
 */
function makePng(width, height, [r, g, b]) {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8; // глубина цвета
    header[9] = 2; // RGB
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x++) {
        const k = x / width;
        row[1 + x * 3] = Math.round(r * (1 - k) + 255 * k);
        row[2 + x * 3] = g;
        row[3 + x * 3] = Math.round(b * k);
    }
    const raw = Buffer.concat(Array.from({ length: height }, () => row));
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk('IHDR', header),
        pngChunk('IDAT', zlib.deflateSync(raw)),
        pngChunk('IEND', Buffer.alloc(0)),
    ]);
}

/**
 * Готовит тестовые картинки: свои (LIVE_IMAGE_1..3) или сгенерированные PNG.
 * @returns {string[]} Пути к трём картинкам
 */
function prepareImages() {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    const colors = [
        [220, 40, 40],
        [40, 160, 60],
        [40, 80, 220],
    ];
    return colors.map((rgb, i) => {
        const custom = process.env[`LIVE_IMAGE_${i + 1}`];
        if (custom) {
            return custom;
        }
        const file = path.join(TMP_DIR, `live-image-${i + 1}.png`);
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, makePng(520, 320, rgb));
        }
        return file;
    });
}

/**
 * Убирает секреты из URL для вывода в консоль: токен Telegram в пути,
 * access_token/токены в query.
 */
function maskUrl(url) {
    return String(url)
        .replace(/\/bot[^/]+\//, '/bot***/')
        .replace(/(access_token|token|key)=[^&]+/gi, '$1=***');
}

/**
 * Оборачивает HTTP-клиент umbot: каждый исходящий запрос к платформе
 * печатается (метод, адрес без токенов, статус, текст ошибки API).
 * @param {object} appContext AppContext бота
 * @param {Array} journal Журнал запросов текущего сценария (наполняется)
 */
function traceHttp(appContext, journal) {
    const realFetch = appContext.httpClient || globalThis.fetch;
    appContext.httpClient = async (url, init) => {
        const started = Date.now();
        const entry = { method: init?.method || 'GET', url: maskUrl(url) };
        try {
            const response = await realFetch(url, init);
            entry.status = response.status;
            entry.ms = Date.now() - started;
            try {
                const text = await response.clone().text();
                entry.body = text.length > 300 ? `${text.slice(0, 300)}…` : text;
                entry.apiError = detectApiError(response.status, text);
            } catch {
                entry.body = '<бинарный ответ>';
            }
            journal.push(entry);
            return response;
        } catch (error) {
            entry.error = error instanceof Error ? error.message : String(error);
            journal.push(entry);
            throw error;
        }
    };
}

/**
 * Определяет ошибку API по статусу и телу: у платформ разные конверты
 * (Telegram ok:false, VK error, Viber status≠0, MAX code/message).
 */
function detectApiError(status, text) {
    if (status >= 400) {
        return text.slice(0, 300) || `HTTP ${status}`;
    }
    try {
        const json = JSON.parse(text);
        if (json && typeof json === 'object') {
            if (json.ok === false) {
                return json.description || 'ok: false';
            }
            if (json.error) {
                return typeof json.error === 'object'
                    ? json.error.error_msg || JSON.stringify(json.error)
                    : String(json.error);
            }
            if (typeof json.status === 'number' && json.status !== 0 && 'status_message' in json) {
                return `${json.status}: ${json.status_message}`;
            }
            if (json.code && json.message && json.success !== true) {
                return `${json.code}: ${json.message}`;
            }
        }
    } catch {
        // не JSON (например, retval загрузки MAX) — это не ошибка
    }
    return null;
}

/**
 * Логгер umbot, собирающий предупреждения и ошибки фреймворка в журнал.
 */
function makeLogger(sink) {
    return {
        error: (message) => sink.push({ level: 'error', message: String(message) }),
        warn: (message) => sink.push({ level: 'warn', message: String(message) }),
        log: () => {},
    };
}

async function ask(question, variants) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
        if (variants) {
            variants.forEach((v, i) => console.log(`  ${i + 1}) ${v}`));
        }
        return (await rl.question(`${question} `)).trim();
    } finally {
        rl.close();
    }
}

/**
 * Разбирает аргументы вида --platform telegram --mode scenarios.
 */
function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            const key = argv[i].slice(2);
            const next = argv[i + 1];
            args[key] = next && !next.startsWith('--') ? argv[++i] : true;
        }
    }
    return args;
}

module.exports = {
    TMP_DIR,
    color,
    loadEnv,
    loadUmbot,
    prepareImages,
    traceHttp,
    makeLogger,
    ask,
    parseArgs,
    maskUrl,
};
