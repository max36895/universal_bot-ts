export interface IRequestSend {
    /**
     * Статус ответа. True, если запрос успешно выполнился, иначе false.
     */
    status: boolean;
    /**
     * Полученные данные.
     */
    data?: any;
    /**
     * Ошибка при отправке запроса.
     */
    err?: string
}
