/**
 * Основной класс приложения для создания мультиплатформенных чат-ботов*
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
 * import { AppContext } from 'umbot';
 * const appContext = new AppContext();
 * // Настройка конфигурации
 * appContext.setAppConfig({
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
 * appContext.setPlatformParams({
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
 * appContext.addCommand('greeting', ['привет', 'здравствуй'], (text, controller) => {
 *   controller.text = 'Привет! Рад вас видеть!';
 * });
 *
 * // Добавление команды с регулярным выражением
 * appContext.addCommand('numbers', ['\\b\\d{3}\\b'], (text, controller) => {
 *   controller.text = `Вы ввели число: ${text}`;
 * }, true); // Явно указываем, что используем регулярное выражение
 *
 * appContext.addCommand('numbers', [/\d{3}/], (text, controller) => {
 *   controller.text = `Вы ввели число: ${text}`;
 * }); // Явно передали regexp
 * ```
 */
import { saveData } from '../utils/standard/util';
import { IDbControllerModel } from '../models/interface';
import { BotController } from '../controller';
import { IEnvConfig, loadEnvFile } from '../utils/EnvConfig';
import { DB, DbControllerFile } from '../models/db';
import * as process from 'node:process';
import { getRegExp, __$usedRe2, isRegex } from '../utils/standard/RegExp';
import os from 'os';

interface IDangerRegex {
    status: boolean;
    slots: TSlots;
}

interface IGroup {
    name: string;
    regLength: number;
    butchRegexp: unknown[];
    regExpSize: number;
}

let MAX_COUNT_FOR_GROUP = 0;
let MAX_COUNT_FOR_REG = 0;

/**
 * Устанавливает ограничение на использование активных регулярных выражений. Нужен для того, чтобы приложение не падало под нагрузкой.
 */
function setMemoryLimit(): void {
    const total = os.totalmem();
    // re2 гораздо лучше работает с оперативной память, а также ограничение на использование памяти не такое суровое
    // например нативный reqExp уронит node при 3_400 группах, либо при 68_000 обычных регулярках (В этот лимит никогда не попадем, так как максимум активных регулярок порядка 10_000)
    // Поэтому если нет re2, то лимиты на количество активных регулярок должно быть меньше, для групп сильно меньше
    if (total < 0.8 * 1024 ** 3) {
        MAX_COUNT_FOR_GROUP = 200;
        MAX_COUNT_FOR_REG = 1000;
    } else if (total < 1.5 * 1024 ** 3) {
        MAX_COUNT_FOR_GROUP = 800;
        MAX_COUNT_FOR_REG = 1400;
    } else if (total < 3 * 1024 ** 3) {
        MAX_COUNT_FOR_GROUP = 1500;
        MAX_COUNT_FOR_REG = 3000;
    } else {
        MAX_COUNT_FOR_GROUP = 6800;
        MAX_COUNT_FOR_REG = 7000;
    }

    // Если нет re2, то количество активных регулярок для групп, нужно сильно сократить, иначе возможно падение nodejs
    if (!__$usedRe2) {
        MAX_COUNT_FOR_GROUP /= 20;
        MAX_COUNT_FOR_REG /= 2;
    }
}

setMemoryLimit();

/**
 * Интерфейс для хранения информации о файле
 *
 * @interface IFileInfo
 */
export interface IFileInfo {
    /**
     * Содержимое файла в виде строки
     */
    data?: object;

    /**
     * Версия файла.
     * Используется время последнего изменения файла в миллисекундах
     */
    version: number;
    timeOutId?: ReturnType<typeof setTimeout> | null;
    isFile: boolean;
}

interface IFileDataBase {
    [tableName: string]: IFileInfo;
}

/**
 * Тип для HTTP клиента
 */
export type THttpClient = (url: URL | RequestInfo, init?: RequestInit) => Promise<Response>;

/**
 * Тип метода для логирования
 */
export type TLoggerCb = (message: string, meta?: Record<string, unknown>) => void;

/**
 * Интерфейс для своей реализации логики логирования
 */
export interface ILogger {
    /**
     * Метод для логирования информации
     */
    log?: (...args: unknown[]) => void;
    /**
     * Метод для логирования ошибок
     * @param message
     * @param meta
     */
    error?: TLoggerCb;

    /**
     * Метод для логирования предупреждений
     * @param message
     * @param meta
     */
    warn?: TLoggerCb;

    /**
     * Метод для логирования метрик
     * @param name - имя метрики
     * @param value - значение метрики
     * @param labels - Дополнительная информация
     */
    metric?: (name: string, value: unknown, labels?: Record<string, unknown>) => void;
}

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
    | 'smart_app' // Сбер SmartApp
    | 'max_app';

/**
 * Константы для метрик
 */
