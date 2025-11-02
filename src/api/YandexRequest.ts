/**
 * Класс для работы с API Яндекса
 *
 * Предоставляет функциональность для:
 * - Отправки HTTP-запросов к API Яндекса
 * - Управления OAuth-авторизацией
 * - Обработки ошибок и логирования
 *
 * Основные возможности:
 * - Автоматическая авторизация запросов
 * - Типизированные ответы от API
 * - Логирование ошибок
 * - Настраиваемые таймауты запросов
 *
 * @example
 * ```typescript
 * import { YandexRequest } from './api/YandexRequest';
 *
 * // Создание экземпляра с токеном
 * const yandexApi = new YandexRequest('your-oauth-token');
 *
 * // Выполнение запроса с обработкой ошибок
 * try {
 *   const response = await yandexApi.call<MyApiResponse>('https://api.yandex.ru/endpoint');
 *
 *   if (response) {
 *     console.log('Успешный ответ:', response);
 *   } else {
 *     console.error('Ошибка запроса:', yandexApi._error);
 *   }
 * } catch (error) {
 *   console.error('Неожиданная ошибка:', error);
 * }
 *
 * // Изменение токена во время работы
 * yandexApi.setOAuth('new-token');
 * ```
 */
import { Request } from './request/Request';
import { IRequestSend, IYandexApi } from './interfaces';
import { AppContext } from '../core/AppContext';

/**
 * @class YandexRequest
 * Класс для работы с API Яндекса
 *
 * Предоставляет методы для отправки запросов к API Яндекса,
 * управления авторизацией и обработки ошибок.
 *
 * @example
 * ```typescript
 * // Создание экземпляра
 * const api = new YandexRequest('your-token');
 *
 * // Установка нового токена
 * api.setOAuth('new-token');
 *
 * // Выполнение запроса
 * const result = await api.call<ApiResponse>('https://api.yandex.ru/endpoint');
 * if (result) {
 *   // Обработка успешного ответа
 *   console.log(result);
 * } else {
 *   // Обработка ошибки
 *   console.error(api._error);
 * }
 * ```
 */
export class YandexRequest {
    /**
     * Экземпляр класса для отправки HTTP-запросов
     * @private
     */
    protected _request: Request;

    /**
     * OAuth-токен для авторизации запросов
     *
     * Используется для авторизации запросов к API Яндекса.
     * Подробная информация о получении токена:
     * @see https://yandex.ru/dev/dialogs/alice/doc/resource-upload-docpage/#http-images-load__auth
     * @private
     */
    protected _oauth: string | null | undefined;

    /**
     * Текст последней ошибки
     *
     * Содержит информацию о последней возникшей ошибке
     * при выполнении запроса к API.
     * @private
     */
    protected _error: string | null;

    /**
     * Контекст приложения.
     */
    protected _appContext: AppContext;

    /**
     * Создает экземпляр класса YandexRequest
     *
     * Инициализирует класс с OAuth-токеном и настраивает
     * параметры HTTP-запросов.
     *
     * @param {string | null} [oauth=null] - OAuth-токен для авторизации
     * @param {AppContext} [appContext] - Контекст приложения
     *
     * @remarks
     * Если токен не указан, будет использован токен из appContext.platformParams.yandex_token.
     * Если и там токена нет, запросы будут выполняться без авторизации.
     *
     * @example
     * ```typescript
     * // Создание с токеном
     * const api = new YandexRequest('your-token');
     *
     * // Создание без токена (будет использован токен из appContext.platformParams)
     * const api = new YandexRequest();
     *
     * // Создание без авторизации
     * const api = new YandexRequest(null);
     * ```
     */
    public constructor(oauth: string | null = null, appContext: AppContext) {
        this._request = new Request(appContext);
        this._appContext = appContext;
        this.setOAuth(oauth || appContext.platformParams.yandex_token || null);
        this._request.maxTimeQuery = 1500;
        this._error = null;
    }

    /**
     * Устанавливает OAuth-токен для авторизации
     *
     * Обновляет токен авторизации и заголовки запросов.
     * При установке токена автоматически добавляется заголовок
     * 'Authorization: OAuth {token}' ко всем последующим запросам.
     *
     * @param {string | null} oauth - OAuth-токен для авторизации
     *
     * @remarks
     * - Если передать null, авторизация будет отключена
     * - Заголовок авторизации добавляется автоматически
     * - Токен сохраняется для всех последующих запросов
     *
     * @example
     * ```typescript
     * const api = new YandexRequest();
     *
     * // Установка нового токена
     * api.setOAuth('new-token');
     * // Теперь все запросы будут с заголовком:
     * // Authorization: OAuth new-token
     *
     * // Сброс токена
     * api.setOAuth(null);
     * // Запросы будут без авторизации
     * ```
     */
    public setOAuth(oauth: string | null): void {
        this._oauth = oauth;
        if (this._request.header) {
            this._request.header = {
                ...this._request.header,
                Authorization: `OAuth ${this._oauth}`,
            };
        } else {
            this._request.header = { Authorization: `OAuth ${this._oauth}` };
        }
    }

    /**
     * Выполняет HTTP-запрос к API Яндекса
     *
     * Отправляет запрос к указанному эндпоинту API и
     * обрабатывает полученный ответ.
     *
     * @template T - Тип ожидаемого ответа, наследующий интерфейс IYandexApi
     * @param {string | null} [url=null] - URL-адрес эндпоинта API
     * @returns {Promise<T | null>} - Результат запроса или null в случае ошибки
     *
     * @throws {Error} Если произошла ошибка сети или сервера
     *
     * @example
     * ```typescript
     * interface MyApiResponse extends IYandexApi {
     *   data: {
     *     id: string;
     *     name: string;
     *   };
     * }
     *
     * const api = new YandexRequest('token');
     *
     * try {
     *   // Выполнение запроса
     *   const response = await api.call<MyApiResponse>('https://api.yandex.ru/endpoint');
     *
     *   if (response) {
     *     // Обработка успешного ответа
     *     console.log('ID:', response.data.id);
     *     console.log('Name:', response.data.name);
     *   } else {
     *     // Обработка ошибки API
     *     console.error('Ошибка API:', api._error);
     *   }
     * } catch (error) {
     *   // Обработка ошибок сети или сервера
     *   console.error('Ошибка запроса:', error);
     * }
     * ```
     */
    public async call<T extends IYandexApi>(url: string | null = null): Promise<T | null> {
        this.setOAuth(this._oauth as string);
        const data: IRequestSend<T> = await this._request.send<T>(url);
        if (data.status && data.data) {
            //Object.hasOwnProperty.call(data.data, 'error')
            if (Object.hasOwnProperty.call(data.data, 'error')) {
                this._error = JSON.stringify(data.data.error);
            }
            return data.data;
        }
        this._log(data.err);
        return null;
    }

    /**
     * Сохраняет информацию об ошибках в лог-файл
     *
     * Записывает детальную информацию об ошибке в файл логов,
     * включая время возникновения, URL запроса и текст ошибки.
     *
     * @param {string} [error=''] - Текст ошибки для логирования
     * @private
     */
    protected _log(error: string = ''): void {
        this._appContext.saveLog(
            'YandexApi.log',
            `\n${new Date()}Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`,
        );
    }
}
