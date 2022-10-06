import {TButtonPayload} from '../../components/button/interfaces';

export interface IAlisaEntities {
    /**
     * Обозначение начала и конца именованной сущности в массиве слов. Нумерация слов в массиве начинается с 0.
     */
    tokens?: {
        /**
         * Первое слово именованной сущности.
         */
        start: number;
        /**
         * Первое слово после именованной сущности.
         */
        end: number;
    }
    /**
     * Тип именованной сущности. Возможные значения:
     * YANDEX.DATETIME — дата и время, абсолютные или относительные.
     * YANDEX.FIO — фамилия, имя и отчество.
     * YANDEX.GEO — местоположение (адрес или аэропорт).
     * YANDEX.NUMBER — число, целое или с плавающей точкой.
     */
    type: string;
    /**
     * Формальное описание именованной сущности.
     * Формат этого поля для всех поддерживаемых типов сущностей приведен в разделе Именованные сущности в запросах.
     */
    value: object | number;
}

export interface IAlisaNlu {
    /**
     * Массив слов из произнесенной пользователем фразы.
     */
    tokens?: string[];
    /**
     * Массив именованных сущностей.
     */
    entities?: IAlisaEntities[];
    intents?: object;
}

export interface IAlisaSession {
    /**
     * Признак новой сессии. Возможные значения:
     * true — пользователь начинает новый разговор с навыком;
     * false — запрос отправлен в рамках уже начатого разговора.
     */
    'new': boolean;
    /**
     * Идентификатор сообщения в рамках сессии, максимум 8 символов.
     * Инкрементируется с каждым следующим запросом.
     */
    message_id: number;
    /**
     * Уникальный идентификатор сессии, максимум 64 символов.
     */
    session_id: string;
    /**
     * Идентификатор вызываемого навыка, присвоенный при создании.
     * Чтобы узнать идентификатор своего навыка, откройте его в личном кабинете — идентификатор можно скопировать на вкладке Общие сведения, внизу страницы.
     */
    skill_id: string;
    /**
     * Идентификатор экземпляра приложения, в котором пользователь общается с Алисой, максимум 64 символа.
     * Даже если пользователь авторизован с одним и тем же аккаунтом в приложении Яндекс для Android и iOS, Яндекс.Диалоги присвоят отдельный user_id каждому из этих приложений.
     */
    user_id?: string;
    /**
     * Атрибуты пользователя Яндекса, который взаимодействует с навыком. Если пользователь не авторизован в приложении, свойства user в запросе не будет.
     */
    user?: {
        /**
         * Идентификатор пользователя Яндекса, единый для всех приложений и устройств.
         * Этот идентификатор уникален для пары «пользователь — навык»: в разных навыках значение свойства user_id для одного и того же пользователя будет различаться.
         */
        user_id: string;
        /**
         * Токен для OAuth-авторизации, который также передается в заголовке Authorization для навыков с настроенной связкой аккаунтов.
         * Это JSON-свойство можно использовать, например, при реализации навыка в Yandex Cloud Functions (Диалоги вызывают функции с параметром integration=raw,который не позволяет получать заголовки клиентского запроса).
         */
        access_token: string
    }
    /**
     * Данные о приложении, с помощью которого пользователь взаимодействует с навыком.
     */
    application?: {
        /**
         * Идентификатор экземпляра приложения, в котором пользователь общается с Алисой, максимум 64 символа.
         * Например, даже если пользователь авторизован с одним и тем же аккаунтом в приложениях Яндекс для Android и iOS, Яндекс.Диалоги присвоят отдельный application_id каждому из этих приложений.
         * Этот идентификатор уникален для пары «приложение — навык»: в разных навыках значение свойства application_id для одного и того же пользователя будет различаться.
         */
        application_id: string;
    }
}

export interface IAlisaRequestState {
    session?: Object | string;
    user?: Object | string;
    application?: Object | string;
}

export interface IAlisaRequestMeta {
    /**
     * Язык в POSIX-формате, максимум 64 символа.
     */
    locale: string;
    /**
     * Название часового пояса, включая алиасы, максимум 64 символа.
     */
    timezone: string;
    /**
     * Идентификатор устройства и приложения, в котором идет разговор, максимум 1024 символа.
     */
    client_id: string;
    /**
     * Интерфейсы, доступные на устройстве пользователя.
     */
    interfaces: {
        /**
         * Пользователь может видеть ответ навыка на экране и открывать ссылки в браузере.
         */
        screen?: object;
        payments?: object | null;
        /**
         * У пользователя есть возможность запросить связку аккаунтов.
         */
        account_linking: object | null;
    };
}

