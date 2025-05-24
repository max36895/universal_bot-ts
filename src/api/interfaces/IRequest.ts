/**
 * Интерфейсы для работы с HTTP-запросами
 * Определяют структуру запросов и ответов при взаимодействии с API
 *
 * @module api/interfaces/IRequest
 */

/**
 * Интерфейс ответа на HTTP-запрос
 * Описывает структуру данных, возвращаемых после выполнения запроса
 *
 * @template T - Тип данных, ожидаемых в ответе от сервера
 *
 * @example
 * ```typescript
 * // Пример использования с типом User
 * interface User {
 *   id: number;
 *   name: string;
 * }
 *
 * const response: IRequestSend<User> = {
 *   status: true,
 *   data: { id: 1, name: "John" }
 * };
 *
 * // Пример обработки ошибки
 * const errorResponse: IRequestSend<User> = {
 *   status: false,
 *   data: null,
 *   err: "User not found"
 * };
 * ```
 */
export interface IRequestSend<T> {
    /**
     * Статус выполнения запроса
     * @type {boolean}
     * - true - запрос выполнен успешно
     * - false - произошла ошибка при выполнении запроса
     */
    status: boolean;

    /**
     * Данные, полученные от сервера
     * @type {T | null}
     * - null - в случае ошибки или отсутствия данных
     * - T - данные в формате, указанном в типе
     */
    data: T | null;

    /**
     * Описание ошибки
     * @type {string}
     * Присутствует только в случае неуспешного выполнения запроса
     */
    err?: string;
}
