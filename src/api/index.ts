/**
 * Библиотека компонентов, отвечающих за взаимодействие с сервером
 * В состав библиотеки входят классы, позволяющие взаимодействовать с api различных платформ, а также класс, позволяющий отправлять запросы сервер
 * @module api
 */
export * from './interfaces';
// Отправка запросов
export * from './request/Request';
// Взаимодействие с api платформы
export * from './TelegramRequest';
export * from './ViberRequest';
export * from './VkRequest';
export * from './MarusiaRequest';
export * from './YandexImageRequest';
export * from './YandexRequest';
export * from './YandexSoundRequest';
export * from './YandexSpeechKit';
