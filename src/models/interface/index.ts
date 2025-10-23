/**
 * Модуль интерфейсов для работы с данными
 *
 * Предоставляет базовые интерфейсы для:
 * - Определения контрактов моделей данных
 * - Управления подключением к базе данных
 * - Работы с контроллерами моделей
 *
 * @example
 * ```typescript
 * import { IModel, IDbControllerModel } from './models/interface';
 *
 * // Реализация базовой модели
 * class MyModel implements IModel {
 *   async get(id: string): Promise<any> {
 *     // Реализация получения данных
 *   }
 *
 *   async set(id: string, data: any): Promise<void> {
 *     // Реализация сохранения данных
 *   }
 * }
 *
 * // Реализация контроллера базы данных
 * class MyDbController implements IDbControllerModel {
 *   async connect(): Promise<void> {
 *     // Реализация подключения к БД
 *   }
 *
 *   async disconnect(): Promise<void> {
 *     // Реализация отключения от БД
 *   }
 * }
 * ```
 */
export * from './IModel';
export * from './IDbControllerModel';
