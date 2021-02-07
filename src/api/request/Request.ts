import {http_build_query, IGetParams, is_file} from "../../utils";
import {IRequestSend} from "../interfaces/IRequest";

/**
 * Класс отвечающий за отправку curl запросов на необходимый url.
 * Поддерживаются различные заголовки, а также присутствует возможность отправки файлов.
 *
 * @class Request
 */
export class Request {
    public static readonly HEADER_RSS_XML: Record<string, string> = {'Content-Type': 'application/rss+xml'};
    public static readonly HEADER_GZIP: Record<string, string> = {'Content-Encoding': 'gzip'};
    public static readonly HEADER_AP_JSON: Record<string, string> = {'Content-Type': 'application/json'};
    public static readonly HEADER_AP_XML: Record<string, string> = {'Content-Type': 'application/xml'};
    public static readonly HEADER_FORM_DATA: Record<string, string> = {'Content-Type': 'multipart/form-data'};

    /**
     * Адрес, на который отправляется запрос.
     */
    public url: string;
    /**
     * Get параметры запроса.
     */
    public get: IGetParams;
    /**
     * Post параметры запроса.
     */
    public post: any;
    /**
     * Отправляемые заголовки.
     */
    public header: HeadersInit;
    /**
     * Прикреплённый файл (url, путь к файлу на сервере либо содержимое файла).
     */
    public attach: string;
    /**
     * Тип передаваемого файла.
     * True, если передается содержимое файла, иначе false. По умолчанию: false.
     */
    public isAttachContent: boolean;
    /**
     * Название параметра при отправке файла (По умолчанию file).
     */
    public attachName: string;
    /**
     * Кастомный (Пользовательский) заголовок (DELETE и тд.).
     */
    public customRequest: string;
    /**
     * Максимально время, за которое должен быть получен ответ. В мсек.
     */
    public maxTimeQuery: number;
    /**
     * Формат ответа.
     * True, если полученный ответ нужно преобразовать как json. По умолчанию true.
     */
    public isConvertJson: boolean;

    /**
     * Ошибки при выполнении запроса.
     */
    private _error: string;

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
        this._error = '';
    }

    /**
     * Возвращаем текст с ошибкой, произошедшей при выполнении запроса.
     *
     * @return string
     * @api
     */
    public getError(): string {
        return this._error;
    }

    /**
     * Получение корректного  параметра для отправки запроса.
     * @return RequestInit
     * @private
     */
    protected _getOptions(): RequestInit {
        const options: RequestInit = {};

        if (this.maxTimeQuery) {
            const controller = new AbortController();
            const signal: AbortSignal = controller.signal;
            const timeoutId = setTimeout(() => controller.abort(), this.maxTimeQuery);
            options.signal = signal;
        }

        let post: object = {};
        if (this.attach) {
            if (is_file(this.attach)) {
                post = {...post, [this.attachName]: `@${this.attach}`};
            } else {
                this._error = `Не удалось найти файл: ${this.attach}`;
                return null;
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
     * Получение url адреса с get запросом.
     *
     * @return string
     * @private
     */
    protected _getUrl(): string {
        let url: string = this.url;
        if (this.get) {
            url += '?' + http_build_query(this.get);
        }
        return url;
    }

    /**
     * Начинаем отправку fetch запроса.
     * В случае успеха возвращаем содержимое запроса, в противном случае null.
     *
     * @return Promise<any>
     */
    private async _run(): Promise<any> {
        if (this.url) {
            const response = await fetch(this._getUrl(), this._getOptions());
            if (response.ok) {
                if (this.isConvertJson) {
                    return await response.json();
                }
                return await response.text();
            }
            this._error = 'Не удалось получить данные с ' + this.url;
        } else {
            this._error = 'Не указан url!';
        }
        return null;
    }

    /**
     * Отправка запроса.
     * Возвращаем массив. В случае успеха свойство 'status' = true.
     *
     * @param {string} url Адрес, на который отправляется запрос.
     * @return Promise<IRequestSend>
     * [
     *  - bool status Статус выполнения запроса.
     *  - mixed data Данные полученные при выполнении запроса.
     * ]
     * @api
     */
    public async send(url: string = null): Promise<IRequestSend> {
        if (url) {
            this.url = url;
        }

        this._error = null;
        const data: any = await this._run();
        if (this._error) {
            return {status: false, err: this._error};
        }
        return {status: true, data};
    }
}
