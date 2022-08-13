import {DbControllerModel, IDbControllerResult, TKey} from "./DbControllerModel";
import {mmApp} from "../../core/mmApp";
import {IQueryData, QueryData} from "./QueryData";
import {IModelRes, IModelRules} from "../interface/IModel";
import {DbControllerFile} from "./DbControllerFile";
import {DbControllerMongoDb} from "./DbControllerMongoDb";

/**
 * Контроллер, позволяющий работать с данными.
 * В зависимости от конфигурации приложения, автоматически подключает нужный источник данных.
 *
 * @see DbControllerFile
 * @see DbControllerMongoDb
 */
export class DbController extends DbControllerModel {
    private _controller: DbControllerFile | DbControllerMongoDb;

    constructor() {
        super();
        if (mmApp.isSaveDb) {
            this._controller = new DbControllerMongoDb();
        } else {
            this._controller = new DbControllerFile();
        }
    }

    public setRules(rules: IModelRules[]) {
        super.setRules(rules);
        this._controller.setRules(rules);
    }

    /**
     * Устанавливает имя уникального ключа
     * @param {string | number} primaryKey
     */
    public set primaryKeyName(primaryKey: TKey) {
        this._primaryKeyName = primaryKey;
        this._controller.primaryKeyName = primaryKey;
    }

    /**
     * Возвращает имя уникального ключа
     */
    public get primaryKeyName(): TKey {
        return this._controller.primaryKeyName;
    }

    /**
     * Устанавливает имя таблицы
     * @param tableName
     */
    public set tableName(tableName: string) {
        super.tableName = tableName;
        this._controller.tableName = tableName;
    }

    /**
     * Возвращает имя таблицы
     */
    public get tableName(): string {
        return this._controller.tableName;
    }

    /**
     * Выполнение запроса на сохранения записи.
     * Обновление записи происходит в том случае, если запись присутствует в источнике данных.
     * Иначе будет добавлена новая запись.
     *
     * @param {QueryData} queryData Данные для сохранения записи
     * @param {boolean} isNew Определяет необходимость добавления новой записи
     * @return {Promise<Object>}
     * @api
     */
    public async save(queryData: QueryData, isNew: boolean = false): Promise<any> {
        return this._controller?.save(queryData, isNew);
    }

    /**
     * Наличие записи в таблице
     *
     * @param {IQueryData} query Запрос
     * @return {Promise<boolean>}
     */
    public async isSelected(query: IQueryData | null): Promise<boolean> {
        return !!(await this._controller.selectOne(query))?.status
    }

    /**
     * Выполнение запроса на обновление записи в источнике данных
     *
     * @param {QueryData} updateQuery Данные для обновления записи
     * @return {Promise<Object>}
     * @api
     */
    public async update(updateQuery: QueryData): Promise<any> {
        return this._controller.update(updateQuery);
    }

    /**
     * Выполнение запроса на добавление записи в источник данных
     *
     * @param {QueryData} insertQuery Данные для добавления записи
     * @return {Promise<Object>}
     * @api
     */
    public async insert(insertQuery: QueryData): Promise<any> {
        return this._controller.insert(insertQuery);
    }

    /**
     * Выполнение запроса на удаление записи в источнике данных
     *
     * @param {QueryData} removeQuery Данные для удаления записи
     * @return {Promise<boolean>}
     * @api
     */
    public async remove(removeQuery: QueryData): Promise<boolean> {
        return this._controller.remove(removeQuery);
    }

    /**
     * Выполнение произвольного запроса к источнику данных
     *
     * @param {Function} callback Запрос, который необходимо выполнить
     * @return {Object|Object[]}
     * @api
     */
    public query(callback: Function): any {
        return this._controller.query(callback);
    }

    /**
     * Валидация значений полей для таблицы.
     *
     * @param {IQueryData} element
     * @api
     */
    public validate(element: IQueryData | null): IQueryData {
        return this._controller.validate(element);
    }

    /**
     * Выполнение запроса на поиск записей в источнике данных
     *
     * @param {IQueryData} where Данные для поиска значения
     * @param {boolean} isOne Вывести только 1 запись.
     * @return {Promise<IModelRes>}
     */
    public async select(where: IQueryData, isOne: boolean = false): Promise<IModelRes> {
        return this._controller.select(where, isOne);
    }

    /**
     * Приводит полученный результат к требуемому типу.
     * В качестве результата должен вернуться объект вида:
     * {
     *    key: value
     * }
     * где key - порядковый номер поля(0, 1... 3), либо название поля. Рекомендуется использовать имя поля. Важно чтобы имя поля было указано в rules, имена не входящие в rules будут проигнорированы.
     * value - значение поля.
     *
     * @param {IModelRes} res Результат выполнения запроса
     * @return {IDbControllerResult}
     */
    public getValue(res: IModelRes): IDbControllerResult | null {
        return this._controller.getValue(res);
    }

    /**
     * Удаление подключения к БД
     */
    public destroy(): void {
        this._controller.destroy();
    }

    /**
     * Декодирование текста(Текст становится приемлемым и безопасным для sql запроса).
     *
     * @param {string | number} text Исходный текст.
     * @return string
     * @api
     */
    public escapeString(text: string | number): string {
        return this._controller.escapeString(text);
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
        return this._controller.isConnected();
    }
}
