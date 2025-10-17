import { IQueryData, QueryData } from './QueryData';
import {
    IModelRes,
    IModelRules,
    IDbControllerModel,
    TKey,
    IDbControllerResult,
    TQueryCb,
} from '../interface';
import { AppContext, IAppDB } from '../../core/AppContext';

/**
 * Абстрактный класс для создания контроллеров баз данных
 * Служит прослойкой между логикой приложения и подключением к базе данных
 *
 * @example
 * ```typescript
 * class CustomDbController extends DbControllerModel {
 *   // Реализация абстрактных методов
 *   async select(where: IQueryData | null, isOne: boolean): Promise<IModelRes> {
 *     // Реализация поиска
 *   }
 *
 *   async insert(data: QueryData): Promise<any> {
 *     // Реализация вставки
 *   }
 *
 *   async update(data: QueryData): Promise<any> {
 *     // Реализация обновления
 *   }
 *
 *   async remove(data: QueryData): Promise<boolean> {
 *     // Реализация удаления
 *   }
 *
 *   async query(callback: TQueryCb): Promise<any> {
 *     // Реализация произвольного запроса
 *   }
 *
 *   async isConnected(): Promise<boolean> {
 *     // Проверка подключения
 *   }
 * }
 * ```
 *
 * @class DbControllerModel
 */
export abstract class DbControllerModel implements IDbControllerModel {
    /**
     * Имя таблицы в базе данных.
     * Используется для выполнения запросов
     */
    protected _tableName: string;

    /**
     * Правила валидации для полей таблицы.
     * Определяют типы и ограничения для каждого поля
     */
    protected _rules: IModelRules[];

    /**
     * Конфигурация подключения к базе данных.
     * Содержит параметры для установки соединения
     */
    protected _connectConfig: IAppDB | undefined;

    /**
     * Имя первичного ключа таблицы
     * По умолчанию 'id'
     *
     * @defaultValue id
     */
    protected _primaryKeyName: TKey;

    /**
     * Контекст приложения
     */
    protected _appContext: AppContext | undefined;

    /**
     * Создает новый экземпляр контроллера
     * Инициализирует базовые параметры
     *
     * @example
     * ```typescript
     * const controller = new CustomDbController();
     * ```
     */
    protected constructor(appContext?: AppContext) {
        this._tableName = '';
        this._primaryKeyName = 'id';
        this._rules = [];
        this._connectConfig = appContext?.appConfig.db;
        this._appContext = appContext;
    }

    /**
     * Устанавливает контекст приложения
     * @param appContext
     */
    public setAppContext(appContext: AppContext): void {
        this._appContext = appContext;
    }

    /**
     * Устанавливает имя таблицы
     *
     * @example
     * ```typescript
     * controller.tableName = 'users';
     * ```
     *
     * @param tableName - Имя таблицы
     */
    public set tableName(tableName: string) {
        this._tableName = tableName;
    }

    /**
     * Возвращает имя таблицы
     *
     * @example
     * ```typescript
     * const table = controller.tableName;
     * ```
     *
     * @returns Имя таблицы
     */
    public get tableName(): string {
        return this._tableName;
    }

    /**
     * Устанавливает имя первичного ключа
     *
     * @example
     * ```typescript
     * controller.primaryKeyName = '_id';
     * ```
     *
     * @param primaryKey - Имя первичного ключа
     */
    public set primaryKeyName(primaryKey: TKey) {
        this._primaryKeyName = primaryKey;
    }

    /**
     * Возвращает имя первичного ключа
     *
     * @example
     * ```typescript
     * const keyName = controller.primaryKeyName;
     * ```
     *
     * @returns Имя первичного ключа
     */
    public get primaryKeyName(): TKey {
        return this._primaryKeyName;
    }

    /**
     * Устанавливает правила валидации для полей
     *
     * @example
     * ```typescript
     * controller.setRules([
     *   { name: ['username'], type: 'string', max: 50 },
     *   { name: ['age'], type: 'integer' }
     * ]);
     * ```
     *
     * @param rules - Массив правил валидации
     */
    public setRules(rules: IModelRules[]): void {
        this._rules = rules;
    }

    /**
     * Преобразует результат запроса в требуемый формат
     *
     * @example
     * ```typescript
     * const result = await controller.select({ id: 1 });
     * const value = controller.getValue(result);
     * console.log(value.username); // John
     * ```
     *
     * @param res - Результат выполнения запроса
     * @returns Объект с данными или null
     */
    public getValue(res: IModelRes): IDbControllerResult | null {
        if (res && res.status) {
            return res.data;
        }
        return null;
    }

