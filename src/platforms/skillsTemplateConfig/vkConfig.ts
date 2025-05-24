import { IVkRequestContent } from '../interfaces';

/**
 *
 * @param query Запрос пользователя
 * @param userId Идентификатор пользователя
 * @param count Номер сообщения
 */
export default function (query: string, userId: string, count: number): IVkRequestContent {
    return {
        type: 'message_new',
        object: {
            message: {
                from_id: +userId,
                text: query,
                id: count,
            },
        },
    };
}
