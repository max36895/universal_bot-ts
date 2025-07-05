/**
 * Основной класс приложения для создания мультиплатформенных чат-ботов
 * @packageDocumentation
 * @module mmApp
 *
 * Основной класс приложения для создания мультиплатформенных чат-ботов
 *
 * Предоставляет функциональность для:
 * - Управления конфигурацией приложения
 * - Работы с базой данных
 * - Обработки команд и интентов
 * - Логирования и сохранения данных
 *
 * Основные возможности:
 * - Поддержка множества платформ (Алиса, Маруся, Telegram, Viber, VK)
 * - Гибкая система конфигурации
 * - Управление командами и интентами
 * - Работа с базой данных
 * - Логирование и отладка
 *
 * @example
 * ```typescript
 * import { mmApp } from './mmApp';
 *
 * // Настройка конфигурации
 * mmApp.setConfig({
 *   error_log: './logs',
 *   json: './data',
 *   isLocalStorage: true,
 *   // База данных опциональна
 *   db: {
 *     host: 'localhost',
 *     database: 'bot_db',
 *     user: 'admin',
 *     pass: 'password'
 *   }
 * });
 *
 * // Настройка параметров
 * mmApp.setParams({
 *   telegram_token: 'your-token',
 *   vk_token: 'your-token',
 *   welcome_text: 'Привет! Чем могу помочь?',
 *   help_text: 'Список доступных команд: ...',
 *   intents: [
 *     {
 *       name: 'greeting',
 *       slots: ['привет', 'здравствуй'],
 *       is_pattern: false
 *     },
 *     {
 *       name: 'numbers',
 *       slots: ['\\b\\d{3}\\b'],
 *       is_pattern: true // Явно указываем, что используем регулярное выражение
 *     }
 *   ]
 * });
 *
 * // Добавление команды
 * mmApp.addCommand('greeting', ['привет', 'здравствуй'], (text, controller) => {
 *   controller.text = 'Привет! Рад вас видеть!';
 * });
 *
 * // Добавление команды с регулярным выражением
 * mmApp.addCommand('numbers', ['\\b\\d{3}\\b'], (text, controller) => {
 *   controller.text = `Вы ввели число: ${text}`;
 * }, true); // Явно указываем, что используем регулярное выражение
 * ```
 */
import { fwrite, isDir, mkdir } from './utils/standard/util';
import { IDbControllerModel } from './models/interface';
import { BotController } from './controller';
import { IEnvConfig, loadEnvFile } from './utils/EnvConfig';

/**
 * @interface IDir
 * Интерфейс для работы с директориями
 *
 * Используется для указания пути к файлу и его имени
 * при сохранении данных.
 *
 * @example
 * ```typescript
 * const dir: IDir = {
 *   path: './data',
 *   fileName: 'config.json'
 * };
 * ```
 */
export interface IDir {
    /**
     * Путь к директории
     *
     * Может быть абсолютным или относительным путем
     * к директории, где будет сохранен файл.
     */
    path: string;
    /**
     * Имя файла
     *
     * Имя файла, который будет создан в указанной директории.
     */
    fileName: string;
}

/**
 * Типы поддерживаемых платформ
 *
 * Определяет все поддерживаемые платформы для бота:
 * - alisa: Яндекс.Алиса
 * - vk: ВКонтакте
 * - telegram: Telegram
 * - viber: Viber
 * - marusia: Маруся
 * - user_application: Пользовательское приложение
 * - smart_app: Сбер SmartApp
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
 * @interface IAppDB
 * Параметры подключения к базе данных
 *
 * Определяет параметры для подключения к базе данных,
 * включая хост, учетные данные и дополнительные опции.
 *
 * @example
 * ```typescript
 * const dbConfig: IAppDB = {
 *   host: 'localhost',
 *   user: 'admin',
 *   pass: 'password',
 *   database: 'bot_db',
 *   options: {
 *     port: 3306,
 *     charset: 'utf8mb4'
 *   }
 * };
 * ```
 */
export interface IAppDB {
    /**
     * Адрес сервера базы данных
     *
     * Может быть указан как localhost или IP-адрес сервера.
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
     *
     * Могут включать специфичные для БД параметры,
     * такие как порт, кодировка и т.д.
     */
    options?: Record<string, unknown>;
}

/**
 * @interface IAppIntent
 * Конфигурация интента (команды)
 *
 * Определяет структуру команды, включая ее имя,
 * триггеры активации и флаг использования регулярных выражений.
 *
 * @example
 * ```typescript
 * // Простая команда
 * const intent: IAppIntent = {
 *   name: 'greeting',
 *   slots: ['привет', 'здравствуй'],
 *   is_pattern: false
 * };
 *
 * // Команда с регулярным выражением
 * const patternIntent: IAppIntent = {
 *   name: 'numbers',
 *   slots: ['\\b\\d{3}\\b'],
 *   is_pattern: true
 * };
 * ```
 */