export interface IAlisaRequest {
    /**
     * Служебное поле: запрос пользователя, преобразованный для внутренней обработки Алисы. В ходе преобразования текст, в частности, очищается от знаков препинания, а числительные преобразуются в числа.
     * Чтобы получить точный текст запроса, используйте свойство original_utterance.
     */
    command: string;
    /**
     * Полный текст пользовательского запроса, максимум 1024 символа.
     */
    original_utterance: string;
    /**
     * Тип ввода, обязательное свойство. Возможные значения:
     * "SimpleUtterance" — голосовой ввод;
     * "ButtonPressed" — нажатие кнопки.
     */
    type: 'SimpleUtterance' | 'ButtonPressed',
    /**
     * Формальные характеристики реплики, которые удалось выделить Яндекс.Диалогам. Отсутствует, если ни одно из вложенных свойств не применимо.
     */
    markup?: {
        /**
         * Признак реплики, которая содержит криминальный подтекст (самоубийство, разжигание ненависти, угрозы). Вы можете настроить навык на определенную реакцию для таких случаев — например, отвечать «Не понимаю, о чем вы. Пожалуйста, переформулируйте вопрос.»
         * Возможно только значение true. Если признак не применим, это свойство не включается в ответ.
         */
        dangerous_context?: boolean;
    },
    /**
     * JSON, полученный с нажатой кнопкой от обработчика навыка (в ответе на предыдущий запрос), максимум 4096 байт.
     */
    payload?: object | string;
    /**
     * Слова и именованные сущности, которые Диалоги извлекли из запроса пользователя.
     * Подробное описание поддерживаемых типов сущностей см. в разделе Именованные сущности в запросах.
     */
    nlu?: IAlisaNlu
}

export interface IAlisaWebhookRequest {
    /**
     * Информация об устройстве, с помощью которого пользователь разговаривает с Алисой.
     */
    meta: IAlisaRequestMeta;
    /**
     * Данные, полученные от пользователя.
     */
    request: IAlisaRequest;
    /**
     * Данные о сессии.
     * Сессия — это период относительно непрерывного взаимодействия пользователя с навыком. Сессия прерывается:
     * когда пользователь запрашивает выход из навыка;
     * когда навык явно завершает работу ("end_session": true);
     * когда от пользователя долго не поступает команд (таймаут зависит от поверхности, минимум несколько минут).
     */
    session: IAlisaSession;
    account_linking_complete_event?: boolean;
    state?: IAlisaRequestState;
    /**
     * Версия протокола. Текущая версия — 1.0.
     */
    version: string;
}

export interface IAlisaButton {
    /**
     * Текст кнопки, обязателен для каждой кнопки. Максимум 64 символа.
     * Если для кнопки не указано свойство url, по нажатию текст кнопки будет отправлен навыку как реплика пользователя.
     */
    title?: string;
    /**
     * Произвольный JSON, который Яндекс.Диалоги должны отправить обработчику, если данная кнопка будет нажата. Максимум 4096 байт.
     */
    payload?: TButtonPayload;
    /**
     * URL, который должна открывать кнопка, максимум 1024 байта.
     * Если свойство url не указано, по нажатию кнопки навыку будет отправлен текст кнопки.
     */
    url?: string;
    /**
     * Признак того, что кнопку нужно убрать после следующей реплики пользователя. Допустимые значения:
     * false — кнопка должна оставаться активной (значение по умолчанию);
     * true — кнопку нужно скрывать после нажатия.
     * @defaultValue false
     */
    hide?: boolean;
}

export interface IAlisaButtonCard {
    /**
     * Текст, который будет отправлен навыку по нажатию на изображение в качестве команды пользователя. Максимум 64 символа.
     * Если свойство передано с пустым значением, свойство request.command в запросе будет отправлено пустым.
     * Если свойство не передано в ответе, Диалоги используют вместо него свойство response.card.title.
     */
    text?: string;
    /**
     * Произвольный JSON, который Яндекс.Диалоги должны отправить обработчику, если пользователь нажмет на изображение. Максимум 4096 байт.
     */
    payload?: TButtonPayload;
    /**
     * URL, который должно открывать нажатие по изображению. Максимум 1024 байта.
     */
    url?: string;
}

