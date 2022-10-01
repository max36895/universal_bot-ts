import {IAppDB, mmApp} from '../../mmApp';
import {IQueryData, QueryData} from './QueryData';
import {IModelRes, IModelRules, IDbControllerModel, TKey, IDbControllerResult} from '../interface';

/**
 * Абстрактный класс служащий прослойкой между логикой ядра и подключением к БД.
 * Необходим для корректной настройки контролера, отвечающего за сохранение пользовательских данных.
 * Все прикладные контролеры должны быть унаследованы от него.
 */
export abstract class DbControllerModel implements IDbControllerModel {
    /**
     * Название таблицы
     */
    protected _tableName: string;

    /**
     * Правила для полей бд. Указывается тип каждого поля.
     */
    protected _rules: IModelRules[];

    /**
     * Конфигурация для настройки подключения к БД.
     */
    protected _connectConfig: IAppDB | undefined;

    /**
     * Название поля, которое является уникальным ключом. По умолчанию id
     */
    protected _primaryKeyName: TKey;

    protected constructor() {
        this._tableName = '';
        this._primaryKeyName = 'id';
        this._rules = [];
        this._connectConfig = mmApp.config.db;
    }

    /**
     * Устанавливает имя таблицы
     * @param {string} tableName
     */
    public set tableName(tableName: string) {
        this._tableName = tableName;
    }

    /**
     * Возвращает имя таблицы
     */
    public get tableName(): string {
        return this._tableName;
    }

    /**
     * Устанавливает имя уникального ключа
     * @param {string | number} primaryKey
     */
    public set primaryKeyName(primaryKey: TKey) {
        this._primaryKeyName = primaryKey;
    }

    /**
     * Возвращает имя уникального ключа
     * @return {string | number}
     */
    public get primaryKeyName(): TKey {
        return this._primaryKeyName;
    }

    /**
     * Устанавливает правила для полей
     * @param {IModelRules[]} rules
     */
    public setRules(rules: IModelRules[]) {
        this._rules = rules;
    }

    /**
     * Приводит полученный результат к требуемому типу.
     * В качестве результата должен вернуться объект вида:
     * {
     *    key: value
     * }
     * где key - порядковый номер поля(0, 1... 3), либо название поля. Рекомендуется использовать имя поля. Важно чтобы имя поля было указано в rules, имена не входящие в rules будут проигнорированы.
     * value - значение поля.
     * @param {IModelRes} res Результат выполнения запроса
     * @return {IDbControllerResult}
     */
    public getValue(res: IModelRes): IDbControllerResult | null {
        if (res && res.status) {
            return res.data;
        }
        return null;
    }

    /**
     * Выполнение запроса на поиск записей в источнике данных
     *
     * @param {IQueryData} select Данные для поиска значения
     * @param {boolean} isOne Вывести только 1 запись.
     * @return {Promise<IModelRes>}
     */
    public abstract select(select: IQueryData | null, isOne: boolean): Promise<IModelRes>;

    /**
     * Выполнение запроса на добавление записи в источник данных
     *
     * @param {QueryData} insertData Данные для добавления записи
     */
    public abstract insert(insertData: QueryData): any;

    /**
     * Выполнение запроса на обновление записи в источнике данных
     *
     * @param {QueryData} updateData Данные для обновления записи
     */
    public abstract update(updateData: QueryData): any;

    /**
     * Выполнение запроса на сохранения записи.
     * Обновление записи происходит в том случае, если запись присутствует в источнике данных.
     * Иначе будет добавлена новая запись.
     *
     * @param {QueryData} saveData Данные для сохранения записи
     * @param {boolean} isNew Определяет необходимость добавления новой записи
     */
    public async save(saveData: QueryData, isNew: boolean): Promise<any> {
        if (isNew) {
            saveData.setData({...saveData.getData(), ...saveData.getQuery()});
            return await this.insert(saveData);
        }
        const select = await this.selectOne(saveData.getQuery());
        if (select?.status) {
            return await this.update(saveData);
        } else {
            saveData.setData({...saveData.getData(), ...saveData.getQuery()});
            return await this.insert(saveData);
        }
    };

    /**
     * Выполнение запроса на удаление записи в источнике данных
     *
     * @param {QueryData} removeData Данные для удаления записи
     */
    public abstract remove(removeData: QueryData): any;

    /**
     * Выполнение произвольного запроса к источнику данных
     *
     * @param {Function} callback Запрос, который необходимо выполнить
     */
    public abstract query(callback: Function): any;

    /**
     * Выполнение запроса на поиск записи записей в источнике данных
     *
     * @param {IQueryData} query Данные для поиска значения
     * @return {Promise<IModelRes>}
     */
    public async selectOne(query: IQueryData | null): Promise<IModelRes | null> {
        if (query) {
            return this.select(query, true);
        }
        return null;
    };

    /**
     * Декодирование текста(Текст становится приемлемым и безопасным для sql запроса).
     *
     * @param {string | number} str Исходный текст
     * @return {string}
     */
    public escapeString(str: string | number): string {
        return str + '';
    }

    /**
     * Проверка подключения к источнику данных.
     * При использовании БД, проверяется статус подключения.
     * Если удалось подключиться, возвращается true, в противном случае false.
     * При сохранении данных в файл, всегда возвращается true.
     *
     * @return {Promise<boolean>}
     */
    public abstract isConnected(): Promise<boolean>;

    /**
     * Удаление подключения к источнику данных
     */
    public destroy(): void {

    };
}
