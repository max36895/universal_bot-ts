/**
 * Модуль базовой модели для работы с данными
 *
 * Предоставляет абстрактный класс для:
 * - Взаимодействия с базой данных
 * - Валидации данных
 * - Управления состоянием модели
 * - Выполнения CRUD операций
 */

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
import { AppContext } from '../../core/AppContext';

/**
 * Абстрактный класс для создания моделей данных
 * Предоставляет базовую функциональность для работы с данными в базе данных
 *
 * @example
 * ```typescript
 * class UserModel extends Model<UserState> {
 *   // Определение правил валидации
 *   rules(): IModelRules[] {
 *     return [
 *       { name: ['username'], type: 'string', max: 50 },
 *       { name: ['age'], type: 'integer' }
 *     ];
 *   }
 *
 *   // Определение меток атрибутов
 *   attributeLabels(): UserState {
 *     return {
 *       id: 'ID',
 *       username: 'Имя пользователя',
 *       age: 'Возраст'
 *     };
 *   }
 *
 *   // Определение имени таблицы
 *   tableName(): string {
 *     return 'users';
 *   }
 * }
 *
 * // Использование модели
 * const user = new UserModel();
 * user.state.username = 'John';
 * user.state.age = 25;
 * await user.save();
 * ```
 *
 * @template TState - Тип состояния модели
 * @class Model
 */
export abstract class Model<TState extends TStateData> {
    /**
     * Контроллер для работы с базой данных
     * Используется для выполнения запросов и управления данными
     *
     * @example
     * ```typescript
     * // Получение данных через контроллер
     * const result = await this.dbController.select(
     *   { where: { id: 1 } },
     *   true
     * );
     * ```
     */
    public dbController: IDbControllerModel | DbController;

    /**
     * Объект для хранения параметров запроса
     * Содержит условия поиска и данные для обновления
     *
     * @example
     * ```typescript
     * // Установка параметров запроса
     * this.queryData.setQuery({ id: 1 });
     * this.queryData.setData({ name: 'John' });
     * ```
     */
    public queryData: QueryData;

    /**
     * Начальный индекс для итерации по данным.
     * Используется при инициализации модели из массива
     */
    public startIndex = 0;

    /**
     * Состояние модели
     * Содержит текущие значения всех атрибутов
     *
     * @example
     * ```typescript
     * // Установка значений
     * this.state.username = 'John';
     * this.state.age = 25;
     *
     * // Получение значений
     * console.log(this.state.username);
     * ```
     */
    public state: Partial<TState> = {};

    /**
     * Контекст приложения.
     */
    protected _appContext: AppContext;

    /**
     * Определяет правила валидации для полей модели
     * Должен быть реализован в дочерних классах
     *
     * @example
     * ```typescript
     * rules(): IModelRules[] {
     *   return [
     *     { name: ['username'], type: 'string', max: 50 },
     *     { name: ['age'], type: 'integer' }
     *   ];
     * }
     * ```
     *
     * @returns Массив правил валидации
     * @virtual
     */
    public abstract rules(): IModelRules[];

    /**
     * Определяет метки атрибутов модели
     * Должен быть реализован в дочерних классах
     *
     * @example
     * ```typescript
     * attributeLabels(): UserState {
     *   return {
     *     id: 'ID',
     *     username: 'Имя пользователя',
     *     age: 'Возраст'
     *   };
     * }
     * ```
     *
     * @returns Объект с метками атрибутов
     * @virtual
     */
    public abstract attributeLabels(): TState;

    /**
     * Определяет имя таблицы в базе данных
     * Должен быть реализован в дочерних классах
     *
     * @example
     * ```typescript
     * tableName(): string {
     *   return 'users';
     * }
     * ```
     *
     * @returns Имя таблицы
     * @virtual
     */
    public abstract tableName(): string;

