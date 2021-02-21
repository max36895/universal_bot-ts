import {fwrite, isDir, mkdir} from "../utils";
import {DbControllerModel} from "../models/db/DbControllerModel";

export type TAppType = 'alisa' | 'vk' | 'telegram' | 'viber' | 'marusia' | 'user_application' | 'smart-app';

/**
 * Используется Алиса
 * @type {string}
 */
export const T_ALISA: TAppType = 'alisa';
/**
 * Используется vk бот
 * @type {string}
 */
export const T_VK: TAppType = 'vk';
/**
 * Используется telegram бот
 * @type {string}
 */
export const T_TELEGRAM: TAppType = 'telegram';
/**
 * Используется viber бот
 * @type {string}
 */
export const T_VIBER: TAppType = 'viber';
/**
 * Используется Марус
 * @type {string}
 */
export const T_MARUSIA: TAppType = 'marusia';
/**
 * Используется Сбер SmartApp
 * @type {string}
 */
export const T_SMARTAPP: TAppType = 'smart-app';
/**
 * Используется пользовательский тип приложения
 * @type {string}
 */
export const T_USER_APP: TAppType = 'user_application';

/**
 * Название интента для приветствия
 * @type {string}
 */
export const WELCOME_INTENT_NAME = 'welcome';
/**
 * Название интента для помощи
 * @type {string}
 */
export const HELP_INTENT_NAME = 'help';

/**
 *  Параметры для подключения к Базе Данных
 */
export interface IAppDB {
    /**
     * Адресс, по которому находится База Данных
     */
    host: string;
    /**
     * Логин для подключения к БД
     */
    user?: string;
    /**
     * Пароль для подключения к БД
     */
    pass?: string;
    /**
     * Название БД
     */
    database: string;
}

export interface IAppIntent {
    /**
     * Название команды. Используется для идентификации команд.
     */
    name: string;
    /**
     * Какие слова активируют команду. (Можно использовать регулярные выражения если установлено свойство is_pattern).
     */
    slots: string[];
    /**
     * Использовать регулярное выражение или нет. По умолчанию false.
     */
    is_pattern?: boolean;
}

export interface IAppConfig {
    /**
     * Директория, в которую будут записываться логи и ошибки выполнения.
     */
    error_log?: string;
    /**
     * Директория, в которую будут записываться json файлы.
     */
    json?: string;
    /**
     * Настройка подключения к базе данных. Актуально если isSaveDb = true.
     */
    db?: IAppDB;
    /**
     * Использование локального хранилища вместо БД. Актуально для Алисы.
     * Важно! Чтобы опция работала, нужно поставить галку "Использовать хранилище данных в навыке" в кабинете разработчика.
     */
    isLocalStorage?: boolean;
}

export interface IAppParam {
    /**
     * Viber токен для отправки сообщений, загрузки изображений и звуков.
     */
    viber_token?: string;
    /**
     * Имя пользователя, от которого будет отправляться сообщение.
     */
    viber_sender?: string;
    /**
     * Версия api для Viber
     */
    viber_api_version?: number;
    /**
     * Telegram токен для отправки сообщений, загрузки изображений и звуков.
     */
    telegram_token?: string;
    /**
     * Версия Vk api. По умолчанию используется v5.103.
     */
    vk_api_version?: string;
    /**
     * Код для проверки корректности Vk бота. Необходим для подтверждения бота.
     */
    vk_confirmation_token?: string;
    /**
     * Vk Токен для отправки сообщений, загрузки изображений и звуков.
     */
    vk_token?: string;
    /**
     * Яндекс Токен для загрузки изображений и звуков в навыке.
     */
    yandex_token?: string;
    /**
     * Токен для отправки запросов в Yandex speesh kit.
     */
    yandex_speech_kit_token?: string;
    /**
     * Актуально для Алисы!
     *      - Использовать в качестве идентификатора пользователя Id в поле session->user.
     *      - Если true, то для всех пользователей, которые авторизованы в Яндекс будет использоваться один токен, а не разный.
     */
    y_isAuthUser?: boolean;
    /**
     * Идентификатор приложения.
     *      - Заполняется автоматически.
     */
    app_id?: string;
    /**
     *Идентификатор пользователя.
     *      - Заполняется автоматически.
     */
    user_id?: string | number;
    /**
     * Текст, или масив из текста для приветствия.
     */
    welcome_text?: string | string[];
    /**
     * Текст, или масив из текста для  помощи.
     */
    help_text?: string | string[];
    /**
     * Обрабатываемые команды.
     *
     * @demo Пример intent с регулярным выражением:
     * ```json
     *  [
     *      -'name' : 'regex',
     *      -'slots' : [
     *          -'\b{_value_}\b', // Поиск точного совпадения. Например, если _value_ = 'привет', поиск будет осуществляться по точному совпадению. Слово "приветствую" в данном случае не будет считаться как точка срабатывания
     *          -'\b{_value_}[^\s]+\b', // Поиск по точному началу. При данной опции слово "приветствую" станет точкой срабатывания
     *          -'(\b{_value_}(|[^\s]+)\b)', // Поиск по точному началу или точному совпадению.
     *          -'\b(\d{3})\b', // Поиск всех чисел от 100 до 999.
     *          -'{_value_} \d {_value_}', // Поиск по определенному условию. Например регулярное "завтра в \d концерт", тогда точкой срабатывания станет пользовательский текст, в котором есть вхождение что и в регулярном выражении, где "\d" это любое число.
     *          -'{_value_}', // Поиск любого похожего текста. Похоже на strpos()
     *          -'...' // Поддерживаются любые регулярные выражения. Перед использованием стоит убедиться в их корректности на сайте: (https://regex101.com/)
     *      ],
     *      -'is_pattern' : true
     *  ]
     *  ```
     */
    intents: IAppIntent[];
    /**
     * Текст для UTM метки. По умолчанию utm_source=Yandex_Alisa&utm_medium=cpc&utm_campaign=phone
     */
    utm_text?: string;
}

