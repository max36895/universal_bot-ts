/**
 * Основной класс приложения для создания мультиплатформенных чат-ботов
 * @packageDocumentation
 */
import { fwrite, isDir, mkdir } from './utils/standard/util';
import { IDbControllerModel } from './models/interface';
import { BotController } from './controller';
import { IEnvConfig, loadEnvFile } from './utils/EnvConfig';

/**
 * Интерфейс для работы с директориями
 */
export interface IDir {
    /**
     * Путь к директории
     * @remarks Может быть абсолютным или относительным
     */
    path: string;
    /**
     * Имя файла
     */
    fileName: string;
}

/**
 * Типы поддерживаемых платформ
 */
export type TAppType =
    | 'alisa' // Яндекс.Алиса
    | 'vk' // ВКонтакте
    | 'telegram' // Telegram
    | 'viber' // Viber
    | 'marusia' // Маруся
    | 'user_application' // Пользовательское приложение
    | 'smart_app'; // Сбер SmartApp

/**
 * Тип платформы: Яндекс.Алиса
 */
export const T_ALISA: TAppType = 'alisa';

/**
 * Тип платформы: ВКонтакте
 */
export const T_VK: TAppType = 'vk';

/**
 * Тип платформы: Telegram
 */
export const T_TELEGRAM: TAppType = 'telegram';

/**
 * Тип платформы: Viber
 */
export const T_VIBER: TAppType = 'viber';

/**
 * Тип платформы: Маруся
 */
export const T_MARUSIA: TAppType = 'marusia';

/**
 * Тип платформы: Сбер SmartApp
 */
export const T_SMARTAPP: TAppType = 'smart_app';

/**
 * Тип платформы: Пользовательское приложение
 */
export const T_USER_APP: TAppType = 'user_application';

/**
 * Идентификатор интента приветствия
 */
export const WELCOME_INTENT_NAME = 'welcome';

/**
 * Идентификатор интента помощи
 */
export const HELP_INTENT_NAME = 'help';

/**
 * Параметры подключения к базе данных
 */
export interface IAppDB {
    /**
     * Адрес сервера базы данных
     * @remarks Например: localhost или IP-адрес
     */
    host: string;
    /**
     * Имя пользователя для подключения
     */
    user?: string;
    /**
     * Пароль для подключения
     */
    pass?: string;
    /**
     * Название базы данных
     */
    database: string;
    /**
     * Дополнительные параметры подключения
     * @remarks Специфичные для БД параметры
     */
    options?: Record<string, unknown>;
}

/**
 * Конфигурация интента (команды)
 */
export interface IAppIntent {
    /**
     * Уникальный идентификатор команды
     */
    name: string;
    /**
     * Триггеры активации команды
     * @remarks Массив слов или регулярных выражений для активации команды
     * @example
     * ```typescript
     * ['привет', 'здравствуй'] // Простые слова
     * ['\\b\\d{3}\\b'] // Регулярное выражение для чисел от 100 до 999
     * ```
     */
    slots: string[];
    /**
     * Флаг использования регулярных выражений
     * @remarks Если true, строки в slots интерпретируются как регулярные выражения
     * @defaultValue false
     */
    is_pattern?: boolean;
}

/**
 * Основная конфигурация приложения
 */
export interface IAppConfig {
    /**
     * Путь к директории для логов ошибок
     */
    error_log?: string;
    /**
     * Путь к директории для JSON файлов
     */
    json?: string;
    /**
     * Конфигурация базы данных
     */
    db?: IAppDB;
    /**
     * Флаг использования локального хранилища платформы
     * @remarks Требует включения соответствующей опции в кабинете разработчика
     */
    isLocalStorage?: boolean;
    /**
     * Путь к файлу с переменными окружения(.env)
     */
    env?: string;
}

/**
 * Параметры приложения для различных платформ
 */
