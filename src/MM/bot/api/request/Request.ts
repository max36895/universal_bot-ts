import {http_build_query, IGetParams, is_file} from "../../utils/functins";
import {IRequestSend} from "../interfaces/IRequest";

/**
 * Class Request
 *
 * Класс для отправки curl запросов на необходимый url.
 * Поддерживаются различные заголовки, а также есть возможность отправки файлов.
 *
 * @package bot\api\request
 */
export class Request {
    public static readonly HEADER_RSS_XML: Record<string, string> = {'Content-Type': 'application/rss+xml'};
    public static readonly HEADER_GZIP: Record<string, string> = {'Content-Encoding': 'gzip'};
    public static readonly HEADER_AP_JSON: Record<string, string> = {'Content-Type': 'application/json'};
    public static readonly HEADER_AP_XML: Record<string, string> = {'Content-Type': 'application/xml'};
    public static readonly HEADER_FORM_DATA: Record<string, string> = {'Content-Type': 'multipart/form-data'};

    /**
     * Адрес, на который будет отправляться запрос.
     * @var url Адрес, на который будет отправляться запрос.
     */
    public url: string;
    /**
     * Get параметры запроса.
     * @var get Get параметры запроса.
     */
    public get: IGetParams;
    /**
     * Post параметры запроса.
     * @var post Post параметры запроса.
     */
    public post: any;
    /**
     * Отправляемые заголовки.
     * @var header Отправляемые заголовки.
     */
    public header: HeadersInit;
    /**
     * Прикрепленные файла (url, путь к файлу на сервере либо содержимое файла).
     * @var attach Прикрепленные файла (url, путь к файлу на сервере либо содержимое файла).
     */
    public attach: string;
    /**
     * True если передается содержимое файла. По умолчанию: false.
     * @var isAttachContent True если передается содержимое файла. По умолчанию: false.
     */
    public isAttachContent: boolean;
    /**
     * Название параметра при отправке файла (По умолчанию file).
     * @var attachName Название параметра при отправке файла (По умолчанию file).
     */
    public attachName: string;
    /**
     * Кастомный (Пользовательский) заголовок (DELETE и тд.).
     * @var customRequest Кастомный (Пользовательский) заголовок (DELETE и тд.).
     */
    public customRequest: string;
    /**
     * Максимально время, за которое должен быть получен ответ. В мсек.
     * @var maxTimeQuery Максимально время, за которое должен быть получен ответ. В мсек.
     */
    public maxTimeQuery: number;
    /**
     * True, если полученный ответ нужно преобразовать как json. По умолчанию true.
     * @var isConvertJson True, если полученный ответ нужно преобразовать как json. По умолчанию true.
     */
    public isConvertJson: boolean;

    /**
     * Ошибки при выполнении запросов.
     * @var _error Ошибки при выполнении запросов.
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
     * Возвращает текст с ошибкой, которая произошла при выполнении запроса.
     *
     * @return string
     * @api
     */
    public getError(): string {
        return this._error;
    }

    /**
     *
     * @return RequestInit
     * @private
     */
    protected _getOptions(): RequestInit {
        const options: RequestInit = {}

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
            options.method = 'POST'
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
     * Запуск отправки curl запроса.
     * В случае успеха возвращает содержимое запроса, в противном случае null.
     *
     * @return mixed
     */
    private _run() {
        if (this.url) {
            const response = fetch(this._getUrl(), this._getOptions());
            return response.then((res) => {
                if (res.ok) {
                    if (this.isConvertJson) {
                        return res.json();
                    }
                    return res.text();
                } else {
                    this._error = `Ошибка при получении данных: ${res.status}`;
                }
            })
        } else {
            this._error = 'Не указан url!';
        }
        return null;
    }

    /**
     * Запуск отправки curl запроса.
     * В случае успеха возвращает содержимое запроса, в противном случае null.
     *
     * @return mixed
     */
    private async _runSync() {
        if (this.url) {
            const response = await fetch(this._getUrl(), this._getOptions());
            if (response.ok) {
                if (this.isConvertJson) {
                    return await response.json();
                }
                return await response.text();
            }
            this._error = 'Не удалось получить данные';
        } else {
            this._error = 'Не указан url!';
        }
        return null;
    }

    /**
     * Отправка запрос.
     * Возвращает массив. В случае успеха свойство 'status' = true.
     *
     * @param url Адрес, на который отправляется запрос.
     * @param isAsync Отправить запрос синхронно.
     * @return IRequestSend
     * [
     *  - bool status Статус выполнения запроса.
     *  - mixed data Данные полученные при выполнении запроса.
     * ]
     * @api
     */
    public send(url: string = null, isAsync = true): IRequestSend {
        if (url) {
            this.url = url;
        }

        this._error = null;
        if (isAsync) {
            const data: any = this._runSync();
            if (this._error) {
                return {status: false, err: this._error};
            }
            return {status: true, data};
        } else {
            return {status: true, data: this._run()};
        }
    }
}