/**
 * Статический класс, хранящий состояние и параметры приложения.
 * @class mmApp
 */
export class mmApp {
    /**
     * Использование стороннего контроллера для подключения к БД.
     * Класс должен быть унаследован от DbControllerModel. Стоит применять в том случае, если используется другая СУБД.
     * Если опция не передается, то используется стандартное подключение MongoDb.
     * @see DbControllerModel
     */
    public static userDbController: DbControllerModel;
    /**
     * Куда сохраняются пользовательские данные. Если false, то данные сохраняются в файл, иначе в бд. По умолчанию false.
     */
    public static isSaveDb: boolean = false;

    /**
     * Тип приложения. (Алиса, бот vk|telegram).
     */
    public static appType: TAppType;
    /**
     * Основная конфигурация приложения.
     */
    public static config: IAppConfig = {
        error_log: '/../../logs',
        json: '/../../json',
        db: {
            host: '',
            user: '',
            pass: '',
            database: ''
        },
        isLocalStorage: false
    };
    /**
     * Основные параметры приложения.
     */
    public static params: IAppParam = {
        viber_token: null,
        viber_sender: null,
        viber_api_version: null,
        telegram_token: null,
        vk_api_version: null,
        vk_confirmation_token: null,
        vk_token: null,
        yandex_token: null,
        y_isAuthUser: false,
        app_id: null,
        user_id: null,
        welcome_text: 'Текст приветствия',
        help_text: 'Текст помощи',
        intents: [
            {
                name: WELCOME_INTENT_NAME, // Название команды приветствия
                slots: [ // Слова, на которые будет срабатывать приветствие
                    'привет',
                    'здравст'
                ]
            },
            {
                name: HELP_INTENT_NAME, // Название команды помощи
                slots: [ // Слова, на которые будет срабатывать помощь
                    'помощ',
                    'что ты умеешь'
                ]
            },
        ],
        utm_text: null
    };

    /**
     * Объединение 2 массивов.
     *
     * @param {object[]} array1 Массив с котором необходимо объединить значение.
     * @param {object[]} array2 Массив для объединения.
     * @return object
     * @api
     */
    public static arrayMerge(array1: object[], array2?: object[]): object {
        if (array2) {
            return [...array1, ...array2];
        }
        return array1;
    }

    /**
     * Инициализация конфигурации приложения.
     *
     * @param {IAppConfig} config Пользовательская конфигурация.
     * @api
     */
    public static setConfig(config: IAppConfig): void {
        this.config = {...this.config, ...config};
    }

    /**
     * Инициализация параметров приложения.
     *
     * @param {IAppParam} params Пользовательские параметры.
     * @api
     */
    public static setParams(params: IAppParam): void {
        this.params = {...this.params, ...params};
    }

    /**
     * Переопределения места, для хранения данных пользователя.
     *
     * @param {boolean} isSaveDb Если true, то данные сохраняются в БД, иначе в файл.
     */
    public static setIsSaveDb(isSaveDb: boolean = false): void {
        this.isSaveDb = isSaveDb;
    }

    /**
     * Сохранение данных в json файл.
     *
     * @param {string} fileName Название файла.
     * @param {any} data Сохраняемые данные.
     * @return boolean
     * @api
     */
    public static saveJson(fileName: string, data: any): boolean {
        const path: string = mmApp.config.json || __dirname + '/../../json';
        if (!isDir(path)) {
            mkdir(path);
        }
        fileName = fileName.replace('`', '');
        fwrite(`${path}/${fileName}`, JSON.stringify(data));
        return true;
    }

    /**
     * Сохранение логов.
     *
     * @param {string} fileName Название файла.
     * @param {string} errorText Текст ошибки.
     * @return boolean
     * @api
     */
    public static saveLog(fileName: string, errorText: string): boolean {
        const path: string = mmApp.config.error_log || __dirname + '/../../logs';
        if (!isDir(path)) {
            mkdir(path);
        }
        fwrite(`${path}/${fileName}`, `[${Date()}]: ${errorText}\n`, 'a');
        return true;
    }
}
