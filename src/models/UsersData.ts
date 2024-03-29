import {Model} from './db/Model';
import {IModelRes, IModelRules} from './interface';
import {mmApp} from '../mmApp';

/**
 * @class UsersData
 *
 * Модель для взаимодействия со всеми пользовательскими данными.
 */
export class UsersData extends Model {
    public static readonly TABLE_NAME = 'UsersData';
    public static readonly T_ALISA = 0;
    public static readonly T_VK = 1;
    public static readonly T_TELEGRAM = 2;
    public static readonly T_VIBER = 3;
    public static readonly T_MARUSIA = 4;
    public static readonly T_SMART_APP = 5;

    public static readonly T_USER_APP = 512;

    /**
     * Идентификатор пользователя (Уникальный ключ).
     */
    public userId: string | number | null;
    /**
     * Meta данные пользователя.
     */
    public meta: any;
    /**
     * Пользовательские данные.
     */
    public data: any;
    /**
     * Тип записи (0 - Алиса; 1 - Vk; 2 - Telegram).
     */
    public type: number;

    /**
     * UsersData constructor.
     */
    public constructor() {
        super();
        this.userId = null;
        this.meta = null;
        this.data = null;
        this.type = UsersData.T_ALISA;
    }

    /**
     * Название таблицы/файла с данными.
     *
     * @return string
     * @api
     */
    public tableName(): string {
        return UsersData.TABLE_NAME;
    }

    /**
     * Основные правила для полей.
     *
     * @return IModelRules[]
     * @api
     */
    public rules(): IModelRules[] {
        return [
            {
                name: ['userId'],
                type: 'string',
                max: 250
            },
            {
                name: ['meta', 'data'],
                type: 'text',
            },
            {
                name: ['type'],
                type: 'integer',
            }
        ];
    }

    /**
     * Название атрибутов таблицы.
     *
     * @return object
     * @api
     */
    public attributeLabels(): object {
        return {
            userId: 'ID',
            meta: 'User meta data',
            data: 'User Data',
            type: 'Type'
        };
    }

    /**
     * Выполнение запроса на поиск одного значения.
     * В случае успешного поиска вернет true.
     *
     * @return {Promise<boolean>}
     * @api
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
     * Валидация значений.
     * @api
     */
    public validate(): void {
        if (mmApp.isSaveDb) {
            if (typeof this.meta !== "string") {
                this.meta = JSON.stringify(this.meta);
            }
            if (typeof this.data !== 'string') {
                this.data = JSON.stringify(this.data);
            }
        }
        super.validate();
    }

    /**
     * Инициализация параметров.
     *
     * @param {Object} data Массив с данными.
     * @api
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
                }
            }
        }
    }
}
