import { ISberSmartAppAnnotations } from './interfaces/ISmartAppPlatform';

export const T_SMART_APP = 'smart_app';

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