export enum EMetric {
    REQUEST = 'umbot_http_request_duration_ms',
    GET_INTENT = 'umbot_get-intent_duration_ms',
    GET_COMMAND = 'umbot_get-command_duration_ms',
    ACTION = 'umbot_action_duration_ms',
    MIDDLEWARE = 'umbot_middleware_duration_ms',
    START_WEBHOOK = 'umbot_request_start',
    END_WEBHOOK = 'umbot_request_duration_ms',
    DB_SAVE = 'umbot_db_save_ms',
    DB_UPDATE = 'umbot_db_update_ms',
    DB_INSERT = 'umbot_db_insert_ms',
    DB_QUERY = 'umbot_db_query_ms',
    DB_REMOVE = 'umbot_db_remove_ms',
    DB_SELECT = 'umbot_db_select_ms',
}

/**
 * Тип платформы: Автоопределение
 */
export const T_AUTO = 'auto';
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
 * Тип платформы: Max
 */
export const T_MAXAPP: TAppType = 'max_app';

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
 * Специальное имя команды для обработки неизвестных запросов.
 *
 * Если ни одна из зарегистрированных команд не сработала,
 * и существует команда с именем `FALLBACK_COMMAND`,
 * её callback будет выполнен как fallback-обработчик.
 *
 * @example
 * ```typescript
 * bot.addCommand(FALLBACK_COMMAND, [], (cmd, ctrl) => {
 *   ctrl.text = 'Извините, я вас не понял. Скажите "помощь" для списка команд.';
 *   ctrl.buttons.addBtn('Помощь');
 * });
 * ```
 *
 * @remarks
 * - Fallback срабатывает только если нет совпадений по слотам.
 * - Не влияет на стандартные интенты (`welcome`, `help`).
 * - Можно зарегистрировать только одну fallback-команду (последняя перезапишет предыдущую).
 * - Можно просто передать "*"
 */
export const FALLBACK_COMMAND = '*';

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
     * Путь к файлу с переменными окружения(.env). Если файл не найден, то поиск будет происходить в process.env
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
     * Токен для Max
     * @remarks
     * Используется для авторизации запросов к MAX API.
     * Получается при создании Standalone-приложения в MAX.
     */
    max_token?: string | null;

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
     * Устанавливается автоматически при инициализации запроса.
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
     * Текст, который будет показан, если нет подходящих команд не найдено
     *
     * Может быть строкой или массивом вариантов.
     */
    empty_text?: string | string[];

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
     *       '\\b{_value_}\\b',             // Точное совпадение слова
     *       '\\b{_value_}[^\\s]+\\b',      // Начало слова (например, "привет" найдет "приветствие")
     *       '(\\b{_value_}(|[^\\s]+)\\b)', // Точное совпадение или начало слова
     *       '\\b(\\d{3})\\b',              // Числа от 100 до 999
     *       '{_value_} \\d {_value_}',     // Шаблон с числом между словами
     *       '{_value_}'                    // Любое вхождение слова
     *       /\d{0, 3}/i                    // Поиск числа от 0 до 999
     *     ],
     *     is_pattern: true
     *   }
     * ]
     * ```
     *
     * Где {_value_} - это значение, которое необходимо найти.
     * Например, если {_value_} = "привет", то регулярное выражение '\\b{_value_}\\b' будет искать точное совпадение слова "привет".
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
 * Тип для слотов команд
 */
export type TSlots = (string | RegExp)[];

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
    slots: TSlots | undefined;
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

    /**
     * Имя группы. Актуально для регулярок
     * @private
     */
    __$groupName?: string | null;
    regExp?: RegExp;
}

interface IGroupData {
    commands: string[];
    regExp: RegExp | null | string;
}

/**
 * Тип для функции обработки кастомного обработчика команд
 * @param userCommand - Команда пользователя
 * @param commands - Список всех зарегистрированных команд
 * @return {string} - Имя команды
 */
export type TCommandResolver = (
    userCommand: string,
    commands: Map<string, ICommandParam>,
) => string | null;

const REG_DANGEROUS = /\)+\s*[+*{?]|}\s*[+*{?]/;
const REG_PIPE = /\([^)]*\|[^)]*\)/;
const REG_EV1 = /\([^)]*(\w)\1+[^)]*\|/;
const REG_EV2 = /\([^)]*[+*{][^)]*\|/;
const REG_REPEAT = /\([^)]*[+*{][^)]*\)\s*\{/;
const REG_BAD = /\.\s*[+*{]/;

/**
 * @class AppContext
 * Основной класс приложения
 *
 * Предоставляет статические методы и свойства для управления
 * конфигурацией, командами и состоянием приложения.
 *
 * @example
 * ```typescript
 * // Настройка режима разработки
 * appContext.setDevMode(true);
 *
 * // Добавление команды
 * appContext.addCommand('greeting', ['привет'], (text, controller) => {
 *   controller.text = 'Привет!';
 * });
 */
