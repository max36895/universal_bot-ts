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
 * ```ts
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
 * ```
 */
import { IDatabaseAdapter, IDatabaseInfo, IPlatform } from './interfaces/IBot';
import { ILogger } from './interfaces/ILogger';
import {
    IAppConfig,
    IAppParam,
    TAppMode,
    THttpClient,
    IDir,
    TAppPlugin,
} from './interfaces/IAppContext';

import { CommandReg, ICommandParam, IGroupData, IStepParam } from './utils/CommandReg';
import { IEnvConfig, loadEnvFile } from '../utils/EnvConfig';
import { saveData } from '../utils';
import * as process from 'node:process';
import { join } from 'node:path';

/**
 * Тип платформы: Автоопределение
 */
export const T_AUTO = 'auto';

/**
 * Идентификатор интента приветствия
 */
export const WELCOME_INTENT_NAME = 'welcome';

/**
 * Идентификатор интента помощи
 */
export const HELP_INTENT_NAME = 'help';

const regBot = /bot\d+:[A-Za-z0-9_-]{35,}/g;
const regVk = /vk1a[a-z0-9]{79}/g;
const regVk2 =
    /("access_token"\s*:|client_secret|vk_confirmation_token|sber_token|oauth|api_key|private_key)\s*:\s*"([^"]{8,})"/g;
const regToken = /"[A-Za-z0-9+/=]{30,256}"/g;
const regToken2 = /\b[A-Za-z0-9]{64,256}\b/g;

interface IErrWarnData {
    errors: string[];
    warnings: string[];
    timeout: ReturnType<typeof setTimeout> | null;
}

/**
 * Внутренний класс для хранения состояния и конфигурации приложения
 * @internal Используется внутри Bot для хранения состояния и конфигурации
 *
 * @remarks
 * Разработчикам обычно НЕ нужно создавать экземпляры этого класса напрямую.
 * Вместо этого используйте методы класса {@link Bot}:
 * - `bot.getAppContext()` - получить доступ к контексту
 * - `bot.setAppConfig()` - настроить конфигурацию
 * - `bot.setPlatformParams()` - настроить параметры платформ
 *
 * Этот класс содержит:
 * - Конфигурацию приложения (IAppConfig)
 * - Параметры платформ (IAppParam)
 * - Регистрацию команд и интентов
 * - Логирование и метрики
 * - Подключение к БД
 *
 * @example
 * ```ts
 * // НЕ ТАК:
 * const appContext = new AppContext();
 *
 * // ТАК (правильно):
 * const bot = new Bot();
 * const appContext = bot.getAppContext(); // если нужен прямой доступ
 * ```
 */
export class AppContext<TDbInfo = IDatabaseInfo> {
    /**
     * Список подключенных платформ
     */
    platforms: IPlatform = {};

    /**
     * Список подключенных плагинов
     */
    plugins: TAppPlugin = {};
    /**
     * Информация по подключению к базе данных.
     */
    database: {
        /**
         * Адаптер для работы с базой данных
         */
        adapter?: IDatabaseAdapter;
        /**
         * Данные, необходимые адаптеру для работы
         */
        databaseInfo?: TDbInfo;
        /**
         * Флаг, определяющий вызывался метод для подключения к базе данных или нет
         */
        isSendConnect?: boolean;
    } = {};

