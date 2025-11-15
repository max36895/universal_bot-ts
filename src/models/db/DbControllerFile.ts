/**
 * Модуль контроллера для работы с данными в файлах
 *
 * Предоставляет функциональность для:
 * - Чтения и записи данных в JSON файлы
 * - Кэширования данных для оптимизации производительности
 * - Выполнения CRUD операций с файловыми данными
 */

import { DbControllerModel } from './DbControllerModel';
import { IQueryData, QueryData } from './QueryData';
import { fread, getFileInfo } from '../../utils/standard/util';
import { IModelRes, TQueryCb } from '../interface';

/**
 * Интерфейс для хранения информации о файле
 *
 * @interface IFileInfo
 */
export interface IFileInfo {
    /**
     * Содержимое файла в виде строки
     */
    data: string;

    /**
     * Версия файла.
     * Используется время последнего изменения файла в миллисекундах
     */
    version: number;
}

/**
 * Тип для кэширования данных из файлов
 * Ключ - путь к файлу, значение - информация о файле
 *
 * @type {Object.<string, IFileInfo>}
 */
export type IFileData = { [key: string]: IFileInfo };

/**
 * Контроллер для работы с данными, хранящимися в JSON файлах
 * Реализует базовые операции CRUD для файлового хранилища
 *
 * @example
 * ```typescript
 * // Создание контроллера
 * const controller = new DbControllerFile();
 * controller.tableName = 'users';
 *
 * // Добавление записи
 * const queryData = new QueryData();
 * queryData.setData({ id: 1, name: 'John' });
 * await controller.insert(queryData);
 *
 * // Поиск записей
 * const result = await controller.select({ name: 'John' });
 * ```
 *
 * @class DbControllerFile
 * @extends DbControllerModel
 */
export class DbControllerFile extends DbControllerModel {
    /**
     * Кэш для хранения данных из файлов.
     * Оптимизирует производительность при частом чтении
     *
     * @protected
     */
    protected cachedFileData: IFileData = {};

    /**
     * Уничтожает контроллер и очищает кэш
     *
     * @example
     * ```typescript
     * controller.destroy();
     * ```
     */
    public destroy(): void {
        super.destroy();
        this.cachedFileData = {};
    }

    /**
     * Обновляет существующую запись в файле
     *
     * @example
     * ```typescript
     * const queryData = new QueryData();
     * queryData.setQuery({ id: 1 });
     * queryData.setData({ name: 'John' });
     * await controller.update(queryData);
     * ```
     *
     * @param updateQuery - Данные для обновления
     * @returns Promise с результатом операции
     */
    public async update(updateQuery: QueryData): Promise<any> {
        const update = updateQuery.getData();
        const select = updateQuery.getQuery();
        const data = this.getFileData();
        if (select) {
            const idVal = select[this.primaryKeyName as string];
            if (idVal !== undefined) {
                if (typeof data[idVal] !== 'undefined') {
                    data[idVal] = { ...data[idVal], ...update };
                    this._appContext?.saveJson(`${this.tableName}.json`, data);
                }
                return true;
            }
        }
        return null;
    }

    /**
     * Добавляет новую запись в файл
     *
     * @example
     * ```typescript
     * const queryData = new QueryData();
     * queryData.setData({ id: 1, name: 'John' });
     * await controller.insert(queryData);
     * ```
     *
     * @param insertQuery - Данные для добавления
     * @returns Promise с результатом операции
     */
    public async insert(insertQuery: QueryData): Promise<any> {
        const insert = insertQuery.getData();
        const data = this.getFileData();
        if (insert) {
            const idVal = insert[this.primaryKeyName as string];
            if (idVal) {
                data[idVal] = insert;
                this._appContext?.saveJson(`${this.tableName}.json`, data);
                return true;
            }
        }
        return null;
    }

    /**
     * Удаляет запись из файла
     *
     * @example
     * ```typescript
     * const queryData = new QueryData();
     * queryData.setQuery({ id: 1 });
     * await controller.remove(queryData);
     * ```
     *
     * @param removeQuery - Данные для удаления
     * @returns Promise<boolean> - true если удаление успешно
     */
    public async remove(removeQuery: QueryData): Promise<boolean> {
        const remove = removeQuery.getQuery();
        const data = this.getFileData();
        if (remove) {
            const idVal = remove[this.primaryKeyName as string];
            if (idVal !== undefined) {
                if (typeof data[idVal] !== 'undefined') {
                    delete data[idVal];
                    this._appContext?.saveJson(`${this.tableName}.json`, data);
                }
                return true;
            }
        }
        return false;
    }

