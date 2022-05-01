import {IAlisaNlu} from "../../../core/interfaces/IAlisa";

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

export interface INluFIO {
    first_name?: string;
    patronymic_name?: string;
    last_name?: string;
}

export interface INluGeo {
    country?: string;
    city?: string;
    street?: string;
    house_number?: string;
    airport?: string;
}

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

export interface INluIntents {
    [name: string]: INluIntent;
}

export interface INluIntent {
    /**
     * Слоты. В Алисе разработчик сам их задает
     */
    slots: INluSlot[] | INluSlot
}

export interface INlu extends IAlisaNlu {
    /**
     * Информация о пользователе
     */
    thisUser?: INluThisUser;
    intents?: INluIntents;
}
