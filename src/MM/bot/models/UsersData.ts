/**
 * Class UsersData
 * @package bot\models
 *
 * Модель для взаимодействия со всеми пользовательскими данными.
 */
import {Model} from "./db/Model";
import {IModelRules} from "./interface/IModel";
import {mmApp} from "../core/mmApp";

export class UsersData extends Model {
    public static readonly TABLE_NAME = 'UsersData';
    public static readonly T_ALISA = 0;
    public static readonly T_VK = 1;
    public static readonly T_TELEGRAM = 2;
    public static readonly T_VIBER = 3;
    public static readonly T_MARUSIA = 4;

    public static readonly T_USER_APP = 512;

    /**
     * Идентификатор пользователя (Уникальный ключ).
     * @var string|null userId Идентификатор пользователя (Уникальный ключ).
     */
    public userId: string | number;
    /**
     * Meta данные пользователя.
     * @var string|array|null meta Meta данные пользователя.
     */
    public meta: any;
    /**
     * Пользовательские данные.
     * @var string|array|null data Пользовательские данные.
     */
    public data: any;
    /**
     * Тип записи (0 - Алиса; 1 - Vk; 2 - Telegram).
     * @var int type Тип записи (0 - Алиса; 1 - Vk; 2 - Telegram).
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
     * Создание таблицы бд для хранения пользовательских данных.
     *
     * @return boolean|mysqli_result|null
     * @api
     */
    public createTable() {
       /* const sql = `CREATE TABLE IF NOT EXISTS \`${this.tableName()}\` (
 \`userId\` VARCHAR(250) COLLATE utf8_unicode_ci NOT NULL,
 \`meta\` TEXT COLLATE utf8_unicode_ci DEFAULT NULL,
 \`data\` TEXT COLLATE utf8_unicode_ci DEFAULT NULL,
 \`type\` INT(3) DEFAULT 0,
 PRIMARY KEY (\`userId\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`;
        return this.query(sql);*/
    }

    /**
     * Удаление таблицы бд для хранения пользовательских данных.
     *
     * @return boolean|mysqli_result|null
     * @api
     */
    public dropTable() {
/*
        return this.query(`DROP TABLE IF EXISTS \`${this.tableName()}\`;`);
*/
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
     * Выполнить запрос на поиск одного значения.
     * В случае успешного поиска вернет true.
     *
     * @return boolean
     * @api
     */
    public getOne(): boolean {
        const one = this.selectOne();
        if (mmApp.isSaveDb) {
            if (one && one.num_rows) {
                this.init(one.fetch_array());
                one.free_result();
                return true;
            }
        } else {
            if (one) {
                this.init(one);
                return true;
            }
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
     * @param data Массив с данными.
     * @api
     */
    public init(data: any): void {
        super.init(data);
        if (mmApp.isSaveDb) {
            if (typeof this.meta === 'string') {
                this.meta = JSON.parse(this.meta);
            }
            if (typeof this.data === 'string') {
                this.data = JSON.parse(this.data);
            }
        }
    }
}
