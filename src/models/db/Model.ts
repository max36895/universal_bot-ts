import {mmApp} from '../../mmApp';
import {IModelRes, IModelRules, ILabelAttr, IDbControllerModel, IDbControllerResult} from '../interface';
import {IQueryData, QueryData} from './QueryData';
import {DbController} from './DbController';

/**
 * @class Model
 *
 * Абстрактный класс для моделей. Все Модели, взаимодействующие с бд наследуют его.
 */
export abstract class Model implements IDbControllerResult {
    public dbController: IDbControllerModel;
    public queryData: QueryData;
    /**
     * Стартовое значение для индекса.
     */
    public startIndex = 0;

    /**
     * Правила для обработки полей. Где 1 - Элемент это название поля, 2 - Элемент тип поля, max - Максимальная длина.
     *
     * @return IModelRules[]
     * @virtual
     */
    public abstract rules(): IModelRules[];

    /**
     * Массив с полями таблицы, где ключ это название поля, а значение краткое описание.
     * Для уникального ключа использовать значение ID.
     *
     * @return object
     * @virtual
     */
    public abstract attributeLabels(): ILabelAttr;

    /**
     * Название таблицы/файла с данными.
     *
     * @return string
     * @virtual
     */
    public abstract tableName(): string;

    /**
     * Model constructor.
     */
    protected constructor() {
        if (mmApp.userDbController) {
            this.dbController = mmApp.userDbController;
        } else {
            this.dbController = new DbController();
        }
        this.dbController.tableName = this.tableName();
        this.dbController.setRules(this.rules());
        this.dbController.primaryKeyName = this.getId();
        this.queryData = new QueryData;
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
        return await this.dbController.isConnected();
    }

    /**
     * Декодирование текста(Текст становится приемлемым и безопасным для sql запроса).
     *
     * @param {string | number} text Исходный текст.
     * @return string
     * @api
     */
    public escapeString(text: string | number): string {
        return this.dbController.escapeString(text);
    }

    /**
     * Валидация значений полей для таблицы.
     * @api
     */
    public validate(): void {
    }

    /**
     * Возвращаем название уникального ключа таблицы.
     *
     * @return number|string
     */
    protected getId(): string | number | null {
        const labels = this.attributeLabels();
        let key = null;
        Object.keys(labels).forEach((index) => {
            // @ts-ignore
            if (labels[index] === 'id' || labels[index] === 'ID') {
                key = index;
                return index;
            }
        });
        return key;
    }

    /**
     * Инициализация данных для модели.
     *
     * @param data Массив с данными.
     * @api
     */
    public init(data: IDbControllerResult[] | IDbControllerResult | null): void {
        if (data === null) {
            return;
        }
        let i = this.startIndex;
        const labels = this.attributeLabels();
        Object.keys(labels).forEach((index) => {
            if (data) {
                // @ts-ignore
                if (typeof data[index] !== 'undefined') {
                    // @ts-ignore
                    this[index] = data[index];
                } else if (typeof data[i] !== 'undefined') {
                    // @ts-ignore
                    this[index] = data[i];
                } else {
                    // @ts-ignore
                    this[index] = '';
                }
            } else {
                // @ts-ignore
                this[index] = '';
            }
            i++;
        })
    }

    /**
     * Выполнение запроса с поиском по уникальному ключу.
     *
     * @return {Promise<IModelRes>}
     * @api
     */
    public async selectOne(): Promise<IModelRes> {
        const idName = this.dbController.primaryKeyName;
        this.queryData.setQuery({
            // @ts-ignore
            [idName]: this[idName]
        });
        this.queryData.setData(null);
        return await this.dbController.select(this.queryData.getQuery(), true);
    }

    /**
     * Инициализация параметров для запроса
     */
    private _initData(): void {
        this.validate();
        const idName = this.dbController.primaryKeyName;
        this.queryData.setQuery({
            // @ts-ignore
            [idName]: this[idName]
        });
        const data: IQueryData = {};
        Object.keys(this.attributeLabels()).forEach((index) => {
            if (index !== idName) {
                // @ts-ignore
                data[index] = this[index];
            }
        });
        this.queryData.setData(data);
    }

    /**
     * Сохранение значения в базу данных.
     * Если значение уже есть в базе данных, то данные обновятся. Иначе добавляется новое значение.
     *
     * @param {boolean} isNew Добавить новую запись в базу данных без поиска по ключу.
     * @return {Promise<Object>}
     * @api
     */
    public async save(isNew: boolean = false): Promise<any> {
        this._initData();
        return await this.dbController.save(this.queryData, isNew);
    }

    /**
     * Обновление значения в таблице.
     *
     * @return {Promise<Object>}
     * @api
     */
    public async update(): Promise<any> {
        this._initData();
        return await this.dbController.update(this.queryData);
    }

    /**
     * Добавление значения в таблицу.
     *
     * @return {Promise<Object>}
     * @api
     */
    public async add(): Promise<any> {
        this.validate();
        this.queryData.setQuery(null);
        const data: IQueryData = {};
        Object.keys(this.attributeLabels()).forEach((index) => {
            // @ts-ignore
            data[index] = this[index];
        });
        this.queryData.setData(data);
        return await this.dbController.insert(this.queryData);
    }

    /**
     * Удаление значения из таблицы.
     *
     * @return {Promise<boolean>}
     * @api
     */
    public async remove(): Promise<boolean> {
        this.validate();
        const idName = this.dbController.primaryKeyName;
        this.queryData.setQuery({
            // @ts-ignore
            [idName]: this[idName]
        });
        this.queryData.setData(null);
        return await this.dbController.remove(this.queryData);
    }

    /**
     * Выполнение запроса к данным.
     *
     * @param where Запрос к таблице.
     * @param {boolean} isOne Вывести только 1 результат. Используется только при поиске по файлу.
     * @return {Promise<IModelRes>}
     * @api
     */
    public async where(where: any = '1', isOne: boolean = false): Promise<IModelRes> {
        let select: IQueryData | null;
        if (typeof where === 'string') {
            select = QueryData.getQueryData(where);
        } else {
            select = where;
        }
        return await this.dbController.select(select, isOne);
    }

    /**
     * Выполнение запроса и инициализация переменных в случае успешного запроса.
     *
     * @param where Запрос к таблице.
     * @return {Promise<boolean>}
     * @api
     */
    public async whereOne(where: any = '1'): Promise<boolean> {
        const res = await this.where(where, true);
        if (res && res.status) {
            this.init(this.dbController.getValue(res));
            return true;
        }
        return false;
    }

    /**
     * Выполнение произвольного запрос к базе данных.
     *
     * @param {Function} callback Непосредственно запрос к бд.
     * @return {Object|Object[]}
     * @api
     */
    public query(callback: Function): any {
        return this.dbController.query(callback);
    }

    /**
     * Удаление подключения к БД
     */
    public destroy(): void {
        this.dbController.destroy();
    }
}
