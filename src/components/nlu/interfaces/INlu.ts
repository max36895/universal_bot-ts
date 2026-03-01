/**
 * Интерфейс для именованных сущностей в запросе.
 * Используется для извлечения структурированных данных из текста пользователя
 */
export interface IBaseEntities {
    /**
     * Позиция сущности в массиве слов
     * Нумерация начинается с 0
     */
    tokens?: {
        /** Индекс первого слова сущности */
        start: number;
        /** Индекс первого слова после сущности */
        end: number;
    };

    /**
     * Тип именованной сущности
     */
    type: string;

    /**
     * Значение сущности
     */
    value: object | number;
}

/**
 * Интерфейс для обработки естественного языка (NLU)
 * Содержит результаты анализа текста пользователя
 */
export interface IBaseNlu {
    /** Массив слов из фразы пользователя */
    tokens?: string[];
    /** Массив найденных именованных сущностей */
    entities?: IBaseEntities[];
    /**
     * Распознанные намерения пользователя.
     * Каждый интент содержит слоты с параметрами
     *
     * @example
     * ```ts
     * intents: {
     *     "YANDEX.CONFIRM": {
     *         slots: []
     *     },
     *     "YANDEX.REJECT": {
     *         slots: []
     *     },
     *     "YANDEX.DATETIME": {
     *         slots: [{
     *             type: "YANDEX.DATETIME",
     *             value: { year: 2024 }
     *         }]
     *     }
     * }
     * ```
     */
    intents?: object;
}

/**
 * @interface INluResult
 * Интерфейс результата поиска в NLU
 *
 * @template T - Тип возвращаемого результата (по умолчанию object)
 *
 * @example
 * ```ts
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
 * ```ts
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
 * ```ts
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
 * ```ts
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
 * ```ts
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
 * ```ts
 * const slot: INluSlot = {
 *     type: "YANDEX.NUMBER",
 *     value: 42
 * };
 * ```
 */
export interface INluSlot<TNLU extends string | unknown = string | unknown> {
    /**
     * Тип значения слота
     */
    type?: string;

    /**
     * Дополнительные свойства слота
     */
    [name: string]: TNLU | string | unknown;
}

/**
 * @interface INluIntents
 * Интерфейс интентов в NLU
 *
 * @example
 * ```ts
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
 * ```ts
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
 * Основной интерфейс NLU
 *
 * @example
 * ```ts
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
export interface INlu extends IBaseNlu {
    /**
     * Информация о пользователе
     */
    thisUser?: INluThisUser;
    /**
     * Интенты
     */
    intents?: INluIntents;
}
