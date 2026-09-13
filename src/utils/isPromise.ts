/**
 * Проверяет, является ли переданное значение промисом.
 *
 * @param {unknown} value - Проверяемое значение
 * @returns true, если значение — Promise (type guard)
 */
export function isPromise(value: unknown): value is Promise<unknown> {
    return !!(
        value &&
        typeof value === 'object' &&
        typeof (value as Promise<unknown>).then === 'function'
    );
}
