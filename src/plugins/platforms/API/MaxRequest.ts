import { IMaxSendMessage, IMaxParams, IMaxAppApi } from './interfaces';
import { IMaxUploadFile, TMaxUploadFile } from './interfaces/IMaxAppApi';
import { AppContext, Request } from '../../../index';
import { T_MAX_APP } from '../Max/constants';
import { getErrorMsg, getErrorToken } from './constants';

/**
 * Базовый URL для всех методов Max API
 */
const MAX_API_ENDPOINT = 'https://platform-api.max.ru/';

/**
 * Класс для взаимодействия с API Max
 * Предоставляет методы для отправки сообщений, загрузки файлов
 * @see (https://dev.max.ru/docs-api) Смотри тут
 */
export class MaxRequest {
    /**
     * Экземпляр класса для выполнения HTTP-запросов
     *
     */
    readonly #request: Request;

    /**
     * Текст последней возникшей ошибки
     *
     */
    #error: object | string | null;

    /**
     * Токен доступа к Max API
     */
    public token: string | null;

    /**
     * Флаг для прямой передачи содержимого файла
     * По умолчанию: false
     */
    public isAttachContent: boolean;

    /**
     * Контекст приложения.
     */
    readonly #appContext: AppContext;

    /**
     * Создает экземпляр класса для работы с API ВКонтакте
     * Устанавливает токен из конфигурации приложения, если он доступен
     */
    public constructor(appContext: AppContext) {
        this.#request = new Request(appContext);
        this.#request.maxTimeQuery = 5500;
        this.isAttachContent = false;
        this.token = null;
        this.#error = null;
        this.#request.post = {};
        this.#appContext = appContext;
        if (appContext.appConfig.tokens[T_MAX_APP]?.token) {
            this.initToken(appContext.appConfig.tokens[T_MAX_APP].token);
        }
    }

    /**
     * Инициализирует токен доступа к MAX API
     * @param token Токен доступа к MAX API
     */
    public initToken(token: string): void {
        this.token = token;
    }

    /**
     * Устанавливает токен доступа к MAX API
     * @param accessToken
     * @protected
     */
    #setAccessToken(accessToken: string): void {
        if (!this.#request.header) {
            this.#request.header = {} as Record<string, string>;
        }
        (this.#request.header as Record<string, string>).Authorization = accessToken;
        this.#request.post ??= {};
        (this.#request.post as Record<string, unknown>).access_token = this.token;
    }

    /**
     * Выполняет вызов метода MAX API
     * @param method Название метода MAX API
     * @returns Результат выполнения метода или null при ошибке
     */
    public async call<T extends IMaxAppApi>(method: string): Promise<T | null> {
        if (this.token) {
            this.#request.header = null;
            this.#setAccessToken(this.token);
            const data = await this.#request.send<T>(MAX_API_ENDPOINT + method);
            if (data.status && data.data) {
                return data.data;
            }
            this.#error = data;
            this.#log(data.err);
        } else {
            this.#log(getErrorToken(T_MAX_APP, 'call'));
        }
        return null;
    }

    /**
     * Загружает файл на сервера Max
     * @param file Путь к файлу или его содержимое
     * @param type Тип загружаемого файла
     * @returns Информация о загруженном файле или null при ошибке
     */
    public async upload(file: string, type: TMaxUploadFile): Promise<IMaxUploadFile | null> {
        if (this.token) {
            this.#request.attach = file;
            this.#request.isAttachContent = this.isAttachContent;
            this.#request.header = Request.HEADER_FORM_DATA;
            this.#request.post ??= {};
            (this.#request.post as Record<string, unknown>).type = type;
            this.#setAccessToken(this.token);
            const data = await this.#request.send<IMaxUploadFile>(MAX_API_ENDPOINT + 'uploads');
            if (data.status && data.data) {
                return data.data;
            }
            this.#log(data.err);
        } else {
            this.#log(getErrorToken(T_MAX_APP, 'upload'));
        }
        return null;
    }

    /**
     * Отправляет сообщение пользователю или в чат
     * @param peerId Идентификатор получателя:
     * @param message Текст сообщения
     * @param params Дополнительные параметры:
     * @returns Информация об отправленном сообщении или null при ошибке
     */
    public async messagesSend(
        peerId: number | string,
        message: string,
        params: IMaxParams | null = null,
    ): Promise<IMaxSendMessage | null> {
        const method = 'messages';
        this.#request.post = {
            user_id: peerId,
            text: message,
        };

        if (params) {
            if (params.attachments || params.keyboard) {
                const attachment = [];
                if (params.attachments !== undefined) {
                    if (Array.isArray(params.attachments)) {
                        attachment.push(...params.attachments);
                    } else {
                        attachment.push(params.attachments);
                    }
                    params.attachments = undefined;
                }
                if (params.keyboard !== undefined) {
                    attachment.push({
                        type: 'inline_keyboard',
                        payload: params.keyboard,
                    });
                    params.keyboard = undefined;
                }

                this.#request.post.attachment = attachment;
            }

            if (Object.keys(params).length) {
                this.#request.post = { ...params, ...this.#request.post };
            }
        }
        return await this.call(method);
    }

    /**
     * Регистрирует событие для получения уведомлений о новых сообщениях в MAX
     * @param url
     */
    public subscriptions(url: string): Promise<unknown> {
        this.#request.post = {
            url,
        };
        return this.call('subscriptions');
    }

    /**
     * Записывает информацию об ошибках в лог-файл
     * @param error Текст ошибки для логирования
     */
    #log(error: string = ''): void {
        this.#appContext.logError(getErrorMsg(error, 'MaxRequest', this.#request.url), {
            error: this.#error,
        });
    }
}
