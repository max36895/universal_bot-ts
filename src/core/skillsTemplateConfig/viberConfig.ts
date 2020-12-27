import {IViberContent} from "../interfaces/IViber";

/**
 *
 * @param query Запрос пользователя
 * @param userId Идентификатор пользователя
 * @param count Номер сообщения
 */
export default function (query: string, userId: string, count: number): IViberContent {
    return {
        event: 'message',
        message: {
            text: query,
            type: 'text'
        },
        message_token: Date.now(),
        sender: {
            id: userId,
            name: 'local_name',
            api_version: 8
        }
    };
}