export interface IAppParam {
    /**
     * Токен Viber для API
     */
    viber_token?: string | null;
    /**
     * Имя отправителя в Viber
     */
    viber_sender?: string | null;
    /**
     * Версия Viber API
     */
    viber_api_version?: number | null;
    /**
     * Токен Telegram для API
     */
    telegram_token?: string | null;
    /**
     * Версия VK API
     * @defaultValue v5.103
     */
    vk_api_version?: string | null;
    /**
     * Токен подтверждения для VK
     */
    vk_confirmation_token?: string | null;
    /**
     * Токен VK для API
     */
    vk_token?: string | null;
    /**
     * Токен Маруси для загрузки медиа
     */
    marusia_token?: string | null;
    /**
     * Токен Яндекса для загрузки медиа
     */
    yandex_token?: string | null;
    /**
     * Токен Yandex SpeechKit
     */
    yandex_speech_kit_token?: string | null;
    /**
     * Флаг использования ID авторизованного пользователя Яндекса
     * @remarks Актуально только для Алисы
     */
    y_isAuthUser?: boolean;
    /**
     * Идентификатор приложения (заполняется автоматически)
     */
    app_id?: string | null;
    /**
     * Идентификатор пользователя (заполняется автоматически)
     */
    user_id?: string | number | null;
    /**
     * Текст приветствия (строка или массив вариантов)
     */
    welcome_text?: string | string[];
    /**
     * Текст помощи (строка или массив вариантов)
     */
    help_text?: string | string[];
    /**
     * Массив интентов (команд) приложения
     * @example
     * ```typescript
     * [
     *   {
     *     name: 'greeting',
     *     slots: [
     *       '\\b{_value_}\\b', // Точное совпадение
     *       '\\b{_value_}[^\\s]+\\b', // Начало слова
     *       '(\\b{_value_}(|[^\\s]+)\\b)', // Точное или начало
     *       '\\b(\\d{3})\\b', // Числа 100-999
     *       '{_value_} \\d {_value_}', // Шаблон с числом
     *       '{_value_}', // Любое вхождение
     *     ],
     *     is_pattern: true
     *   }
     * ]
     * ```
     */
    intents: IAppIntent[] | null;
    /**
     * UTM-метка для ссылок
     * @defaultValue utm_source=Yandex_Alisa&utm_medium=cpc&utm_campaign=phone
     */
    utm_text?: string | null;
}

/**
 * Параметры команды
 */
export interface ICommandParam {
    /**
     * Триггеры активации команды
     * @remarks Массив слов или регулярных выражений для активации команды
     */
    slots: string[];
    /**
     * Флаг использования регулярных выражений
     * @remarks Если true, строки в slots интерпретируются как регулярные выражения
     */
    isPattern?: boolean;
    /**
     * Функция-обработчик команды
     * @param userCommand - Текст команды пользователя
     * @param botController - Контроллер бота для управления ответом
     * @returns Строка ответа или void
     * @remarks Если функция возвращает строку, она автоматически устанавливается как ответ бота
     */
    cb?: (userCommand: string, botController?: BotController) => void | string;
}

/**
 * Тип данных команды
 */
export type ICommand = Record<string, ICommandParam>;

/**
 * Статический класс, хранящий состояние и параметры приложения
 * @class mmApp
 */
export class mmApp {
    private static _envVars: IEnvConfig;
    /**
     * Флаг режима разработки
     * @private
     */
    private static _isDevMode: boolean;

    /**
     * Пользовательский контроллер базы данных
     * @remarks Используется для подключения альтернативных СУБД вместо MongoDB
     * @see DbControllerModel
     */
    public static userDbController: IDbControllerModel;

    /**
     * Флаг сохранения данных в БД
     * @remarks false - сохранение в файл, true - сохранение в БД
     * @defaultValue false
     */
    public static isSaveDb: boolean = false;

    /**
     * Тип платформы приложения
     */
    public static appType: TAppType | null;

    /**
     * Основная конфигурация приложения
     */
    public static config: IAppConfig = {
        error_log: '/../../logs',
        json: '/../../json',
        db: {
            host: '',
            user: '',
            pass: '',
            database: '',
        },
        isLocalStorage: false,
    };

