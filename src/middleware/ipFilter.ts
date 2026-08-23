// middleware/ipFilter.ts
import { BotController } from '../controller';
import { MiddlewareNext } from '../core';

/**
 * Опции ipFilter middleware.
 */
export interface IIpFilterOptions {
    /**
     * Белый список IP/CIDR. Если задан — разрешены только эти адреса.
     * Примеры: `'10.0.0.1'`, `'192.168.0.0/24'`, `'127.0.0.1'`.
     */
    whitelist?: string[];

    /**
     * Чёрный список IP/CIDR. Если задан — перечисленные запрещены.
     * Игнорируется, если задан `whitelist`.
     */
    blacklist?: string[];

    /**
     * Текст ответа, который получит пользователь из заблокированного IP.
     * @defaultValue '' (пустой ответ — молчим)
     */
    deniedText?: string;
}

/**
 * Разбирает CIDR и строковый IP нотацию в числовое представление.
 * Примеры:
 *   - "192.168.0.1" → ipInt 3232235521, prefix 32
 *   - "192.168.0.0/24" → network 3232235520, prefix 24
 */
function parseCidr(cidr: string): { network: number; prefix: number } | null {
    const [ipStr, prefixStr] = cidr.split('/');
    const ipParts = ipStr.trim().split('.');
    if (ipParts.length !== 4) return null;
    let ipInt = 0;
    for (const part of ipParts) {
        const n = parseInt(part, 10);
        if (isNaN(n) || n < 0 || n > 255) return null;
        ipInt = (ipInt << 8) | n;
    }
    const prefix = prefixStr !== undefined ? parseInt(prefixStr, 10) : 32;
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;
    // Сдвигаем адрес так, чтобы сравнивалась только network часть
    const network = (ipInt >>> 0) & (prefix === 0 ? 0 : ~((1 << (32 - prefix)) - 1));
    return { network: network >>> 0, prefix };
}

function ipToInt(ip: string): number | null {
    const parts = ip.trim().split('.');
    if (parts.length !== 4) return null;
    let n = 0;
    for (const p of parts) {
        const v = parseInt(p, 10);
        if (isNaN(v) || v < 0 || v > 255) return null;
        n = (n << 8) | v;
    }
    return n >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
    const cidrParsed = parseCidr(cidr);
    const ipInt = ipToInt(ip);
    if (!cidrParsed || ipInt === null) return false;
    const { network, prefix } = cidrParsed;
    if (prefix === 0) return true; // 0.0.0.0/0 совпадает со всем
    const mask = ~((1 << (32 - prefix)) - 1) >>> 0;
    // JS побитовые операции возвращают signed int32 — без >>>0 сравнение падает на IP >127.255.x.x
    return (ipInt & mask) >>> 0 === network;
}

/**
 * Middleware для фильтрации входящих запросов по IP-адресу клиента.
 *
 * ⚠️ **Важное ограничение**: этот middleware работает **только если бот запущен через webhook**
 * (`bot.start()` или `bot.webhookHandle()`), не через long polling/console. Причина — IP клиента
 * доступен только из HTTP-заголовков.
 *
 * Если middleware применён к запросу без HTTP-контекста (например, `bot.run(...)` напрямую),
 * то запрос **пропускается** — мы не можем определить IP, значит не можем надёжно блокировать.
 * В совокупности с IP-фильтрацией на уровне быстрого reverse proxy (nginx) это дополнительный
 * уровень защиты, а не единственный.
 *
 * @example
 * ```ts
 * import { ipFilter } from 'umbot/middleware';
 *
 * // Только IP от Yandex Cloud Functions (примерный диапазон)
 * bot.use(ipFilter({
 *   whitelist: ['91.207.66.0/24', '91.207.74.0/24'],
 *   deniedText: 'Forbidden'
 * }));
 *
 * // Запретить спам-IP
 * bot.use(ipFilter({ blacklist: ['203.0.113.42', '198.51.100.0/24'] }));
 * ```
 *
 * @param options Конфигурация фильтра (whitelist или blacklist).
 * @returns Middleware для `bot.use(...)`.
 */
export function ipFilter(
    options: IIpFilterOptions,
): (ctx: BotController, next: MiddlewareNext) => Promise<void> {
    const whitelist = options.whitelist ?? null;
    const blacklist = options.blacklist ?? null;
    const deniedText = options.deniedText ?? '';

    return async (ctx: BotController, next: MiddlewareNext): Promise<void> => {
        // IP клиента заполняется фреймворком в webhookHandle из сокета HTTP-запроса.
        // requestObject здесь не подходит — это распарсенное JSON-тело платформы.
        const remoteIp = ctx.platformOptions.clientIp;

        // Если нет IP (например, bot.run() в тесте или console) — не блокируем.
        // Это нужно для того, чтобы middleware не ломал локальную разработку и долгоживущие сценарии.
        if (!remoteIp) {
            await next();
            return;
        }

        // Нормализация IPv4-mapped IPv6: "::ffff:127.0.0.1" → "127.0.0.1"
        const ip = remoteIp.startsWith('::ffff:') ? remoteIp.slice(7) : remoteIp;

        // Если задан whitelist — должен быть match
        if (whitelist && whitelist.length) {
            const matched = whitelist.some((cidr) => ipInCidr(ip, cidr));
            if (!matched) {
                ctx.appContext.logWarn(`ipFilter: блокирован запрос с небелого IP=${ip}`);
                ctx.text = deniedText;
                return;
            }
            await next();
            return;
        }

        // Если задан blacklist — должен НЕ быть match
        if (blacklist && blacklist.length) {
            const matched = blacklist.some((cidr) => ipInCidr(ip, cidr));
            if (matched) {
                ctx.appContext.logWarn(`ipFilter: блокирован запрос с чёрного IP=${ip}`);
                ctx.text = deniedText;
                return;
            }
        }

        await next();
    };
}
