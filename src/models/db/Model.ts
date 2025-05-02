import { mmApp } from '../../mmApp';
import {
    IModelRes,
    IModelRules,
    IDbControllerModel,
    IDbControllerResult,
    TStateData,
    TQueryCb,
} from '../interface';
import { IQueryData, QueryData } from './QueryData';
import { DbController } from './DbController';
import { ProxyUtils } from './ProxyUtils';

/**
 * @class Model
 *
 * Абстрактный класс для моделей. Все Модели, взаимодействующие с бд наследуют его.
 */
export abstract class Model<TState extends TStateData> {
    /**
     * Модель для работы с БД
     */
    public dbController: IDbControllerModel | DbController;
    /**
     * Поля запроса.
     */
    public queryData: QueryData;
    /**
     * Стартовое значение для индекса.
     */
    public startIndex = 0;
    /**
     * Состояние модели.
     */
    public state: Partial<TState> = {};

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
    public abstract attributeLabels(): TState;

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
        this.queryData = new QueryData();
        Object.keys(this.attributeLabels()).forEach((key) => {
            this.state[key as keyof TState] = undefined;
        });
        return ProxyUtils(this);
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
     */
    public escapeString(text: string | number): string {
        return this.dbController.escapeString(text);
    }

    /**
     * Валидация значений полей для таблицы.
     */
    public validate(): void {}

    /**
     * Возвращаем название уникального ключа таблицы.
     *
     * @return number|string
     */
    protected getId(): string | number | null {
        const labels = this.attributeLabels();
        let key = null;
        for (const index in labels) {
            if (labels[index] === 'id' || labels[index] === 'ID') {
                key = index;
                return index;
            }
        }
        return key;
    }

    /**
     * Инициализация данных для модели.
     *
     * @param data Массив с данными.
     */
    public init(data: IDbControllerResult[] | IDbControllerResult | null): void {
        if (data === null) {
            return;
        }
        let i = this.startIndex;
        const labels = this.attributeLabels();

        for (const index in labels) {
            if (data) {
                if (typeof (data as IDbControllerResult)[index] !== 'undefined') {
                    this.state[index as keyof TState] = (data as IDbControllerResult)[
                        index
                    ] as TState[keyof TState];
                } else if (typeof data[i] !== 'undefined') {
                    this.state[index] = data[i] as TState[keyof TState];
                } else {
                    this.state[index] = '' as TState[keyof TState];
                }
            } else {
                this.state[index] = '' as TState[keyof TState];
            }
            i++;
        }
    }

    /**
     * Выполнение запроса с поиском по уникальному ключу.
     *
     * @return {Promise<IModelRes>}
     */
    public async selectOne(): Promise<IModelRes> {
        const idName = this.dbController.primaryKeyName;
        if (idName) {
            this.queryData.setQuery({
                [idName]: this.state[idName],
            });
        }
        this.queryData.setData(null);
        return await this.dbController.select(this.queryData.getQuery(), true);
    }

    /**
     * Инициализация параметров для запроса
     */
    private _initData(): void {
        this.validate();
        const idName = this.dbController.primaryKeyName;
        if (idName) {
            this.queryData.setQuery({
                [idName]: this.state[idName],
            });
        }
        const data: IQueryData = {};
        for (const index in this.attributeLabels()) {
            if (index !== idName) {
                data[index] = this.state[index];
            }
        }
        this.queryData.setData(data);
    }

    /**
     * Сохранение значения в базу данных.
     * Если значение уже есть в базе данных, то данные обновятся. Иначе добавляется новое значение.
     *
     * @param {boolean} isNew Добавить новую запись в базу данных без поиска по ключу.
     * @return {Promise<Object>}
     */
    public async save(isNew: boolean = false): Promise<any> {
        this._initData();
        return await this.dbController.save(this.queryData, isNew);
    }

    /**
     * Обновление значения в таблице.
     *
     * @return {Promise<Object>}
     */
    public async update(): Promise<any> {
        this._initData();
        return await this.dbController.update(this.queryData);
    }

    /**
     * Добавление значения в таблицу.
     *
     * @return {Promise<Object>}
     */
    public async add(): Promise<any> {
        this.validate();
        this.queryData.setQuery(null);
        const data: IQueryData = {};
        for (const index in this.attributeLabels()) {
            data[index] = this.state[index];
        }
        this.queryData.setData(data);
        return await this.dbController.insert(this.queryData);
    }

    /**
     * Удаление значения из таблицы.
     *
     * @return {Promise<boolean>}
     */
    public async remove(): Promise<boolean> {
        this.validate();
        const idName = this.dbController.primaryKeyName;
        if (idName) {
            this.queryData.setQuery({
                [idName]: this.state[idName],
            });
        }
        this.queryData.setData(null);
        return await this.dbController.remove(this.queryData);
    }

    /**
     * Выполнение запроса к данным.
     *
     * @param where Запрос к таблице.
     * @param {boolean} isOne Вывести только 1 результат. Используется только при поиске по файлу.
     * @return {Promise<IModelRes>}
     */
    public async where(where: any = '1', isOne: boolean = false): Promise<IModelRes> {
        const select: IQueryData | null =
            typeof where === 'string' ? QueryData.getQueryData(where) : where;
        return await this.dbController.select(select, isOne);
    }

    /**
     * Выполнение запроса и инициализация переменных в случае успешного запроса.
     *
     * @param where Запрос к таблице.
     * @return {Promise<boolean>}
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
     */
    public query(callback: TQueryCb): any {
        return this.dbController.query(callback);
    }

    /**
     * Удаление подключения к БД
     */
    public destroy(): void {
        this.dbController.destroy();
    }
}
