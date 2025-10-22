/**
 * Модуль для отправки HTTP-запросов.
 * Предоставляет функционал для работы с различными типами запросов и ответов
 *
 * @module api/request/Request
 */
import { fread, httpBuildQuery, IGetParams, isFile } from '../../utils';
import { IRequestSend } from '../interfaces';
import { AppContext, THttpClient } from '../../core';

/**
 * Класс для отправки HTTP-запросов.
 * Поддерживает различные типы запросов, заголовки и отправку файлов
 *
 * @class Request
 */
export class Request {
    /** Заголовок для отправки form-data */
    public static readonly HEADER_FORM_DATA: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
    };

    /** Заголовок для RSS/XML контента */
    public static readonly HEADER_RSS_XML: Record<string, string> = {
        'Content-Type': 'application/rss+xml',
    };

    /** Заголовок для JSON контента */
    public static readonly HEADER_AP_JSON: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    /** Заголовок для XML контента */
    public static readonly HEADER_AP_XML: Record<string, string> = {
        'Content-Type': 'application/xml',
    };

    /** Заголовок для сжатого контента */
    public static readonly HEADER_GZIP: Record<string, string> = { 'Content-Encoding': 'gzip' };

    /** URL для отправки запроса */
    public url: string | null;

    /** GET-параметры запроса */
    public get: IGetParams | null;

    /** POST-параметры запроса */
    public post: any;

    /** HTTP-заголовки запроса */
    public header: HeadersInit | null;

    /** Прикрепленный файл (URL, путь или содержимое) */
    public attach: string | null;

    /**
     * Тип передаваемого файла
     * true - передается содержимое файла
     * false - передается путь к файлу
     * @defaultValue false
     */
    public isAttachContent: boolean;

    /**
     * Имя параметра при отправке файла
     * @defaultValue file
     */
    public attachName: string;

    /** Кастомный HTTP-метод (DELETE и т.д.) */
    public customRequest: string | null;

    /** Максимальное время ожидания ответа (мс) */
    public maxTimeQuery: number | null;

    /**
     * Преобразование ответа в JSON
     * true - ответ будет преобразован в JSON
     * false - ответ будет возвращен как текст
     * @defaultValue true
     */
    public isConvertJson: boolean;

    /** Текст ошибки при выполнении запроса */
    private _error: string | null;

    /** Таймер для отмены запроса */
    private _setTimeOut: NodeJS.Timeout | null;
    /**
     * Понимает что возвращается бинарный ответ
     */
    public isBinaryResponse: boolean = false;

    /**
     * Контекст приложения
     */
    private _appContext?: AppContext;

    /**
     * Создает новый экземпляр Request.
     * Инициализирует все поля значениями по умолчанию
     */
    public constructor(appContext: AppContext) {
        this.url = null;
        this.get = null;
        this.post = null;
        this.header = null;
        this.attach = null;
        this.isAttachContent = false;
        this.attachName = 'file';
        this.customRequest = null;
        this.maxTimeQuery = null;
        this.isConvertJson = true;
        this._error = null;
        this._setTimeOut = null;
        this.isBinaryResponse = false;
        this._appContext = appContext;
    }

    /**
     * Устанавливает контекст приложения
     * @param appContext
     */
    public setAppContext(appContext: AppContext) {
        if (appContext) {
            this._appContext = appContext;
        }
    }

    /**
     * Отправляет HTTP-запрос
     *
     * @param {string} [url] - URL для отправки запроса (если не указан, используется this.url)
     * @returns {Promise<IRequestSend<T>>} Результат выполнения запроса
     */
    public async send<T>(url: string | null = null): Promise<IRequestSend<T>> {
        if (url) {
            this.url = url;
        }

        this._error = null;
        const data = (await this._run()) as T;
        if (this._error) {
            return { status: false, data: null, err: this._error };
        }
        return { status: true, data };
    }

    /**
     * Формирует URL с GET-параметрами
     *
     * @returns {string} Полный URL с параметрами
     * @private
     */
    protected _getUrl(): string {
        let url: string = this.url || '';
        if (this.get) {
            url += '?' + httpBuildQuery(this.get);
        }
        return url;
    }

    /**
     * Очищает таймер отмены запроса
     * @private
     */
    private _clearTimeout(): void {
        if (this._setTimeOut) {
            clearTimeout(this._setTimeOut);
            this._setTimeOut = null;
        }
    }

    /**
     * Возвращает функцию для отправки запроса
     */
    private _getHttpClient(): THttpClient {
        if (this._appContext?.httpClient) {
            return this._appContext?.httpClient;
        }
        return fetch;
    }

    /**
     * Выполняет HTTP-запрос
     *
     * @returns {Promise<T|string|null>} Ответ сервера или null в случае ошибки
     * @private
     */
    private async _run<T>(): Promise<T | string | null> {
        if (this.url) {
            try {
                this._clearTimeout();
                const response = await this._getHttpClient()(this._getUrl(), this._getOptions());
                this._clearTimeout();
                if (response.ok) {
                    if (this.isConvertJson) {
                        return await response.json();
                    }
                    if (this.isBinaryResponse) {
                        return (await response.arrayBuffer()) as T;
                    }
                    return await response.text();
                }
                this._error = 'Не удалось получить данные с ' + this.url;
            } catch (e) {
                this._error = e instanceof Error ? e.message : String(e);
            }
        } else {
            this._error = 'Не указан url!';
        }
        return null;
    }

    /**
     * Формирует параметры для http запроса
     *
     * @returns {RequestInit|undefined} Параметры запроса
     * @private
     */
    protected _getOptions(): RequestInit | undefined {
        const options: RequestInit = {};

        if (this.maxTimeQuery) {
            const controller = new AbortController();
            const signal: AbortSignal = controller.signal;
            this._setTimeOut = setTimeout(() => controller.abort(), this.maxTimeQuery);
            options.signal = signal;
        }

        let post: BodyInit | null = null;
        if (this.attach) {
            if (isFile(this.attach)) {
                const formData = this.getAttachFile(this.attach, this.attachName);
                if (!formData) {
                    this._error = `Не удалось прочитать файл: ${this.attach}`;
                    return;
                }
                // Добавляем дополнительные поля из this.post в FormData
                if (this.post && typeof this.post === 'object') {
                    for (const [key, value] of Object.entries(this.post)) {
                        formData.append(key, String(value));
                    }
                }
                post = formData;
            } else {
                this._error = `Не удалось найти файл: ${this.attach}`;
                return;
            }
        } else if (this.post) {
            post = JSON.stringify(this.post);
        }

        if (post) {
            options.body = post;
        }

        if (this.header) {
            options.headers = this.header;
        }

        if (this.customRequest) {
            options.method = this.customRequest;
        }

        return options;
    }

    /**
     * Создает FormData для отправки файла
     *
     * @param {string} filePath - Путь к файлу
     * @param {string} [fileName] - Имя файла
     * @returns {FormData|null} FormData с файлом или null в случае ошибки
     */
    public getAttachFile(filePath: string, fileName?: string): FormData | null {
        try {
            const formData = new FormData();
            const fileResult = fread(filePath);
            if (fileResult.data) {
                const blob = new Blob([fileResult.data], { type: 'application/octet-stream' });
                formData.append(fileName || 'file', blob);
                return formData;
            }
        } catch (e) {
            if (this._appContext?.logError) {
                this._appContext?.logError(
                    'Ошибка при чтении файла:',
                    e as Record<string, unknown>,
                );
            }
        }
        return null;
    }

    /**
     * Возвращает текст последней ошибки
     *
     * @returns {string|null} Текст ошибки или null
     */
    public getError(): string | null {
        return this._error;
    }
}
