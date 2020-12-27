import {IAlisaNlu} from "../../../core/interfaces/IAlisa";

export interface INluResult {
    /**
     * Статус. Если удалось найти значение, вернет true, иначе false
     */
    status: boolean;
    /**
     * Результат поиска
     */
    result: string | object;
}

export interface INluThisUser {
    /**
     * Имя
     */
    username: string;
    /**
     * Фамилия
     */
    first_name?: string;
    /**
     * Отчество
     */
    last_name?: string;
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
}
