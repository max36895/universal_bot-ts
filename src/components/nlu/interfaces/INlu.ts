import { IAlisaNlu } from '../../../platforms/interfaces';

/**
 * @interface INluResult
 * Интерфейс результата поиска в NLU
 *
 * @template T - Тип возвращаемого результата (по умолчанию object)
 *
 * @example
 * ```typescript
 * // Пример успешного результата
 * const successResult: INluResult<string> = {
 *     status: true,
 *     result: "найденное значение"
 * };
 *
 * // Пример неудачного результата
 * const failResult: INluResult<string> = {
 *     status: false,
 *     result: null
 * };
 * ```
 */
export interface INluResult<T = object> {
    /**
     * Статус поиска. true если значение найдено, false если не найдено
     */
    status: boolean;
    /**
     * Результат поиска. null если значение не найдено
     */
    result: T | null;
}

/**
 * @interface INluFIO
 * Интерфейс результата поиска ФИО в NLU
 *
 * @example
 * ```typescript
 * const fio: INluFIO = {
 *     first_name: "Иван",
 *     patronymic_name: "Иванович",
 *     last_name: "Иванов"
 * };
 * ```
 */
export interface INluFIO {
    /**
     * Имя
     */
    first_name?: string;
    /**
     * Отчество
     */
    patronymic_name?: string;
    /**
     * Фамилия
     */
    last_name?: string;
}

/**
 * @interface INluGeo
 * Интерфейс результата поиска геолокации в NLU
 *
 * @example
 * ```typescript
 * const geo: INluGeo = {
 *     country: "Россия",
 *     city: "Москва",
 *     street: "Ленина",
 *     house_number: "10"
 * };
 * ```
 */
export interface INluGeo {
    /**
     * Страна
     */
    country?: string;
    /**
     * Город
     */
    city?: string;
    /**
     * Улица
     */
    street?: string;
    /**
     * Номер дома
     */
    house_number?: string;
    /**
     * Аэропорт
     */
    airport?: string;
}

/**
 * @interface INluDateTime
 * Интерфейс результата поиска даты и времени в NLU
 *
 * @example
 * ```typescript
 * const dateTime: INluDateTime = {
 *     year: 2024,
 *     month: 3,
 *     day: 15,
 *     hour: 14,
 *     minute: 30
 * };
 *
 * // Относительная дата
 * const relativeDateTime: INluDateTime = {
 *     day: 1,
 *     day_is_relative: true // "завтра"
 * };
 * ```
 */
export interface INluDateTime {
    /**
     * Год
     */
    year?: number;
    /**
     * Флаг относительности года
     */
    year_is_relative?: boolean;
    /**
     * Месяц
     */
    month?: number;
    /**
     * Флаг относительности месяца
     */
    month_is_relative?: boolean;
    /**
     * День
     */
    day?: number;
    /**
     * Флаг относительности дня
     */
    day_is_relative?: boolean;
    /**
     * Час
     */
    hour?: number;
    /**
     * Флаг относительности часа
     */
    hour_is_relative?: boolean;
    /**
     * Минута
     */
    minute?: number;
    /**
     * Флаг относительности минуты
     */
    minute_is_relative?: boolean;
}

/**
 * @interface INluThisUser
 * Интерфейс результата поиска информации о пользователе в NLU
 *
 * @example
 * ```typescript
 * const user: INluThisUser = {
 *     username: "ivan_ivanov",
 *     first_name: "Иван",
 *     last_name: "Иванов"
 * };
 * ```
 */
export interface INluThisUser {
    /**
     * Имя пользователя
     */
    username: string | null;
    /**
     * Фамилия пользователя
     */
    first_name?: string | null;
    /**
     * Отчество пользователя
     */
    last_name?: string | null;
}

/**
 * @interface INluSlot
 * Интерфейс слота в NLU
 *
 * @example
 * ```typescript
 * const slot: INluSlot = {
 *     type: "YANDEX.NUMBER",
 *     value: 42
 * };
 * ```
 */
export interface INluSlot {
    /**
     * Тип значения слота
     */
    type?: string;

    /**
     * Дополнительные свойства слота
     */
    [name: string]: any;
}

/**
 * @interface INluIntents
 * Интерфейс интентов в NLU
 *
 * @example
 * ```typescript
 * const intents: INluIntents = {
 *     "YANDEX.CONFIRM": {
 *         slots: []
 *     },
 *     "YANDEX.REJECT": {
 *         slots: []
 *     }
 * };
 * ```
 */
export interface INluIntents {
    /**
     * Интенты по их именам
     */
    [name: string]: INluIntent;
}

/**
 * @interface INluIntent
 * Интерфейс интента в NLU
 *
 * @example
 * ```typescript
 * const intent: INluIntent = {
 *     slots: [
 *         {
 *             type: "YANDEX.DATETIME",
 *             value: { year: 2024 }
 *         }
 *     ]
 * };
 * ```
 */
export interface INluIntent {
    /**
     * Слоты. В Алисе разработчик сам их задает
     */
    slots: INluSlot[] | INluSlot;
}

/**
 * @interface INlu
 * Основной интерфейс NLU
 *
 * @extends {IAlisaNlu}
 *
 * @example
 * ```typescript
 * const nlu: INlu = {
 *     thisUser: {
 *         username: "ivan_ivanov",
 *         first_name: "Иван"
 *     },
 *     intents: {
 *         "YANDEX.CONFIRM": {
 *             slots: []
 *         }
 *     }
 * };
 * ```
 */
export interface INlu extends IAlisaNlu {
    /**
     * Информация о пользователе
     */
    thisUser?: INluThisUser;
    /**
     * Интенты
     */
    intents?: INluIntents;
}
