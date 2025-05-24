import { IViberContent } from '../interfaces';

/**
 *
 * @param query Запрос пользователя
 * @param userId Идентификатор пользователя
 */
export default function (query: string, userId: string): IViberContent {
    return {
        event: 'message',
        message: {
            text: query,
            type: 'text',
        },
        message_token: Date.now(),
        sender: {
            id: userId,
            name: 'local_name',
            api_version: 8,
        },
    };
}
