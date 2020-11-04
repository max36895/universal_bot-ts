export type TModelRulesType = 'text' | 'string' | 'integer' | 'date' | 'int' | 'bool';

export interface IModelRules {
    name: string[];
    type: TModelRulesType;
    max?: number
}
