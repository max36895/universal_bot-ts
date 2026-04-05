/**
 * Ядро фреймворка - основные компоненты для работы приложения с различными платформами.
 *
 * Модуль содержит:
 * - Интерфейсы для определения контрактов компонентов
 * - Основной класс приложения для обработки запросов
 * - Контекст приложения, в котором хранится вся настройка
 */
export * from './interfaces/IBot';
export * from './interfaces/ILogger';
export * from './interfaces/IAppContext';
export * from './Bot';
export * from './AppContext';
export {
    FALLBACK_COMMAND,
    type ICommandParam,
    type TCommandResolver,
    type TSlots,
    type IStepParam,
} from './utils/CommandReg';
