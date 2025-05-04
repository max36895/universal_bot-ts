/**
 * Модуль базовых интерфейсов для моделей данных
 *
 * Определяет основные типы и интерфейсы для:
 * - Валидации данных
 * - Обработки результатов запросов
 * - Работы с правилами моделей
 *
 * @module models/interface/IModel
 */

/**
 * Типы данных для валидации полей модели
 *
 * @example
 * ```typescript
 * const type: TModelRulesType = 'string'; // для текстовых полей
 * const type: TModelRulesType = 'integer'; // для целых чисел
 * const type: TModelRulesType = 'date'; // для дат
 * const type: TModelRulesType = 'bool'; // для булевых значений
 * ```
 */
export type TModelRulesType = 'text' | 'string' | 'integer' | 'date' | 'int' | 'bool';

/**
 * Интерфейс для описания правил валидации полей модели
 *
 * @example
 * ```typescript
 * const rules: IModelRules = {
 *   name: ['username', 'nickname'],
 *   type: 'string',
 *   max: 50
 * };
 *
 * const dateRule: IModelRules = {
 *   name: ['birthDate', 'createdAt'],
 *   type: 'date'
 * };
 * ```
 */
export interface IModelRules {
    /**
     * Массив названий полей, к которым применяются правила
     *
     * @example
     * ```typescript
     * name: ['username', 'email'] // правила применяются к полям username и email
     * ```
     */
    name: string[];

    /**
     * Тип данных поля
     * Определяет формат и правила валидации
     *
     * @example
     * ```typescript
     * type: 'string' // текстовое поле
     * type: 'integer' // целочисленное поле
     * ```
     */
    type: TModelRulesType;

    /**
     * Максимальное значение для поля
     * Используется для ограничения длины строковых полей
     *
     * @example
     * ```typescript
     * max: 100 // максимальная длина строки 100 символов
     * ```
     */
    max?: number;
}

/**
 * Интерфейс для описания результата выполнения операции с моделью
 *
 * @example
 * ```typescript
 * // Успешный результат
 * const success: IModelRes = {
 *   status: true,
 *   data: { id: 1, name: 'John' }
 * };
 *
 * // Результат с ошибкой
 * const error: IModelRes = {
 *   status: false,
 *   error: 'User not found'
 * };
 * ```
 */
export interface IModelRes {
    /**
     * Статус выполнения операции
     * true - операция выполнена успешно
     * false - произошла ошибка
     */
    status: boolean;

    /**
     * Сообщение об ошибке
     * Присутствует только при status = false
     *
     * @example
     * ```typescript
     * error: 'Invalid input data'
     * error: 'Database connection failed'
     * ```
     */
    error?: string;

    /**
     * Результат выполнения операции
     * Присутствует только при status = true
     * Может содержать любые данные в зависимости от операции
     *
     * @example
     * ```typescript
     * data: { id: 1, name: 'John' } // результат запроса пользователя
     * data: [1, 2, 3] // список идентификаторов
     * ```
     */
    data?: any;
}
