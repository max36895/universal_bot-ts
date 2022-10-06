/**
 * Модуль отвечающий за отправку запросов
 * @module
 */
import {fread, httpBuildQuery, IGetParams, isFile} from '../../utils/standard/util';
import {IRequestSend} from '../interfaces';

/**
 * Класс отвечающий за отправку curl запросов на необходимый url.
 * Поддерживаются различные заголовки, а также возможность отправки файлов.
 *
 * @class Request
 */
export class Request {
    public static readonly HEADER_FORM_DATA: Record<string, string> = {'Content-Type': 'multipart/form-data'};
    public static readonly HEADER_RSS_XML: Record<string, string> = {'Content-Type': 'application/rss+xml'};
    public static readonly HEADER_AP_JSON: Record<string, string> = {'Content-Type': 'application/json'};
    public static readonly HEADER_AP_XML: Record<string, string> = {'Content-Type': 'application/xml'};
    public static readonly HEADER_GZIP: Record<string, string> = {'Content-Encoding': 'gzip'};

    /**
     * Адрес, на который отправляется запрос.
     */
    public url: string | null;
    /**
     * Get параметры запроса.
     */
    public get: IGetParams | null;
    /**
     * Post параметры запроса.
     */
    public post: any;
    /**
     * Отправляемые заголовки.
     */
    public header: HeadersInit | null;
    /**
     * Прикреплённый файл (url, путь к файлу на сервере либо содержимое файла).
     */
    public attach: string | null;
    /**
     * Тип передаваемого файла.
     * True, если передается содержимое файла, иначе false. По умолчанию: false.
     * @defaultValue false
     */
    public isAttachContent: boolean;
    /**
     * Название параметра при отправке файла (По умолчанию file).
     * @defaultValue file
     */
    public attachName: string;
    /**
     * Кастомный (Пользовательский) заголовок (DELETE и тд.).
     */
    public customRequest: string | null;
    /**
     * Максимально время, за которое должен быть получен ответ. В мсек.
     */
    public maxTimeQuery: number | null;
    /**
     * Преобразовать формат ответа в json.
     * True, если полученный ответ нужно преобразовать в json. По умолчанию true.
     * @defaultValue true
     */
    public isConvertJson: boolean;

    /**
     * Ошибки при выполнении запроса.
     */
    private _error: string | null;

    private _setTimeOut: NodeJS.Timeout | null;

    /**
     * Request constructor.
     */
    public constructor() {
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
    }

    /**
     * Отправка запроса.
     * Возвращаем объект. В случае успеха свойство 'status' = true.
     *
     * @param {string} url Адрес, на который отправляется запрос.
     * @return Promise<IRequestSend>
     * [
     *  - bool status Статус выполнения запроса.
     *  - mixed data Данные полученные при выполнении запроса.
     * ]
     * @api
     */
    public async send<T>(url: string | null = null): Promise<IRequestSend<T>> {
        if (url) {
            this.url = url;
        }

        this._error = null;
        const data: any = await this._run();
        if (this._error) {
            return {status: false, data: null, err: this._error};
        }
        return {status: true, data};
    }

    /**
     * Получение url адреса с get запросом.
     *
     * @return string
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
     * Начинаем отправку fetch запроса.
     * В случае успеха возвращаем содержимое запроса, в противном случае null.
     *
     * @return Promise<any>
     */
    private async _run<T>(): Promise<T | string | null> {
        if (this.url) {
            try {
                const response = await fetch(this._getUrl(), this._getOptions());
                if (this._setTimeOut) {
                    clearTimeout(this._setTimeOut);
                    this._setTimeOut = null;
                }
                if (response.ok) {
                    if (this.isConvertJson) {
                        return await response.json();
                    }
                    return await response.text();
                }
                this._error = 'Не удалось получить данные с ' + this.url;
            } catch (e) {
                this._error = (e as DOMException).message;
            }
        } else {
            this._error = 'Не указан url!';
        }
        return null;
    }

    /**
     * Получение корректного параметра для отправки запроса.
     * @return RequestInit
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

        let post: object | null = null;
        if (this.attach) {
            if (isFile(this.attach)) {
                post = Request.getAttachFile(this.attach, this.attachName);
            } else {
                this._error = `Не удалось найти файл: ${this.attach}`;
                return;
            }
        }
        if (this.post) {
            post = {...post, ...this.post};
        }
        if (post) {
            options.method = 'POST';
            options.body = JSON.stringify(post);
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
     * Получение содержимого файла, пригодного для отправки в запросе
     * @param {string} filePath Расположение файла
     * @param {string} fileName Имя файла
     */
    public static getAttachFile(filePath: string, fileName?: string): FormData | null {
        if (!filePath && !fileName) {
            return null;
        }
        if (!fileName) {
            const match = filePath.match(/((\/|\\|^)(\w+)\.(\w{1,6})$)/);
            fileName = (match ? match[0] : filePath);
        }
        const form = new FormData();
        const buffer = fread(filePath);
        form.append("Content-Type", "application/octect-stream");
        form.append(fileName, buffer);
        return form;
    }

    /**
     * Возвращает текст с ошибкой, произошедшей при выполнении запроса.
     *
     * @return string
     * @api
     */
    public getError(): string | null {
        return this._error;
    }
}
