import {DbControllerModel} from "./DbControllerModel";
import {mmApp} from "../../core/mmApp";
import {IQueryData, QueryData} from "./QueryData";
import {fread, isFile} from "../../utils/index";
import {IModelRes} from "../interface/IModel";

/**
 * Контроллер, позволяющий работать с данными, хранящимися в файле
 */
export class DbControllerFile extends DbControllerModel {
    /**
     * Выполнение запроса на обновление записи в источнике данных
     *
     * @param {QueryData} updateQuery Данные для обновления записи
     * @return {Promise<Object>}
     * @api
     */
    public async update(updateQuery: QueryData): Promise<any> {
        let update = updateQuery.getData();
        let select = updateQuery.getQuery();
        const data = this.getFileData();
        if (select) {
            let idVal = select[this.primaryKeyName as string];
            if (idVal !== undefined) {
                if (typeof data[idVal] !== 'undefined') {
                    data[idVal] = {...data[idVal], ...update};
                    mmApp.saveJson(`${this.tableName}.json`, data);
                }
                return true;
            }
        }
        return null;
    }

    /**
     * Выполнение запроса на добавление записи в источник данных
     *
     * @param {QueryData} insertQuery Данные для добавления записи
     * @return {Promise<Object>}
     * @api
     */
    public async insert(insertQuery: QueryData): Promise<any> {
        const insert = insertQuery.getData();
        const data = this.getFileData();
        if (insert) {
            const idVal = insert[this.primaryKeyName as string];
            if (idVal) {
                data[idVal] = insert;
                mmApp.saveJson(`${this.tableName}.json`, data);
                return true;
            }
        }
        return null;
    }

    /**
     * Выполнение запроса на удаление записи в источнике данных
     *
     * @param {QueryData} removeQuery Данные для удаления записи
     * @return {Promise<boolean>}
     * @api
     */
    public async remove(removeQuery: QueryData): Promise<boolean> {
        const remove = removeQuery.getQuery();
        const data = this.getFileData();
        if (remove) {
            const idVal = remove[this.primaryKeyName as string];
            if (idVal !== undefined) {
                if (typeof data[idVal] !== 'undefined') {
                    delete data[idVal];
                    mmApp.saveJson(`${this.tableName}.json`, data);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Выполнение произвольного запроса к источнику данных
     *
     * @param {Function} callback Запрос, который необходимо выполнить
     * @return {Object|Object[]}
     * @api
     */
    public query(callback: Function): null {
        return null;
    }

    /**
     * Валидация значений полей для таблицы.
     *
     * @param {IQueryData} element
     * @api
     */
    public validate(element: IQueryData | null): IQueryData {
        if (!element) {
            return {};
        }
        return element;
    }

    /**
     * Выполнение запроса на поиск записей в источнике данных
     *
     * @param {IQueryData} where Данные для поиска значения
     * @param {boolean} isOne Вывести только 1 запись.
     * @return {Promise<IModelRes>}
     */
    public async select(where: IQueryData, isOne: boolean = false): Promise<IModelRes> {
        let result = null;
        const content = this.getFileData();
        for (const key in content) {
            if (content.hasOwnProperty(key)) {
                let isSelected = null;

                for (const data in where) {
                    if (content[key].hasOwnProperty(data) && where.hasOwnProperty(data)) {
                        isSelected = content[key][data] === where[data];
                        if (isSelected === false) {
                            break;
                        }
                    }
                }

                if (isSelected) {
                    if (isOne) {
                        result = content[key];
                        return {
                            status: true,
                            data: result
                        };
                    }
                    if (result === null) {
                        result = [];
                    }
                    result.push(content[key]);
                }
            }
        }
        if (result) {
            return {
                status: true,
                data: result
            };
        }
        return {
            status: false,
            error: 'Не удалось получить данные'
        };
    }

    /**
     * Получение всех значений из файла. Актуально если глобальная константа mmApp.isSaveDb равна false.
     *
     * @return {Object|Object[]}
     * @api
     */
    public getFileData(): any {
        const path = mmApp.config.json;
        const fileName = this.tableName;
        const file = `${path}/${fileName}.json`;
        if (isFile(file)) {
            return JSON.parse(fread(file));
        } else {
            return {};
        }
    }

    /**
     * Декодирование текста(Текст становится приемлемым и безопасным для sql запроса).
     *
     * @param {string | number} text Исходный текст.
     * @return string
     * @api
     */
    public escapeString(text: string | number): string {
        return text + '';
    }

    /**
     * Проверка подключения к источнику данных.
     * При использовании БД, проверяется статус подключения.
     * Если удалось подключиться, возвращается true, в противном случае false.
     * При сохранении данных в файл, всегда возвращается true.
     *
     * @return {Promise<boolean>}
     */
    public async isConnected(): Promise<boolean> {
        return true;
    }
}
