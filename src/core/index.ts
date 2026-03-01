/**
 * Ядро системы - основные компоненты для работы бота
 *
 * Модуль содержит:
 * - Интерфейсы для определения контрактов компонентов
 * - Основной класс бота для обработки запросов
 * - Тестовые утилиты для проверки функциональности
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
