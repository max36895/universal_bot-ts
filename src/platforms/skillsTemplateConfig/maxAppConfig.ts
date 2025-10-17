import { IMaxRequestContent } from '../interfaces/IMaxApp';

/**
 *
 * @param query Запрос пользователя
 * @param userId Идентификатор пользователя
 * @param count Номер сообщения
 */
export default function (query: string, userId: string, count: number): IMaxRequestContent {
    return {
        update_type: 'message_created',
        message: {
            sender: {
                user_id: +userId,
            },
            body: {
                text: query,
                seq: count,
                mid: '',
            },
        },
    };
}
