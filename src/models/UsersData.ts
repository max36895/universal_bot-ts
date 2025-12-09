import { Model } from './db/Model';
import { IModelRes, IModelRules } from './interface';
import { AppContext } from '../core/AppContext';

/**
 * Интерфейс для внутреннего состояния модели пользовательских данных.
 * Определяет структуру данных для хранения информации о пользователях в базе данных.
 */
export interface IUserDataModelState {
    /**
     * Идентификатор пользователя.
     * Уникальный идентификатор пользователя в конкретной платформе.
     * @example "123456789" для Telegram, "user_123456" для VK
     */
    userId: string;
    /**
     * Метаданные пользователя в JSON.
     * Содержит дополнительную информацию о пользователе, такую как статистика использования,
     * настройки, временные метки и т.д.
     * @example { "lastVisit": "2024-03-20T12:00:00Z", "usageCount": 42 }
     */
    meta: string;
    /**
     * Пользовательские данные в JSON.
     * Содержит основное состояние пользователя, например, прогресс в игре,
     * сохраненные настройки, историю действий и т.д.
     * @example { "progress": 75, "settings": { "notifications": true } }
     */
    data: string;
    /**
     * Тип платформы.
     * Определяет, на какой платформе зарегистрирован пользователь.
     * @see UsersData.T_ALISA
     * @see UsersData.T_VK
     * @see UsersData.T_TELEGRAM
     * @see UsersData.T_VIBER
     * @see UsersData.T_MARUSIA
     * @see UsersData.T_SMART_APP
     * @see UsersData.T_MAX_APP
     * @see UsersData.T_USER_APP
     */
    type: string;
}

/**
 * Модель для работы с пользовательскими данными.
 * Предоставляет единый интерфейс для работы с данными пользователей во всех поддерживаемых платформах.
 *
 * @class UsersData
 * @extends Model<IUserDataState>
 *
 * Основные возможности:
 * - Сохранение состояния пользователя между сессиями
 * - Хранение метаданных (например, статистика использования)
 * - Поддержка как файлового хранилища, так и БД
 * - Автоматическая сериализация/десериализация данных
 *
 * @example
 * Сохранение прогресса пользователя:
 * ```typescript
 * class GameController extends BotController {
 *   public async action(intentName: string): Promise<void> {
 *     // Загрузка данных пользователя
 *     const userData = new UsersData();
 *     userData.userId = this.userId;
 *
 *     // Если есть сохраненные данные - загружаем их
 *     if (await userData.getOne()) {
 *       const progress = userData.data.progress || 0;
 *       this.text = `Ваш текущий прогресс: ${progress}%`;
 *     } else {
 *       // Создаем новые данные
 *       userData.data = { progress: 0 };
 *       userData.meta = { firstVisit: new Date() };
 *       await userData.save();
 *       this.text = 'Добро пожаловать в игру!';
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * Работа с разными платформами:
 * ```typescript
 * const userData = new UsersData();
 *
 * // Для Алисы
 * userData.type = UsersData.T_ALISA;
 *
 * // Для Telegram
 * userData.type = UsersData.T_TELEGRAM;
 *
 * // Автоматическое определение типа из appContext
 * userData.type = this.AppContext.appType === 'alisa'
 *   ? UsersData.T_ALISA
 *   : UsersData.T_TELEGRAM;
 * ```
 */
export class UsersData extends Model<IUserDataModelState> {
    /**
     * Название таблицы для хранения данных пользователей.
     * @readonly
     */
    public static readonly TABLE_NAME = 'UsersData';

    /**
     * Константы для определения типа платформы.
     * Используются для указания, на какой платформе зарегистрирован пользователь.
     */
    /** Тип платформы: Яндекс.Алиса */
    public static readonly T_ALISA = 0;
    /** Тип платформы: ВКонтакте */
    public static readonly T_VK = 1;
    /** Тип платформы: Telegram */
    public static readonly T_TELEGRAM = 2;
    /** Тип платформы: Viber */
    public static readonly T_VIBER = 3;
    /** Тип платформы: Маруся */
    public static readonly T_MARUSIA = 4;
    /** Тип платформы: Сбер SmartApp */
    public static readonly T_SMART_APP = 5;
    /**
     * Тип платформы: Max
     * */
    public static readonly T_MAX_APP = 6;
    /** Тип платформы: Пользовательское приложение */
    public static readonly T_USER_APP = 512;

    /**
     * Уникальный идентификатор пользователя.
     * Может быть строкой или числом в зависимости от платформы.
     * @example "123456789" для Telegram, 123456789 для VK
     */
    public userId: string | number | null;

    /**
     * Метаданные пользователя.
     * Может содержать любые дополнительные данные о пользователе, такие как:
     * - Статистика использования
     * - Временные метки
     * - Настройки пользователя
     * - Дополнительная информация
     * @remarks При сохранении в БД автоматически преобразуется в JSON строку
     */
    public meta: any;

    /**
     * Основные данные пользователя.
     * Содержит основное состояние пользователя, например:
     * - Прогресс в игре
     * - Сохраненные настройки
     * - История действий
     * - Другие пользовательские данные
     * @remarks При сохранении в БД автоматически преобразуется в JSON строку
     */
    public data: any;

