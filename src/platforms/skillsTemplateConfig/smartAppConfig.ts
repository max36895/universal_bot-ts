import { ISberSmartAppWebhookRequest, ISberSmartAppAnnotations } from '../interfaces/ISberSmartApp';

const DEVICE = {
    platformType: '',
    platformVersion: '',
    surface: '',
    surfaceVersion: '',
    features: {
        appTypes: [],
    },
    capabilities: {
        screen: {
            available: true,
        },
        mic: {
            available: true,
        },
        speak: {
            available: true,
        },
    },
    additionalInfo: {},
};
const ANNOTATIONS: ISberSmartAppAnnotations = {
    censor_data: {
        classes: ['politicians', 'obscene', 'model_response'],
        probas: [0, 0, 0],
    },
    text_sentiment: {
        classes: ['negative', 'speech', 'neutral', 'positive', 'skip'],
        probas: [0, 0, 100, 0, 0],
    },
    asr_sentiment: {
        classes: ['positive', 'neutral', 'negative'],
        probas: [0, 1, 0],
    },
};

/**
 *
 * @param query Запрос пользователя
 * @param userId Идентификатор пользователя
 * @param count Номер сообщения
 */
export default function (
    query: string,
    userId: string,
    count: number,
): ISberSmartAppWebhookRequest {
    return {
        messageName: 'MESSAGE_TO_SKILL',
        uuid: { userId: `${+userId}`, userChannel: '', sub: '' },
        messageId: count,
        sessionId: `${userId}`,
        payload: {
            device: DEVICE,
            app_info: {
                projectId: '',
                applicationId: '',
                appversionId: '',
            },
            character: {
                id: 'sber',
                name: 'Сбер',
                gender: 'male',
                appeal: 'official',
            },
            intent: '',
            original_intent: '',
            intent_meta: {},
            meta: {
                time: {
                    timezone_id: '',
                    timezone_offset_sec: 0,
                    timestamp: Date.now(),
                },
            },
            projectName: 'test',
            annotations: ANNOTATIONS,
            strategies: {
                happy_birthday: false,
                last_call: 0,
            },
            new_session: count === 0,
            message: {
                normalized_text: query,
                original_text: query,
                asr_normalized_message: '',
                tokenized_elements_list: [],
            },
        },
    };
}
