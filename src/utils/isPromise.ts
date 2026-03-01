/**
 * Определяет промис передан или нет
 */
export function isPromise(value: unknown): value is Promise<unknown> {
    // @ts-ignore
    return !!(value && typeof value.then === 'function');
}
