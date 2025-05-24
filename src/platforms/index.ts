/**
 * Модуль платформ для работы с различными мессенджерами и голосовыми ассистентами
 *
 * Поддерживаемые платформы:
 * - Yandex Alice (Алиса)
 * - Yandex Marusia (Маруся)
 * - Sber SmartApp
 * - Telegram
 * - Viber
 * - VKontakte
 *
 * Каждая платформа реализует общий интерфейс для:
 * - Инициализации и обработки запросов
 * - Формирования ответов
 * - Работы с пользовательскими данными
 * - Управления состоянием сессии
 *
 * @module platforms
 */

export * from './Alisa';
export * from './Marusia';
export * from './SmartApp';
export * from './Telegram';
export * from './TemplateTypeModel';
export * from './Viber';
export * from './Vk';

export * from './interfaces';
