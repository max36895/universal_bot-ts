/**
 * Модуль для работы с данными запросов к базе данных
 *
 * Предоставляет интерфейсы и классы для:
 * - Формирования параметров запросов
 * - Парсинга строк запросов
 * - Управления данными для вставки и обновления
 */
import { IModelRules } from '../interface/IModel';

/**
 * Интерфейс для хранения данных запроса к базе данных.
 * Позволяет задавать произвольные поля и их значения
 *
 * Значения могут быть простыми (строка, число) или объектами с операторами (например, $gt, $in). Формат условий зависит от реализации адаптера — фреймворк не навязывает конкретный диалект.
 *
 * @example
 * ```ts
 * const query: IQueryData = {
 *   id: 1,                    // Поиск по id = 1
 *   name: 'John',            // Поиск по name = 'John'
 *   age: { $gt: 18 },        // Поиск по age > 18
 *   city: { $in: ['Moscow', 'St. Petersburg'] } // Поиск по city в списке
 * };
 * ```
 */
export interface IQueryData {
    /**
     * Произвольные поля запроса
     * Ключ - название поля в базе данных
     * Значение - условие для поиска или значение для обновления
     *
     * @example
     * ```ts
     * {
     *   'user_id': 123,           // Точное совпадение
     *   'status': 'active',       // Точное совпадение
     *   'age': { $gt: 18 },       // Больше чем
     *   'tags': { $in: ['a', 'b'] } // В списке значений
     * }
     * ```
     */
    [key: string]: unknown | string | number;
}

const DATA_REG = /`([^`]+)`\s*=\s*(?:"([^"]*)"|(\S+))/gim;

/**
 * Тип для ключа
 */
export type TKey = string | number | null;

/**
 * Структура запроса к базе данных.
 *
 * Используется всеми методами адаптера (`_select`, `_insert` и др.).
 */
export interface IQuery {
    /**
     * Условие фильтрации (для SELECT/UPDATE/DELETE)
     */
    query: IQueryData | null;
    /**
     * Данные для вставки или обновления
     */
    data: IQueryData | null;
    /**
     * Название таблиц
     */
    tableName: string;
    /**
     * Имя поля, используемого как первичный ключ (может быть null)
     */
    primaryKeyName: TKey;
    /**
     * Правила валидации модели
     */
    rules: IModelRules[];
}

/**
 * Парсит строку запроса в объект IQueryData
 * Поддерживает формат `field=value` с возможностью экранирования
 *
 * @example
 * ```ts
 * const query = QueryData.getQueryData('`id`=1 `name`="John Doe"');
 * // Результат: { id: 1, name: 'John Doe' }
 * ```
 *
 * @param str - Строка запроса для парсинга
 * @returns Объект с параметрами запроса или null
 */
export function getQueryData(str: string): IQueryData | null {
    if (str) {
        const datas = str.matchAll(DATA_REG);
        const regData: IQueryData = {};
        let data = datas.next();
        while (!data.done) {
            let val: string | number = data.value[2] ?? data.value[3];
            if (!isNaN(+val)) {
                val = +val;
            }
            regData[data.value[1]] = val;
            data = datas.next();
        }
        return regData;
    }
    return null;
}