export interface IAlisaImage {
    /**
     * Тип карточки. Поддерживаемые значения:
     * BigImage — одно изображение.
     * ItemsList — список нескольких изображений (от 1 до 5).
     * ImageGallery — галерея нескольких изображений (от 1 до 7).
     * Требуемый формат ответа зависит от типа карточки.
     */
    type?: string;
    /**
     * Идентификатор изображения, который возвращается в ответ на запрос загрузки.
     * Необходимо указывать для типа карточки BigImage, для типов ItemsList и ImageGallery игнорируется.
     */
    image_id?: string;
    /**
     * Заголовок изображения. Максимум 128 символов.
     * Игнорируется для типов карточки ItemsList.
     */
    title: string;
    /**
     * Описание изображения. Максимум 256 символов.
     * Игнорируется для типов карточки ItemsList и ImageGallery.
     */
    description?: string;
    /**
     * Свойства изображения, на которое можно нажать.
     * Игнорируется для типов карточки ItemsList и ImageGallery.
     */
    button?: IAlisaButtonCard;
}

export interface IAlisaBigImage extends IAlisaImage {
    type: 'BigImage';
}

export interface IAlisaItemsList {
    type: 'ItemsList';
    /**
     * Заголовок списка изображений.
     * Игнорируется для типов карточки BigImage и ImageGallery.
     */
    header?: {
        /**
         * Текст заголовка, обязателен, если передается свойство header. Максимум 64 символа.
         */
        text: string
    }
    /**
     * Набор изображений. Не меньше 1, не больше 5 для списка и не больше 7 для галереи.
     * Игнорируется для типа карточки BigImage.
     */
    items?: IAlisaImage[];
    /**
     * Кнопки под списком изображений.
     * Игнорируется для типа карточки ImageGallery.
     */
    footer?: {
        /**
         * Текст первой кнопки, обязательное свойство. Максимум 64 символа.
         */
        text: string;
        button?: IAlisaButtonCard;
    }
}

export interface IAlisaImageGallery {
    type: 'ImageGallery';
    /**
     * Набор изображений. Не меньше 1, не больше 5 для списка и не больше 7 для галереи.
     * Игнорируется для типа карточки BigImage.
     */
    items?: IAlisaImage[];
}

export interface IAlisaResponse {
    /**
     * Текст, который следует показать и сказать пользователю. Максимум 1024 символа. Не должен быть пустым.
     * Текст также используется, если у Алисы не получилось отобразить включенную в ответ карточку (свойство response.card). На устройствах, которые поддерживают только голосовое общение с навыком, это будет происходить каждый раз, когда навык присылает карточку в ответе.
     * В тексте ответа можно указать переводы строк последовательностью «\n», например: "Отдых напрасен. Дорога крута.\nВечер прекрасен. Стучу в ворота."
     */
    text: string;
    /**
     * Ответ в формате TTS (text-to-speech), максимум 1024 символа.
     * Советы по использованию этого формата приведены в разделе Как настроить генерацию речи.
     * Вы также можете проигрывать звуки из библиотеки Алисы и собственные звуки (теги <speaker>, которые используются для ссылок на звуки, не учитываются в ограничении в 1024 символа на длину значения свойства tts).
     */
    tts?: string;
    /**
     * Описание карточки — сообщения с поддержкой изображений.
     * Если приложению удается отобразить карточку для пользователя, свойство response.text не используется.
     */
    card?: IAlisaBigImage | IAlisaItemsList | IAlisaImageGallery;
    /**
     * Кнопки, которые следует показать пользователю.
     * Все указанные кнопки выводятся после основного ответа Алисы, описанного в свойствах response.text и response.card. Кнопки можно использовать как релевантные ответу ссылки или подсказки для продолжения разговора.
     */
    buttons?: IAlisaButton[] | null;
    /**
     * Признак конца разговора.
     * Допустимые значения:
     * false — сессию следует продолжить;
     * true — сессию следует завершить.
     */
    end_session: boolean;
}

export interface IAlisaWebhookResponse {
    /**
     * Данные для ответа пользователю.
     */
    response?: IAlisaResponse;
    session_state?: object | string;
    application_state?: object | string;
    user_state_update?: object | string;
    /**
     * Версия протокола. Текущая версия — 1.0.
     */
    version: string;
    /**
     * Авторизация пользователя.
     */
    start_account_linking?: any;
}