export class AppContext {
    /**
     * Переменные окружения
     */
    #envVars: IEnvConfig | undefined;

    /**
     * Флаг режима разработки
     */
    #isDevMode: boolean = false;

    /**
     * Пользовательский контроллер базы данных
     * @remarks Используется для подключения альтернативных СУБД вместо MongoDB
     * @see DbControllerModel
     */
    public userDbController: IDbControllerModel | undefined;

    /**
     * Флаг сохранения данных в базу данных
     *
     * @defaultValue false
     */
    public isSaveDb: boolean = false;

    /**
     * Тип платформы приложения
     */
    public appType: TAppType | null = null;

    /**
     * Кастомный логгер приложения
     */
    #logger: ILogger | null = null;

    /**
     * Конфигурация приложения
     */
    public appConfig: IAppConfig = {
        error_log: `${__dirname}/../../logs`,
        json: `${__dirname}/../../json`,
        db: { host: '', user: '', pass: '', database: '' },
        isLocalStorage: false,
    };

    /**
     * Параметры приложения
     */
    public platformParams: IAppParam = {
        viber_token: null,
        viber_sender: null,
        viber_api_version: null,
        telegram_token: null,
        vk_api_version: null,
        vk_confirmation_token: null,
        vk_token: null,
        max_token: null,
        marusia_token: null,
        yandex_token: null,
        y_isAuthUser: false,
        app_id: null,
        user_id: null,
        welcome_text: 'Текст приветствия',
        help_text: 'Текст помощи',
        empty_text: 'Извините, но я вас не понимаю',
        intents: [
            { name: WELCOME_INTENT_NAME, slots: ['привет', 'здравст'] },
            { name: HELP_INTENT_NAME, slots: ['помощ', 'что ты умеешь'] },
        ],
        utm_text: null,
    };

    /**
     * База данных
     */
    #db: DB | undefined;

    /**
     * Кастомный HTTP-клиент для выполнения всех исходящих запросов библиотеки.
     * По умолчанию используется глобальный `fetch`.
     * Вы можете заменить его на любой совместимый клиент (например, axios, undici, got),
     * реализующий интерфейс:
     * ```ts
     * (input: RequestInfo, init?: RequestInit) => Promise<Response>
     * ```
     *      *  Это позволяет:
     * - добавлять retry-логику, таймауты, circuit breaker;
     * - внедрять tracing, метрики или логирование всех запросов;
     * - мокать сетевые вызовы в тестах;
     * - использовать альтернативные HTTP-библиотеки.
     * @example
     * ```ts
     * const bot = new Bot();
     * const ctx = bot.getAppContext();
     * ctx.httpClient = async (url, options) => {
     *   // добавляем таймаут 5 сек
     *   const controller = new AbortController();
     *   const id = setTimeout(() => controller.abort(), 5000);
     *   try {
     *     const res = await fetch(url, { ...options, signal: controller.signal });
     *     clearTimeout(id);
     *     return res;
     *   } catch (e) {
     *     clearTimeout(id);
     *     throw e;
     *   }
     * };
     *```
     */
    public httpClient: THttpClient = global.fetch;

    /**
     * Флаг строгого режима обработки команд и логов.
     *
     * При `true`:
     * - Небезопасные регулярные выражения отклоняются;
     * - Все секреты (токены, ключи) **автоматически маскируются** в логах — даже при использовании кастомного логгера;
     * - Рекомендуется для production-сред.
     *
     * @default false
     */
    public strictMode: boolean = false;

    /**
     * Кастомизация поиска команд.
     */
    public customCommandResolver: TCommandResolver | undefined;

    /**
     * Получить текущее подключение к базе данных
     */
    public get vDB(): DB {
        if (!this.#db) {
            this.#db = new DB(this);
        }
        return this.#db;
    }

    #fileDataBase: IFileDataBase = {};

    /**
     * Возвращает данные из файловой базы данные.
     * Важно!
     * Не рекомендуется использовать без острой необходимости
     */
    public get fDB(): IFileDataBase {
        return this.#fileDataBase;
    }

    /**
     * Закрыть подключение к базе данных
     */
    public async closeDB(): Promise<void> {
        if (this.#db) {
            await this.#db?.close();
            this.#db = undefined;
        }
        DbControllerFile.close(this);
        this.#fileDataBase = {};
        if (this.userDbController) {
            this.userDbController.destroy();
        }
    }

    /**
     * Добавленные команды для обработки
     */
    public commands: Map<string, ICommandParam<any>> = new Map();

    /**
     * Сгруппированные регулярные выражения. Начинает отрабатывать как только было задано более 250 регулярных выражений
     */
    public regexpGroup: Map<string, IGroupData> = new Map();
    #noFullGroups: IGroup | null = null;
    #regExpCommandCount = 0;

