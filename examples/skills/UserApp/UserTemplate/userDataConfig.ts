/**
 *
 * @param query Запрос пользователя
 * @param userId Идентификатор пользователя
 * @param _ Номер сообщения
 */
export default function (query: string, userId: string, _: number): any {
    return {
        userId,
        data: {
            text: query.toLowerCase(),
        },
    };
}
