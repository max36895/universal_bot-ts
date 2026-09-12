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
export * from './constants';
export * from './events';
export {
    CommandReg,
    type ICommandParam,
    type IDangerRegex,
    type TCommandResolver,
    type TSlots,
    type IStepParam,
    type IEventParam,
    type IGroupData,
} from './utils/CommandReg';
export {
    MemorySessionStorage,
    MEMORY_SESSION_MAX_SIZE,
    MEMORY_SESSION_TTL,
    type IMemorySessionConfig,
} from './utils/MemorySessionStorage';
export { createPlugin } from './plugin';
