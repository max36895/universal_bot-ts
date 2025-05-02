import { IAlisaNlu } from '../../../platforms/interfaces';

/**
 * Интерфейс результата поиска в nlu
 */
export interface INluResult<T = object> {
    /**
     * Статус. Если удалось найти значение, вернет true, иначе false
     */
    status: boolean;
    /**
     * Результат поиска
     */
    result: T | null;
}

/**
 * Интерфейс результата поиска ФИО в nlu
 */
export interface INluFIO {
    first_name?: string;
    patronymic_name?: string;
    last_name?: string;
}

/**
 * Интерфейс результата поиска геолокации в nlu
 */
export interface INluGeo {
    country?: string;
    city?: string;
    street?: string;
    house_number?: string;
    airport?: string;
}

/**
 * Интерфейс результата поиска даты и времени в nlu
 */
export interface INluDateTime {
    year?: number;
    year_is_relative?: boolean;
    month?: number;
    month_is_relative?: boolean;
    day?: number;
    day_is_relative?: boolean;
    hour?: number;
    hour_is_relative?: boolean;
    minute?: number;
    minute_is_relative?: boolean;
}

/**
 * Интерфейс результата поиска пользователя в nlu
 */
export interface INluThisUser {
    /**
     * Имя
     */
    username: string | null;
    /**
     * Фамилия
     */
    first_name?: string | null;
    /**
     * Отчество
     */
    last_name?: string | null;
}

/**
 * Интерфейс слота в nlu
 */
export interface INluSlot {
    /**
     * Тип значения
     */
    type?: string;

    /**
     * Значения
     */
    [name: string]: any;
}

/**
 * Интерфейс интентов в nlu
 */
export interface INluIntents {
    [name: string]: INluIntent;
}

/**
 * Интерфейс интента в nlu
 */
export interface INluIntent {
    /**
     * Слоты. В Алисе разработчик сам их задает
     */
    slots: INluSlot[] | INluSlot;
}

/**
 * Интерфейс nlu
 */
export interface INlu extends IAlisaNlu {
    /**
     * Информация о пользователе
     */
    thisUser?: INluThisUser;
    intents?: INluIntents;
}
