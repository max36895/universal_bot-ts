import { mmApp } from '../../mmApp';
import { DB } from './DB';
import { IModelRes, TQueryCb } from '../interface';

/**
 * Переменная с подключением к базе данных. Нужна для того, чтобы не было дополнительных подключений.
 */
export let _vDB: DB | null = new DB();

/**
 * Класс, позволяющий работать в Базой Данных
 * @class Sql
 */
export class Sql {
    /**
     * Местоположение базы данных.
     */
    public host: string | null = null;
    /**
     * Имя пользователя.
     */
    public user: string | null = null;
    /**
     * Пароль пользователя.
     */
    public pass: string | null = null;
    /**
     * Название базы данных.
     */
    public database: string | null = null;

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
     */
    public async standardInit(): Promise<boolean> {
        if (typeof mmApp.config.db !== 'undefined' && mmApp.config.db) {
            const config = mmApp.config.db;
            if (config.host && config.database) {
                this.initParam(config.host, config.user || '', config.pass || '', config.database);
            } else {
                Sql._saveLog(
                    'Sql.standardInit(): Не переданы настройки для подключения к Базе Данных!',
                );
                return false;
            }
            try {
                return await this.connect();
            } catch (exception) {
                Sql._saveLog(`Ошибка при инициализации БД.\n${exception}`);
            }
        }
        return false;
    }

    /**
     * Инициализация параметров подключения в Базе данных.
     *
     * @param {string} host Расположение базы данных.
     * @param {string} user Имя пользователя.
     * @param {string} pass Пароль.
     * @param {string} database Название базы данных.
     */
    public initParam(host: string, user: string, pass: string, database: string): void {
        this.host = host;
        this.user = user;
        this.pass = pass;
        this.database = database;
        if (_vDB) {
            _vDB.params = {
                host: this.host,
                user: this.user,
                pass: this.pass,
                database: this.database,
            };
        }
    }

    /**
     * Подключение к Базе данных.
     *
     * @return boolean
     */
    public async connect(): Promise<boolean> {
        if (_vDB && !(await _vDB.connect())) {
            Sql._saveLog(`Sql:connect() - Ошибка при подключении к БД.\n${_vDB.errors[0]}`);
            return false;
        }
        return true;
    }

    /**
     * Проверка подключения к БД.
     * При успешном подключении вернется true, иначе false
     *
     * @return {Promise<boolean>}
     */
    public async isConnected(): Promise<boolean> {
        try {
            if (_vDB && _vDB.dbConnect) {
                const client = await _vDB.dbConnect;
                await client.db().admin().ping(); //.isConnected();
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    /**
     * Закрываем подключение к базе данных
     */
    public close(): void {
        if (_vDB) {
            _vDB.destroy();
            _vDB = null;
        }
    }

    /**
     * Декодирование текста(Текст становится приемлемым для sql запроса).
     *
     * @param {string|number} text декодируемый текст.
     * @return string
     */
    public escapeString(text: string | number): string {
        return text + '';
    }

    /**
     * Выполнение запроса к базе данных.
     *
     * @param {Function} callback Функция с логикой.
     * @return {Promise<Object|Object[]>}
     */
    public async query(callback: TQueryCb): Promise<any> {
        try {
            if (_vDB && _vDB.dbConnect) {
                const client = await _vDB.dbConnect;
                const db = client.db(_vDB.params?.database);
                const data: IModelRes = await callback(client, db);
                if (data && data.status) {
                    return data.data;
                }
                Sql._saveLog(data.error + '');
                return null;
            } else {
                Sql._saveLog('Не удалось выполнить запрос.');
                return null;
            }
        } catch (err) {
            Sql._saveLog(err as string);
            if (_vDB) {
                _vDB.dbConnect = null;
            }
            return null;
        }
    }

    /**
     * Сохранение логов.
     *
     * @param {string} errorMsg Текст ошибки.
     * @return {boolean}
     * @private
     */
    protected static _saveLog(errorMsg: string): boolean {
        if (mmApp.saveLog('sql.log', errorMsg)) {
            return true;
        }
        if (mmApp.isDevMode) {
            console.warn('Sql.connect(): Не удалось создать/открыть файл!');
        }
        return false;
    }
}