export interface IAppIntent {
    /**
     * Уникальный идентификатор команды
     */
    name: string;
    /**
     * Триггеры активации команды
     *
     * Массив слов или регулярных выражений для активации команды.
     *
     * @example
     * ```typescript
     * // Простые слова
     * slots: ['привет', 'здравствуй']
     *
     * // Регулярное выражение для чисел
     * slots: ['\\b\\d{3}\\b']
     * ```
     */
    slots: string[];
    /**
     * Флаг использования регулярных выражений
     *
     * Если true, строки в slots интерпретируются как регулярные выражения.
     *
     * @defaultValue false
     */
    is_pattern?: boolean;
}

/**
 * @interface IAppConfig
 * Основная конфигурация приложения
 *
 * Определяет основные настройки приложения, включая пути к директориям,
 * конфигурацию базы данных и флаги режимов работы.
 *
 * @example
 * ```typescript
 * const config: IAppConfig = {
 *   error_log: './logs',
 *   json: './data',
 *   db: {
 *     host: 'localhost',
 *     database: 'bot_db'
 *   },
 *   isLocalStorage: true,
 *   env: '.env'
 * };
 * ```
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
     *
     * Требует включения соответствующей опции в кабинете разработчика.
     */
    isLocalStorage?: boolean;
    /**
     * Путь к файлу с переменными окружения(.env)
     */
    env?: string;
}

/**
 * @interface IAppParam
 * Параметры приложения для различных платформ
 *
 * Содержит токены и настройки для работы с различными платформами,
 * а также тексты приветствия и помощи.
 *
 * @example
 * ```typescript
 * const params: IAppParam = {
 *   welcome_text: 'Привет! Чем могу помочь?',
 *   help_text: 'Список доступных команд: ...',
 *   intents: [
 *     {
 *       name: 'greeting',
 *       slots: ['привет', 'здравствуй'],
 *       is_pattern: false
 *     }
 *   ]
 * };
 * ```
 */
export interface IAppParam {
    /**
     * Токен Viber для API
     *
     * @remarks
     * Используется для авторизации запросов к Viber API.
     * Получается в личном кабинете разработчика Viber.
     */
    viber_token?: string | null;

    /**
     * Имя отправителя в Viber
     *
     * @remarks
     * Имя, которое будет отображаться в сообщениях от бота.
     * Должно быть предварительно зарегистрировано в Viber.
     */
    viber_sender?: string | null;

    /**
     * Версия Viber API
     *
     * @remarks
     * Определяет версию API для работы с Viber.
     * Рекомендуется использовать последнюю стабильную версию.
     */
    viber_api_version?: number | null;

    /**
     * Токен Telegram для API
     *
     * @remarks
     * Используется для авторизации запросов к Telegram Bot API.
     * Получается у BotFather при создании бота.
     */
    telegram_token?: string | null;

    /**
     * Версия VK API
     *
     * @remarks
     * Определяет версию API для работы с ВКонтакте.
     * По умолчанию используется v5.103
     */
    vk_api_version?: string | null;

    /**
     * Токен подтверждения для VK
     *
     * @remarks
     * Используется для подтверждения вебхуков в VK.
     * Генерируется при создании группы и настройке Callback API.
     */
    vk_confirmation_token?: string | null;

    /**
     * Токен VK для API
     *
     * @remarks
     * Используется для авторизации запросов к VK API.
     * Получается при создании Standalone-приложения в VK.
     */
    vk_token?: string | null;

    /**
     * Токен Маруси для загрузки медиа
     *
     * @remarks
     * Используется для загрузки медиафайлов в Маруси.
     * Получается в личном кабинете разработчика Маруси.
     */
    marusia_token?: string | null;

    /**
     * Токен Яндекс.Алисы для API
     *
     * @remarks
     * Используется для авторизации запросов к API Яндекс.Алисы.
     * Получается в личном кабинете разработчика Яндекс.Алисы.
     */
    yandex_token?: string | null;

    /**
     * Токен Yandex SpeechKit
     *
     * @remarks
     * Используется для преобразования текста в речь.
     * Получается в личном кабинете Yandex Cloud.
     */
    yandex_speech_kit_token?: string | null;

    /**
     * Флаг использования ID авторизованного пользователя Яндекса
     *
     * Актуально только для Алисы.
     */
    y_isAuthUser?: boolean;

    /**
     * Идентификатор приложения
     *
     * Заполняется автоматически.
     */
    app_id?: string | null;

    /**
     * Идентификатор пользователя
     *
     * Заполняется автоматически.
     */
    user_id?: string | number | null;

