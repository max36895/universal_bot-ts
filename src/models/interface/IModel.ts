/**
 * Модуль базовых интерфейсов для моделей данных
 *
 * Определяет основные типы и интерфейсы для:
 * - Валидации данных
 * - Обработки результатов запросов
 * - Работы с правилами моделей
 */

/**
 * Типы данных для валидации полей модели
 *
 * @example
 * ```ts
 * const type: TModelRulesType = 'string'; // для текстовых полей
 * const type: TModelRulesType = 'integer'; // для целых чисел
 * const type: TModelRulesType = 'date'; // для дат
 * const type: TModelRulesType = 'bool'; // для булевых значений
 * ```
 */
export type TModelRulesType = 'text' | 'string' | 'integer' | 'date' | 'int' | 'bool';

export interface IDataValue {
    [key: string]: unknown;
}

/**
 * Интерфейс для описания правил валидации полей модели
 *
 * @example
 * ```ts
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
     * ```ts
     * name: ['username', 'email'] // правила применяются к полям username и email
     * ```
     */
    name: string[];

    /**
     * Тип данных поля.
     * Определяет формат и правила валидации
     *
     * @example
     * ```ts
     * type: 'string' // текстовое поле
     * type: 'integer' // целочисленное поле
     * ```
     */
    type: TModelRulesType;

    /**
     * Максимальное значение для поля.
     * Используется для ограничения длины строковых полей
     *
     * @example
     * ```ts
     * max: 100 // максимальная длина строки 100 символов
     * ```
     */
    max?: number;
}

/**
 * Интерфейс для описания результата выполнения операции с моделью
 *
 * @example
 * ```ts
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
export interface IModelRes<TModelData = IDataValue> {
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
     * ```ts
     * error: 'Invalid input data'
     * error: 'Database connection failed'
     * ```
     */
    error?: string | Error;

    /**
     * Результат выполнения операции.
     * Присутствует только при status = true.
     * Может содержать любые данные в зависимости от операции
     *
     * @example
     * ```ts
     * data: { id: 1, name: 'John' } // результат запроса пользователя
     * data: [1, 2, 3] // список идентификаторов
     * ```
     */
    data?: TModelData | TModelData[];
}

/**
 * Тип функции обратного вызова для выполнения запросов к базе данных
 *
 * @example
 * ```ts
 * const queryCallback: TQueryCb = async (client, db) => {
 *   const collection = db.collection('users');
 *   const result = await collection.find({}).toArray();
 *   return { status: true, data: result };
 * };
 * ```
 *
 * @param client - Клиент MongoDB для выполнения запросов
 * @param db - Экземпляр базы данных MongoDB
 * @returns Promise с результатом выполнения запроса
 */
export type TQueryCb<TClient = unknown, TDB = unknown> = (
    client: TClient,
    db: TDB,
) => Promise<IModelRes>;