    #errWarnData: IErrWarnData = {
        errors: [],
        warnings: [],
        timeout: null,
    };

    #logErrorBind = this.logError.bind(this);

    /**
     * Все зарегистрированные команды и шаги
     */
    public command: CommandReg = new CommandReg(
        {
            warn: this.logWarn.bind(this),
            error: this.#logErrorBind,
        },
        this.plugins,
    );

    /**
     * Получение всех зарегистрированных команд
     */
    public get commands(): Map<string, ICommandParam> {
        return this.command.commands;
    }

    /**
     * Получение всех зарегистрированных шагов
     */
    public get steps(): Map<string, IStepParam> {
        return this.command.steps;
    }

    /**
     * Получение всех зарегистрированных команд, которые распределены по группам.
     * В группу добавляются только команды с регулярными выражениями.
     * Группы используются для оптимизации поиска нужной команды
     */
    public get regexpGroup(): Map<string, IGroupData> {
        return this.command.regexpGroup;
    }

    /**
     * Переменные окружения
     */
    #envVars: IEnvConfig | undefined;

    /**
     * Кастомный логгер приложения
     */
    #logger: ILogger | null = null;

    /**
     * Конфигурация приложения
     */
    public appConfig: Required<IAppConfig> = {
        error_log: join(__dirname, '..', '..', 'logs'),
        json: join(__dirname, '..', '..', 'json'),
        db: { host: '', user: '', pass: '', database: '' },
        isLocalStorage: false,
        tokens: {},
        env: '',
    };

    /**
     * Параметры приложения
     */
    public platformParams: IAppParam = {
        isAuthUser: false,
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
     * Кастомный HTTP-клиент для выполнения всех исходящих запросов фреймворка.
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
     * Определяет режим работы приложения
     */
    public appMode: TAppMode = 'dev';

    /**
     * Закрывает все подключения, для корректного завершения работы приложения
     */
    public async close(): Promise<void> {
        this.#saveErrorData();
        if (this.database.adapter && this.database.isSendConnect) {
            return this.database.adapter.destroy();
        }
    }

    /**
     * Установка всех токенов из переменных окружения или параметров
     */
    #setTokens(): void {
        const envVars = this.#getEnvVars();
        if (envVars) {
            // Не самое хорошее решение, но возможно этот вариант кому-то удобен
            if (envVars.VIBER_TOKEN) {
                this.appConfig.tokens.viber ??= {};
                this.appConfig.tokens.viber.token = envVars.VIBER_TOKEN;
            }

            if (envVars.TELEGRAM_TOKEN) {
                this.appConfig.tokens.telegram ??= {};
                this.appConfig.tokens.telegram.token = envVars.TELEGRAM_TOKEN;
            }

            if (envVars.VK_TOKEN) {
                this.appConfig.tokens.vk ??= {};
                this.appConfig.tokens.vk.token = envVars.VK_TOKEN;
                this.appConfig.tokens.vk.confirmation_token =
                    envVars.VK_CONFIRMATION_TOKEN || this.appConfig.tokens.vk.confirmation_token;
            }

            if (envVars.MAX_TOKEN) {
                this.appConfig.tokens.max_app ??= {};
                this.appConfig.tokens.max_app.token = envVars.MAX_TOKEN;
            }

            if (envVars.MARUSIA_TOKEN) {
                this.appConfig.tokens.marusia ??= {};
                this.appConfig.tokens.marusia.token = envVars.MARUSIA_TOKEN;
            }

            if (envVars.YANDEX_TOKEN) {
                this.appConfig.tokens.alisa ??= {};
                this.appConfig.tokens.alisa.token = envVars.YANDEX_TOKEN;
            }
        }
    }

    /**
     * Возвращает объект с настройками окружения
     * @param {string|undefined} envPath - Путь к файлу окружения
     */
    #getEnvVars(envPath: string | undefined = this.appConfig?.env): IEnvConfig | undefined {
        const setEnvFn = (errorMsg: string): void => {
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
                this.logError('AppContext: ' + errorMsg);
            } else {
                this.#envVars = correctEnvValue;
            }
        };
        if (envPath === 'local') {
            setEnvFn('Не удалось получить данные из process.env');
            // Возвращаем результаты сразу, чтобы не возникло ситуации, когда пытается прочитать файл local
            return this.#envVars;
        }
        if (this.#envVars) {
            return this.#envVars;
        }
        if (envPath) {
            const res = loadEnvFile(envPath);
            if (res.status) {
                this.#envVars = res.data;
            } else {
                setEnvFn(
                    (res.error as string) + '. Также не удалось получить данные из process.env',
                );
            }
        }
        return this.#envVars;
    }

    /**
     * Устанавливает конфигурацию приложения
     * @param {IAppConfig} config - Пользовательская конфигурация
     */
    public setAppConfig(config: Partial<IAppConfig>): void {
        this.appConfig = { ...this.appConfig, ...config };
        if (config.env) {
            const envVars = this.#getEnvVars(config.env);
            if (envVars) {
                // Пишем в конфиг для подключения к БД, только если есть настройки для подключения
                if (this.appConfig.db || envVars.DB_HOST || envVars.DB_NAME) {
                    this.appConfig.db = {
                        ...this.appConfig.db,
                        host: envVars.DB_HOST || this.appConfig.db?.host,
                        user: envVars.DB_USER || this.appConfig.db?.user,
                        pass: envVars.DB_PASSWORD || this.appConfig.db?.pass,
                        database: envVars.DB_NAME || this.appConfig.db?.database,
                    };
                }

                this.#setTokens();
            }
        }
    }

    /**
     * Устанавливает параметры приложения
     * @param {IAppParam} params - Пользовательские параметры
     */
    public setPlatformParams(params: IAppParam): void {
        this.platformParams = { ...this.platformParams, ...params };
        this.platformParams.intents =
            this.platformParams.intents?.filter((intent) => {
                if (intent.is_pattern) {
                    const res = this.command.isDangerRegex(intent.slots);
                    if (res.slots.length) {
                        if (res.slots.length !== intent.slots.length) {
                            intent.slots = res.slots as string[];
                        }
                        return true;
                    }
                    return false;
                }
                return true;
            }) || [];
        this.#setTokens();
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
            this.#logger.error(
                this.appMode.includes('strict') ? this.#maskSecrets(str) : str,
                meta,
            );
        } else {
            this.#errWarnLog(
                `${str}\n${JSON.stringify({ ...meta, trace: new Error().stack }, null, '\t')}`,
                true,
            );
        }
    }

    /**
     * Возвращает флаг, который говорит о том необходимо собирать метрики или нет
     */
    public get usedMetric(): boolean {
        return !!this.#logger?.metric;
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

    #saveErrorData(): void {
        if (this.#errWarnData.timeout) {
            clearTimeout(this.#errWarnData.timeout);
        }
        if (this.#errWarnData.warnings.length) {
            this.#saveLog('warn.log', this.#errWarnData.warnings.join('\n'), false);
        }
        if (this.#errWarnData.errors.length) {
            this.#saveLog('error.log', this.#errWarnData.errors.join('\n'), false);
        }
        this.#errWarnData.errors = [];
        this.#errWarnData.warnings = [];
        this.#errWarnData.timeout = null;
    }

    #errWarnLog(msg: string, isError: boolean): void {
        if (isError) {
            this.#errWarnData.errors.push(`[${new Date().toISOString()}]: ${msg}`);
        } else {
            this.#errWarnData.warnings.push(`[${new Date().toISOString()}]: ${msg}`);
        }
        if (!this.#errWarnData.timeout) {
            this.#errWarnData.timeout = setTimeout(() => {
                this.#errWarnData.timeout = null;
                this.#saveErrorData();
            }, 200);
        }
    }

    /**
     * Логирование предупреждения
     * @param str
     * @param meta
     */
    public logWarn(str: string, meta?: Record<string, unknown>): void {
        if (this.#logger?.warn) {
            this.#logger.warn(this.appMode.includes('strict') ? this.#maskSecrets(str) : str, {
                ...meta,
                trace: new Error().stack,
            });
        } else {
            if (this.appMode === 'dev') {
                console.warn(this.appMode.includes('strict') ? this.#maskSecrets(str) : str, meta);
            }
            this.#errWarnLog(
                `${str}\n${JSON.stringify({ ...meta, trace: new Error().stack }, null, '\t')}`,
                false,
            );
        }
    }

    /**
     * Сохраняет данные в JSON файл
     * @param {string} fileName - Имя файла
     * @param {any} data - Данные для сохранения
     * @returns {boolean} true в случае успешного сохранения
     */
    public saveFileData(fileName: string, data: unknown): boolean {
        const dir: IDir = {
            path: this.appConfig.json || join(__dirname, '..', '..', 'json'),
            fileName: fileName,
        };
        return saveData(dir, JSON.stringify(data), undefined, true, this.#logErrorBind);
    }

    /**
     * Скрывает секретные данные в тексте
     * @param text
     */
    #maskSecrets(text: string): string {
        if (!text) {
            return text;
        }

        // Определите список паттернов как массив
        const patterns = [
            { regex: regBot, replacement: 'bot***' },
            { regex: regVk, replacement: 'vk1a***' },
            {
                regex: regVk2,
                replacement: '$1:"***"',
            },
            { regex: regToken, replacement: '"***"' },
            { regex: regToken2, replacement: '***' },
        ];

        let result = text;

        for (const { regex, replacement } of patterns) {
            result = result.replace(regex, replacement);
        }

        return result;
    }

    /**
     * Сохраняет лог ошибки
     * @param {string} fileName - Имя файла лога
     * @param {string} errorText - Текст ошибки
     * @param {boolean} usedDate - Флаг, говорящий о том, нужно ли добавлять время или нет.
     * @returns {boolean} true в случае успешного сохранения
     */
    #saveLog(fileName: string, errorText: string | null = '', usedDate: boolean = true): boolean {
        const msg = `${usedDate ? `[${new Date().toISOString()}]: ` : ''}${errorText}\n`;
        const dir: IDir = {
            path: this.appConfig.error_log || join(__dirname, '..', '..', 'json'),
            fileName,
        };
        if (this.appMode === 'dev') {
            console.error(msg);
        }
        return saveData(dir, this.#maskSecrets(msg), 'a', false, this.#logErrorBind);
    }
}
