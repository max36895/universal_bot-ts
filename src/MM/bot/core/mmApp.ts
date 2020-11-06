import {fwrite, isDir, mkdir} from "../utils/functins";

export type TAppType = 'alisa' | 'vk' | 'telegram' | 'viber' | 'marusia' | 'user_application';

export const T_ALISA: TAppType = 'alisa';
export const T_VK: TAppType = 'vk';
export const T_TELEGRAM: TAppType = 'telegram';
export const T_VIBER: TAppType = 'viber';
export const T_MARUSIA: TAppType = 'marusia';
export const T_USER_APP: TAppType = 'user_application';

export const WELCOME_INTENT_NAME = 'welcome';
export const HELP_INTENT_NAME = 'help';

export interface IAppDB {
    host: string;
    user: string;
    pass: string;
    database: string;
}

export interface IAppIntent {
    /**
     * @typeof {string} name Название команды. Используется для идентификации команд.
     */
    name: string;
    /**
     * @typeof {string[]} slots Какие слова активируют команду. (Можно использовать регулярные выражения если установлено свойство is_pattern).
     */
    slots: string[];
    /**
     * @typeof {boolean} is_pattern Использовать регулярное выражение или нет. По умолчанию false.
     */
    is_pattern?: boolean;
}

export interface IAppConfig {
    /**
     * @typeof {string}[error_log=/../../] error_log Директория, в которую будут записываться логи и ошибки выполнения.
     */
    error_log: string;
    /**
     * @typeof {string}[json=/../../json]json Директория, в которую будут записываться json файлы.
     */
    json: string;
    /**
     * @typeof {IAppDB} db Настройка подключения к базе данных. Актуально если isSaveDb = true.
     */
    db?: IAppDB;
    /**
     * @typeof {boolean}[isLocalStorage=false] isLocalStorage Использование локального хранилища вместо БД. Актуально для Алисы.
     * Важно! Чтобы опция работала, нужно поставить галку "Использовать хранилище данных в навыке" в кабинете разработчика.
     */
    isLocalStorage?: boolean;
}

export interface IAppParam {
    /**
     * @typeof {string} viber_token Viber токен для отправки сообщений, загрузки изображений и звуков.
     */
    viber_token?: string;
    /**
     * @typeof {string} viber_sender Имя пользователя, от которого будет отправляться сообщение.
     */
    viber_sender?: string;
    /**
     * @typeof {number} viber_api_version Версия api для Viber
     */
    viber_api_version?: number;
    /**
     * @typeof {string} telegram_token Telegram токен для отправки сообщений, загрузки изображений и звуков.
     */
    telegram_token?: string;
    /**
     * @typeof {string} vk_api_version Версия Vk api. По умолчанию используется v5.103.
     */
    vk_api_version?: string;
    /**
     * @typeof {string} vk_confirmation_token Код для проверки корректности Vk бота. Необходим для подтверждения бота.
     */
    vk_confirmation_token?: string;
    /**
     * @typeof {string} vk_token Vk Токен для отправки сообщений, загрузки изображений и звуков.
     */
    vk_token?: string;
    /**
     * @typeof {string} yandex_token Яндекс Токен для загрузки изображений и звуков в навыке.
     */
    yandex_token?: string;
    /**
     * @typeof {string}
     */
    yandex_speech_kit_token?: string;
    /**
     * @typeof {boolean} y_isAuthUser Актуально для Алисы!
     *      - Использовать в качестве идентификатора пользователя Id в поле session->user.
     *      - Если true, то для всех пользователей, которые авторизованы в Яндекс будет использоваться один токен, а не разный.
     */
    y_isAuthUser?: boolean;
    /**
     * @typeof {string} app_id Идентификатор приложения.
     *      - Заполняется автоматически.
     */
    app_id?: string;
    /**
     * @typeof {string|number} user_id Идентификатор пользователя.
     *      - Заполняется автоматически.
     */
    user_id?: string | number;
    /**
     * @typeof {string} welcome_text Текст приветствия.
     */
    welcome_text?: string;
    /**
     * @typeof {string} help_text Текст помощи.
     */
    help_text?: string;
    /**
     * @typeof {IAppIntent} intents Обрабатываемые команды.
     *
     * @demo Пример intent с регулярным выражением:
     *  [
     *      -'name' : 'regex',
     *      -'slots' : [
     *          -'\b{_value_}\b', // Поиск точного совпадения. Например, если _value_ = 'привет', поиск будет осуществляться по точному совпадению. Слово "приветствую" в данном случае не будет считаться как точка срабатывания
     *          -'\b{_value_}[^\s]+\b', // Поиск по точному началу. При данной опции слово "приветствую" станет точкой срабатывания
     *          -'(\b{_value_}(|[^\s]+)\b)', // Поиск по точному началу или точному совпадению. (Используется по умолчанию)
     *          -'\b(\d{3})\b', // Поиск всех чисел от 100 до 999.
     *          -'{_value_} \d {_value_}', // Поиск по определенному условию. Например регулярное "завтра в \d концерт", тогда точкой срабатывания станет пользовательский текст, в котором есть вхождение что и в регулярном выражении, где "\d" это любое число.
     *          -'{_value_}', // Поиск любого похожего текста. Похоже на strpos()
     *          -'...' // Поддерживаются любые регулярные выражения. Перед использованием стоит убедиться в их корректности на сайте: (https://regex101.com/)
     *      ],
     *      -'is_pattern' : true
     *  ]
     */
    intents: IAppIntent[];
    /**
     * @typeof {string}
     */
    utm_text?: string;
}

export class mmApp {

    /**
     * Куда сохраняются пользовательские даннеы. Если false, то данные сохраняются в файл, иначе в бд. По умолчанию false.
     * @type {boolean}
     */
    public static isSaveDb: boolean = false;

    /**
     * Тип приложения. (Алиса, бот vk|telegram).
     * @var string $appType Тип приложения. (Алиса, бот vk|telegram).
     */
    public static appType: TAppType;
    /**
     * Основная конфигурация приложения.
     * @var config Основная конфигурация приложения.
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
     * @var params Основные параметры приложения.
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
     * @param array1 Массив с котором необходимо объединить значение.
     * @param array2 Массив для объединения.
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
     * @param config Пользовательская конфигурация.
     * @api
     */
    public static setConfig(config: IAppConfig): void {
        this.config = {...this.config, ...config};
    }

    /**
     * Инициализация параметров приложения.
     *
     * @param params Пользовательские параметры.
     * @api
     */
    public static setParams(params: IAppParam): void {
        this.params = {...this.params, ...params};
    }

    public static setIsSaveDb(isSaveDb: boolean = false) {
        this.isSaveDb = isSaveDb;
    }

    /**
     * Сохранение json файла.
     *
     * @param fileName Название файла.
     * @param data Сохраняемые данные.
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
     * @param fileName Название файла.
     * @param errorText Текст ошибки.
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