    /**
     * Текст приветствия
     *
     * Может быть строкой или массивом вариантов.
     */
    welcome_text?: string | string[];

    /**
     * Текст помощи
     *
     * Может быть строкой или массивом вариантов.
     */
    help_text?: string | string[];

    /**
     * Массив интентов (команд) приложения
     *
     * @remarks
     * При использовании регулярных выражений в slots:
     * - Убедитесь, что выражение безопасно и не может вызвать ReDoS
     * - Используйте ограниченные квантификаторы (например, {1,5} вместо *)
     * - Избегайте сложных вложенных групп
     * - Тестируйте выражения на различных входных данных
     *
     * @example
     * ```typescript
     * intents: [
     *   {
     *     name: 'greeting',
     *     slots: [
     *       '\\b{_value_}\\b',      // Точное совпадение слова
     *       '\\b{_value_}[^\\s]+\\b', // Начало слова (например, "привет" найдет "приветствие")
     *       '(\\b{_value_}(|[^\\s]+)\\b)', // Точное совпадение или начало слова
     *       '\\b(\\d{3})\\b',       // Числа от 100 до 999
     *       '{_value_} \\d {_value_}', // Шаблон с числом между словами
     *       '{_value_}'             // Любое вхождение слова
     *     ],
     *     is_pattern: true
     *   }
     * ]
     * ```
     *
     * Где {_value_} - это плейсхолдер, который будет заменен на конкретное значение
     * при обработке команды. Например, если {_value_} = "привет", то регулярное
     * выражение '\\b{_value_}\\b' будет искать точное совпадение слова "привет".
     */
    intents: IAppIntent[] | null;

    /**
     * UTM-метка для ссылок
     *
     * @defaultValue utm_source=Yandex_Alisa&utm_medium=cpc&utm_campaign=phone
     */
    utm_text?: string | null;
}

/**
 * @interface ICommandParam
 * Параметры команды
 *
 * Определяет структуру команды, включая триггеры активации,
 * флаг использования регулярных выражений и функцию-обработчик.
 *
 * @example
 * ```typescript
 * const command: ICommandParam = {
 *   slots: ['привет', 'здравствуй'],
 *   isPattern: false,
 *   cb: (text, controller) => {
 *     controller.text = 'Привет! Рад вас видеть!';
 *   }
 * };
 * ```
 */
export interface ICommandParam<TBotController extends BotController = BotController> {
    /**
     * Триггеры активации команды
     *
     * Массив слов или регулярных выражений для активации команды.
     */
    slots: string[];
    /**
     * Флаг использования регулярных выражений
     *
     * Если true, строки в slots интерпретируются как регулярные выражения.
     */
    isPattern?: boolean;
    /**
     * Функция-обработчик команды
     *
     * @param {string} userCommand - Текст команды пользователя
     * @param {BotController} [botController] - Контроллер бота для управления ответом
     * @returns {void | string} - Строка ответа или void
     *
     * Если функция возвращает строку, она автоматически
     * устанавливается как ответ бота.
     */
    cb?: (userCommand: string, botController: TBotController) => void | string;
}

/**
 * @class mmApp
 * Основной класс приложения
 *
 * Предоставляет статические методы и свойства для управления
 * конфигурацией, командами и состоянием приложения.
 *
 * @example
 * ```typescript
 * // Настройка режима разработки
 * mmApp.setDevMode(true);
 *
 * // Добавление команды
 * mmApp.addCommand('greeting', ['привет'], (text, controller) => {
 *   controller.text = 'Привет!';
 * });
 *
 * // Сохранение данных
 * mmApp.saveData({
 *   path: './data',
 *   fileName: 'config.json'
 * }, JSON.stringify(config));
 * ```
 */
export class mmApp {
    /**
     * Переменные окружения
     * @private
     */
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
     * Флаг сохранения данных в базу данных
     *
     * @defaultValue false
     */
    public static isSaveDb: boolean = false;

    /**
     * Тип платформы приложения
     */
    public static appType: TAppType | null;

    /**
     * Конфигурация приложения
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
    public static commands: Map<string, ICommandParam<any>> = new Map();

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
    public static addCommand<TBotController extends BotController = BotController>(
        commandName: string,
        slots: string[],
        cb?: ICommandParam<TBotController>['cb'],
        isPattern: boolean = false,
    ): void {
        this.commands.set(commandName, {
            slots,
            isPattern,
            cb,
        });
    }

    /**
     * Удаляет команду
     * @param commandName - Имя команды
     */
    public static removeCommand(commandName: string): void {
        if (this.commands.has(commandName)) {
            this.commands.delete(commandName);
            if (this.commands.size === 0) {
                this.commands.clear();
            }
        }
    }

    /**
     * Удаляет все команды
     */
    public static clearCommands(): void {
        this.commands.clear();
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
