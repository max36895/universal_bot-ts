/**
 * Модуль для работы с базами данных
 *
 * Предоставляет компоненты для:
 * - Подключения к различным источникам данных (MongoDB, файловая система)
 * - Выполнения SQL-запросов
 * - Управления моделями данных
 * - Контроля доступа к данным
 *
 * @example
 * ```typescript
 * import { DB, Model, DbControllerMongoDb } from './models/db';
 *
 * // Подключение к MongoDB
 * const db = new DB({
 *   host: 'localhost',
 *   port: 27017,
 *   database: 'myapp'
 * });
 *
 * // Создание модели пользователя
 * class UserModel extends Model {
 *   tableName = 'users';
 *   primaryKey = 'user_id';
 * }
 *
 * // Создание контроллера для работы с MongoDB
 * const userController = new DbControllerMongoDb(db, UserModel);
 * ```
 */
export * from './DB';
export * from './Model';
export * from './Sql';
export * from './QueryData';
export * from './DbController';
export * from './DbControllerModel';
export * from './DbControllerFile';
export * from './DbControllerMongoDb';
