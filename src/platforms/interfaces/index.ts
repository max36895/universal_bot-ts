/**
 * Модуль интерфейсов для работы с различными платформами
 *
 * Содержит типы и интерфейсы для:
 * - Yandex Alice (Алиса)
 * - Yandex Marusia (Маруся)
 * - Sber SmartApp
 * - Telegram
 * - Viber
 * - VKontakte
 *
 * Каждый интерфейс определяет:
 * - Структуру входящих запросов
 * - Формат исходящих ответов
 * - Типы данных для работы с API
 * - Вспомогательные типы для компонентов
 *
 * @module platforms/interfaces
 */

export * from './IAlisa';
export * from './IMarusia';
export * from './ISberSmartApp';
export * from './ITelegram';
export * from './IViber';
export * from './IVk';
