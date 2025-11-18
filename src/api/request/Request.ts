/**
 * Модуль для отправки HTTP-запросов.
 * Предоставляет функционал для работы с различными типами запросов и ответов
 */
import { httpBuildQuery, IGetParams, isFile } from '../../utils';
import { IRequestSend } from '../interfaces';
import { AppContext, EMetric, THttpClient } from '../../core';
import fs from 'fs';
import { basename } from 'path';

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

    /**
     * Понимает что возвращается бинарный ответ
     */
    public isBinaryResponse: boolean = false;

    /** Текст ошибки при выполнении запроса */
    #error: Error | string | null;

    /**
     * Контекст приложения
     */
    #appContext?: AppContext;

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
        this.#error = null;
        this.isBinaryResponse = false;
        this.#appContext = appContext;
    }

    /**
     * Устанавливает контекст приложения
     * @param appContext
     */
    public setAppContext(appContext: AppContext): void {
        if (appContext) {
            this.#appContext = appContext;
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

        this.#error = null;
        const data = (await this.#run()) as T;
        this.attachName = 'file';
        this.attach = null;
        this.post = null;
        if (this.#error) {
            return { status: false, data: null, err: this.#error };
        }
        return { status: true, data };
    }

    /**
     * Формирует URL с GET-параметрами
     *
     * @returns {string} Полный URL с параметрами
     */
    protected _getUrl(): string {
        let url: string = this.url || '';
        if (this.get) {
            url += '?' + httpBuildQuery(this.get);
        }
        return url;
    }

    /**
     * Возвращает функцию для отправки запроса
     */
    #getHttpClient(): THttpClient {
        if (this.#appContext?.httpClient) {
            return this.#appContext?.httpClient;
        }
        return fetch;
    }

    /**
     * Выполняет HTTP-запрос
     *
     * @returns {Promise<T|string|null>} Ответ сервера или null в случае ошибки
     */
    async #run<T>(): Promise<T | string | null> {
        if (this.url) {
            try {
                const start = performance.now();
                const response = await this.#getHttpClient()(this._getUrl(), this._getOptions());
                this.#appContext?.logMetric(EMetric.REQUEST, performance.now() - start, {
                    url: this.url,
                    method: this.customRequest || 'POST',
                    status: response.status || 0,
                });
                if (response.ok) {
                    if (this.isConvertJson) {
                        return await response.json();
                    }
                    if (this.isBinaryResponse) {
                        return (await response.arrayBuffer()) as T;
                    }
                    return await response.text();
                }
                this.#error = 'Не удалось получить данные с ' + this.url;
            } catch (e) {
                this.#error = e as Error;
            }
        } else {
            this.#error = 'Не указан url!';
        }
        return null;
    }

    /**
     * Формирует параметры для http запроса
     *
     * @returns {RequestInit|undefined} Параметры запроса
     */
    protected _getOptions(): RequestInit | undefined {
        const options: RequestInit = {};

        if (this.maxTimeQuery) {
            options.signal = AbortSignal.timeout(this.maxTimeQuery);
        }

        let post: BodyInit | null = null;
        if (this.attach) {
            if (isFile(this.attach)) {
                const formData = this.getAttachFile(this.attach, this.attachName);
                if (!formData) {
                    this.#error = `Не удалось прочитать файл: ${this.attach}`;
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
                this.#error = `Не удалось найти файл: ${this.attach}`;
                return;
            }
        } else if (this.post) {
            if (typeof this.post !== 'string' && !(this.post instanceof FormData)) {
                post = JSON.stringify(this.post);
            } else {
                post = this.post;
            }
        }

        if (post) {
            options.body = post;
            options.method = this.customRequest || 'POST';
            options.headers = this.header || Request.HEADER_AP_JSON;
        }
        if (this.header) {
            options.headers = this.header;
        }

        if (post instanceof FormData && options.headers) {
            const headers = new Headers(options.headers);
            headers.delete('Content-Type');
            options.headers = headers;
        }

        if (this.customRequest) {
            options.method = this.customRequest;
        }

        return options;
    }

    /**
     * Добавляет файл в FormData
     * @param formData
     * @param filePath
     * @param fileName
     */
    public addAttachFile(formData: FormData, filePath: string, fileName?: string): void {
        const fileResult = fs.readFileSync(filePath);
        if (fileResult) {
            const fileBlob = new Blob([fileResult]);
            formData.append(fileName || 'file', fileBlob, basename(filePath));
        }
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
            this.addAttachFile(formData, filePath, fileName);
            return formData;
        } catch (e) {
            if (this.#appContext?.logError) {
                this.#appContext?.logError(
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
    public getError(): Error | string | null {
        return this.#error;
    }
}
