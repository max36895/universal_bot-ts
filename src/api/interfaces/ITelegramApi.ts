export type TTelegramQuestionType = 'quiz' | 'regular';
export type TTelegramChatId = string | number;

export interface ITelegramParams {
    /**
     * Уникальный идентификатор целевого чата или имя пользователя целевого канала (в формате @channelusername).
     */
    chat_id?: TTelegramChatId;
    /**
     * Текст отправляемого сообщения, 1-4096 символов после синтаксического анализа сущностей.
     */
    text?: string;
    /**
     * Отправьте Markdown или HTML, если вы хотите, чтобы приложения Telegram отображали полужирный, курсивный, фиксированный по ширине текст или встроенные URL-адреса в сообщении вашего бота.
     */
    parse_mode?: string;
    /**
     * Отключает предварительный просмотр ссылок для ссылок в этом сообщении.
     */
    disable_web_page_preview?: boolean;
    /**
     * Отправляет сообщение молча. Пользователи получат уведомление без звука.
     */
    disable_notification?: boolean;
    /**
     * Если сообщение является ответом, то идентификатор исходного сообщения.
     */
    reply_to_message_id?: number;
    /**
     * Дополнительные опции интерфейса. JSON-сериализованный объект для встроенной клавиатуры, пользовательской клавиатуры ответа, инструкций по удалению клавиатуры ответа или принудительному получению ответа от пользователя.
     */
    reply_markup?: string;

    // question
    /**
     * Опросный вопрос, 1-255 символов.
     */
    question?: string;
    /**
     * A JSON-serialized list of answer options, 2-10 strings 1-100 characters each.
     */
    options?: any;
    /**
     * True, если опрос должен быть анонимным, по умолчанию используется значение True.
     */
    is_anonymous?: boolean;
    /**
     * Типа опрос, “quiz” или “regular”, по умолчанию “regular”.
     */
    type?: TTelegramQuestionType;
    /**
     * True, если опрос допускает несколько ответов, игнорируемых для опросов в режиме викторины, по умолчанию имеет значение False.
     */
    allows_multiple_answers?: boolean;
    /**
     * 0 - идентификатор правильного варианта ответа, необходимый для опросов в режиме викторины.
     */
    correct_option_id?: number;
    /**
     * Передайте True, если опрос Нужно немедленно закрыть. Это может быть полезно для предварительного просмотра опроса.
     */
    is_closed?: boolean;

    // photo
    /**
     * Фото для отправки. Передайте file_id в качестве строки для отправки фотографии, которая существует на серверах Telegram (рекомендуется), передайте HTTP URL в качестве строки для Telegram, чтобы получить фотографию из интернета, или загрузите новую фотографию с помощью multipart/form-data. Более подробная информация об отправке файлов» (https://core.telegram.org/bots/api#sending-files).
     */
    photo?: string;
    /**
     * Подпись к фотографии (также может использоваться при повторной отправке фотографий по file_id), 0-1024 символа после синтаксического анализа сущностей.
     */
    caption?: string;

    // document
    /**
     * Файл для отправки. Передайте file_id в качестве строки для отправки файла, который существует на серверах Telegram (рекомендуется), передайте HTTP URL в качестве строки для Telegram, чтобы получить файл из интернета, или загрузите новый, используя multipart/form-data. Более подробная информация об отправке файлов» (https://core.telegram.org/bots/api#sending-files).
     */
    document?: string;
    /**
     * Миниатюра отправленного файла; может быть проигнорирована, если генерация миниатюр для файла поддерживается на стороне сервера. Миниатюра должна быть в формате JPEG и иметь размер менее 200 кб. Ширина и высота миниатюры не должны превышать 320. Игнорируется, если файл не загружен с помощью multipart / form-data. Миниатюры не могут быть повторно использованы и могут быть загружены только в виде нового файла, поэтому вы можете передать “attach:/ / <file_attach_name>", если миниатюра была загружена с использованием составных / form-данных в разделе <file_attach_name>. Более подробная информация об отправке файлов » (https://core.telegram.org/bots/api#sending-files).
     */
    thumb?: string;

    // audio
    /**
     * Аудио Файл для отправки. Передайте file_id в виде строки для отправки аудиофайла, существующего на серверах Telegram (рекомендуется), передайте HTTP URL в виде строки для Telegram, чтобы получить аудиофайл из интернета, или загрузите новый, используя multipart/form-data. Более подробная информация об отправке файлов» (https://core.telegram.org/bots/api#sending-files).
     */
    audio?: string;
    /**
     * Длительность звука в секундах.
     */
    duration?: number;
    /**
     * Исполнитель.
     */
    performer?: string;
    /**
     * Название трека.
     */
    title?: string;

