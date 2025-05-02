import { Request } from './request/Request';
import { mmApp } from '../mmApp';
import { ITelegramParams, ITelegramResult, TTelegramChatId } from './interfaces';
import { isFile } from '../utils/standard/util';

/**
 * Класс для взаимодействия с API Telegram
 * Предоставляет методы для отправки сообщений, файлов и других типов контента
 * @see (https://core.telegram.org/bots/api) Смотри тут
 *
 * @example
 * ```typescript
 * import { TelegramRequest } from './api/TelegramRequest';
 *
 * // Создание экземпляра
 * const telegram = new TelegramRequest();
 * telegram.initToken('your-bot-token');
 *
 * // Отправка простого сообщения
 * await telegram.sendMessage(12345, 'Привет!');
 *
 * // Отправка форматированного сообщения
 * await telegram.sendMessage(12345,
 *   '*Жирный текст* и _курсив_\n' +
 *   '[Ссылка](https://example.com)\n' +
 *   '`code` и ```pre```',
 *   { parse_mode: 'Markdown' }
 * );
 *
 * // Отправка сообщения с клавиатурой
 * const keyboard = {
 *   keyboard: [[
 *     { text: 'Кнопка 1' },
 *     { text: 'Кнопка 2' }
 *   ]],
 *   resize_keyboard: true,
 *   one_time_keyboard: true
 * };
 *
 * await telegram.sendMessage(12345, 'Выберите:', {
 *   reply_markup: JSON.stringify(keyboard)
 * });
 *
 * // Отправка файлов
 * await telegram.sendPhoto(12345, 'photo.jpg', 'Описание фото');
 * await telegram.sendDocument(12345, 'document.pdf');
 * await telegram.sendAudio(12345, 'audio.mp3', {
 *   title: 'Название',
 *   performer: 'Исполнитель'
 * });
 * ```
 */
export class TelegramRequest {
    /**
     * Базовый URL для всех методов Telegram API
     */
    public readonly API_ENDPOINT = 'https://api.telegram.org/bot';

    /**
     * Экземпляр класса для выполнения HTTP-запросов
     * @private
     */
    protected _request: Request;

    /**
     * Текст последней возникшей ошибки
     * @private
     */
    protected _error: string | null | undefined;

    /**
     * Токен доступа к Telegram API
     */
    public token: string | null;

    /**
     * Создает экземпляр класса для работы с API Telegram
     * Устанавливает токен из конфигурации приложения, если он доступен
     */
    public constructor() {
        this._request = new Request();
        this._request.maxTimeQuery = 5500;
        this.token = null;
        this._error = null;
        if (typeof mmApp.params.telegram_token !== 'undefined') {
            this.initToken(mmApp.params.telegram_token);
        }
    }

    /**
     * Инициализирует токен доступа к Telegram API
     * @param token Токен для доступа к API
     */
    public initToken(token: string | null): void {
        this.token = token;
    }

    /**
     * Формирует URL для отправки запроса
     * @returns Полный URL для API запроса
     * @private
     */
    protected _getUrl(): string {
        return `${this.API_ENDPOINT}${mmApp.params.telegram_token}/`;
    }

    /**
     * Подготавливает данные для отправки файла
     * @param type Тип отправляемого файла
     * @param file Путь к файлу или его содержимое
     * @private
     */
    protected _initPostFile(type: string, file: string): void {
        if (isFile(file)) {
            this._request.post[type] = Request.getAttachFile(file);
        } else {
            this._request.post[type] = file;
        }
    }

    /**
     * Отправляет запрос к Telegram API
     * @param method Название метода API
     * @param userId ID пользователя или чата
     * @returns Результат выполнения метода или null при ошибке
     */
    public async call(
        method: string,
        userId: TTelegramChatId | null = null,
    ): Promise<ITelegramResult | null> {
        if (userId) {
            this._request.post.chat_id = userId;
        }
        if (this.token) {
            if (method) {
                const data = await this._request.send<ITelegramResult>(this._getUrl() + method);
                if (data.status && data.data) {
                    if (!data.data.ok) {
                        this._error = data.data.description;
                        this._log();
                        return null;
                    }
                    return data.data;
                }
                this._log(data.err);
            }
        } else {
            this._log('Не указан telegram токен!');
        }
        return null;
    }

