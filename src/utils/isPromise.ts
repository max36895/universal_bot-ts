/**
 * Проверяет, является ли переданное значение промисом.
 *
 * @param {unknown} value - Проверяемое значение
 * @returns {value is Promise<unknown>} true если значение является промисом
 */
export function isPromise(value: unknown): value is Promise<unknown> {
    return !!(
        value &&
        typeof value === 'object' &&
        typeof (value as Promise<unknown>).then === 'function'
    );
}