    // video
    /**
     * Видео для отправки. Передайте file_id в качестве строки для отправки видео, которое существует на серверах Telegram (рекомендуется), передайте HTTP URL в качестве строки для Telegram, чтобы получить видео из интернета, или загрузите новое видео с помощью multipart/form-data. Более подробная информация об отправке файлов» (https://core.telegram.org/bots/api#sending-files).
     */
    video?: string;
    /**
     * Передайте True, если загруженное видео подходит для потоковой передачи.
     */
    supports_streaming?: boolean;
}

export interface ITelegramFrom {
    /**
     * Идентификатор отправителя
     */
    id: number;
    /**
     * Тип отправителя (Бот или человек)
     */
    is_bot: boolean;
    /**
     * Имя отправителя
     */
    first_name: string;
    /**
     * Никнейм отправителя
     */
    username: string;
}

export interface ITelegramChat {
    /**
     * Идентификатор пользователя
     */
    id: number;
    /**
     * Имя пользователя
     */
    first_name: string;
    /**
     * Фамилия пользователя
     */
    last_name: string;
    /**
     * Никнейм пользователя
     */
    username: string;
    /**
     * Тип чата(Приватный и тд)
     */
    type: string;
}

export interface ITelegramPoll {
    /**
     * Уникальный идентификатор опроса
     */
    id: number;
    /**
     * Вопрос
     */
    question: string;
    /**
     * Варианты ответов
     */
    options: [{
        /**
         * Вариант ответа
         */
        text: string;
        /**
         * Количество проголосовавших
         */
        voter_count: number;
    }];
    /**
     * Общее количество пользователей проголосовавших в опросе
     */
    total_voter_count: number;
    /**
     * True, если опрос закрыт
     */
    is_closed: boolean;
    /**
     * True, если опрос анонимный
     */
    is_anonymous: boolean;
    /**
     * Тип опроса (regular, quiz)
     */
    type: TTelegramQuestionType;
    /**
     * True, если в опросе допускается несколько ответов
     */
    allows_multiple_answers: boolean;
    /**
     * 0-основанный идентификатор правильного варианта ответа. Доступно только для опросов в режиме викторины, которые закрыты или были отправлены (не переадресованы) ботом или в приватный чат с ботом.
     */
    correct_option_id: number;
}

interface IFileInfo {
    /**
     * Идентификатор файла, который может быть использован для загрузки или повторного использования
     */
    file_id: string;
    /**
     * Уникальный идентификатор для этого файла, который должен быть одинаковым с течением времени и для разных ботов. Нельзя использовать для загрузки или повторного использования файла.
     */
    file_unique_id: string;
    /**
     * Размер файла
     */
    file_size: number;
}

export interface ITelegramPhoto extends IFileInfo {
    /**
     * Ширина изображения
     */
    width: number;
    /**
     * Высота изображения
     */
    height: number;
}

export interface ITelegramThumb extends IFileInfo {
    /**
     * Ширина изображения
     */
    width?: number;
    /**
     * Высота изображения
     */
    height?: number;
}

export interface ITelegramDocument extends IFileInfo {
    /**
     * Оригинальное(исходное) имя файла
     */
    file_name: string;
    /**
     * MIME тип файла
     */
    mime_type: string;
    thumb: ITelegramThumb;
}

export interface ITelegramAudio extends IFileInfo {
    /**
     * Оригинальное(исходное) название аудио файла
     */
    name: string;
    /**
     * MIME тип файла
     */
    mime_type: string;
    /**
     * Длительность аудио файла
     */
    duration: number;
    /**
     * Исполнитель аудио файла
     */
    performer: string;
    thumb: ITelegramThumb;
}

export interface ITelegramVideo extends ITelegramAudio {
    /**
     * Ширина видео
     */
    width: number;
    /**
     * Высота ширина
     */
    height: number;
}

export interface ITelegramResultContent {
    /**
     * Идентификатор сообщения
     */
    message_id: number;
    from: ITelegramFrom;
    chat?: ITelegramChat
    /**
     * Дата отправки сообщения в unix time
     */
    date?: number;
    /**
     * Текст отправленного сообщения
     */
    text?: string;
    poll?: ITelegramPoll;
    photo?: ITelegramPhoto;
    document?: ITelegramDocument;
    audio?: ITelegramAudio;
    video?: ITelegramVideo;
}

export interface ITelegramResult {
    /**
     * Статус отправки сообщения
     */
    ok: boolean;
    result?: ITelegramResultContent;
    /**
     * Код ошибки
     */
    error_code?: number;
    /**
     * Описание ошибки
     */
    description?: string;
}

