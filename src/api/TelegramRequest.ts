import {Request} from './request/Request';
import {mmApp} from '../mmApp';
import {ITelegramParams, ITelegramResult, TTelegramChatId} from './interfaces';
import {isFile} from '../utils/standard/util';

/**
 * Класс отвечающий за отправку запросов на telegram сервер.
 *
 * Документация по telegram api.
 * @see (https://core.telegram.org/bots/api) Смотри тут
 *
 * @class TelegramRequest
 */
export class TelegramRequest {
    /**
     * @const string: Адрес, на который отправляться запрос.
     */
    public readonly API_ENDPOINT = 'https://api.telegram.org/bot';
    /**
     * Отправка запросов.
     * @see Request Смотри тут
     */
    protected _request: Request;
    /**
     * Строка с ошибками.
     */
    protected _error: string | null | undefined;
    /**
     * Авторизационный токен бота, необходимый для отправки данных.
     */
    public token: string | null;

    /**
     * TelegramRequest constructor.
     */
    public constructor() {
        this._request = new Request();
        this._request.maxTimeQuery = 5500;
        this.token = null;
        this._error = null;
        if (typeof mmApp.params.telegram_token !== "undefined") {
            this.initToken(mmApp.params.telegram_token);
        }
    }

    /**
     * Установить токен.
     *
     * @param {string} token Токен для загрузки данных на сервер.
     * @api
     */
    public initToken(token: string | null): void {
        this.token = token;
    }

    /**
     * Получение url адреса, на который будет отправляться запрос.
     *
     * @return string
     */
    protected _getUrl(): string {
        return `${this.API_ENDPOINT}${mmApp.params.telegram_token}/`;
    }

    /**
     * Заполняем данные для отправки файла
     *
     * @param {string} type Тип отправляемого файла
     * @param {string} file Путь к файлу
     */
    protected _initPostFile(type: string, file: string): void {
        if (isFile(file)) {
            this._request.post[type] = Request.getAttachFile(file);
        } else {
            this._request.post[type] = file;
        }
    }

