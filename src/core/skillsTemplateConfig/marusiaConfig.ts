import {IMarusiaWebhookRequest} from "../interfaces/IMarusia";

/**
 *
 * @param query Запрос пользователя
 * @param userId Идентификатор пользователя
 * @param count Номер сообщения
 * @param state Локальное хранилище
 */
export default function (query: string, userId: string, count: number, state: object | string): IMarusiaWebhookRequest {
    return {
        meta: {
            locale: 'ru-Ru',
            timezone: 'UTC',
            client_id: 'local',
            interfaces: {
                payments: null,
                account_linking: null
            }
        },
        session: {
            message_id: count,
            session_id: 'local',
            skill_id: 'local_test',
            user_id: userId,
            'new': (count === 0)
        },
        request: {
            command: query.toLowerCase(),
            original_utterance: query,
            type: 'SimpleUtterance'
        },
        state: {
            session: state,
        },
        version: '1.0'
    };
}