    /**
     * Выполняет поиск записей в источнике данных
     * Должен быть реализован в дочерних классах
     *
     * @example
     * ```typescript
     * // Реализация в дочернем классе
     * async select(where: IQueryData | null, isOne: boolean): Promise<IModelRes> {
     *   // Логика поиска
     * }
     * ```
     *
     * @param select - Условия поиска
     * @param isOne - Флаг выборки одной записи
     * @returns Promise с результатом запроса
     * @virtual
     */
    public abstract select(select: IQueryData | null, isOne: boolean): Promise<IModelRes>;

    /**
     * Добавляет новую запись в источник данных
     * Должен быть реализован в дочерних классах
     *
     * @example
     * ```typescript
     * // Реализация в дочернем классе
     * async insert(data: QueryData): Promise<any> {
     *   // Логика вставки
     * }
     * ```
     *
     * @param insertData - Данные для добавления
     * @virtual
     */
    public abstract insert(insertData: QueryData): any;

    /**
     * Обновляет существующую запись в источнике данных
     * Должен быть реализован в дочерних классах
     *
     * @example
     * ```typescript
     * // Реализация в дочернем классе
     * async update(data: QueryData): Promise<any> {
     *   // Логика обновления
     * }
     * ```
     *
     * @param updateData - Данные для обновления
     * @virtual
     */
    public abstract update(updateData: QueryData): any;

    /**
     * Сохраняет запись в источник данных
     * Если запись существует - обновляет, иначе создает новую
     *
     * @example
     * ```typescript
     * const queryData = new QueryData();
     * queryData.setData({ username: 'John' });
     * queryData.setQuery({ id: 1 });
     * await controller.save(queryData);
     * ```
     *
     * @param saveData - Данные для сохранения
     * @param isNew - Флаг создания новой записи
     * @returns Promise с результатом операции
     */
    public async save(saveData: QueryData, isNew: boolean): Promise<any> {
        if (isNew) {
            saveData.setData({ ...saveData.getData(), ...saveData.getQuery() });
            return await this.insert(saveData);
        }
        const select = await this.selectOne(saveData.getQuery());
        if (select?.status) {
            return await this.update(saveData);
        } else {
            saveData.setData({ ...saveData.getData(), ...saveData.getQuery() });
            return await this.insert(saveData);
        }
    }

    /**
     * Удаляет запись из источника данных
     * Должен быть реализован в дочерних классах
     *
     * @example
     * ```typescript
     * // Реализация в дочернем классе
     * async remove(data: QueryData): Promise<boolean> {
     *   // Логика удаления
     * }
     * ```
     *
     * @param removeData - Данные для удаления
     * @virtual
     */
    public abstract remove(removeData: QueryData): any;

    /**
     * Выполняет произвольный запрос к источнику данных
     * Должен быть реализован в дочерних классах
     *
     * @example
     * ```typescript
     * // Реализация в дочернем классе
     * async query(callback: TQueryCb): Promise<any> {
     *   // Логика выполнения запроса
     * }
     * ```
     *
     * @param callback - Функция обратного вызова для выполнения запроса
     * @virtual
     */
    public abstract query(callback: TQueryCb): any;

    /**
     * Выполняет поиск одной записи в источнике данных
     *
     * @example
     * ```typescript
     * const result = await controller.selectOne({ id: 1 });
     * if (result?.status) {
     *   console.log('Record found');
     * }
     * ```
     *
     * @param query - Условия поиска
     * @returns Promise с результатом запроса или null
     */
    public async selectOne(query: IQueryData | null): Promise<IModelRes | null> {
        if (query) {
            return this.select(query, true);
        }
        return null;
    }

    /**
     * Экранирует специальные символы в строке
     *
     * @example
     * ```typescript
     * const safe = controller.escapeString("O'Connor");
     * ```
     *
     * @param str - Текст для экранирования
     * @returns Экранированная строка
     */
    public escapeString(str: string | number): string {
        return str + '';
    }

    /**
     * Проверяет состояние подключения к источнику данных
     * Должен быть реализован в дочерних классах
     *
     * @example
     * ```typescript
     * // Реализация в дочернем классе
     * async isConnected(): Promise<boolean> {
     *   // Логика проверки подключения
     * }
     * ```
     *
     * @returns Promise<boolean> - true если подключение активно
     * @virtual
     */
    public abstract isConnected(): Promise<boolean>;

    /**
     * Закрывает соединение с источником данных
     *
     * @example
     * ```typescript
     * controller.destroy();
     * ```
     */
    public destroy(): void {}
}