    /**
     * Отправка запроса на telegram сервер.
     *
     * @param {string} method Отправляемый метод, что именно будет отправляться (Изображение, сообщение и тд).
     * @param {TTelegramChatId} userId Идентификатор пользователя/чата
     * @return {Promise<Object>}
     * @api
     */
    public async call(method: string, userId: TTelegramChatId | null = null): Promise<ITelegramResult | null> {
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
     * Отправка сообщения пользователю.
     *
     * @see https://core.telegram.org/bots/api#sendmessage Смотри тут
     * @param {TTelegramChatId}  chatId Идентификатор пользователя/чата.
     * @param {string} message Текст сообщения.
     * @param {ITelegramParams} params Пользовательские параметры:
     * [
     *  - string|int chat_id: Уникальный идентификатор целевого чата или имя пользователя целевого канала (в формате @channelusername).
     *  - string text: Текст отправляемого сообщения, 1-4096 символов после синтаксического анализа сущностей.
     *  - string parse_mode: Отправьте Markdown или HTML, если вы хотите, чтобы приложения Telegram отображали полужирный, курсивный, фиксированный по ширине текст или встроенные URL-адреса в сообщении бота.
     *  - bool disable_web_page_preview: Отключает предварительный просмотр ссылок для ссылок в этом сообщении.
     *  - bool disable_notification: Отправляет сообщение молча. Пользователи получат уведомление без звука.
     *  - int reply_to_message_id: Если сообщение является ответом, то идентификатор исходного сообщения.
     *  - string reply_markup: Дополнительные опции интерфейса. JSON-сериализованный объект для встроенной клавиатуры, пользовательской клавиатуры ответа, инструкций по удалению клавиатуры ответа или принудительному получению ответа от пользователя.
     * ]
     * @return Promise<ITelegramResult>
     * [
     *  - 'ok' => bool, Статус отправки сообщения
     *  - 'result' => [
     *      - 'message_id' => int Идентификатор сообщения
     *      - 'from' => [
     *          - 'id' => int Идентификатор отправителя
     *          - 'is_bot' => bool Тип отправителя (Бот или человек)
     *          - 'first_name' => string Имя отправителя
     *          - 'username' => string Никнейм отправителя
     *      ],
     *      - 'chat' => [
     *          - 'id' => int Идентификатор пользователя
     *          - 'first_name' => string Имя пользователя
     *          - 'last_name' => string Фамилия пользователя
     *          - 'username' => string Никнейм пользователя
     *          - 'type' => string Тип чата(Приватный и тд)
     *      ],
     *      - 'date' => int Дата отправки сообщения в unix time
     *      - 'text' => string Текст отправленного сообщения
     *  ]
     * ]
     * or
     * [
     *  - 'ok' => false.
     *  - 'error_code' => int
     *  - 'description' => string
     * ]
     * @api
     */
    public sendMessage(chatId: TTelegramChatId, message: string, params: ITelegramParams | null = null): Promise<ITelegramResult | null> {
        this._request.post = {
            chat_id: chatId,
            text: message
        };
        if (params) {
            this._request.post = {...params, ...this._request.post};
        }
        return this.call('sendMessage');
    }

    /**
     * Отправка опроса пользователю.
     *
     * @param {TTelegramChatId} chatId Идентификатор пользователя/чата.
     * @param {string} question Название опроса.
     * @param {string[]} options Варианты ответов.
     * @param {ITelegramParams} params Пользовательские параметры:
     * [
     *  - int|string chat_id: Уникальный идентификатор целевого чата или имя пользователя целевого канала (в формате @channelusername).
     *  - string question: Опросный вопрос, 1-255 символов.
     *  - array|string options: A JSON-serialized list of answer options, 2-10 strings 1-100 characters each.
     *  - bool is_anonymous: True, если опрос должен быть анонимным, по умолчанию используется значение True.
     *  - string type: Типа опрос, “quiz” или “regular”, по умолчанию “regular”.
     *  - bool allows_multiple_answers: True, если опрос допускает несколько ответов, игнорируемых для опросов в режиме викторины, по умолчанию имеет значение False.
     *  - int correct_option_id: 0 - идентификатор правильного варианта ответа, необходимый для опросов в режиме викторины.
     *  - bool is_closed: Передайте True, если опрос Нужно немедленно закрыть. Это может быть полезно для предварительного просмотра опроса.
     *  - bool disable_notification: Отправляет сообщение молча. Пользователи получат уведомление без звука.
     *  - int reply_to_message_id: Если сообщение является ответом, то идентификатор исходного сообщения.
     *  - string reply_markup: Дополнительные опции интерфейса. JSON-сериализованный объект для встроенной клавиатуры, пользовательской клавиатуры ответа, инструкций по удалению клавиатуры ответа или принудительному получению ответа от пользователя.
     * ]
     * @return Promise<ITelegramResult>
     * [
     *  - 'ok' => bool, Статус отправки опроса
     *  - 'result' => [
     *      - 'message_id' => int Идентификатор сообщения
     *      - 'from' => [
     *          - 'id' => int Идентификатор отправителя
     *          - 'is_bot' => bool Тип отправителя (Бот или человек)
     *          - 'first_name' => string Имя отправителя
     *          - 'username' => string Никнейм отправителя
     *      ],
     *      - 'chat' => [
     *          - 'id' => int Идентификатор пользователя
     *          - 'first_name' => string Имя пользователя
     *          - 'last_name' => string Фамилия пользователя
     *          - 'username' => string Никнейм пользователя
     *          - 'type' => string Тип чата(Приватный и тд)
     *      ],
     *      - 'date' => int Дата отправки сообщения в unix time
     *      - 'text' => string Текст отправленного сообщения
     *      - 'poll' =>[
     *          - 'id' => int Уникальный идентификатор опроса
     *          - 'question' => string Вопрос
     *          - 'options' => [ Варианты ответов
     *              [
     *                  - 'text' => string Вариант ответа
     *                  - 'voter_count' => int Количество проголосовавших
     *              ]
     *          ]
     *          - 'total_voter_count' => int Общее количество пользователей проголосовавших в опросе
     *          - 'is_closed' => bool True, если опрос закрыт
     *          - 'is_anonymous' => bool True, если опрос анонимный
     *          - 'type' => string Тип опроса (regular, quiz)
     *          - 'allows_multiple_answers' => bool True, если в опросе допускается несколько ответов
     *          - 'correct_option_id' => int  0-основанный идентификатор правильного варианта ответа. Доступно только для опросов в режиме викторины, которые закрыты или были отправлены (не переадресованы) ботом или в приватный чат с ботом.
     *      ]
     *  ]
     * ]
     * @api
     */
    public sendPoll(chatId: TTelegramChatId, question: string, options: string[], params: ITelegramParams | null = null): Promise<ITelegramResult | null> | null {
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
                this._request.post = {...params, ...this._request.post};
            }
            return this.call('sendPoll');
        } else {
            this._log('Недостаточное количество вариантов. Должно быть от 2 - 10 вариантов!');
            return null;
        }
    }

    /**
     * Отправка изображения пользователю.
     *
     * @param {TTelegramChatId} userId Идентификатор пользователя.
     * @param {string} file Название файла.
     * @param {string} desc Описание к фотографии.
     * @param {ITelegramParams} params Пользовательские команды:
     * [
     *  - int|string chart_id: Уникальный идентификатор целевого чата или имя пользователя целевого канала (в формате @channelusername).
     *  - string photo: Фото для отправки. Передайте file_id в качестве строки для отправки фотографии, которая существует на серверах Telegram (рекомендуется), передайте HTTP URL в качестве строки для Telegram, чтобы получить фотографию из интернета, или загрузите новую фотографию с помощью multipart/form-data. Более подробная информация об отправке файлов» (https://core.telegram.org/bots/api#sending-files).
     *  - string caption: Подпись к фотографии (также может использоваться при повторной отправке фотографий по file_id), 0-1024 символа после синтаксического анализа сущностей.
     *  - string parse_mode: Отправьте Markdown или HTML, если вы хотите, чтобы приложения Telegram отображали жирный, курсивный, фиксированный по ширине текст или встроенные URL-адреса в заголовке СМИ.
     *  - bool disable_notification: Отправляет сообщение молча. Пользователи получат уведомление без звука.
     *  - int reply_to_message_id: Если сообщение является ответом, то идентификатор исходного сообщения.
     *  - string reply_markup: Дополнительные опции интерфейса. JSON-сериализованный объект для встроенной клавиатуры, пользовательской клавиатуры ответа, инструкций по удалению клавиатуры ответа или принудительному получению ответа от пользователя.
     * ]
     * @return Promise<ITelegramResult>
     * [
     *  - 'ok' => bool, Статус отправки изображения
     *  - 'result' => [
     *      - 'message_id' => int Идентификатор сообщения
     *      - 'from' => [
     *          - 'id' => int Идентификатор отправителя
     *          - 'is_bot' => bool Тип отправителя (Бот или человек)
     *          - 'first_name' => string Имя отправителя
     *          - 'username' => string Никнейм отправителя
     *      ],
     *      - 'chat' => [
     *          - 'id' => int Идентификатор пользователя
     *          - 'first_name' => string Имя пользователя
     *          - 'last_name' => string Фамилия пользователя
     *          - 'username' => string Никнейм пользователя
     *          - 'type' => string Тип чата(Приватный и тд)
     *      ],
     *      - 'date' => int Дата отправки сообщения в unix time
     *      - 'text' => string Текст отправленного сообщения
     *      - 'photo" =>[
     *          [
     *              - 'file_id' => string Идентификатор изображения, который может быть использован для загрузки или повторного использования
     *              - 'file_unique_id' => string Уникальный идентификатор для этого изображения, который должен быть одинаковым с течением времени и для разных ботов. Нельзя использовать для загрузки или повторного использования файла.
     *              - 'file_size' => int Размер изображения
     *              - 'width' => int Ширина изображения
     *              - 'height' => int Высота изображения
     *          ]
     *      ]
     *  ]
     * ]
     * or
     * [
     *  - 'ok' => false.
     *  - 'error_code' => int
     *  - 'description' => string
     * ]
     * @api
     */
    public sendPhoto(userId: TTelegramChatId, file: string, desc: string | null = null, params: ITelegramParams | null = null): Promise<ITelegramResult | null> {
        this._initPostFile('photo', file);
        if (desc) {
            this._request.post.caption = desc;
        }
        if (params) {
            this._request.post = {...params, ...this._request.post};
        }
        return this.call('sendPhoto', userId);
    }

    /**
     * Отправка документа пользователю.
     *
     * @param {TTelegramChatId} userId Идентификатор пользователя.
     * @param {string} file Путь к файлу.
     * @param {ITelegramParams} params Пользовательские параметры:
     * [
     *  - int|string chart_id: Уникальный идентификатор целевого чата или имя пользователя целевого канала (в формате @channelusername).
     *  - string document: Файл для отправки. Передайте file_id в качестве строки для отправки файла, который существует на серверах Telegram (рекомендуется), передайте HTTP URL в качестве строки для Telegram, чтобы получить файл из интернета, или загрузите новый, используя multipart/form-data. Более подробная информация об отправке файлов» (https://core.telegram.org/bots/api#sending-files).
     *  - string thumb: Миниатюра отправленного файла; может быть проигнорирована, если генерация миниатюр для файла поддерживается на стороне сервера. Миниатюра должна быть в формате JPEG и иметь размер менее 200 кб. Ширина и высота миниатюры не должны превышать 320. Игнорируется, если файл не загружен с помощью multipart / form-data. Миниатюры не могут быть повторно использованы и могут быть загружены только в виде нового файла, поэтому вы можете передать “attach:/ / <file_attach_name>", если миниатюра была загружена с использованием составных / form-данных в разделе <file_attach_name>. Более подробная информация об отправке файлов » (https://core.telegram.org/bots/api#sending-files).
     *  - string caption: Заголовок документа (также может использоваться при повторной отправке документов по идентификатору file_id), 0-1024 символа после синтаксического анализа сущностей.
     *  - string parse_mode: Отправьте Markdown или HTML, если вы хотите, чтобы приложения Telegram отображали жирный, курсивный, фиксированный по ширине текст или встроенные URL-адреса в заголовке СМИ.
     *  - bool disable_notification: Отправляет сообщение молча. Пользователи получат уведомление без звука.
     *  - int reply_to_message_id: Если сообщение является ответом, то идентификатор исходного сообщения.
     *  - string reply_markup: Дополнительные опции интерфейса. JSON-сериализованный объект для встроенной клавиатуры, пользовательской клавиатуры ответа, инструкций по удалению клавиатуры ответа или принудительному получению ответа от пользователя.
     * ]
     * @return Promise<ITelegramResult>
     * [
     *  - 'ok' => bool, Статус отправки документа
     *  - 'result' => [
     *      - 'message_id' => int Идентификатор сообщения
     *      - 'from' => [
     *          - 'id' => int Идентификатор отправителя
     *          - 'is_bot' => bool Тип отправителя (Бот или человек)
     *          - 'first_name' => string Имя отправителя
     *          - 'username' => string Никнейм отправителя
     *      ],
     *      - 'chat' => [
     *          - 'id' => int Идентификатор пользователя
     *          - 'first_name' => string Имя пользователя
     *          - 'last_name' => string Фамилия пользователя
     *          - 'username' => string Никнейм пользователя
     *          - 'type' => string Тип чата(Приватный и тд)
     *      ],
     *      - 'date' => int Дата отправки сообщения в unix time
     *      - 'text' => string Текст отправленного сообщения
     *      - 'document" =>[
     *          - 'file_name' => string Оригинальное(исходное) имя файла
     *          - 'mime_type' => string MIME тип файла
     *          - 'thumb' => [
     *              - 'file_id' => string Идентификатор файла, который может быть использован для загрузки или повторного использования
     *              - 'file_unique_id' => string Уникальный идентификатор для этого файла, который должен быть одинаковым с течением времени и для разных ботов. Нельзя использовать для загрузки или повторного использования файла.
     *              - 'file_size' => int Размер файла
     *              - 'width' => int Ширина изображения
     *              - 'height' => int Высота изображения
     *          ],
     *          - 'file_id' => string Идентификатор файла, который может быть использован для загрузки или повторного использования
     *          - 'file_unique_id' => string Уникальный идентификатор для этого файла, который должен быть одинаковым с течением времени и для разных ботов. Нельзя использовать для загрузки или повторного использования файла.
     *          - 'file_size' => int Размер файла
     *      ]
     *  ]
     * ]
     * or
     * [
     *  - 'ok' => false.
     *  - 'error_code' => int
     *  - 'description' => string
     * ]
     * @api
     */
    public sendDocument(userId: TTelegramChatId, file: string, params: ITelegramParams | null = null): Promise<ITelegramResult | null> {
        this._initPostFile('document', file);
        if (params) {
            this._request.post = {...params, ...this._request.post};
        }
        return this.call('sendDocument', userId);
    }

    /**
     * Отправка Аудиофайла пользователю.
     *
     * @param {TTelegramChatId} userId Идентификатор пользователя.
     * @param {string} file Путь или содержимое файла.
     * @param {ITelegramParams} params Пользовательские параметры:
     * [
     *  - int|string chart_id: Уникальный идентификатор целевого чата или имя пользователя целевого канала (в формате @channelusername).
     *  - string audio: Аудио Файл для отправки. Передайте file_id в виде строки для отправки аудиофайла, существующего на серверах Telegram (рекомендуется), передайте HTTP URL в виде строки для Telegram, чтобы получить аудиофайл из интернета, или загрузите новый, используя multipart/form-data. Более подробная информация об отправке файлов» (https://core.telegram.org/bots/api#sending-files).
     *  - string thumb: Миниатюра отправленного файла; может быть проигнорирована, если генерация миниатюр для файла поддерживается на стороне сервера. Миниатюра должна быть в формате JPEG и иметь размер менее 200 кб. Ширина и высота миниатюры не должны превышать 320. Игнорируется, если файл не загружен с помощью multipart / form-data. Миниатюры не могут быть повторно использованы и могут быть загружены только в виде нового файла, поэтому вы можете передать “attach:/ / <file_attach_name>", если миниатюра была загружена с использованием составных / form-данных в разделе <file_attach_name>. Более подробная информация об отправке файлов» (https://core.telegram.org/bots/api#sending-files).
     *  - string caption: Подпись к фотографии (также может использоваться при повторной отправке фотографий по file_id), 0-1024 символа после синтаксического анализа сущностей.
     *  - string parse_mode: Отправьте Markdown или HTML, если вы хотите, чтобы приложения Telegram отображали жирный, курсивный, фиксированный по ширине текст или встроенные URL-адреса в заголовке СМИ.
     *  - int duration: Длительность звука в секундах.
     *  - string performer: Исполнитель.
     *  - string title: Название трека.
     *  - bool disable_notification: Отправляет сообщение молча. Пользователи получат уведомление без звука.
     *  - int reply_to_message_id: Если сообщение является ответом, то идентификатор исходного сообщения.
     *  - string reply_markup: Дополнительные опции интерфейса. JSON-сериализованный объект для встроенной клавиатуры, пользовательской клавиатуры ответа, инструкций по удалению клавиатуры ответа или принудительному получению ответа от пользователя.
     * ]
     * @return Promise<ITelegramResult>
     * [
     *  - 'ok' => bool, Статус отправки аудио файла
     *  - 'result' => [
     *      - 'message_id' => int Идентификатор сообщения
     *      - 'from' => [
     *          - 'id' => int Идентификатор отправителя
     *          - 'is_bot' => bool Тип отправителя (Бот или человек)
     *          - 'first_name' => string Имя отправителя
     *          - 'username' => string Никнейм отправителя
     *      ],
     *      - 'chat' => [
     *          - 'id' => int Идентификатор пользователя
     *          - 'first_name' => string Имя пользователя
     *          - 'last_name' => string Фамилия пользователя
     *          - 'username' => string Никнейм пользователя
     *          - 'type' => string Тип чата(Приватный и тд)
     *      ],
     *      - 'date' => int Дата отправки сообщения в unix time
     *      - 'text' => string Текст отправленного сообщения
     *      - 'audio" =>[
     *          - 'name' => string Оригинальное(исходное) название аудио файла
     *          - 'mime_type' => string MIME тип файла
     *          - 'duration' => int Длительность аудио файла
     *          - 'performer' => string Исполнитель аудио файла
     *          - 'thumb' => [ Для фотографий
     *              - 'file_id' => string Идентификатор файла, который может быть использован для загрузки или повторного использования
     *              - 'file_unique_id' => string Уникальный идентификатор для этого файла, который должен быть одинаковым с течением времени и для разных ботов. Нельзя использовать для загрузки или повторного использования файла.
     *              - 'file_size' => int Размер файла
     *              - 'width' => int Ширина изображения
     *              - 'height' => int Высота изображения
     *          ],
     *          - 'file_id' => string Идентификатор аудио файла, который может быть использован для загрузки или повторного использования
     *          - 'file_unique_id' => string Уникальный идентификатор для этого аудиофайла, который должен быть одинаковым с течением времени и для разных ботов. Нельзя использовать для загрузки или повторного использования файла.
     *          - 'file_size' => int Размер аудио файла
     *      ]
     *  ]
     * ]
     * or
     * [
     *  - 'ok' => false.
     *  - 'error_code' => int
     *  - 'description' => string
     * ]
     * @api
     */
    public sendAudio(userId: TTelegramChatId, file: string, params: ITelegramParams | null = null): Promise<ITelegramResult | null> {
        this._initPostFile('audio', file);
        if (params) {
            this._request.post = {...params, ...this._request.post};
        }
        return this.call('sendAudio', userId);
    }

    /**
     * Отправка видео файла пользователю.
     *
     * @param {TTelegramChatId} userId Идентификатор пользователя.
     * @param {string} file Путь к файлу.
     * @param {ITelegramParams} params Пользовательские параметры:
     * [
     *  - int|string chart_id: Уникальный идентификатор целевого чата или имя пользователя целевого канала (в формате @channelusername).
     *  - string video: Видео для отправки. Передайте file_id в качестве строки для отправки видео, которое существует на серверах Telegram (рекомендуется), передайте HTTP URL в качестве строки для Telegram, чтобы получить видео из интернета, или загрузите новое видео с помощью multipart/form-data. Более подробная информация об отправке файлов» (https://core.telegram.org/bots/api#sending-files).
     *  - string thumb: Миниатюра отправленного файла; может быть проигнорирована, если генерация миниатюр для файла поддерживается на стороне сервера. Миниатюра должна быть в формате JPEG и иметь размер менее 200 кб. Ширина и высота миниатюры не должны превышать 320. Игнорируется, если файл не загружен с помощью multipart / form-data. Миниатюры не могут быть повторно использованы и могут быть загружены только в виде нового файла, поэтому вы можете передать “attach:/ / <file_attach_name>", если миниатюра была загружена с использованием составных / form-данных в разделе <file_attach_name>. Более подробная информация об отправке файлов » (https://core.telegram.org/bots/api#sending-files).
     *  - string caption: Заголовок видео (также может использоваться при повторной отправке видео по file_id), 0-1024 символа после разбора сущностей.
     *  - int duration: Длительность отправленного видео в секундах.
     *  - int width: Ширина видео.
     *  - int height: Высота видео.
     *  - bool supports_streaming: Передайте True, если загруженное видео подходит для потоковой передачи.
     *  - string parse_mode: Отправьте Markdown или HTML, если вы хотите, чтобы приложения Telegram отображали жирный, курсивный, фиксированный по ширине текст или встроенные URL-адреса в заголовке СМИ.
     *  - bool disable_notification: Отправляет сообщение молча. Пользователи получат уведомление без звука.
     *  - int reply_to_message_id: Если сообщение является ответом, то идентификатор исходного сообщения.
     *  - string reply_markup: Дополнительные опции интерфейса. JSON-сериализованный объект для встроенной клавиатуры, пользовательской клавиатуры ответа, инструкций по удалению клавиатуры ответа или принудительному получению ответа от пользователя.
     * ]
     * @return Promise<ITelegramResult>
     * [
     *  - 'ok' => bool, Статус отправки видео файла
     *  - 'result' => [
     *      - 'message_id' => int Идентификатор сообщения
     *      - 'from' => [
     *          - 'id' => int Идентификатор отправителя
     *          - 'is_bot' => bool Тип отправителя (Бот или человек)
     *          - 'first_name' => string Имя отправителя
     *          - 'username' => string Никнейм отправителя
     *      ],
     *      - 'chat' => [
     *          - 'id' => int Идентификатор пользователя
     *          - 'first_name' => string Имя пользователя
     *          - 'last_name' => string Фамилия пользователя
     *          - 'username' => string Никнейм пользователя
     *          - 'type' => string Тип чата(Приватный и тд)
     *      ],
     *      - 'date' => int Дата отправки сообщения в unix time
     *      - 'text' => string Текст отправленного сообщения
     *      - 'video' =>[
     *          - 'name' => string Оригинальное(исходное) название аудио файла
     *          - 'mime_type' => string MIME тип файла
     *          - 'duration' => int Длительность аудио файла
     *          - 'thumb' => [ Для фотографий
     *              - 'file_id' => string Идентификатор файла, который может быть использован для загрузки или повторного использования
     *              - 'file_unique_id' => string Уникальный идентификатор для этого файла, который должен быть одинаковым с течением времени и для разных ботов. Нельзя использовать для загрузки или повторного использования файла.
     *              - 'file_size' => int Размер файла
     *              - 'width' => int Ширина видео
     *              - 'height' => int Высота ширина
     *          ],
     *          - 'file_id' => string Идентификатор видео файла, который может быть использован для загрузки или повторного использования
     *          - 'file_unique_id' => string Уникальный идентификатор для этого видео файла, который должен быть одинаковым с течением времени и для разных ботов. Нельзя использовать для загрузки или повторного использования файла.
     *          - 'file_size' => int Размер аудио файла
     *          - 'width' => int Ширина видео
     *          - 'height' => int Высота ширина
     *      ]
     *  ]
     * ]
     * or
     * [
     *  - 'ok' => false.
     *  - 'error_code' => int
     *  - 'description' => string
     * ]
     * @api
     */
    public sendVideo(userId: TTelegramChatId, file: string, params: ITelegramParams | null = null): Promise<ITelegramResult | null> {
        this._initPostFile('video', file);
        if (params) {
            this._request.post = {...params, ...this._request.post};
        }
        return this.call('sendVideo', userId);
    }

    /**
     * Сохранение логов в файл.
     *
     * @param {string} error Текст ошибки.
     */
    protected _log(error: string = ''): void {
        error = `\n(${Date.now()}): Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`;
        mmApp.saveLog('telegramApi.log', error);
    }
}