    /**
     * Отправляет текстовое сообщение
     * @param chatId ID чата или пользователя
     * @param message Текст сообщения
     * @param params Дополнительные параметры:
     * - parse_mode: формат текста
     *   - Markdown: *жирный*, _курсив_, [ссылка](url), `код`, ```pre```
     *   - HTML: <b>жирный</b>, <i>курсив</i>, <a href="url">ссылка</a>, <code>код</code>, <pre>pre</pre>
     * - disable_web_page_preview: отключить предпросмотр ссылок
     * - disable_notification: отключить уведомление
     * - reply_to_message_id: ID сообщения для ответа
     * - reply_markup: клавиатура в JSON формате
     *   - keyboard: обычная клавиатура
     *   - inline_keyboard: встроенная клавиатура
     *   - remove_keyboard: удалить клавиатуру
     *   - force_reply: форсировать ответ
     *
     * @example
     * ```typescript
     * // Простое сообщение
     * await telegram.sendMessage(12345, 'Привет!');
     *
     * // Форматированное сообщение
     * await telegram.sendMessage(12345,
     *   '<b>Жирный</b> и <i>курсив</i>\n' +
     *   '<a href="https://example.com">Ссылка</a>\n' +
     *   '<code>code</code>',
     *   { parse_mode: 'HTML' }
     * );
     *
     * // Сообщение с обычной клавиатурой
     * const keyboard = {
     *   keyboard: [[
     *     { text: 'Кнопка 1' },
     *     { text: 'Кнопка 2' }
     *   ]],
     *   resize_keyboard: true
     * };
     * await telegram.sendMessage(12345, 'Выберите:', {
     *   reply_markup: JSON.stringify(keyboard)
     * });
     *
     * // Сообщение с inline-клавиатурой
     * const inlineKeyboard = {
     *   inline_keyboard: [[{
     *     text: 'Кнопка',
     *     callback_data: 'button_1'
     *   }]]
     * };
     * await telegram.sendMessage(12345, 'Нажмите:', {
     *   reply_markup: JSON.stringify(inlineKeyboard)
     * });
     * ```
     *
     * @returns Информация об отправленном сообщении или null при ошибке
     */
    public sendMessage(
        chatId: TTelegramChatId,
        message: string,
        params: ITelegramParams | null = null,
    ): Promise<ITelegramResult | null> {
        this._request.post = {
            chat_id: chatId,
            text: message,
        };
        if (params) {
            this._request.post = { ...params, ...this._request.post };
        }
        return this.call('sendMessage');
    }

    /**
     * Отправляет опрос
     * @param chatId ID чата или пользователя
     * @param question Текст вопроса
     * @param options Массив вариантов ответов (2-10 вариантов)
     * @param params Дополнительные параметры:
     * - is_anonymous: анонимный опрос (по умолчанию true)
     * - type: тип опроса
     *   - 'regular': обычный опрос (по умолчанию)
     *   - 'quiz': викторина с одним правильным ответом
     * - allows_multiple_answers: разрешить несколько ответов (только для regular)
     * - correct_option_id: ID правильного ответа (0-9, только для quiz)
     * - explanation: пояснение правильного ответа (только для quiz)
     * - explanation_parse_mode: формат пояснения (HTML/Markdown)
     * - open_period: время в секундах, когда опрос активен
     * - close_date: дата закрытия опроса (Unix timestamp)
     * - is_closed: закрыть опрос сразу
     *
     * @example
     * ```typescript
     * // Обычный опрос
     * await telegram.sendPoll(12345,
     *   'Любимый цвет?',
     *   ['Красный', 'Синий', 'Зеленый'],
     *   { allows_multiple_answers: true }
     * );
     *
     * // Викторина
     * await telegram.sendPoll(12345,
     *   'Столица России?',
     *   ['Санкт-Петербург', 'Москва', 'Новосибирск'],
     *   {
     *     type: 'quiz',
     *     correct_option_id: 1,
     *     explanation: 'Москва - столица России с 1918 года',
     *     explanation_parse_mode: 'HTML'
     *   }
     * );
     * ```
     *
     * @returns Информация об отправленном опросе или null при ошибке
     */
    public sendPoll(
        chatId: TTelegramChatId,
        question: string,
        options: string[],
        params: ITelegramParams | null = null,
    ): Promise<ITelegramResult | null> | null {
        this._request.post = {
            chat_id: chatId,
            question,
        };
        let isSend = true;
        if (options) {
            const countOptions = options.length;
            if (countOptions > 1) {
                if (countOptions > 10) {
                    options = options.slice(0, 10);
                }
                this._request.post.options = JSON.stringify(options);
            } else {
                isSend = false;
            }
        }
        if (isSend) {
            if (params) {
                this._request.post = { ...params, ...this._request.post };
            }
            return this.call('sendPoll');
        } else {
            this._log('Недостаточное количество вариантов. Должно быть от 2 - 10 вариантов!');
            return null;
        }
    }

