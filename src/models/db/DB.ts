import {IAppDB} from "../../core/mmApp";
import * as mongoDb from "mongodb";

/**
 * Класс отвечающий за подключение и взаимодействие с Базой Данных
 * @class DB
 */
export class DB {
    /**
     * Позволяет установить соединение с MongoDB.
     * От него идет подключение к бд, и выполнение запросов.
     * Рекомендуется использовать dbConnect
     */
    public sql: mongoDb.MongoClient;
    /**
     * Подключение к базе данных
     */
    public dbConnect: Promise<mongoDb.MongoClient>;
    /**
     * Ошибки при выполнении запросов
     */
    public errors: string[];
    /**
     * Параметры для конфигурации. имеют следующие поля:
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
            const options: any = {
                useUnifiedTopology: true
            };
            if (this.params.user) {
                options.auth = {
                    user: this.params.user,
                    password: this.params.pass
                };
            }
            this.sql = new mongoDb.MongoClient(this.params.host, options);
            this.dbConnect = this.sql.connect((err) => {
                if (err) {
                    this.dbConnect = null;
                }
            });
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
    public close(): void {
        if (this.sql) {
            if (this.dbConnect) {
                this.dbConnect.then((client) => {
                    if (client.isConnected()) {
                        client.close();
                    }
                });
            }
            this.dbConnect = null;
            if (this.sql.isConnected()) {
                this.sql.close();
            }
            this.sql = null;
        }
    }

    /**
     * Закрываем подключение к БД
     */
    public destroy(): void {
        this.close();
    }
}
