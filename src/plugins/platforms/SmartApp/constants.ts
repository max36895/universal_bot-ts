import { ISberSmartAppAnnotations } from './interfaces/ISmartAppPlatform';

/**
 * Идентификатор платформы Сбер SmartApp (ключ в appConfig.tokens).
 */
export const T_SMART_APP = 'smart_app';

/**
 * URL хранилища данных SmartApp Code API по умолчанию
 * (переопределяется через appConfig.tokens.smart_app.storage_url).
 */
export const SMART_APP_STORAGE_URL = 'https://smartapp-code.sberdevices.ru/tools/api/data';

/**
 * Заготовка DEVICE-секции ответа SmartApp; заполняется адаптером под конкретный запрос.
 */
export const DEVICE = {
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
/**
 * Заготовка ANNOTATIONS-секции (модерация ответов SmartApp); передаётся адаптером как есть.
 */
export const ANNOTATIONS: ISberSmartAppAnnotations = {
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
