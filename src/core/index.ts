/**
 * Ядро движка
 * @module core
 */
// Интерфейсы
export * from './interfaces/IAlisa';
export * from './interfaces/IBot';
export * from './interfaces/IMarusia';
export * from './interfaces/ISberSmartApp';
export * from './interfaces/ITelegram';
export * from './interfaces/IViber';
export * from './interfaces/IVk';
// Поддерживаемые типы приложений
export * from './types/Alisa';
export * from './types/Marusia';
export * from './types/SmartApp';
export * from './types/Telegram';
export * from './types/TemplateTypeModel';
export * from './types/Viber';
export * from './types/Vk';
// Основная работа приложения
export * from './Bot';
export * from './mmApp';
