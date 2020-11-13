/**
 * Переменная с коннектом к базе данных. Нужна для того, чтобы не было дополнительных подключений к базе
 * @var DB|null vDB Переменная с коннектом к базе данных. Нужна для того, чтобы не было дополнительных подключений к базе
 */
import {mmApp} from "../../core/mmApp";
import {DB} from "./DB";
import {IModelRes} from "./Model";

export let _vDB = new DB();

/**
 * Класс, позволяющий работать в Базой Данных
 * Class Sql
 * @package bot\models\db
 */
export class Sql {
    /**
     * Местоположение базы данных.
     * @var host Местоположение базы данных.
     */
    public host: string;
    /**
     * Имя пользователя.
     * @var user Имя пользователя.
     */
    public user: string;
    /**
     * Пароль пользователя.
     * @var pass Пароль пользователя.
     */
    public pass: string;
    /**
     * Название базы данных.
     * @var database Название базы данных.
     */
    public database: string;

    /**
     * Sql constructor.
     */
    public constructor() {
        if (!_vDB) {
            _vDB = new DB();
        }
        this.standardInit();
    }

    /**
     * Настройка подключения к базе данных.
     *
     * @return boolean
     * @api
     */
    public standardInit(): boolean {
        if (typeof mmApp.config.db !== 'undefined' && mmApp.config.db) {
            const config = mmApp.config.db;
            if (config.host && config.database) {
                this.initParam(config.host, config.user, config.pass, config.database);
            } else {
                this._saveLog('Sql::standardInit(): Не переданы настройки для подключения к Базе Данных!');
                return false;
            }
            try {
                return this.connect();
            } catch (exception) {
                console.warn(exception);
                this._saveLog(`Ошибка при инициализации БД.\n${exception}`);
            }
        }
        return false;
    }

    /**
     * Инициализация параметров подключения в Базе данных.
     *
     * @param host Расположение базы данных.
     * @param user Имя пользователя.
     * @param pass Пароль.
     * @param database Название базы данных.
     * @api
     */
    public initParam(host: string, user: string, pass: string, database: string): void {
        this.host = host;
        this.user = user;
        this.pass = pass;
        this.database = database;
        _vDB.params = {
            host: this.host,
            user: this.user,
            pass: this.pass,
            database: this.database
        };
    }

    /**
     * Подключение к Базе данных.
     *
     * @return boolean
     * @api
     */
    public connect(): boolean {
        if (_vDB.connect() === false) {
            this._saveLog(`Sql:connect() - Ошибка при подключении к БД.\n${_vDB.errors[0]}`);
            return false;
        }
        return true;
    }

    /**
     * Декодирование текста(Текст становится приемлемым для sql запроса).
     *
     * @param text декодируемый текст.
     * @return string
     * @api
     */
    public escapeString(text: string | number): string {
        return text.toString();
    }

    /**
     * Выполнение запроса к базе данных.
     *
     * @param callback Функция с логикой.
     * @return mysqli_result|boolean|null
     * @api
     */
    public async query(callback: Function) {
        return await _vDB.sql.connect((err, client) => {
            if (err) {
                this._saveLog(err);
                return null;
            }
            const db = client.db(_vDB.params.database);
            const data: IModelRes = callback(client, db);
            client.close();
            if (data && data.status) {
                return data.data;
            }
            this._saveLog(data.error.toString());
            return null;
        });
    }


    /**
     * Сохранение логов.
     *
     * @param  errorMsg Текст ошибки.
     * @return boolean
     */
    protected _saveLog(errorMsg: string): boolean {
        if (mmApp.saveLog('sql.log', errorMsg)) {
            return true;
        }
        console.warn('Sql::connect(): Не удалось создать/открыть файл!');
        return false;
    }
}