    /* eslint-disable */
    /**
     * Выполняет произвольный запрос к файлу
     * В текущей реализации всегда возвращает null
     *
     * @param callback - Функция обратного вызова
     * @returns null
     */
    public query(callback: TQueryCb): null {
        return null;
    }

    /* eslint-enable */

    /**
     * Выполняет валидацию данных
     * В текущей реализации просто возвращает исходные данные
     *
     * @example
     * ```typescript
     * const validated = controller.validate({
     *   id: 1,
     *   name: 'John'
     * });
     * ```
     *
     * @param element - Данные для валидации
     * @returns Валидированные данные
     */
    public validate(element: IQueryData | null): IQueryData {
        if (!element) {
            return {};
        }
        return element;
    }

    /**
     * Выполняет поиск записей в файле
     *
     * @example
     * ```typescript
     * // Поиск одной записи
     * const one = await controller.select({ id: 1 }, true);
     *
     * // Поиск нескольких записей
     * const many = await controller.select({ name: 'John' });
     * ```
     *
     * @param where - Условия поиска
     * @param isOne - Флаг выборки одной записи
     * @returns Promise с результатом запроса
     */
    public async select(where: IQueryData | null, isOne: boolean = false): Promise<IModelRes> {
        let result = null;
        const content = this.getFileData();
        if (where) {
            for (const key in content) {
                if (Object.hasOwnProperty.call(content, key)) {
                    let isSelected = null;

                    for (const data in where) {
                        if (
                            Object.hasOwnProperty.call(content[key], data) &&
                            Object.hasOwnProperty.call(where, data)
                        ) {
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
                                data: result,
                            };
                        }
                        if (result === null) {
                            result = [];
                        }
                        result.push(content[key]);
                    }
                }
            }
        } else {
            result = isOne ? content[Object.keys(content)[0]] : content;
        }
        if (result) {
            return {
                status: true,
                data: result,
            };
        }
        return {
            status: false,
            error: 'Не удалось получить данные',
        };
    }

    /**
     * Получает все данные из файла
     * Использует кэширование для оптимизации производительности
     *
     * @example
     * ```typescript
     * const data = controller.getFileData();
     * console.log(data); // { "1": { "id": 1, "name": "John" } }
     * ```
     *
     * @returns Объект с данными из файла
     */
    public getFileData(): any {
        const path = this._appContext?.appConfig.json;
        const fileName = this.tableName;
        const file = `${path}/${fileName}.json`;
        const fileInfo = getFileInfo(file).data;
        if (fileInfo && fileInfo.isFile()) {
            const getFileData = (isForce: boolean = false): string => {
                const fileData =
                    this.cachedFileData[file] &&
                    this.cachedFileData[file].version > fileInfo.mtimeMs &&
                    !isForce
                        ? this.cachedFileData[file].data
                        : (fread(file).data as string);

                this.cachedFileData[file] = {
                    data: fileData,
                    version: fileInfo.mtimeMs,
                };
                return fileData;
            };
            try {
                const fileData = getFileData();
                if (fileData) {
                    return JSON.parse(fileData);
                }
                return {};
            } catch {
                // Может возникнуть ситуация когда файл прочитался во время записи, из-за чего не получится его распарсить.
                // Поэтому считаем что произошла ошибка при чтении, и пробуем прочитать повторно.
                const fileData = getFileData(true);
                if (!fileData) {
                    return {};
                }
                try {
                    return JSON.parse(fileData);
                } catch (e) {
                    this._appContext?.logError(`Ошибка при парсинге файла ${file}`, {
                        content: fileData,
                        error: (e as Error).message,
                    });
                    return {};
                }
            }
        } else {
            return {};
        }
    }

    /**
     * Экранирует специальные символы в строке
     * В текущей реализации просто преобразует значение в строку
     *
     * @example
     * ```typescript
     * const safe = controller.escapeString("O'Connor");
     * ```
     *
     * @param text - Текст для экранирования
     * @returns Экранированная строка
     */
    public escapeString(text: string | number): string {
        return text + '';
    }

    /**
     * Проверяет состояние подключения к файлу
     * В текущей реализации всегда возвращает true
     *
     * @example
     * ```typescript
     * const isConnected = await controller.isConnected();
     * if (isConnected) {
     *   // Выполнение операций с файлом
     * }
     * ```
     *
     * @returns Promise<boolean> - всегда true
     */
    public async isConnected(): Promise<boolean> {
        return true;
    }
}
