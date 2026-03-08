import { Base } from '../Base/Base';
import { IQueryData, IQuery, IModelRes, fread, getFileInfo, IDatabaseInfo } from '../../../index';

type TFileData = Record<string, Record<string, unknown>>;

/**
 * Интерфейс для хранения информации о файле
 *
 * @interface IFileInfo
 */
interface IFileInfo {
    /**
     * Содержимое файла в виде строки
     */
    data?: TFileData;

    /**
     * Версия файла.
     * Используется время последнего изменения файла в миллисекундах
     */
    version: number;
    /**
     * Идентификатор тайм-аута для легкого сохранения
     */
    timeOutId?: ReturnType<typeof setTimeout> | null;
    /**
     * Идентификатор тайм-аута для строгого сохранения. Необходим для случаев, когда идет постоянная нагрузка на сервер, и нет возможности сохранить информацию в файл.
     */
    forceTimeOutId?: ReturnType<typeof setTimeout> | null;
    /**
     * Определяет было ли произведено чтение файла или нет
     */
    isFileRead: boolean;
}

interface IFileDbInfo extends IDatabaseInfo {
    [tableName: string]: IFileInfo;
}

/**
 * Тип для кэширования данных из файлов
 * Ключ - путь к файлу, значение - информация о файле
 *
 * @type {Object.<string, IFileInfo>}
 */
type IFileData = { [key: string]: IFileInfo };

// Сохраняем данные не чаще 1 раза в 500мс
const LAZY_DELAY_SAVE_TIME = 500;
// Принудительно сохраняем данные каждые 3 минут. Актуально для случаев, когда идет постоянная нагрузка на сервер.
const FORCE_DELAY_SAVE_TIME = 60 * 1000 * 3;

/**
 * Адаптер для файловой базы данных.
 * Стоит использовать только для быстрого старта, либо для приложений, у которых объем базы не будет превышать 250мб.
 */
export class FileAdapter extends Base<IFileDbInfo> {
    /**
     * Формат базы данных
     */
    dbFormat: string = 'file';
    /**
     * Для локального сохранения, на случай если AppContext не доступен
     * @private
     */
    #cachedFileData: IFileData = {};

    constructor() {
        super();
    }

    connect(): Promise<boolean> | boolean {
        // TODO костыль, но нужно как-то предварительно загрузить содержимое файлов, иначе под нагрузкой может 1 файл прочитаться несколько раз сразу, либо прочитаться во время выполнения. Лучше пусть будет так, чем приложение упадет при запросе.
        this.getFileData('UsersData');
        this.getFileData('SoundTokens');
        this.getFileData('ImageTokens');
        return true;
    }

    /**
     * Сохранение всех данные в базу
     * @param tableName Имя таблицы
     * @param data Сохраняемые данные
     */
    setCachedFileData(tableName: string, data: IFileInfo | undefined): void {
        if (this._appContext.database.databaseInfo) {
            if (data === undefined) {
                // @ts-ignore
                this._appContext.database.databaseInfo[tableName] = undefined;
            } else {
                const timeOutId = this._appContext.database.databaseInfo[tableName]?.timeOutId;
                this._appContext.database.databaseInfo[tableName] = data;
                // из-за асинхронности может выйти так, что кто-то записывает новые данные, которые перетирают ранее установленный timeout
                if (data.timeOutId === undefined && timeOutId !== undefined) {
                    this._appContext.database.databaseInfo[tableName].timeOutId = timeOutId;
                }
            }
        } else if (data === undefined) {
            // @ts-ignore
            this.#cachedFileData[tableName] = undefined;
        } else {
            this.#cachedFileData[tableName] = data;
        }
    }

    /**
     * Получение всех данных из базы
     * @param tableName Имя таблицы
     */
    getCachedFileData(tableName: string): IFileInfo {
        if (this._appContext?.database.databaseInfo) {
            if (!this._appContext.database.databaseInfo[tableName]) {
                this._appContext.database.databaseInfo[tableName] = {
                    version: 0,
                    data: {},
                    isFileRead: false,
                };
            }
            return this._appContext.database.databaseInfo[tableName];
        }
        this.#cachedFileData ??= {};
        return this.#cachedFileData[tableName];
    }