    /**
     * Создает новый экземпляр модели
     * Инициализирует контроллер базы данных и состояние модели
     *
     * @example
     * ```typescript
     * const user = new UserModel();
     * ```
     */
    protected constructor(appContext: AppContext) {
        this._appContext = appContext;
        if (appContext?.userDbController) {
            this.dbController = appContext.userDbController;
        } else {
            this.dbController = new DbController(appContext);
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
     * Проверяет состояние подключения к базе данных
     *
     * @example
     * ```typescript
     * const isConnected = await model.isConnected();
     * if (isConnected) {
     *   // Выполнение операций с базой данных
     * }
     * ```
     *
     * @returns Promise<boolean> - true если подключение активно
     */
    public async isConnected(): Promise<boolean> {
        return await this.dbController.isConnected();
    }

    /**
     * Экранирует специальные символы в строке
     *
     * @example
     * ```typescript
     * const safe = model.escapeString("O'Connor");
     * ```
     *
     * @param text - Текст для экранирования
     * @returns Экранированная строка
     */
    public escapeString(text: string | number): string {
        if (this.dbController) {
            return this.dbController.escapeString(text);
        }
        return text.toString();
    }

    /**
     * Выполняет валидацию данных модели
     * Может быть переопределен в дочерних классах
     *
     * @example
     * ```typescript
     * validate(): void {
     *   if (!this.state.username) {
     *     throw new Error('Username is required');
     *   }
     * }
     * ```
     */
    public validate(): void {}

    /**
     * Определяет имя первичного ключа таблицы.
     * Ищет поле с меткой 'id' или 'ID'
     *
     * @returns Имя первичного ключа или null
     */
    protected getId(): string | number | null {
        const labels = this.attributeLabels();
        for (const index in labels) {
            if (labels[index] === 'id' || labels[index] === 'ID') {
                return index;
            }
        }
        return null;
    }

    /**
     * Инициализирует модель данными
     *
     * @example
     * ```typescript
     * model.init({
     *   id: 1,
     *   username: 'John',
     *   age: 25
     * });
     * ```
     *
     * @param data - Данные для инициализации
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
     * Выполняет поиск записи по первичному ключу
     *
     * @example
     * ```typescript
     * const result = await model.selectOne();
     * if (result.status) {
     *   model.init(result.data);
     * }
     * ```
     *
     * @returns Promise с результатом запроса
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
     * Инициализирует параметры запроса.
     * Подготавливает данные для сохранения или обновления
     *
     * @private
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
     * Сохраняет данные модели в базу данных
     * Если запись существует - обновляет, иначе создает новую
     *
     * @example
     * ```typescript
     * model.state.name = 'John';
     * await model.save(); // Обновление существующей записи
     * await model.save(true); // Создание новой записи
     * ```
     *
     * @param isNew - Флаг создания новой записи
     * @returns Promise с результатом операции
     */
    public async save(isNew: boolean = false): Promise<any> {
        this._initData();
        return await this.dbController.save(this.queryData, isNew);
    }

    /**
     * Обновляет существующую запись в базе данных
     *
     * @example
     * ```typescript
     * model.state.name = 'John';
     * await model.update();
     * ```
     *
     * @returns Promise с результатом операции
     */
    public async update(): Promise<any> {
        this._initData();
        return await this.dbController.update(this.queryData);
    }

    /**
     * Добавляет новую запись в базу данных
     *
     * @example
     * ```typescript
     * model.state.name = 'John';
     * await model.add();
     * ```
     *
     * @returns Promise с результатом операции
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
     * Удаляет запись из базы данных
     *
     * @example
     * ```typescript
     * await model.remove();
     * ```
     *
     * @returns Promise<boolean> - true если удаление успешно
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
     * Выполняет произвольный запрос к базе данных
     *
     * @param where - Условия запроса
     * @param isOne - Флаг выборки одной записи
     * @returns Promise с результатом запроса
     */
    public async where(where: any = '1', isOne: boolean = false): Promise<IModelRes> {
        const select: IQueryData | null =
            typeof where === 'string' ? QueryData.getQueryData(where) : where;
        return await this.dbController.select(select, isOne);
    }

    /**
     * Выполняет запрос с выборкой одной записи
     *
     * @example
     * ```typescript
     * const found = await model.whereOne({ id: 1 });
     * if (found) {
     *   console.log('Record found');
     * }
     * ```
     *
     * @param where - Условия запроса
     * @returns Promise<boolean> - true если запись найдена
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
     * Выполняет произвольный запрос к базе данных
     *
     * @example
     * ```typescript
     * const result = await model.query(async (client, db) => {
     *   const collection = db.collection('users');
     *   return await collection.aggregate([
     *     { $match: { age: { $gt: 18 } } },
     *     { $group: { _id: '$city', count: { $sum: 1 } } }
     *   ]).toArray();
     * });
     * ```
     *
     * @param callback - Функция обратного вызова для выполнения запроса
     * @returns Результат выполнения запроса
     */
    public query(callback: TQueryCb): any {
        return this.dbController.query(callback);
    }

    /**
     * Закрывает соединение с базой данных
     *
     * @example
     * ```typescript
     * model.destroy();
     * ```
     */
    public destroy(): void {
        this.dbController.destroy();
    }
}
