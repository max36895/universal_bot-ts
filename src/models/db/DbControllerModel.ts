import {IAppDB, mmApp} from "../../core/mmApp";
import {IQueryData, QueryData} from "./QueryData";
import {IModelRules, IModelRes} from "../interface/IModel";

type TKey = string | number

export interface IDbControllerResult {
    [keyStr: string]: any;

    [keyInt: number]: any;
}

/**
 * Абстрактный класс служащий прослойкой между логикой ядра и подключением к БД.
 * Необходим для корректной настройки контролла, отвечающего за сохранение пользовательских данных.
 * Все прикладные контроллы должны быть унаследованы от него.
 */
export abstract class DbControllerModel {
    /**
     * Название таблицы
     * @var
     */
    public tableName: string;

    /**
     * Правила для полей бд. Указывается тип каждого поля.
     * @var
     */
    protected _rules: IModelRules[];

    /**
     * Конфигурация для настройки подключения к БД.
     * @var
     */
    protected _connectConfig: IAppDB;

    /**
     * Название поля, которое является уникальным ключом
     */
    protected _primaryKeyName: TKey;

    protected constructor() {
        this._connectConfig = mmApp.config.db;
    }

    /**
     * Установить имя уникального ключа
     * @param {string | number} primaryKey
     */
    public set primaryKeyName(primaryKey: TKey) {
        this._primaryKeyName = primaryKey;
    }

    /**
     * Получить имя уникального ключа
     * @return {string | number}
     */
    public get primaryKeyName(): TKey {
        return this._primaryKeyName;
    }

    /**
     * Установить правила для полей
     * @param {IModelRules[]} rules
     */
    public setRules(rules: IModelRules[]) {
        this._rules = rules;
    }

    /**
     * Приводим полученный результат к требуемому типу.
     * В качестве результата должен вернуться объект вида:
     * {
     *    key: value
     * }
     * где key - порядковый номер поля(0, 1... 3), либо название поля. Рекомендуется использовать имя поля. Важно чтобы имя поля было указано в rules, имена не входящие в rules будут проигнорированы.
     * value - значение поля.
     * @param {IModelRes} res Результат выполнения запроса
     * @return {IDbControllerResult}
     */
    public abstract getValue(res: IModelRes): IDbControllerResult;

    /**
     * Выполнение запроса на поиск записей в таблице
     *
     * @param {IQueryData} select Данные для поиска значения
     * @param {boolean} isOne Вывести только 1 запись.
     * @return {Promise<IModelRes>}
     */
    public abstract select(select: IQueryData, isOne: boolean): Promise<IModelRes>;

    /**
     * Выполнение запроса на добавление записи в таблицу
     *
     * @param {QueryData} insertData Данные для добавления записи
     */
    public abstract insert(insertData: QueryData);

    /**
     * Выполнение запроса на обновление записи в таблице
     *
     * @param {QueryData} updateData Данные для обновления записи
     */
    public abstract update(updateData: QueryData);

    /**
     * Выполнение запроса на сохранения записи.
     * Обновление записи происходит в том случае, если запись присутствует в таблице.
     * Иначе будет добавлена новая запись.
     *
     * @param {QueryData} saveData Данные для сохранения записи
     * @param {boolean} isNew В любом случае выполнить добавление записи
     */
    public abstract save(saveData: QueryData, isNew: boolean);

    /**
     * Выполнение запроса на удаление записи в таблице
     *
     * @param {QueryData} removeData Данные для удаления записи
     */
    public abstract remove(removeData: QueryData);

    /**
     * Выполнение произвольного запроса к таблице
     *
     * @param {Function} callback Запрос, который необходимо выполнить
     */
    public abstract query(callback: Function);

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
     * Проверка подключения к Базе Данных.
     * При использовании БД, проверяется статус подключения.
     * Если удалось подключиться, возвращается true, в противном случае false.
     * При сохранении данных в файл, всегда возвращается true.
     *
     * @return {Promise<boolean>}
     */
    public abstract isConnected();

    /**
     * Удаление подключения к таблице
     */
    public destroy(): void {

    };
}
