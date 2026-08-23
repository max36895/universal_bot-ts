/**
 * Интерфейс, описывающий отправителя сообщения в Max App.
 */
export interface IMaxSender {
    /**
     * Уникальный идентификатор пользователя-отправителя.
     */
    user_id: number;

    /**
     * Имя отправителя.
     */
    first_name?: string;

    /**
     * Фамилия отправителя.
     */
    last_name?: string;

    /**
     * Полное имя отправителя.
     */
    name?: string;

    /**
     * Имя пользователя (никнейм) отправителя.
     */
    username?: string;

    /**
     * Флаг, указывающий, является ли отправитель ботом.
     */
    is_bot?: boolean;

    /**
     * Время последней активности отправителя (предположительно, в формате Unix timestamp).
     */
    last_activity_time?: number;
}

/**
 * Интерфейс, описывающий вложение в сообщении Max App.
 */
export interface IMaxAttachment {
    /**
     * Тип вложения.
     */
    type?: 'image' | 'inline_keyboard';

    /**
     * Полезная нагрузка вложения, представленная в виде произвольного объекта.
     */
    payload?: Record<string, unknown>;
}

/**
 * Интерфейс, описывающий тело сообщения в Max App.
 */
export interface IMaxMessageBody {
    /**
     * Уникальный идентификатор сообщения.
     */
    mid: string;

    /**
     * Последовательный номер сообщения (в рамках диалога или сессии).
     */
    seq: number;

    /**
     * Текст сообщения.
     */
    text: string;

    /**
     * Вложения к сообщению.
     */
    attachments?: IMaxAttachment[] | IMaxAttachment;

    /**
     * Разметка текста (например, для выделения, ссылок).
     */
    markup?: {
        /**
         * Тип разметки.
         */
        type: string;

        /**
         * Индекс символа начала размеченной части текста (0-based).
         */
        from?: number;

        /**
         * Длина размеченной части текста.
         */
        length?: number;

        /**
         * URL, связанный с разметкой (например, для ссылки).
         */
        url?: string;
    };
}

/**
 * Интерфейс, описывающий полное сообщение в Max App.
 */
export interface IMaxMessage {
    /**
     * Информация об отправителе сообщения.
     */
    sender?: IMaxSender;

    /**
     * Информация о получателе сообщения (например, для личных сообщений).
     */
    recipient?: {
        /**
         * ID чата.
         */
        chat_id: number;

        /**
         * Тип чата.
         */
        chat_type: 'chat';

        /**
         * ID пользователя-получателя.
         */
        user_id: number;
    };

    /**
     * Временная метка сообщения (предположительно, в формате Unix timestamp).
     */
    timestamp?: number;

    /**
     * Информация о пересланном или процитированном сообщении.
     */
    link?: {
        /**
         * Тип связи: 'forward' - пересылка, 'reply' - ответ.
         */
        type: 'forward' | 'reply';

        /**
         * Отправитель пересланного/процитированного сообщения.
         */
        sender: IMaxSender;

        /**
         * ID чата, откуда было переслано сообщение.
         */
        chat_id: number;

        /**
         * Тело пересланного/процитированного сообщения.
         */
        message: IMaxMessageBody;
    };

    /**
     * Основное тело сообщения.
     */
    body: IMaxMessageBody | null;

    /**
     * Статистика по сообщению.
     */
    stat?: {
        /**
         * Количество просмотров сообщения.
         */
        views: number;
    };

    /**
     * URL, связанный с сообщением (например, если оно содержит ссылку).
     */
    url?: string;
}

/**
 * Интерфейс, описывающий структуру содержимого обновления от Max App.
 * Представляет собой полный объект, получаемый от webhook`а.
 */
export interface IMaxRequestContent {
    /**
     * Тип обновления.
     */
    update_type:
        | 'bot_added'
        | 'bot_started'
        | 'bot_stopped'
        | 'bot_removed'
        | 'chat_title_changed'
        | 'dialog_cleared'
        | 'dialog_muted'
        | 'dialog_unmuted'
        | 'dialog_removed'
        | 'message_callback'
        | 'message_created'
        | 'message_edited'
        | 'message_removed'
        | 'user_added'
        | 'user_removed';

    /**
     * Временная метка обновления (предположительно, в формате Unix timestamp).
     */
    timestamp?: number;

    /** ID чата или канала для служебных событий. */
    chat_id?: number;

    /** Пользователь, связанный со служебным событием. */
    user?: IMaxSender;

    /** Признак события из канала. */
    is_channel?: boolean;

    /**
     * Объект сообщения, связанного с обновлением.
     */
    message?: IMaxMessage;

    /** Данные нажатия callback-кнопки. */
    callback?: {
        /** Идентификатор, обязательный для ответа через POST /answers. */
        callback_id: string;
        /** Полезная нагрузка кнопки. */
        payload?: string;
        /** Пользователь, нажавший кнопку. */
        user?: IMaxSender;
    };

    /**
     * Языковой стандарт (locale) пользователя, инициировавшего обновление.
     */
    user_locale?: string;
}

/**
 * Интерфейс, описывающий кнопку в Max App.
 * Определяет тип, текст, полезную нагрузку и другие параметры кнопки.
 */
export interface IMaxButton {
    /**
     * Тип кнопки.
     * - 'message': Отправляет текстовое сообщение.
     * - 'link': Открывает указанный URL.
     * - 'callback': Отправляет payload на сервер.
     * - 'request_geo_location': Запрашивает геолокацию у пользователя.
     * - 'request_contact': Запрашивает контактные данные у пользователя.
     * - 'open_app': Открывает другое приложение Max App.
     * - 'clipboard': Копирует текст из payload в буфер обмена пользователя.
     */
    type:
        | 'message'
        | 'link'
        | 'callback'
        | 'request_geo_location'
        | 'request_contact'
        | 'open_app'
        | 'clipboard';

    /**
     * Текст, отображаемый на кнопке.
     */
    text: string;

    /**
     * Полезная нагрузка, отправляемая с кнопкой (например, при нажатии типа 'callback').
     */
    payload?: string;

    /**
     * Интент кнопки, влияющий на её визуальное оформление (например, цвет).
     */
    intent?: 'default' | 'positive' | 'negative';

    /**
     * URL, открываемый при нажатии кнопки типа 'link'.
     */
    url?: string;

    /**
     * Флаг, указывающий, является ли кнопка "быстрой".
     * Быстрые кнопки могут исчезать после нажатия.
     */
    quick?: boolean;

    /**
     * URL веб-приложения, открываемого при нажатии кнопки типа 'open_app'.
     */
    web_app?: string;

    /**
     * ID контакта, используемый при нажатии кнопки типа 'request_contact'.
     */
    contact_id?: number;
}

/**
 * Интерфейс, описывающий объект, содержащий массив кнопок Max App.
 * Используется для передачи коллекции кнопок в API.
 */
export interface IMaxButtonObject {
    /**
     * Массив кнопок Max App.
     */
    /**
     * Строки inline-клавиатуры. Плоский массив сохранён для обратной совместимости
     * и нормализуется перед отправкой.
     */
    buttons: IMaxButton[][] | IMaxButton[];
}
