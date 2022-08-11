/**
 * @typeParam T Тип, используемый в data
 */
export interface IRequestSend<T> {
    /**
     * Статус ответа. True, если запрос успешно выполнился, иначе false.
     */
    status: boolean;
    /**
     * Полученные данные.
     */
    data: T | null;
    /**
     * Ошибка при отправке запроса.
     */
    err?: string
}