    /**
     * Отправляет фотографию
     * @param userId ID чата или пользователя
     * @param file Путь к файлу или его содержимое
     * Поддерживаемые форматы:
     * - JPEG, JPG, PNG, GIF, WEBP
     * - Максимальный размер: 10MB
     * - Максимальное разрешение: 10000x10000
     * @param desc Подпись к фотографии
     * @param params Дополнительные параметры:
     * - caption: подпись к фото (0-1024 символа)
     * - caption: подпись к фото
     * - parse_mode: формат текста
     * - disable_notification: отключить уведомление
     * - reply_to_message_id: ID сообщения для ответа
     * - reply_markup: клавиатура в JSON
     * @returns Информация об отправленной фотографии или null при ошибке
     */
    public sendPhoto(
        userId: TTelegramChatId,
        file: string,
        desc: string | null = null,
        params: ITelegramParams | null = null,
    ): Promise<ITelegramResult | null> {
        this._initPostFile('photo', file);
        if (desc) {
            this._request.post.caption = desc;
        }
        if (params) {
            this._request.post = { ...params, ...this._request.post };
        }
        return this.call('sendPhoto', userId);
    }

    /**
     * Отправляет документ
     * @param userId ID чата или пользователя
     * @param file Путь к файлу или его содержимое
     * @param params Дополнительные параметры:
     * - caption: подпись к документу
     * - parse_mode: формат текста
     * - disable_notification: отключить уведомление
     * - reply_to_message_id: ID сообщения для ответа
     * - reply_markup: клавиатура в JSON
     * @returns Информация об отправленном документе или null при ошибке
     */
    public sendDocument(
        userId: TTelegramChatId,
        file: string,
        params: ITelegramParams | null = null,
    ): Promise<ITelegramResult | null> {
        this._initPostFile('document', file);
        if (params) {
            this._request.post = { ...params, ...this._request.post };
        }
        return this.call('sendDocument', userId);
    }

    /**
     * Отправляет аудиофайл
     * @param userId ID чата или пользователя
     * @param file Путь к файлу или его содержимое
     * @param params Дополнительные параметры:
     * - caption: подпись к аудио
     * - parse_mode: формат текста
     * - duration: длительность в секундах
     * - performer: исполнитель
     * - title: название
     * - disable_notification: отключить уведомление
     * - reply_to_message_id: ID сообщения для ответа
     * - reply_markup: клавиатура в JSON
     * @returns Информация об отправленном аудио или null при ошибке
     */
    public sendAudio(
        userId: TTelegramChatId,
        file: string,
        params: ITelegramParams | null = null,
    ): Promise<ITelegramResult | null> {
        this._initPostFile('audio', file);
        if (params) {
            this._request.post = { ...params, ...this._request.post };
        }
        return this.call('sendAudio', userId);
    }

    /**
     * Отправляет видео
     * @param userId ID чата или пользователя
     * @param file Путь к файлу или его содержимое
     * @param params Дополнительные параметры:
     * - caption: подпись к видео
     * - parse_mode: формат текста
     * - duration: длительность в секундах
     * - width: ширина
     * - height: высота
     * - disable_notification: отключить уведомление
     * - reply_to_message_id: ID сообщения для ответа
     * - reply_markup: клавиатура в JSON
     * @returns Информация об отправленном видео или null при ошибке
     */
    public sendVideo(
        userId: TTelegramChatId,
        file: string,
        params: ITelegramParams | null = null,
    ): Promise<ITelegramResult | null> {
        this._initPostFile('video', file);
        if (params) {
            this._request.post = { ...params, ...this._request.post };
        }
        return this.call('sendVideo', userId);
    }

    /**
     * Записывает информацию об ошибках в лог-файл
     * @param error Текст ошибки для логирования
     * @private
     */
    protected _log(error: string = ''): void {
        error = `\n(${Date.now()}): Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`;
        mmApp.saveLog('telegramApi.log', error);
    }
}
