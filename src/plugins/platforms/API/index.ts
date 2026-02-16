/**
 * Модуль для взаимодействия с API различных платформ.
 * Содержит классы для работы с:
 * - Telegram API
 * - Viber API
 * - VK API
 * - Marusia API
 * - Yandex API (основной, изображения, звуки, речь)
 *
 * Также включает базовый класс для отправки HTTP-запросов
 */
export * from './interfaces';
// Классы для работы с API платформ
export * from './TelegramRequest';
export * from './ViberRequest';
export * from './VkRequest';
export * from './MarusiaRequest';
export * from './YandexImageRequest';
export * from './YandexRequest';
export * from './YandexSoundRequest';
export * from './YandexSpeechKit';
export * from './MaxRequest';
