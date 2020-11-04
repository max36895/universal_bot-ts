/**
 *
 * @param query Запрос пользователя
 * @param userId Идентификатор пользователя
 * @param count Номер сообщения
 */
export default function (query: string, userId: string, count: number): any {
    return {
        userId,
        data: {
            text: query.toLowerCase(),
        }
    };
}
