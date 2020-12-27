export type TModelRulesType = 'text' | 'string' | 'integer' | 'date' | 'int' | 'bool';

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
     * Максимальное значени. Актуально, если type=string
     */
    max?: number
}
