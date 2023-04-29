import {IModelRes, IModelRules} from './IModel';
import {IQueryData, QueryData} from '../db/QueryData';

export type TKey = string | number | null;

export interface IDbControllerResult {
    [keyStr: string]: any;

    [keyInt: number]: any;
}

/**
 * Интерфейс для абстрактного класса служащего прослойкой между логикой ядра и подключением к БД.
 */
export interface IDbControllerModel {
    tableName: string;
    primaryKeyName: TKey;
    setRules: (rules: IModelRules[]) => void;
    getValue: (res: IModelRes) => IDbControllerResult | null;
    select: (select: IQueryData | null, isOne: boolean) => Promise<IModelRes>;
    insert: (insertData: QueryData) => any;
    update: (updateData: QueryData) => any;
    save: (saveData: QueryData, isNew: boolean) => Promise<any>;
    remove: (removeData: QueryData) => any;
    query: (callback: Function) => any;
    selectOne: (query: IQueryData | null) => Promise<IModelRes | null>;
    escapeString: (str: string | number) => string;
    isConnected: () => Promise<boolean>;
    destroy: () => void;
    [name: string]: any;
}