    /**
     * Параметры приложения
     */
    public static params: IAppParam = {
        viber_token: null,
        viber_sender: null,
        viber_api_version: null,
        telegram_token: null,
        vk_api_version: null,
        vk_confirmation_token: null,
        vk_token: null,
        marusia_token: null,
        yandex_token: null,
        y_isAuthUser: false,
        app_id: null,
        user_id: null,
        welcome_text: 'Текст приветствия',
        help_text: 'Текст помощи',
        intents: [
            {
                name: WELCOME_INTENT_NAME,
                slots: ['привет', 'здравст'],
            },
            {
                name: HELP_INTENT_NAME,
                slots: ['помощ', 'что ты умеешь'],
            },
        ],
        utm_text: null,
    };

    /**
     * Добавленные команды для обработки
     */
    public static commands: ICommand = {};

    /**
     * Устанавливает режим разработки
     * @param {boolean} isDevMode - Флаг включения режима разработки
     * @remarks В режиме разработки в консоль выводятся все ошибки и предупреждения
     */
    public static setDevMode(isDevMode: boolean = false): void {
        mmApp._isDevMode = isDevMode;
    }

    /**
     * Возвращает текущий режим работы приложения
     * @returns {boolean} true, если включен режим разработки
     */
    public static get isDevMode(): boolean {
        return mmApp._isDevMode;
    }

    /**
     * Объединяет два массива объектов
     * @param {object[]} array1 - Основной массив
     * @param {object[]} array2 - Массив для объединения
     * @returns {object} Объединенный массив
     */
    public static arrayMerge(array1: object[], array2?: object[]): object {
        if (array2) {
            return [...array1, ...array2];
        }
        return array1;
    }

    /**
     * Установка всех токенов из переменных окружения или параметров
     * @private
     */
    private static _setTokens(): void {
        const envVars = mmApp._getEnvVars();
        if (envVars) {
            mmApp.params = {
                ...mmApp.params,
                viber_token: envVars.VIBER_TOKEN || mmApp.params.viber_token,
                telegram_token: envVars.TELEGRAM_TOKEN || mmApp.params.telegram_token,
                vk_token: envVars.VK_TOKEN || mmApp.params.vk_token,
                vk_confirmation_token:
                    envVars.VK_CONFIRMATION_TOKEN || mmApp.params.vk_confirmation_token,
                marusia_token: envVars.MARUSIA_TOKEN || mmApp.params.marusia_token,
                yandex_token: envVars.YANDEX_TOKEN || mmApp.params.yandex_token,
            };
        }
    }

    /**
     * Возвращает объект с настройками окружения
     * @param {string|undefined} envPath - Путь к файлу окружения
     * @private
     */
    private static _getEnvVars(
        envPath: string | undefined = mmApp.config?.env,
    ): IEnvConfig | undefined {
        if (mmApp._envVars) {
            return mmApp._envVars;
        }
        if (envPath) {
            mmApp._envVars = loadEnvFile(envPath);
        }
        return mmApp._envVars;
    }

    /**
     * Устанавливает конфигурацию приложения
     * @param {IAppConfig} config - Пользовательская конфигурация
     */
    public static setConfig(config: IAppConfig): void {
        this.config = { ...this.config, ...config };
        if (config.env) {
            const envVars = mmApp._getEnvVars(config.env);
            if (envVars) {
                // Пишем в конфиг для подключения к БД, только если есть настройки для подключения
                if (this.config.db || envVars.DB_HOST || envVars.DB_NAME) {
                    mmApp.config.db = {
                        ...mmApp.config.db,
                        host: (envVars.DB_HOST || mmApp.config.db?.host) as string,
                        user: envVars.DB_USER || mmApp.config.db?.user,
                        pass: envVars.DB_PASSWORD || mmApp.config.db?.pass,
                        database: (envVars.DB_NAME || mmApp.config.db?.database) as string,
                    };
                }

                this._setTokens();
            }
        }
    }

    /**
     * Устанавливает параметры приложения
     * @param {IAppParam} params - Пользовательские параметры
     */
    public static setParams(params: IAppParam): void {
        this.params = { ...this.params, ...params };
        mmApp._setTokens();
    }

