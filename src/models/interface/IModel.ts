/**
 * Тип параметра
 */
export type TModelRulesType = 'text' | 'string' | 'integer' | 'date' | 'int' | 'bool';

/**
 * Интерфейс для описания правил проверки параметров
 */
export interface IModelRules {
    /**
     * Название поля
     */
    name: string[];
    /**
     * Тип поля
     */
    type: TModelRulesType;
    /**
     * Максимальное значение. Актуально, если type=string
     */
    max?: number;
}

/**
 * Интерфейс для описания модели
 */
export interface IModelRes {
    /**
     * Статус выполнения запроса
     */
    status: boolean;
    /**
     * Ошибки, возникшие во время выполнения запроса
     */
    error?: string;
    /**
     * Полученный результат запроса
     */
    data?: any;
}