    /**
     * Сохранение данные в базу
     * @param tableName Имя таблицы
     * @param field Поле, в которое происходит сохранение
     * @param data Данные для сохранения
     * @private
     */
    #setCachedFileData<T extends keyof IFileInfo = keyof IFileInfo>(
        tableName: string,
        field: T,
        data: IFileInfo[T],
    ): void {
        const cachedData = this.getCachedFileData(tableName);
        cachedData[field] = data;
        this.setCachedFileData(tableName, cachedData);
    }

    /**
     * Сохраняет данные
     * @param tableName Название таблицы
     * @param force Флаг принудительного сохранения
     * @private
     */
    #update(tableName: string, force: boolean = false): void {
        // data не нужен, так как все данные редактируются в объекте по ссылке
        const cb = (): void => {
            const data = this.getCachedFileData(tableName).data;
            if (data) {
                this._appContext?.saveFileData(`${tableName}.json`, data);
            }
            this.#setCachedFileData(tableName, 'timeOutId', null);
            const forceTimeOutId = this.getCachedFileData(tableName).forceTimeOutId;
            if (forceTimeOutId) {
                clearTimeout(forceTimeOutId);
                this.#setCachedFileData(tableName, 'forceTimeOutId', null);
            }
        };
        const timeOutId = this.getCachedFileData(tableName).timeOutId;
        if (timeOutId) {
            clearTimeout(timeOutId);
            this.#setCachedFileData(tableName, 'timeOutId', null);
        }
        const forceTimeOutId = this.getCachedFileData(tableName).forceTimeOutId;
        if (force) {
            cb();
        } else {
            this.#setCachedFileData(tableName, 'timeOutId', setTimeout(cb, LAZY_DELAY_SAVE_TIME));
            if (!forceTimeOutId) {
                this.#setCachedFileData(
                    tableName,
                    'forceTimeOutId',
                    setTimeout(cb, FORCE_DELAY_SAVE_TIME),
                );
            }
        }
    }

    /**
     * Выполняет UPDATE-запрос.
     * @param updateData Дополнительная информация для запроса. Содержит сам запроса, а также название таблицы и прочие данные.
     */
    public _update(updateData: IQuery): boolean {
        const update = updateData.data;
        const select = updateData.query;
        const data = this.getFileData(updateData.tableName);
        if (select) {
            const idVal = select[updateData.primaryKeyName as string] as string;
            if (idVal !== undefined) {
                if (data[idVal] !== undefined) {
                    data[idVal] = { ...data[idVal], ...update };
                    this.#update(updateData.tableName);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Выполняет INSERT-запрос.
     * @param insertData Дополнительная информация для запроса. Содержит сам запроса, а также название таблицы и прочие данные.
     */
    public _insert(insertData: IQuery): boolean {
        const insert = insertData.data;
        const data = this.getFileData(insertData.tableName);
        if (insert) {
            const idVal = insert[insertData.primaryKeyName as string] as string;
            if (idVal) {
                data[idVal] = insert;
                this.#update(insertData.tableName);
                return true;
            }
        }
        return false;
    }

    /**
     * Выполняет DELETE-запрос.
     * @param removeData Дополнительная информация для запроса. Содержит сам запроса, а также название таблицы и прочие данные.
     */
    public _remove(removeData: IQuery): boolean {
        const remove = removeData.query;
        const data = this.getFileData(removeData.tableName);
        if (remove) {
            const idVal = remove[removeData.primaryKeyName as string] as string;
            if (idVal !== undefined) {
                if (data[idVal] !== undefined) {
                    delete data[idVal];
                    this.#update(removeData.tableName);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Получение данных по уникальному ключу
     * @param selectData
     * @param where
     * @param isOne
     * @param content
     * @private
     */
    #selectInPrimaryKey(
        selectData: IQuery,
        where: IQueryData,
        isOne: boolean = false,
        content: TFileData = {},
    ): IModelRes {
        const whereKey = where[selectData.primaryKeyName as string];
        if ((typeof whereKey === 'string' || typeof whereKey === 'number') && content[whereKey]) {
            if (Object.keys(where).length === 1) {
                return {
                    status: true,
                    data: isOne ? content[whereKey] : [content[whereKey]],
                };
            } else {
                let isSelected = false;
                for (const data in where) {
                    if (Object.hasOwn(content[whereKey], data) && Object.hasOwn(where, data)) {
                        isSelected = content[whereKey][data] === where[data];
                        if (!isSelected) {
                            break;
                        }
                    }
                }
                return {
                    status: isSelected,
                    data: isOne ? content[whereKey] : [content[whereKey]],
                };
            }
        } else {
            return {
                status: false,
            };
        }
    }

    /**
     * Выполняет SELECT-запрос.
     *
     * ⚠️ Файловый адаптер поддерживает только точное совпадение значений. Условия с операторами (например, $gt, $in) игнорируются.
     *
     * @param selectData Дополнительная информация для запроса. Содержит информацию о таблице и структуре.
     * @param where Сам запрос
     * @param isOne Определяет нужно ли вернуть только 1 найденную запись, либо отдать все доступные данные.
     */
    public _select(
        selectData: IQuery,
        where: IQueryData | null,
        isOne: boolean = false,
    ): IModelRes {
        let result: Record<string, unknown> | Record<string, unknown>[] | null = null;
        const content = this.getFileData(selectData.tableName);
        if (where) {
            const whereKey = where[selectData.primaryKeyName as string];
            if (whereKey) {
                return this.#selectInPrimaryKey(selectData, where, isOne, content);
            }
            for (const key in content) {
                let isSelected = null;

                for (const data in where) {
                    if (Object.hasOwn(content[key], data) && Object.hasOwn(where, data)) {
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
                    result ??= [];
                    result.push(content[key]);
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
     * Загружает данные таблицы из JSON-файла и кэширует их в памяти.
     *
     * - При первом обращении читает файл `${tableName}.json` из директории `appConfig.json`.
     * - Данные кэшируются с привязкой к времени последнего изменения файла (mtimeMs).
     * - Если файл не изменился, возвращаются кэшированные данные.
     * - В случае ошибки парсинга делается повторная попытка (защита от гонок записи/чтения).
     *
     * Формат данных в файле:
     * ```json
     * {
     *   "user123": { "name": "Alice", "age": 30 },
     *   "user456": { "name": "Bob", "age": 25 }
     * }
     * ```
     * где ключ — значение первичного ключа.
     * В случае если файла нет, вернутся пустые данные
     * @param tableName Имя таблицы (используется как имя файла)
     */
    public getFileData(tableName: string): TFileData {
        const path = this._appContext?.appConfig.json;
        const file = `${path}/${tableName}.json`;
        // Так как именно модель управляет файлом, то не нужно постоянно обращаться к файлу, так как извне никто не может поменять содержимое. По крайней мере не должен!

        const fileInfo = this.getCachedFileData(tableName).isFileRead
            ? null
            : getFileInfo(file).data;
        if (fileInfo?.isFile()) {
            // При размере базы более 400мб, может произойти падение приложения.
            if (fileInfo.size > 3.6e8) {
                this._appContext.logError(
                    'Размер файловой Базы данных приближается к 400мб! Крайне велика вероятность падения приложения! Рекомендуется перейти на другой адаптер(Например MongoAdapter, или какое-то свое решение) для работы с базой данных!',
                    { fileInfo },
                );
            } else if (fileInfo.size > 2.7e8) {
                this._appContext.logWarn(
                    'Размер файловой Базы данных приближается к 300мб, при дальнейшем увеличении размера базы данных, приложение может упасть. Рекомендуется перейти на другой адаптер для работы с базой данных.',
                    { fileInfo },
                );
            }
            const getFileData = (isForce: boolean = false): TFileData => {
                const cachedFileData = this.getCachedFileData(tableName);
                const fileData =
                    cachedFileData && cachedFileData.version >= fileInfo.mtimeMs && !isForce
                        ? cachedFileData.data
                        : (fread(file).data as string);

                const data = typeof fileData === 'string' ? JSON.parse(fileData) : fileData;
                this.setCachedFileData(tableName, {
                    data,
                    version: fileInfo.mtimeMs,
                    isFileRead: true,
                });
                return data;
            };
            try {
                return getFileData() || {};
            } catch {
                try {
                    // Может возникнуть ситуация когда файл прочитался во время записи, из-за чего не получится его распарсить.
                    // Поэтому считаем что произошла ошибка при чтении, и пробуем прочитать повторно.
                    return getFileData(true) || {};
                } catch (e) {
                    this._appContext?.logError(
                        `Произошла ошибка при получении данных из файла ${file}. Возможно файл был поврежден!`,
                        {
                            error: (e as Error).message,
                        },
                    );
                    return {};
                }
            }
        } else {
            this.#setCachedFileData(tableName, 'isFileRead', true);
            return this.getCachedFileData(tableName).data as TFileData;
        }
    }

    /**
     * Проверяет, установлено ли соединение с БД.
     */
    public isConnected(): boolean {
        return true;
    }

    /**
     * Закрывает все подключения к файловой БД.
     * Все процессы завершаются, и происходит сохранение данных в файл.
     */
    public destroy(): void {
        super.destroy();
        if (this._appContext.database.databaseInfo) {
            Object.keys(this._appContext.database.databaseInfo).forEach((tableName: string) => {
                this.close(tableName);
            });
        }
    }

    /**
     * Закрывает подключение к определенной таблице.
     * При закрытии, все хранящиеся в памяти данные сохраняются в файл.
     * @param tableName
     */
    public close(tableName: string): void {
        const timeOutId = this.getCachedFileData(tableName).timeOutId;
        if (timeOutId) {
            clearTimeout(timeOutId);
            this.#setCachedFileData(tableName, 'timeOutId', null);
            this.#update(tableName, true);
        }
        this.setCachedFileData(tableName, undefined);
    }
}