    /**
     * Добавляет команду для обработки пользовательских запросов
     *
     * @param {string} commandName - Уникальный идентификатор команды
     * @param {string[]} slots - Триггеры для активации команды
     * @param {ICommandParam['cb']} cb - Функция-обработчик команды
     * @param {boolean} isPattern - Использовать регулярные выражения (по умолчанию false)
     *
     * @example
     * Простая команда со словами:
     * ```typescript
     * mmApp.addCommand(
     *   'greeting',
     *   ['привет', 'здравствуй'],
     *   (cmd, ctrl) => {
     *     if (ctrl) ctrl.text = 'Здравствуйте!';
     *   }
     * );
     * ```
     *
     * @example
     * Команда с регулярными выражениями:
     * ```typescript
     * // Обработка чисел от 1 до 999
     * mmApp.addCommand(
     *   'number',
     *   ['\\b([1-9]|[1-9][0-9]|[1-9][0-9][0-9])\\b'],
     *   (cmd, ctrl) => {
     *     if (ctrl) ctrl.text = `Вы ввели число: ${cmd}`;
     *   },
     *   true  // включаем поддержку регулярных выражений
     * );
     * ```
     *
     * @example
     * Команда с доступом к состоянию:
     * ```typescript
     * mmApp.addCommand(
     *   'stats',
     *   ['статистика'],
     *   async (cmd, ctrl) => {
     *     if (ctrl) {
     *       // Доступ к пользовательским данным
     *       const visits = ctrl.userData?.visits || 0;
     *       ctrl.text = `Вы использовали бота ${visits} раз`;
     *
     *       // Доступ к кнопкам и другим UI элементам
     *       ctrl.buttons
     *         .addBtn('Сбросить статистику')
     *         .addBtn('Закрыть');
     *     }
     *   }
     * );
     * ```
     *
     * @remarks
     * - Команды обрабатываются в порядке добавления
     * - При isPattern=true используются регулярные выражения JavaScript
     * - В callback доступен весь функционал BotController
     * - Можно использовать async функции в callback
     */
    public static addCommand(
        commandName: string,
        slots: string[],
        cb?: ICommandParam['cb'],
        isPattern: boolean = false,
    ): void {
        this.commands[commandName] = {
            slots,
            isPattern,
            cb,
        };
    }

    /**
     * Удаляет команду
     * @param commandName - Имя команды
     */
    public static removeCommand(commandName: string): void {
        if (this.commands[commandName]) {
            delete this.commands[commandName];
        }
    }

    /**
     * Устанавливает способ хранения пользовательских данных
     * @param {boolean} isSaveDb - true для сохранения в БД, false для сохранения в файл
     */
    public static setIsSaveDb(isSaveDb: boolean = false): void {
        this.isSaveDb = isSaveDb;
    }

    /**
     * Сохраняет данные в файл
     * @param {IDir} dir - Объект с путем и названием файла
     * @param {string} data - Сохраняемые данные
     * @param {string} mode - Режим записи
     * @returns {boolean} true в случае успешного сохранения
     */
    public static saveData(dir: IDir, data: string, mode?: string): boolean {
        if (!isDir(dir.path)) {
            mkdir(dir.path);
        }
        fwrite(`${dir.path}/${dir.fileName}`, data, mode);
        return true;
    }

    /**
     * Сохраняет данные в JSON файл
     * @param {string} fileName - Имя файла
     * @param {any} data - Данные для сохранения
     * @returns {boolean} true в случае успешного сохранения
     */
    public static saveJson(fileName: string, data: any): boolean {
        const dir: IDir = {
            path: mmApp.config.json || __dirname + '/../../json',
            fileName: fileName.replace(/`/g, ''),
        };
        return this.saveData(dir, JSON.stringify(data));
    }

    /**
     * Сохраняет лог ошибки
     * @param {string} fileName - Имя файла лога
     * @param {string} errorText - Текст ошибки
     * @returns {boolean} true в случае успешного сохранения
     */
    public static saveLog(fileName: string, errorText: string | null = ''): boolean {
        const dir: IDir = {
            path: mmApp.config.error_log || __dirname + '/../../logs',
            fileName,
        };
        const msg = `[${Date()}]: ${errorText}\n`;
        if (mmApp._isDevMode) {
            console.warn(msg);
        }
        return this.saveData(dir, msg, 'a');
    }
}
