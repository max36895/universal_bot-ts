import {ITelegramContent} from "../interfaces/ITelegram";

/**
 *
 * @param query Запрос пользователя
 * @param userId Идентификатор пользователя
 * @param count Номер сообщения
 */
export default function (query: string, userId: string, count: number): ITelegramContent {
    return {
        message: {
            chat: {
                id: +userId,
            },
            text: query,
            message_id: count
        }
    };
}
