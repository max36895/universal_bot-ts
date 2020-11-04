/**
 * Класс отвечающий за подключение и взаимодействие с Базой Данных
 * Class DB
 * @package bot\models\db
 */
import {IAppDB} from "../../core/mmApp";
import * as mongoDb from "mongodb";

export class DB {
    /**
     * Подключение к базе данных
     * @var sql Подключение к базе данных
     */
    public sql: mongoDb.MongoClient;
    /**
     * Ошибки при выполнении запросов
     * @var array errors Ошибки при выполнении запросов
     */
    public errors: string[];
    /**
     * параметры для конфигурации. имеют следующие поля:
     * @var array|null params параметры для конфигурации. имеют следующие поля:
     * [
     *  - string host:  Местоположение базы данных
     *  - string user Имя пользователя
     *  - string pass Пароль пользователя
     *  - string database Название базы данных
     * ]
     */
    public params: IAppDB;

    /**
     * DB constructor.
     */
    public constructor() {
        this.sql = null;
        this.errors = [];
        this.params = null;
    }

    /**
     * Подключение к базе данных.
     *
     * @return boolean
     * @api
     */
    public connect(): boolean {
        this.errors = [];
        if (this.params) {
            this.close();
            this.sql = new mongoDb.MongoClient(this.params.host);
            return true;
        } else {
            this.errors.push('Отсутствуют данные для подключения в БД!');
        }
        return false;
    }

    /**
     * Закрытие подключения к базе данных.
     * @api
     */
    public close() {
        if (this.sql) {
            this.sql.close();
            this.sql = null;
        }
    }

    public destroy() {
        this.close();
    }
}
