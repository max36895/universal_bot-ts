/**
 * Настройки сессии в памяти процесса.
 *
 * @example
 * ```ts
 * bot.setAppConfig({
 *     isLocalStorage: true,
 *     memorySession: { maxSize: 50_000, ttl: 60 * 60 * 1000 }, // 50 тыс. пользователей, 1 час
 * });
 * ```
 */
export interface IMemorySessionConfig {
    /**
     * Максимальное количество пользователей в памяти. При превышении вытесняется
     * пользователь, данные которого дольше всех не обновлялись.
     * @defaultValue 10000
     */
    maxSize?: number;
    /**
     * Время жизни данных пользователя в миллисекундах, отсчитывается от последнего
     * запроса пользователя. `0` — без ограничения по времени (остаётся только `maxSize`).
     * @defaultValue 86400000 (24 часа)
     */
    ttl?: number;
}

/** Количество пользователей в сессии по умолчанию. */
export const MEMORY_SESSION_MAX_SIZE = 10_000;
/** Время жизни данных пользователя по умолчанию — 24 часа. */
export const MEMORY_SESSION_TTL = 24 * 60 * 60 * 1000;

interface IMemorySessionEntry<T> {
    value: T;
    expiresAt: number;
}

/**
 * Хранилище `userData` в памяти процесса — аналог `MemorySessionStorage` у grammY.
 *
 * Используется ядром, когда включён `isLocalStorage`, платформа не поддерживает
 * локальное хранилище (Telegram, VK, MAX, Viber), а DB-адаптер не подключён.
 *
 * Ограничения — те же, что у любой сессии в памяти:
 * - данные теряются при перезапуске процесса;
 * - данные не разделяются между процессами (кластер, несколько реплик, serverless).
 *
 * Объём ограничен `maxSize` (вытесняется запись, дольше всех не обновлявшаяся)
 * и `ttl`. Таймеров нет: устаревшие записи удаляются при чтении и при записи.
 * Порядок вставки в `Map` совпадает с порядком истечения (ttl один на всё
 * хранилище, запись перемещается в конец), поэтому очистка — O(1) амортизированно.
 *
 * @example
 * ```ts
 * const storage = new MemorySessionStorage<{ step?: string }>({ maxSize: 2 });
 * storage.set('telegram:1', { step: 'ask_name' });
 * storage.get('telegram:1'); // { step: 'ask_name' }
 * ```
 */
export class MemorySessionStorage<T> {
    readonly #entries = new Map<string, IMemorySessionEntry<T>>();
    readonly #maxSize: number;
    readonly #ttl: number;

    /**
     * @param config Настройки хранилища
     */
    constructor(config: IMemorySessionConfig = {}) {
        this.#maxSize =
            config.maxSize && config.maxSize > 0
                ? Math.floor(config.maxSize)
                : MEMORY_SESSION_MAX_SIZE;
        this.#ttl = config.ttl !== undefined && config.ttl >= 0 ? config.ttl : MEMORY_SESSION_TTL;
    }

    /**
     * Максимальное количество записей.
     * @returns Лимит хранилища
     */
    public get maxSize(): number {
        return this.#maxSize;
    }

    /**
     * Время жизни записи в миллисекундах (`0` — без ограничения).
     * @returns TTL хранилища
     */
    public get ttl(): number {
        return this.#ttl;
    }

    /**
     * Текущее количество записей (включая ещё не удалённые устаревшие).
     * @returns Количество записей
     */
    public get size(): number {
        return this.#entries.size;
    }

    /**
     * Возвращает данные по ключу.
     * @param key Ключ записи (платформа + id пользователя)
     * @returns Сохранённые данные или `undefined`, если записи нет или она устарела
     * @example
     * ```ts
     * const data = storage.get('telegram:42') ?? {};
     * ```
     */
    public get(key: string): T | undefined {
        const entry = this.#entries.get(key);
        if (!entry) {
            return undefined;
        }
        if (this.#ttl && entry.expiresAt <= Date.now()) {
            this.#entries.delete(key);
            return undefined;
        }
        return entry.value;
    }

    /**
     * Сохраняет данные по ключу и продлевает время их жизни.
     * @param key Ключ записи (платформа + id пользователя)
     * @param value Данные пользователя
     * @example
     * ```ts
     * storage.set('telegram:42', { oldIntentName: 'ask_name' });
     * ```
     */
    public set(key: string, value: T): void {
        const now = Date.now();
        // Удаление перед вставкой переносит запись в конец — порядок Map
        // остаётся порядком «последнего обновления».
        this.#entries.delete(key);
        this.#entries.set(key, { value, expiresAt: this.#ttl ? now + this.#ttl : Infinity });
        this.#prune(now);
    }

    /**
     * Удаляет запись.
     * @param key Ключ записи
     * @returns `true`, если запись существовала
     */
    public delete(key: string): boolean {
        return this.#entries.delete(key);
    }

    /**
     * Удаляет все записи.
     */
    public clear(): void {
        this.#entries.clear();
    }

    /**
     * Удаляет устаревшие записи из начала очереди и вытесняет лишние по лимиту.
     * @param now Текущее время
     */
    #prune(now: number): void {
        for (const [key, entry] of this.#entries) {
            if (this.#entries.size > this.#maxSize || entry.expiresAt <= now) {
                this.#entries.delete(key);
            } else {
                break;
            }
        }
    }
}
