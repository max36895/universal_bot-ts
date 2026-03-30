/**
 * Определяет промис передан или нет
 */
export function isPromise(value: unknown): value is Promise<unknown> {
    return !!(
        value &&
        typeof value === 'object' &&
        typeof (value as Promise<unknown>).then === 'function'
    );
}
