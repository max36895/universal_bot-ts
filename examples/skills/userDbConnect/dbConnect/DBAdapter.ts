import { IModelRes, IQuery, IQueryData, TQueryCb } from '../../../../src/models';
import { BaseDbAdapter } from '../../../../src/plugins';

type IData = Record<string, Record<string, unknown>>;

/**
 * Адаптер для пользовательской базы данных, которая хранит все данные в оперативной памяти
 */
export default class DBAdapter extends BaseDbAdapter {
    /**
     * Внутренний метод для сохранения данных в оперативной памяти
     * @param data
     * @param tableName
     * @protected
     */
    protected _saveData(data: IData, tableName: string) {
        if (this._appContext.database.databaseInfo) {
            this._appContext.database.databaseInfo[tableName] = data;
        } else {
            this._appContext.database.databaseInfo = {
                [tableName]: data,
            };
        }
    }

    /**
     * Ищем данные
     * @param selectData
     * @param where
     * @param isOne
     */
    public _select(selectData: IQuery, where: IQueryData | null, isOne: boolean): IModelRes {
        const data: IData = (this._appContext.database.databaseInfo?.[selectData.tableName] ||
            {}) as IData;
        if (data[where?.[selectData.primaryKeyName as string]]) {
            return { status: true, data: data[where?.[selectData.primaryKeyName as string]] };
        }
        return {
            status: false,
        };
    }

    /**
     * Обновляем значение в базе данных
     * @param updateData
     */
    _update(updateData: IQuery): boolean | Promise<boolean> {
        const update = updateData.data;
        const select = updateData.query;
        const data: IData = (this._appContext.database.databaseInfo?.[updateData.tableName] ||
            {}) as IData;
        if (select) {
            const idVal = select[updateData.primaryKeyName as string] as string;
            if (idVal !== undefined) {
                // Prevent prototype pollution via special object keys
                if (idVal === '__proto__' || idVal === 'constructor' || idVal === 'prototype') {
                    return false;
                }
                if (typeof data[idVal] !== 'undefined') {
                    data[idVal] = { ...data[idVal], ...update };
                    this._saveData(data, updateData.tableName);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Выполнение произвольного запроса
     * @param _callback
     */
    _query(_callback: TQueryCb): Promise<unknown> | unknown {
        // Так как нет необходимости в выполнении произвольного запроса, просто вызываем базовую логику
        return super._query(_callback);
    }

    /**
     * Удаление записи из базы данных
     * @param removeData
     */
    _remove(removeData: IQuery): boolean | Promise<boolean> {
        const remove = removeData.query;
        const data: IData = (this._appContext.database.databaseInfo?.[removeData.tableName] ||
            {}) as IData;
        if (remove) {
            const idVal = remove[removeData.primaryKeyName as string] as string;
            if (idVal !== undefined) {
                // Prevent prototype pollution via special object keys
                if (idVal === '__proto__' || idVal === 'constructor' || idVal === 'prototype') {
                    return false;
                }
                if (typeof data[idVal] !== 'undefined') {
                    delete data[idVal];
                    this._saveData(data, removeData.tableName);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Выполнение запроса на добавление данных в бд
     * @param insertData
     */
    _insert(insertData: IQuery): boolean | Promise<boolean> {
        if (insertData.data) {
            this._appContext.database.databaseInfo ??= {};
            this._appContext.database.databaseInfo[insertData.tableName] ??= {};
            // @ts-expect-error
            this._appContext.database.databaseInfo[insertData.tableName][
                insertData.data[insertData.primaryKeyName as string] as string
            ] = insertData.data;
            return true;
        }
        return false;
    }
    /**
     * Проверяет, установлено ли соединение с БД.
     */
    isConnected(): Promise<boolean> | boolean {
        /**
         * Тут должна быть проверка на то, что подключение к базе прошло,
         * так как у нас база хранится в оперативной памяти, всегда возвращаем true
         */
        return true;
    }
}