    /**
     * Тип платформы пользователя.
     * Определяет платформу, с которой работает пользователь.
     * @see T_ALISA, T_VK, T_TELEGRAM и другие константы типов
     * @remarks Возможные значения:
     * - T_ALISA (0) - Яндекс.Алиса
     * - T_VK (1) - ВКонтакте
     * - T_TELEGRAM (2) - Telegram
     * - T_VIBER (3) - Viber
     * - T_MARUSIA (4) - Маруся
     * - T_SMART_APP (5) - Сбер SmartApp
     * - T_MAX_APP (6) - Max
     * - T_USER_APP (512) - Пользовательское приложение
     */
    public type: number;

    /**
     * Создает экземпляр модели пользовательских данных.
     * Инициализирует все поля значениями по умолчанию.
     *
     * @example
     * ```typescript
     * const userData = new UsersData();
     * userData.userId = 'user123';
     * userData.type = UsersData.T_TELEGRAM;
     * ```
     */
    public constructor(appContext: AppContext) {
        super(appContext);
        this.userId = null;
        this.meta = null;
        this.data = null;
        this.type = UsersData.T_ALISA;
    }

    /**
     * Возвращает название таблицы/файла для хранения данных.
     *
     * @return {string} Название таблицы для хранения данных пользователей
     */
    public tableName(): string {
        return UsersData.TABLE_NAME;
    }

    /**
     * Определяет правила валидации полей модели.
     *
     * @return {IModelRules[]} Массив правил валидации
     */
    public rules(): IModelRules[] {
        return [
            {
                name: ['userId'],
                type: 'string',
                max: 250,
            },
            {
                name: ['meta', 'data'],
                type: 'text',
            },
            {
                name: ['type'],
                type: 'integer',
            },
        ];
    }

    /**
     * Возвращает описания атрибутов модели.
     * Используется для отображения понятных названий полей.
     *
     * @return {IUserDataModelState} Описания атрибутов
     */
    public attributeLabels(): IUserDataModelState {
        return {
            userId: 'ID',
            meta: 'User meta data',
            data: 'User Data',
            type: 'Type',
        };
    }

    /**
     * Ищет одну запись в хранилище по текущим параметрам.
     *
     * @return {Promise<boolean>} true, если запись найдена
     *
     * @example
     * ```typescript
     * const userData = new UsersData();
     * userData.userId = 'user123';
     * if (await userData.getOne()) {
     *   console.log('Пользователь найден:', userData.data);
     * } else {
     *   console.log('Пользователь не найден');
     * }
     * ```
     */
    public async getOne(): Promise<boolean> {
        const query: IModelRes | any = await this.selectOne();
        if (query && query.status) {
            this.init(this.dbController.getValue(query));
            return true;
        }
        return false;
    }

    private safeStringify(obj: Record<string, unknown>): string {
        const seen = new WeakSet();
        return JSON.stringify(obj, (_, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) return '[Circular]';
                seen.add(value);
            }
            return value;
        });
    }

    /**
     * Валидирует значения перед сохранением.
     * Преобразует объекты meta и data в JSON при сохранении в БД.
     *
     * @throws {Error} Если данные не прошли валидацию
     *
     * @example
     * ```typescript
     * userData.meta = { lastVisit: new Date() };
     * userData.data = { progress: 75 };
     * userData.validate(); // meta и data будут преобразованы в JSON
     * ```
     */
    public validate(): void {
        if (this._appContext?.isSaveDb) {
            if (typeof this.meta !== 'string') {
                this.meta = this.safeStringify(this.meta);
            }
            if (typeof this.data !== 'string') {
                this.data = this.safeStringify(this.data);
            }
        }
        super.validate();
    }

    /**
     * Инициализирует модель данными.
     * Преобразует JSON строки meta и data в объекты при загрузке из БД.
     *
     * @param {any} data - Данные для инициализации
     * @remarks
     * - При парсинге data, ошибки игнорируются для обеспечения обратной совместимости
     * - Парсинг происходит только если включено сохранение в БД (appContext.isSaveDb === true)
     *
     * @example
     * ```typescript
     * const userData = new UsersData();
     * userData.init({
     *   userId: 'user123',
     *   meta: '{"lastVisit":"2024-03-20T12:00:00Z"}',
     *   data: '{"progress":75}',
     *   type: UsersData.T_TELEGRAM
     * });
     * console.log(userData.meta.lastVisit); // Date object
     * console.log(userData.data.progress); // 75
     * ```
     */
    public init(data: any): void {
        super.init(data);
        if (this._appContext?.isSaveDb) {
            if (typeof this.meta === 'string') {
                this.meta = JSON.parse(this.meta);
            }
            if (typeof this.data === 'string') {
                try {
                    this.data = JSON.parse(this.data);
                } catch (e) {
                    this._appContext?.logError(`UserData:init() Ошибка при парсинге данных`, {
                        error: e,
                        data: this.data,
                    });
                }
            }
        }
    }
}