    /**
     * Устанавливает режим разработки
     * @param {boolean} isDevMode - Флаг включения режима разработки
     * @remarks В режиме разработки в консоль выводятся все ошибки и предупреждения
     */
    public setDevMode(isDevMode: boolean = false): void {
        this.#isDevMode = isDevMode;
    }

    /**
     * Возвращает текущий режим работы приложения
     * @returns {boolean} true, если включен режим разработки
     */
    public get isDevMode(): boolean {
        return this.#isDevMode;
    }

    /**
     * Установка всех токенов из переменных окружения или параметров
     */
    #setTokens(): void {
        const envVars = this.#getEnvVars();
        if (envVars) {
            this.platformParams = {
                ...this.platformParams,
                viber_token: envVars.VIBER_TOKEN || this.platformParams.viber_token,
                telegram_token: envVars.TELEGRAM_TOKEN || this.platformParams.telegram_token,
                vk_token: envVars.VK_TOKEN || this.platformParams.vk_token,
                max_token: envVars.MAX_TOKEN || this.platformParams.max_token,
                vk_confirmation_token:
                    envVars.VK_CONFIRMATION_TOKEN || this.platformParams.vk_confirmation_token,
                marusia_token: envVars.MARUSIA_TOKEN || this.platformParams.marusia_token,
                yandex_token: envVars.YANDEX_TOKEN || this.platformParams.yandex_token,
            };
        }
    }

    /**
     * Возвращает объект с настройками окружения
     * @param {string|undefined} envPath - Путь к файлу окружения
     */
    #getEnvVars(envPath: string | undefined = this.appConfig?.env): IEnvConfig | undefined {
        if (this.#envVars) {
            return this.#envVars;
        }
        if (envPath) {
            const res = loadEnvFile(envPath);
            if (res.status) {
                this.#envVars = res.data;
            } else {
                let correctEnvValue = {};
                if (process.env) {
                    correctEnvValue = {
                        VIBER_TOKEN: process.env.VIBER_TOKEN,
                        TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
                        VK_TOKEN: process.env.VK_TOKEN,
                        MAX_TOKEN: process.env.MAX_TOKEN,
                        VK_CONFIRMATION_TOKEN: process.env.VK_CONFIRMATION_TOKEN,
                        MARUSIA_TOKEN: process.env.MARUSIA_TOKEN,
                        YANDEX_TOKEN: process.env.YANDEX_TOKEN,
                        DB_HOST: process.env.DB_HOST,
                        DB_USER: process.env.DB_USER,
                        DB_PASSWORD: process.env.DB_PASSWORD,
                        DB_NAME: process.env.DB_NAME,
                    };
                }
                let isError = true;
                Object.values(correctEnvValue).forEach((correctEnvValue) => {
                    if (correctEnvValue) {
                        isError = false;
                    }
                });
                if (isError) {
                    this.logError(
                        (res.error as string) + '. Также не удалось получить данные из process.env',
                    );
                }
            }
        }
        return this.#envVars;
    }

    /**
     * Устанавливает конфигурацию приложения
     * @param {IAppConfig} config - Пользовательская конфигурация
     */
    public setAppConfig(config: IAppConfig): void {
        this.appConfig = { ...this.appConfig, ...config };
        if (config.env) {
            const envVars = this.#getEnvVars(config.env);
            if (envVars) {
                // Пишем в конфиг для подключения к БД, только если есть настройки для подключения
                if (this.appConfig.db || envVars.DB_HOST || envVars.DB_NAME) {
                    this.appConfig.db = {
                        ...this.appConfig.db,
                        host: (envVars.DB_HOST || this.appConfig.db?.host) as string,
                        user: envVars.DB_USER || this.appConfig.db?.user,
                        pass: envVars.DB_PASSWORD || this.appConfig.db?.pass,
                        database: (envVars.DB_NAME || this.appConfig.db?.database) as string,
                    };
                }

                this.#setTokens();
            }
        }
        if (this.appConfig.db && this.appConfig.db.host) {
            this.setIsSaveDb(true);
        }
    }

    /**
     * Устанавливает параметры приложения
     * @param {IAppParam} params - Пользовательские параметры
     */
    public setPlatformParams(params: IAppParam): void {
        this.platformParams = { ...this.platformParams, ...params };
        this.platformParams.intents?.forEach((intent, i) => {
            if (intent.is_pattern) {
                const res = this.#isDangerRegex(intent.slots);
                if (res.slots.length) {
                    if (res.slots.length !== intent.slots.length) {
                        intent.slots = res.slots as string[];
                    }
                } else {
                    delete this.platformParams.intents?.[i];
                }
            }
        });
        this.#setTokens();
    }

    #isRegexLikelySafe(pattern: string, isRegex: boolean): boolean {
        try {
            if (!isRegex) {
                new RegExp(pattern);
            }
            // 1. Защита от слишком длинных шаблонов (DoS через размер)
            if (pattern.length > 1000) {
                return false;
            }

            // 2. Убираем экранированные символы из рассмотрения (упрощённо)
            // Для простоты будем искать только в "сыром" виде — этого достаточно для эвристик

            // 3. Основные ReDoS-эвристики

            // Вложенные квантификаторы: (a+)+, (a*)*, [a-z]+*, и т.п.
            // Ищем: закрывающая скобка или символ класса, за которой следует квантификатор
            const dangerousNested = REG_DANGEROUS.test(pattern);
            if (dangerousNested) {
                return false;
            }

            // Альтернативы с пересекающимися паттернами: (a|aa), (a|a+)
            // Простой признак: один терм — префикс другого
            // Точное определение сложно без AST, но часто такие паттерны содержат:
            // - `|` внутри группы + повторяющиеся символы
            const hasPipeInGroup = REG_PIPE.test(pattern);
            if (hasPipeInGroup) {
                // Дополнительная эвристика: есть ли повторяющиеся символы или квантификаторы?
                if (REG_EV1.test(pattern)) {
                    return false;
                }
                if (REG_EV2.test(pattern)) {
                    return false;
                }
            }

            // Повторяющиеся квантифицируемые группы: (a+){10,100}
            if (REG_REPEAT.test(pattern)) {
                return false;
            }

            // Квантификаторы на "жадных" конструкциях без якорей — сложнее ловить,
            // но если есть .*+ — это почти всегда опасно
            if (REG_BAD.test(pattern)) {
                return false;
            }

            // Слишком глубокая вложенность скобок — признак сложности
            let depth = 0;
            let maxDepth = 0;
            for (let i = 0; i < pattern.length; i++) {
                if (pattern[i] === '\\' && i + 1 < pattern.length) {
                    i++; // пропускаем экранированный символ
                    continue;
                }
                if (pattern[i] === '(') depth++;
                else if (pattern[i] === ')') depth--;
                if (depth < 0) {
                    return false; // некорректная скобочная структура
                }
                if (depth > maxDepth) {
                    maxDepth = depth;
                }
            }
            return maxDepth <= 5;
        } catch {
            return false;
        }
    }

    /**
     * Определяет опасная передана регулярка или нет
     * @param slots
     */
    #isDangerRegex(slots: TSlots | RegExp): IDangerRegex {
        if (isRegex(slots)) {
            if (!this.#isRegexLikelySafe(slots.source, true)) {
                this[this.strictMode ? 'logError' : 'logWarn'](
                    `Найдено небезопасное регулярное выражение, проверьте его корректность: ${slots.source}`,
                    {},
                );
                if (this.strictMode) {
                    return {
                        status: false,
                        slots: [],
                    };
                } else {
                    return { status: true, slots: [slots] };
                }
            }
            return {
                status: true,
                slots: [slots],
            };
        } else {
            const correctSlots: TSlots | undefined = [];
            const errors: string[] | undefined = [];
            slots.forEach((slot) => {
                const slotStr = isRegex(slot) ? slot.source : slot;
                if (this.#isRegexLikelySafe(slotStr, isRegex(slot))) {
                    (correctSlots as TSlots).push(slot);
                } else {
                    (errors as string[]).push(slotStr);
                }
            });
            const status = errors.length === 0;
            if (!status) {
                this[this.strictMode ? 'logError' : 'logWarn'](
                    `Найдены небезопасные регулярные выражения, проверьте их корректность: ${errors.join(', ')}`,
                    {},
                );
                errors.length = 0;
            }
            return { status, slots: this.strictMode ? correctSlots : slots };
        }
    }

    #timeOutReg: ReturnType<typeof setTimeout> | undefined;
    #oldFnGroup: (() => void) | undefined;
    #oldGroupName: string | undefined;

    #getGroupRegExp(
        groupData: IGroupData,
        slots: TSlots,
        group: IGroup,
        useReg: boolean = true,
        isRegUp: boolean = true,
    ): void {
        group.butchRegexp ??= [];
        const parts = slots.map((s) => {
            return `(${typeof s === 'string' ? s : s.source})`;
        });
        const groupIndex = group.butchRegexp.length;
        // Для уменьшения длины регулярного выражения, а также для исключения случая,
        // когда имя команды может быть не корректным для имени группы, сами задаем корректное имя с учетом индекса
        const pat = `(?<_${groupIndex}>${parts?.join('|')})`;
        group.butchRegexp.push(pat);
        group.regExpSize += pat.length;
        const pattern = group.butchRegexp.join('|');
        if (useReg) {
            if (group.name !== this.#oldGroupName && this.#timeOutReg) {
                this.#oldFnGroup?.();
                this.#oldGroupName = group.name;
            }
            if (this.#timeOutReg) {
                clearTimeout(this.#timeOutReg);
                this.#timeOutReg = undefined;
            }
            this.#oldFnGroup = (): void => {
                const pattern = group.butchRegexp.join('|');
                const regExp = getRegExp(pattern);
                if (isRegUp) {
                    // прогреваем регулярку
                    regExp.test('__umbot_testing');
                    regExp.test('');
                }
                groupData.regExp = regExp;
                this.#timeOutReg = undefined;
                this.#oldFnGroup = undefined;
            };

            this.#timeOutReg = setTimeout(this.#oldFnGroup, 100);
            return;
        } else {
            if (this.#timeOutReg && this.#oldGroupName !== group.name) {
                this.#oldFnGroup?.();
            }
            clearTimeout(this.#timeOutReg);
            this.#oldFnGroup = undefined;
            this.#oldGroupName = undefined;
            this.#timeOutReg = undefined;
        }
        groupData.regExp = pattern;
    }

    #addRegexpInGroup(commandName: string, slots: TSlots, isRegexp: boolean): string | null {
        // Если количество команд до 300, то нет необходимости в объединении регулярок, так как это не даст сильного преимущества
        if (this.#regExpCommandCount < 300) {
            return commandName;
        }
        if (isRegexp) {
            if (!this.#isRegexLikelySafe(slots.join('|'), false)) {
                return commandName;
            }
            if (this.#noFullGroups) {
                let groupName = this.#noFullGroups.name;
                let groupData = this.regexpGroup.get(groupName) || { commands: [], regExp: null };
                if (
                    this.#noFullGroups.butchRegexp.length === 1 &&
                    this.#noFullGroups.name !== commandName
                ) {
                    const command = this.commands.get(this.#noFullGroups.name);
                    if (command) {
                        command.regExp = undefined;
                        this.commands.set(this.#noFullGroups.name, command);
                    }
                }
                // В среднем 9 символов зарезервировано под стандартный шаблон для группы регулярки. Даем примерно 60 регулярок по 5 символов
                if (
                    this.#noFullGroups.regLength >= 60 ||
                    (this.#noFullGroups.regExpSize || 0) > 850
                ) {
                    groupData = { commands: [], regExp: null };
                    groupName = commandName;
                    this.#noFullGroups = {
                        name: commandName,
                        regLength: 0,
                        butchRegexp: [],
                        regExpSize: 0,
                    };
                }
                groupData.commands.push(commandName);
                this.#getGroupRegExp(
                    groupData,
                    slots,
                    this.#noFullGroups,
                    this.regexpGroup.size < MAX_COUNT_FOR_GROUP,
                );

                this.regexpGroup.set(groupName, groupData);
                this.#noFullGroups.regLength += slots.length;
                return groupName;
            } else {
                const butchRegexp = [];
                const parts = slots.map((s) => {
                    return `(${typeof s === 'string' ? s : s.source})`;
                });
                butchRegexp.push(`(?<${commandName}>${parts?.join('|')})`);
                const regExp = getRegExp(`${butchRegexp.join('|')}`);
                this.#noFullGroups = {
                    name: commandName,
                    regLength: slots.length,
                    butchRegexp,
                    regExpSize: regExp.source.length,
                };
                this.regexpGroup.set(commandName, {
                    commands: [commandName],
                    regExp,
                });
                return commandName;
            }
        } else {
            if (this.#noFullGroups) {
                if (this.regexpGroup.has(this.#noFullGroups.name)) {
                    const groupCommandCount =
                        this.regexpGroup.get(this.#noFullGroups.name)?.commands?.length || 0;
                    if (groupCommandCount < 2) {
                        this.regexpGroup.delete(this.#noFullGroups.name);
                    }
                }
                this.#noFullGroups = null;
            }
            return null;
        }
    }

    #removeRegexpInGroup(commandName: string): void {
        const getReg = (
            groupData: IGroupData,
            newCommandName: string,
            newCommands: string[],
            group: IGroup,
            useReg: boolean,
        ): void => {
            newCommands.forEach((cName) => {
                const command = this.commands.get(cName);
                if (command) {
                    command.__$groupName = newCommandName;
                    this.commands.set(cName, command);
                    console.log('wtf');
                    this.#getGroupRegExp(groupData, command.slots as TSlots, group, useReg, false);
                }
            });
        };
        if (this.regexpGroup.has(commandName)) {
            const group = this.regexpGroup.get(commandName);
            this.regexpGroup.delete(commandName);
            if (group?.commands?.length) {
                const newCommands = group?.commands.filter((gCommand) => {
                    return gCommand !== commandName;
                }) as string[];
                const newCommandName = newCommands[0];
                const nGroup: IGroup = {
                    name: newCommandName,
                    regLength: 0,
                    butchRegexp: [],
                    regExpSize: 0,
                };
                const groupData: IGroupData = {
                    commands: newCommands,
                    regExp: null,
                };
                getReg(
                    groupData,
                    newCommandName,
                    newCommands,
                    nGroup,
                    typeof group.regExp !== 'string',
                );
                this.regexpGroup.set(newCommandName, groupData);
            }
        } else if (this.commands.has(commandName)) {
            const command = this.commands.get(commandName);
            if (command?.__$groupName && this.regexpGroup.has(command?.__$groupName)) {
                const group = this.regexpGroup.get(command.__$groupName);
                if (group) {
                    const newCommands = group?.commands.filter((gCommand) => {
                        return gCommand !== commandName;
                    }) as string[];
                    const nGroup: IGroup = {
                        name: commandName,
                        regLength: 0,
                        butchRegexp: [],
                        regExpSize: 0,
                    };
                    const groupData: IGroupData = {
                        commands: newCommands,
                        regExp: null,
                    };
                    getReg(
                        groupData,
                        commandName,
                        newCommands,
                        nGroup,
                        typeof group.regExp !== 'string',
                    );
                    this.regexpGroup.set(command.__$groupName, groupData);
                }
            }
        }
    }

    /**
     * Добавляет команду для обработки пользовательских запросов
     *
     * @param {string} commandName - Уникальный идентификатор команды
     * @param {TSlots} slots - Триггеры для активации команды
     *   - Если элемент — строка → ищется как подстрока (`text.includes(...)`).
     *   - Если элемент — RegExp → проверяется как регулярное выражение (`.test(text)`).
     *   - Параметр `isPattern` учитывается **только если в `slots` нет RegExp**.
     *   - При наличии хотя бы одного `RegExp`, `isPattern = false` игнорируется, и каждый элемент
     *     обрабатывается согласно своему типу.
     * @param {ICommandParam['cb']} cb - Функция-обработчик команды
     * @param {boolean} isPattern - Использовать регулярные выражения (по умолчанию false)
     *
     * @example
     * Простая команда со словами:
     * ```typescript
     * appContext.addCommand(
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
     * appContext.addCommand(
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
     * appContext.addCommand(
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
    public addCommand<TBotController extends BotController = BotController>(
        commandName: string,
        slots: TSlots,
        cb?: ICommandParam<TBotController>['cb'],
        isPattern: boolean = false,
    ): void {
        if (commandName === FALLBACK_COMMAND) {
            this.commands.set(commandName, {
                slots: undefined,
                isPattern: false,
                cb,
                regExp: undefined,
                __$groupName: commandName,
            });
            return;
        }
        if (
            this.commands.size === 1e4 ||
            this.commands.size === 5e4 ||
            this.commands.size === 1e5
        ) {
            this.logWarn(
                `Задано более ${this.commands.size} команд, скорей всего команды задаются через цикл, который отработал не корректно. Проверьте корректность работы приложения, а также добавленные команды.`,
            );
        }
        let correctSlots: TSlots = this.strictMode ? [] : slots;
        let regExp;
        let groupName;
        if (isPattern) {
            correctSlots = this.#isDangerRegex(slots).slots;
            if (correctSlots.length) {
                groupName = this.#addRegexpInGroup(commandName, correctSlots, true);
                if (groupName === commandName) {
                    this.#regExpCommandCount++;
                    if (this.#regExpCommandCount < MAX_COUNT_FOR_REG) {
                        regExp = getRegExp(correctSlots);
                        regExp.test('__umbot_testing');
                        regExp.test('');
                    }
                }
            }
        } else {
            this.#addRegexpInGroup(commandName, correctSlots, false);
            for (const slot of slots) {
                if (isRegex(slot)) {
                    const res = this.#isDangerRegex(slot);
                    if (res.status && this.strictMode) {
                        correctSlots.push(slot);
                    }
                } else {
                    if (this.strictMode) {
                        correctSlots.push(slot);
                    }
                }
            }
        }
        if (correctSlots.length) {
            this.commands.set(commandName, {
                slots: correctSlots,
                isPattern,
                cb,
                regExp,
                __$groupName: groupName,
            });
        }
    }

    /**
     * Удаляет команду
     * @param commandName - Имя команды
     */
    public removeCommand(commandName: string): void {
        if (commandName === FALLBACK_COMMAND) {
            this.commands.delete(commandName);
            return;
        }
        if (this.commands.has(commandName)) {
            const command = this.commands.get(commandName);
            if (command?.isPattern && command.regExp) {
                this.#regExpCommandCount--;
                if (this.#regExpCommandCount < 0) {
                    this.#regExpCommandCount = 0;
                }
            }
            this.commands.delete(commandName);
        }
        this.#removeRegexpInGroup(commandName);
    }

    /**
     * Удаляет все команды
     */
    public clearCommands(): void {
        this.commands.clear();
        this.#noFullGroups = null;
        this.#regExpCommandCount = 0;
        this.regexpGroup.clear();
        this.#oldGroupName = undefined;
        this.#oldFnGroup = undefined;
        clearTimeout(this.#timeOutReg);
        this.#timeOutReg = undefined;
    }

    /**
     * Позволяет установить свою реализацию для логирования
     * @param logger
     */
    public setLogger(logger: ILogger | null): void {
        this.#logger = logger;
    }

    /**
     * Логирование информации
     * @param args
     */
    public log(...args: unknown[]): void {
        if (this.#logger?.log) {
            this.#logger.log(...args);
        } else {
            console.log(...args);
        }
    }

    /**
     * Логирование ошибки
     * @param str
     * @param meta
     */
    public logError(str: string, meta?: Record<string, unknown>): void {
        if (this.#logger?.error) {
            this.#logger.error(this.strictMode ? this.#maskSecrets(str) : str, meta);
        } else {
            const metaStr = JSON.stringify({ ...meta, trace: new Error().stack }, null, '\t');
            this.saveLog('error.log', `${str}\n${metaStr}`);
        }
    }

    /**
     * Логирование метрики
     * @param name - имя метрики
     * @param value - значение
     * @param label - Дополнительные метаданные
     */
    public logMetric(name: string, value: unknown, label: Record<string, unknown>): void {
        if (this.#logger?.metric) {
            this.#logger.metric(name, value, label);
        }
    }

    /**
     * Логирование предупреждения
     * @param str
     * @param meta
     */
    public logWarn(str: string, meta?: Record<string, unknown>): void {
        if (this.#logger?.warn) {
            this.#logger.warn(this.strictMode ? this.#maskSecrets(str) : str, {
                ...meta,
                trace: new Error().stack,
            });
        } else {
            if (this.#isDevMode) {
                console.warn(this.strictMode ? this.#maskSecrets(str) : str, meta);
            }
            const metaStr = JSON.stringify({ ...meta, trace: new Error().stack }, null, '\t');
            this.saveLog('warn.log', `${str}\n${metaStr}`);
        }
    }

    /**
     * Устанавливает способ хранения пользовательских данных
     * @param {boolean} isSaveDb - true для сохранения в БД, false для сохранения в файл
     */
    public setIsSaveDb(isSaveDb: boolean = false): void {
        this.isSaveDb = isSaveDb;
    }

    /**
     * Сохраняет данные в JSON файл
     * @param {string} fileName - Имя файла
     * @param {any} data - Данные для сохранения
     * @returns {boolean} true в случае успешного сохранения
     */
    public saveJson(fileName: string, data: any): boolean {
        const dir: IDir = {
            path: this.appConfig.json || __dirname + '/../../json',
            fileName: fileName,
        };
        return saveData(dir, JSON.stringify(data), undefined, true, this.logError.bind(this));
    }

    /**
     * Скрывает секретные данные в тексте
     * @param text
     */
    #maskSecrets(text: string): string {
        return (
            text
                // Telegram bot token
                .replace(/bot\d+:[A-Za-z0-9_-]{30,}/g, 'bot***')
                // VK access token (vk1a...)
                .replace(/vk1a[a-z0-9]{79}/g, 'vk1a***')
                // Общий паттерн для длинных base64-подобных токенов
                .replace(/"access_token"\s*:\s*"([^"]+)"/g, '***')
                .replace(/"client_secret"\s*:\s*"([^"]+)"/g, '***')
                .replace(/"vk_confirmation_token"\s*:\s*"([^"]+)"/g, '***')
                .replace(/"sber_token"\s*:\s*"([^"]+)"/g, '***')
                .replace(/"oauth"\s*:\s*"([^"]+)"/g, '***')
                .replace(/"api_key"\s*:\s*"([^"]+)"/g, '***')
                .replace(/"private_key"\s*:\s*"([^"]+)"/g, '***')
                .replace(/([a-zA-Z0-9]{40,})/g, '***')
        );
    }

    /**
     * Сохраняет лог ошибки
     * @param {string} fileName - Имя файла лога
     * @param {string} errorText - Текст ошибки
     * @returns {boolean} true в случае успешного сохранения
     */
    public saveLog(fileName: string, errorText: string | null = ''): boolean {
        const msg = `[${Date()}]: ${errorText}\n`;

        /*if (this._logger?.error) {
            this._logger.error(`[${fileName}]: ${msg}`, { fileName, trace: new Error().stack });
            return true;
        }*/

        const dir: IDir = { path: this.appConfig.error_log || `${__dirname}/../../logs`, fileName };
        if (this.#isDevMode) {
            console.error(msg);
        }
        return saveData(dir, this.#maskSecrets(msg), 'a', false, this.logError.bind(this));
    }
}
