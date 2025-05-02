import { Model } from './db/Model';
import { IModelRes, IModelRules } from './interface';
import { mmApp } from '../mmApp';

/**
 * Внутреннее состояние модели пользовательских данных
 */
export interface IUserDataModelState {
    /**
     * Идентификатор пользователя
     */
    userId: string;
    /**
     * Метаданные пользователя в JSON
     */
    meta: string;
    /**
     * Пользовательские данные в JSON
     */
    data: string;
    /**
     * Тип платформы
     */
    type: string;
}

/**
 * Модель для работы с пользовательскими данными
 *
 * @class UsersData
 * @extends Model<IUserDataState>
 *
 * Класс предоставляет интерфейс для работы с пользовательскими данными во всех поддерживаемых платформах.
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
 * // Автоматическое определение типа из mmApp
 * userData.type = mmApp.appType === 'alisa'
 *   ? UsersData.T_ALISA
 *   : UsersData.T_TELEGRAM;
 * ```
 */
export class UsersData extends Model<IUserDataModelState> {
    /**
     * Название таблицы для хранения данных
     * @readonly
     */
    public static readonly TABLE_NAME = 'UsersData';

    /**
     * Тип платформы: Яндекс.Алиса
     * @readonly
     */
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
    /** Тип платформы: Пользовательское приложение */
    public static readonly T_USER_APP = 512;

    /**
     * Уникальный идентификатор пользователя
     */
    public userId: string | number | null;

    /**
     * Метаданные пользователя
     * @remarks Может содержать любые дополнительные данные о пользователе
     */
    public meta: any;

    /**
     * Основные данные пользователя
     * @remarks Содержит основное состояние пользователя
     */
    public data: any;

    /**
     * Тип платформы пользователя
     * @see T_ALISA, T_VK, T_TELEGRAM и другие константы типов
     * @remarks Определяет платформу, с которой работает пользователь.
     * Возможные значения:
     * - T_ALISA (0) - Яндекс.Алиса
     * - T_VK (1) - ВКонтакте
     * - T_TELEGRAM (2) - Telegram
     * - T_VIBER (3) - Viber
     * - T_MARUSIA (4) - Маруся
     * - T_SMART_APP (5) - Сбер SmartApp
     * - T_USER_APP (512) - Пользовательское приложение
     */
    public type: number;

    /**
     * Создает экземпляр модели пользовательских данных
     *
     * @example
     * ```typescript
     * const userData = new UsersData();
     * userData.userId = 'user123';
     * ```
     */
    public constructor() {
        super();
        this.userId = null;
        this.meta = null;
        this.data = null;
        this.type = UsersData.T_ALISA;
    }

    /**
     * Возвращает название таблицы/файла для хранения данных
     * @returns {string} Название таблицы
     */
    public tableName(): string {
        return UsersData.TABLE_NAME;
    }

    /**
     * Определяет правила валидации полей
     * @returns {IModelRules[]} Массив правил валидации
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
     * Возвращает описания атрибутов модели
     * @returns {IUserDataModelState} Описания атрибутов
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
     * Ищет одну запись в хранилище по текущим параметрам
     * @returns {Promise<boolean>} true, если запись найдена
     *
     * @example
     * ```typescript
     * const userData = new UsersData();
     * userData.userId = 'user123';
     * if (await userData.getOne()) {
     *   console.log('Пользователь найден:', userData.data);
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

    /**
     * Валидирует значения перед сохранением
     * @remarks Преобразует объекты meta и data в JSON при сохранении в БД
     *
     * @throws {Error} Если данные не прошли валидацию
     *
     * @example
     * ```typescript
     * userData.meta = { lastVisit: new Date() };
     * userData.validate(); // meta будет преобразован в JSON
     * ```
     */
    public validate(): void {
        if (mmApp.isSaveDb) {
            if (typeof this.meta !== 'string') {
                this.meta = JSON.stringify(this.meta);
            }
            if (typeof this.data !== 'string') {
                this.data = JSON.stringify(this.data);
            }
        }
        super.validate();
    }

    /**
     * Инициализирует модель данными
     * @param {any} data - Данные для инициализации
     * @remarks
     * - Преобразует JSON строки meta и data в объекты при загрузке из БД
     * - При парсинге data, ошибки игнорируются для обеспечения обратной совместимости
     * - Парсинг происходит только если включено сохранение в БД (mmApp.isSaveDb === true)
     *
     * @example
     * ```typescript
     * userData.init({
     *   userId: 'user123',
     *   meta: '{"lastVisit":"2024-01-01"}',
     *   data: '{"visits":1}',
     *   type: 0
     * });
     * ```
     */
    public init(data: any): void {
        super.init(data);
        if (mmApp.isSaveDb) {
            if (typeof this.meta === 'string') {
                this.meta = JSON.parse(this.meta);
            }
            if (typeof this.data === 'string') {
                try {
                    this.data = JSON.parse(this.data);
                } catch (e) {
                    mmApp.saveLog('userData.log', `Ошибка при парсинге данных: ${e}`);
                }
            }
        }
    }
}
