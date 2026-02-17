import { IModelRes, IModelRules } from './interface';

import { IModelState, Model } from './db/Model';
import { IDbResult, AppContext } from '../core';

/**
 * Интерфейс для внутреннего состояния модели пользовательских данных.
 * Определяет структуру данных для хранения информации о пользователях в базе данных.
 */
export interface IUserDataModelState extends IModelState {
    /**
     * Идентификатор пользователя.
     * Уникальный идентификатор пользователя в конкретной платформе.
     * @example "123456789" для Telegram, "user_123456" для VK
     */
    userId: string | number | null;
    /**
     * Метаданные пользователя в JSON.
     * Содержит дополнительную информацию о пользователе, такую как статистика использования,
     * настройки, временные метки и т.д.
     * @example { "lastVisit": "2024-03-20T12:00:00Z", "usageCount": 42 }
     */
    meta: Record<string, unknown> | string | null;
    /**
     * Пользовательские данные в JSON.
     * Содержит основное состояние пользователя, например, прогресс в игре,
     * сохраненные настройки, историю действий и т.д.
     * @example { "progress": 75, "settings": { "notifications": true } }
     */
    data: string | Record<string, unknown> | null;
    /**
     * Тип платформы.
     * Определяет, на какой платформе зарегистрирован пользователь.
     */
    platform: string;
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
 * ```ts
 * class GameController extends BotController {
 *   public async action(intentName: string): Promise<void> {
 *     // Загрузка данных пользователя
 *     const userData = new UsersData(this.appContext);
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
 * ```ts
 * const userData = new UsersData(appContext);
 *
 * // Для Алисы
 * userData.platform = T_ALISA;
 *
 * // Для Telegram
 * userData.platform = T_TELEGRAM;
 * ```
 */
export class UsersData extends Model<IUserDataModelState> {
    /**
     * Название таблицы для хранения данных пользователей.
     * @readonly
     */
    public static readonly TABLE_NAME = 'UsersData';

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
     */
    public platform: string;

    /**
     * Создает экземпляр модели пользовательских данных.
     * Предоставляет унифицированный интерфейс для хранения данных пользователя.
     *
     * @example
     * ```ts
     * const userData = new UsersData(appContext);
     * userData.userId = 'user123';
     * userData.type = UsersData.T_TELEGRAM;
     * ```
     */
    public constructor(appContext: AppContext) {
        super(appContext);
        this.userId = null;
        this.meta = null;
        this.data = null;
        this.platform = 'unknown';
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
                name: ['platformName'],
                type: 'string',
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
            platform: 'Platform Name',
        };
    }

    /**
     * Ищет одну запись в хранилище по текущим параметрам.
     *
     * @return {Promise<boolean>} true, если запись найдена
     *
     * @example
     * ```ts
     * const userData = new UsersData(appContext);
     * userData.userId = 'user123';
     * if (await userData.getOne()) {
     *   console.log('Пользователь найден:', userData.data);
     * } else {
     *   console.log('Пользователь не найден');
     * }
     * ```
     */
    public async getOne(): Promise<boolean> {
        const query: IModelRes = await this.selectOne();
        if (query && query.status && this._appContext.database.adapter) {
            this.init(this._appContext.database.adapter.getValue(query));
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
     * ```ts
     * userData.meta = { lastVisit: new Date() };
     * userData.data = { progress: 75 };
     * userData.validate(); // meta и data будут преобразованы в JSON
     * ```
     */
    public validate(): void {
        if (typeof this.meta !== 'string') {
            this.meta = this.safeStringify(this.meta);
        }
        if (typeof this.data !== 'string') {
            this.data = this.safeStringify(this.data);
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
     * ```ts
     * const userData = new UsersData(appContext);
     * userData.init({
     *   userId: 'user123',
     *   meta: '{"lastVisit":"2024-03-20T12:00:00Z"}',
     *   data: '{"progress":75}',
     *   platform: T_TELEGRAM
     * });
     * console.log(userData.meta.lastVisit); // Date object
     * console.log(userData.data.progress); // 75
     * ```
     */
    public init(data: IDbResult[] | IDbResult | null): void {
        super.init(data);
        if (typeof this.meta === 'string') {
            if (this.meta.startsWith('{') || this.meta.startsWith('[')) {
                this.meta = JSON.parse(this.meta);
            }
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
        //}
    }
}
