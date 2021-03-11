/**
 * Тип запроса
 * @variant MESSAGE_TO_SKILL — содержит сообщение для смартапа;
 * @variant SERVER_ACTION — сообщает смартапу о действиях пользователя на фронтенде;
 * @variant RUN_APP — сообщает о запуске смартапа;
 * @variant CLOSE_APP — сообщает о закрытии смартапа.
 */
type TMessageName = 'MESSAGE_TO_SKILL' | 'SERVER_ACTION' | 'RUN_APP' | 'CLOSE_APP'

type TSberSmartAppType = 'DIALOG' | 'WEB_APP' | 'APK' | 'CHAT_APP';

interface ISberSmartAppDeviceInfo {
    /**
     * Операционная система устройства.
     * Возможные значения:
     * ANDROID;
     * IOS.
     */
    platformType: string;
    /**
     * Версия операционной системы.
     */
    platformVersion: string;
    /**
     * Поверхность, от которой приходит вызов ассистента. Например, приложение Сбербанк Онлайн или SberBox.
     * Возможные значения:
     * SBOL — запрос пришел из приложения Сбербанк Онлайн;
     * SUPER_APP — запрос приложения СБЕР Салют;
     * SBERBOX — запрос пришел от устройства SberBox.
     */
    surface: string;
    /**
     * Версия поверхности.
     */
    surfaceVersion: string;
    /**
     * Идентификатор устройства.
     */
    deviceId?: string;
    /**
     * Описание функциональности устройства.
     */
    features: {
        /**
         * Типы смартапов, которые поддерживает устройство.
         * Возможные значения:
         * DIALOG;
         * WEB_APP;
         * APK;
         * CHAT_APP.
         */
        appTypes: TSberSmartAppType[]
    },
    /**
     * Описание возможностей устройства пользователя.
     */
    capabilities: {
        /**
         * Описание экрана устройства.
         */
        screen: { available: boolean },
        /**
         * Описание микрофона устройства.
         */
        mic: { available: boolean },
        /**
         * Описание динамиков устройства.
         */
        speak: { available: boolean }
    },
    /**
     * Дополнительная информация об объекте или устройстве. В настоящий момент не используется.
     */
    additionalInfo: object;
}

interface ISberSmartAppAppInfo {
    /**
     * Идентификатор проекта в SmartApp Studio.
     */
    projectId: string;
    /**
     * Идентификатор смартапа.
     */
    applicationId: string;
    /**
     * Идентификатор опубликованной версии смартапа.
     */
    appversionId: string;
    /**
     * Ссылка на веб-приложение. Поле актуально для Canvas Apps.
     */
    frontendEndpoint?: string;
    /**
     * Тип смартапа.
     * Обратите внимание, что ассистент перехватывает навигационные команды "вверх", "вниз", "влево" и "вправо" только в Canvas App (тип приложения WEB_APP). В этом случае команды обрабатываются на уровне фронтенда приложения. В остальных случаях, команды передаются в бекэнд активного приложения.
     */
    frontendType?: TSberSmartAppType
    /**
     * Более читаемый аналог поля projectId. Не актуален для внешних приложений.
     */
    systemName?: string;
    /**
     * Объединённое значение полей projectId, applicationId и appversionId.
     */
    frontendStateId?: string
}

interface ISberSmartAppCharacterInfo {
    /**
     * Идентификатор персонажа, которого выбрал пользователь.
     * Возможные значения:
     * sber — персонаж мужского пола по имени Сбербанк. Обращается на "вы".
     * athena — персонаж женского пола по имени Афина. Обращается на "вы".
     * joy — персонаж женского пола по имени Джой.  Обращается на "ты".
     * Учитывайте пол персонажа (поле gender) и форму обращения (поле appeal) при проектировании ответов.
     */
    id: "sber" | "athena" | "joy";
    /**
     * Имя персонажа.
     */
    name: "Сбер" | "Афина" | "Джой";
    /**
     * Пол персонажа. Учитывайте пол персонажа при проектировании ответов.
     */
    gender: "male" | "female";
    /**
     * Форма обращения персонажа. Учитывайте форму обращения персонажа при проектировании ответов.
     * Возможные значения:
     * official — персонаж обращается на "вы".
     * no_official — персонаж обращается на "ты".
     */
    appeal: "official" | "no_official";
}

interface ISberSmartAppMetaInfo {
    /**
     * Данные о текущем времени на устройстве пользователя.
     */
    time: {
        /**
         * Наименование часового пояса.
         */
        timezone_id: string;
        /**
         * Разница во времени
         */
        timezone_offset_sec: number;
        /**
         * Unix-время в миллисекундах.
         */
        timestamp: number;
    }
}

interface ISberSmartAppEntities {
    /**
     *
     */
    value?: string | number;
    /**
     *
     */
    amount?: number,
    /**
     *
     */
    currency?: string,
    /**
     *
     */
    adjectival_number?: boolean
}

interface ISberSmartAppMessageInfo {
    /**
     * Исходное сообщение пользователя: распознанный голос или введенный текст. В случае распознанного голоса предоставляется текст запроса без нормализации числительных и другого, соответственно, все числа, номера телефонов и тд представлены словами.
     * Пример: "хочу заказать пиццу на девять вечера за пятьсот рублей".
     */
    original_text: string,
    /**
     * Нормализованный текст, который ввел пользователь. Можно использовать для снижения многообразия запросов, например, для аналитики.
     * Пример: хотеть заказать пицца на TIME_TIME_TOKEN за MONEY_TOKEN .
     */
    normalized_text: string,
    /**
     * Отображаемый на экране текст запроса / нормализованный на этапе ASR запрос.
     * Пример: "Хочу заказать пиццу на 9 вечера за 500 ₽".
     */
    asr_normalized_message: string,
    /**
     * Извлеченные из запроса сущности.
     */
    entities?: {
        [name: string]: ISberSmartAppEntities[]
    },
    /**
     * Список токенов в запросе пользователя. Содержит грамматический и синтаксический разбор, а также привязку к сущностям и их нормализованным значениям для каждого токена.
     */
    tokenized_elements_list: any[];
}

export interface ISberSmartAppServerAction {
    /**
     * Действие, которое обрабатывает бэкенд смартапа.
     * Значение по умолчанию:run_app.
     */
    action_id: string,
    /**
     * Любые параметры, которые требуются для запуска смартапа. Параметры должны быть представлены в виде валидного JSON-объекта.
     */
    parameters: any
}

interface ISberSmartAppSelectedItem {
    /**
     * Номер элемента из списка, начиная с 0.
     */
    index: number;
    /**
     * Название элемента.
     */
    title: string;
    /**
     * Указывает выбор элемента по номеру.
     */
    is_query_by_number: boolean
}

interface ISberSmartAppAnnotations {
    /**
     * Информация о прохождении цензуры.
     */
    censor_data: {
        /**
         * Список подцензурных категорий, обнаруженных в тексте или реплике пользователя. Содержит следующие значения:
         * politicians — наличие политиков из списка
         * obscene — наличие нецензурной лексики
         * model_response — вероятность негатива
         */
        classes: ["politicians", "obscene", "model_response"],
        /**
         * Коэффициенты подцензурных категорий. Сопоставляются по индексам, в соответствии со списком категорий censor_data.classes.
         * Для категорий politicians и obscene могут принимать только значения 0 и 1.
         */
        probas: [number, number, number]
    },
    /**
     * Эмоциональная окраска текста пользователя.
     */
    text_sentiment: {
        /**
         * Список характеристик эмоциональной окраски текста пользователя. Содержит следующие значения:
         * negative
         * positive
         * neutral
         */
        classes: ["negative", "speech", "neutral", "positive", "skip"],
        /**
         * Коэффициенты той или иной эмоциональной характеристики текста пользователя в диапазоне от 0 до 1.
         * Коэффициенты сопоставляются по индексам с характеристиками, представленными в поле text_sentiment.classes.
         */
        probas: [number, number, number, number, number]
    },
    /**
     * Эмоциональная окраска голоса пользователя.
     */
    asr_sentiment: {
        /**
         * Список характеристик эмоциональной окраски голоса пользователя. Содержит следующие значения:
         * positive
         * neutral
         * negative
         */
        classes: ["positive", "neutral", "negative"],
        /**
         * Коэффициенты той или иной эмоциональной характеристики реплики пользователя в диапазоне от 0 до 1.
         * Коэффициенты сопоставляются по индексам с характеристиками, представленными в поле asr_sentiment .classes.
         */
        probas: [number, number, number]
    }
}

export interface ISberSmartAppRequestPayload {
    /**
     * Информация об устройстве пользователя.
     */
    device: ISberSmartAppDeviceInfo;
    /**
     * Информация о смартапе.
     */
    app_info: ISberSmartAppAppInfo;
    /**
     * Информация о текущем персонаже ассистента, который установлен у пользователя.
     */
    character: ISberSmartAppCharacterInfo;
    /**
     * Интент, полученный из предыдущего ответа смартапа.
     */
    intent: string;
    /**
     * Исходный интент. Значение поля отличается от значения intent только при монопольном захвате контекста.
     */
    original_intent: string;
    /**
     * Мета данные, полученные от сервиса распознавания интентов.
     * Поле будет использовано в будущем. В текущей реализации содержит пустой объект.
     * Определяйте интенты в SmartApp Code и передавайте их в запросах к своему серверу.
     */
    intent_meta: object;
    /**
     * Данные о содержимом экрана пользователя.
     */
    meta: ISberSmartAppMetaInfo;
    /**
     * Имя смартапа, которое задается при создании проекта и отображается в каталоге приложений.
     */
    projectName: string;
    /**
     * Описание элемента экрана, который пользователь назвал при запросе ("включи второй" / "включи второго терминатора"). Для работы этой функциональности нужна отправка во входящем сообщении с фронтенда item_selector со списком элементов.
     * Объект передаётся всегда и может быть либо пустым, либо содержать все указанные поля.
     */
    selected_item?: ISberSmartAppSelectedItem;
    /**
     * Указывает на характер запуска смартапа. Если поле содержит true, сессии присваивается новый идентификатор (поле sessionId).
     * Возможные значения:
     * true — приложение запущено впервые или после закрытия приложения, а так же при запуске приложения по истечению тайм-аута (10 минут) или после прерывания работы приложения, например, по запросу "текущее время"i
     * false — во всех остальных случаях.
     * По умолчанию: false.
     */
    new_session?: boolean
    /**
     * Общие характеристики сообщения пользователя.
     */
    annotations: ISberSmartAppAnnotations;
    /**
     * Возможные стратегии смартапа.
     */
    strategies: { happy_birthday: boolean, last_call: number, is_alice?: boolean },
    /**
     * Информация о запускаемом смартапе и параметрах его запуска.
     * Формируется бэкендом приложения.
     * По умолчанию: пустой объект.
     */
    server_action?: ISberSmartAppServerAction
    /**
     * Результат пред обработки.
     */
    message: ISberSmartAppMessageInfo
}

interface ISberSmartAppUuId {
    /**
     * Идентификатор канала коммуникации.
     */
    userChannel: string;
    /**
     * Постоянный идентификатор пользователя созданный на основе SberID. Может отсутствовать, если пользователь не аутентифицирован.
     * Может использовать для хранения контекста диалога пользователя. Контекст диалога можно обновлять по значению поля new_session.
     */
    sub: string;
    /**
     * Идентификатор, который используется для определения не аутентифицированных пользователей.
     * Идентификатор может изменяться при сбросе настроек или переустановке смартапа.
     */
    userId: string;
}

export interface ISberSmartAppWebhookRequest {
    /**
     * Тип запроса.
     */
    messageName: TMessageName;
    /**
     * Идентификатор сессии, который обновляется каждый раз, когда в поле new_session приходит true.
     * При использовании совместно с messageId помогает гарантировать уникальность сообщения. В том числе если пользователь взаимодействует с несколькими поверхностями.
     */
    sessionId: string;
    /**
     * Идентификатор запроса, который отправил ассистент.
     * Ответ на запрос должен содержать такой же идентификатор в поле messageId.
     */
    messageId: number;
    /**
     * Составной идентификатор пользователя.
     */
    uuid: ISberSmartAppUuId,
    /**
     * Коллекция, в которой в зависимости от потребителя и messageName передается дополнительная информация.
     */
    payload: ISberSmartAppRequestPayload;
}

/**
 * @variant ANSWER_TO_USER — содержит ответ, который ассистент предоставит пользователю;
 * @variant POLICY_RUN_APP — сообщает о вызове смартапа из другого приложения;
 * @variant NOTHING_FOUND — смартап не смог найти ответ. Может указывать на то, что приложение было запущено по ошибке;
 * @variant ERROR — возвращается, если смартап недоступен или вернул ошибку.
 */
export type TSberResponseMessageName = 'ANSWER_TO_USER' | 'POLICY_RUN_APP' | 'NOTHING_FOUND' | 'ERROR'

/**
 * Идентификатор эмоции, определяющий эмоцию персонажа.
 * @variant igrivost — анимация игривости, которую ассистент может испытывать в ответ на дружеские шутки и подколки пользователя;
 * @variant udovolstvie — анимация удовольствия;
 * @variant podavleniye_gneva — анимация подавляемого раздражения на отрицательно окрашенные реплики в адрес ассистента;
 * @variant smushchennaya_ulibka — анимация смущения, например, в ответ на похвалу;
 * @variant simpatiya — анимация симпатии в ответ на положительно окрашенные реплики;
 * @variant oups — анимация неловкости в ответ на лёгкое раздражение или неудобные вопросы пользователя. Например, при вопросе вида "Почему такие низкие ставки по вкладам?";
 * @variant laugh — анимация смеха над шуткой пользователя;
 * @variant ok_prinyato — анимация исполнения запроса;
 * @variant bespokoistvo — анимация беспокойства, например, при жалобе пользователя на самочувствие;
 * @variant predvkusheniye — анимация возбуждённого ожидания следующей реплики пользователя;
 * @variant vinovatiy — анимация вины, например, если в приложении произошла ошибка;
 * @variant zhdu_otvet — анимация ожидания реакции от пользователя, например, ответа на заданный вопрос;
 * @variant zadumalsa — анимация размышление над репликой пользователя, например, если её не удалось распознать;
 * @variant neznayu — анимация отсутствия ответа.
 * @variant nedoumenie — анимация сомнения, например, когда не удаётся точно распознать реплику.
 * @variant nedovolstvo — анимация негативной реакции в ответ на реплику
 * @variant nesoglasie — анимация несогласия с пользователем.
 * @variant pechal — анимация грусти и тоскливого настроения.
 * @variant radost — анимация радости или удовлетворения действиями или репликами пользователя.
 * @variant sochuvstvie — анимация сопереживания или выражения участия в проблемах пользователя.
 * @variant strakh — анимация испуга.
 * @variant zainteresovannost — анимация проявления интереса или любопытства по отношению к действиям или репликам пользователя.
 */
export type TSberSmartAppEmotionId =
    'igrivost'
    | 'udovolstvie'
    | 'podavleniye_gneva'
    | 'smushchennaya_ulibka'
    | 'simpatiya'
    | 'oups'
    | 'laugh'
    | 'ok_prinyato'
    | 'bespokoistvo'
    | 'predvkusheniye'
    | 'vinovatiy'
    | 'zhdu_otvet'
    | 'zadumalsa'
    | 'neznayu'
    | 'nedoumenie'
    | 'nedovolstvo'
    | 'nesoglasie'
    | 'pechal'
    | 'radost'
    | 'sochuvstvie'
    | 'strakh'
    | 'zainteresovannost';

interface ISberSmartAppSuggestionAction {
    /**
     * Текст, который появится на экране. Передается, только в действии типа text.
     */
    text?: string;
    /**
     * Объект передаётся в сообщении SERVER_ACTION, после нажатия кнопки, тип действия которой задан как server_action.
     */
    server_action?: any;
    /**
     * Тип действия.
     * Возможные значения:
     * text — по нажатию на кнопку отображается текст, указанный в поле text.
     * server_action — указывайте этот тип чтобы передать в бекэнд приложения сообщение SERVER_ACTION с необходимым объектом server_action.
     */
    type: 'text' | 'server_action';
}

export interface ISberSmartAppSuggestionButton {
    /**
     * Название кнопки, которое отображается в интерфейсе ассистента.
     */
    title: string;
    /**
     * Описывает действие, которое выполнится по нажатию кнопки.
     */
    action?: ISberSmartAppSuggestionAction;
}

/**
 * Поведение шторки ассистента. Параметр актуален при работе с ассистентом на наших устройствах.
 * @variant auto_expand — шторка будет автоматически разворачиваться, если полученный текст не помещается в свёрнутой шторке;
 * @variant force_expand — шторка развернётся независимо от того, помещается полученный текст в свёрнутой шторке или нет;
 * @variant preserve_panel_state — сохраняет текущее состояние шторки независимо от длины текста.
 * @default auto_expand.
 */
type TSberSmartAppExpandPolicy = 'auto_expand' | 'force_expand' | 'preserve_panel_state'

export interface ISberSmartAppBubble {
    /**
     * Текст, который отобразит ассистент.
     * Максимальная длина: не более 250 символов.
     */
    text: string;
    /**
     * Указывает, что текст содержит маркдаун-разметку, которую необходимо обработать.
     * Если поле отсутствует, применяется значение false и текст отображается в исходном виде.
     */
    markdown?: boolean;
    /**
     * Поведение шторки ассистента. Параметр актуален при работе с ассистентом на наших устройствах.
     */
    expand_policy: TSberSmartAppExpandPolicy;
}

type TSberSmartAppPadding = '0x' | '1x' | '2x' | '4x' | '5x' | '6x' | '8x' | '9x' | '10x' | '12x' | '16x';

export interface ISberSmartAppCardAction {
    /**
     * Тип действия.
     * Возможные значения:
     * text — действие, которое обозначает отправку сообщения от имени пользователя в чат с ассистентом;
     * send_contact_phone — действие, которое обозначает отправку номера телефона указанного контакта;
     * deep_link — действие, которое обозначает обработку диплинка ассистентом или хост-приложением.
     */
    type: 'text' | 'send_contact_phone' | 'deep_link';
    /**
     * Передаётся только в действиях с типом text.
     * Текст сообщения от имени пользователя
     */
    text?: string;
    /**
     * Может передаваться только в действиях с типом text.
     * Указывает, что сообщение нужно не только отобразить в чате с ассистентом, но и отправить в бэкенд.
     * По умолчанию true.
     */
    should_send_to_backend?: boolean;
    /**
     * Передаётся только в действиях с типом send_contact_phone.
     * Идентификатор контакта.
     */
    send_contact_phone?: number;
    /**
     * Может передаваться только в действиях с типом send_contact_phone.
     * Сообщение, которое может содержать подстроку [[placeholder]]. В [[placeholder]] необходимо подставлять номер телефона контакта, указанного в поле send_contact_phone.
     */
    template?: string
    /**
     * Передаётся только в действиях с типом deep_link.
     * Диплинк, который нужно открыть.
     */
    deep_link?: string;
}

export type TSberSmartAppTypeface =
    'headline1'
    | 'headline2'
    | 'headline3'
    | 'title1'
    | 'title2'
    | 'body1'
    | 'body2'
    | 'body3'
    | 'text1'
    | 'paragraphText1'
    | 'paragraphText2'
    | 'footnote1'
    | 'footnote2'
    | 'button1'
    | 'button2'
    | 'caption';
export type TSberSmartAppTextColor =
    'default'
    | 'secondary'
    | 'tertiary'
    | 'inverse'
    | 'brand'
    | 'warning'
    | 'critical'
    | 'link';

interface ISberSmartAppCardText {
    /**
     * Текст, который необходимо отобразить. Минимальная длина текста 1 символ.
     */
    text: string;
    /**
     * Стиль текста
     */
    typeface: TSberSmartAppTypeface;
    /**
     * Цвет текста.
     */
    text_color: TSberSmartAppTextColor;
    /**
     * Отступы.
     */
    margins?: ISberSmartAppCardPadding;
    /**
     * Максимальное количество строк. По умолчанию 1.
     * Значение 0 указывает на неограниченное количество строк.
     */
    max_lines?: number;
    /**
     * Массив объектов, описывающих действия.
     */
    actions?: ISberSmartAppCardAction;
}

export interface ISberSmartAppCardPadding {
    /**
     * Размер отступа.
     */
    left?: TSberSmartAppPadding;
    /**
     * Размер отступа.
     */
    top?: TSberSmartAppPadding;
    /**
     * Размер отступа.
     */
    right?: TSberSmartAppPadding;
    /**
     * Размер отступа.
     */
    bottom?: TSberSmartAppPadding;
}

interface ISberSmartAppCardImage {
    /**
     * Адрес изображения.
     */
    url?: string;
    /**
     * Хэш изображения.
     */
    hash?: string;
    /**
     * Заглушка, которая отображается, если изображения нет или оно невалидно.
     */
    placeholder?: string;
    /**
     * Режим растягивания содержимого.
     */
    scale_mode?: 'scale_aspect_fill' | 'scale_aspect_fit' | 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
    /**
     * Высота контейнера изображения, выраженная в независящих от платформы единицах.
     * Поле игнорируется, если присутствует поле size.
     * По умолчанию 192.
     */
    height?: number;
    /**
     * Цвет фона.
     */
    placeholder_color?: 'solid_black' | 'solid_white' | 'solid_transparent' | 'solid_disabled' | 'solid_brand' | 'solid_warning' | 'solid_critical' | 'solid_action' | 'liquid_60' | 'liquid_50' | 'liquid_40' | 'liquid_30' | 'liquid_20' | 'liquid_10';
    /**
     * Массив объектов, описывающих действия.
     */
    actions?: ISberSmartAppCardAction[];
    /**
     * Размер изображения.
     */
    size?: {
        /**
         * Ширина содержимого в терминах сеток.
         */
        width: 'small' | 'medium' | 'large' | 'resizable';
        /**
         * Отношение высоты содержимого к ширине.
         */
        aspect_ratio: number;
    }
}

export interface ISberSmartAppCardItem {
    /**
     * Тип ячейки.
     */
    type: 'greeting_grid_item' | 'media_gallery_item' | 'gallery_more_button_item' | 'image_cell_view' | 'text_cell_view' | 'left_right_cell_view';
    /**
     * Параметры верхнего текста.
     */
    top_text?: ISberSmartAppCardText;
    /**
     * Параметры нижнего текста.
     */
    bottom_text?: ISberSmartAppCardText;
    /**
     * Отступы.
     */
    margins?: ISberSmartAppCardPadding;
    /**
     * Массив объектов, описывающих действия.
     */
    actions?: ISberSmartAppCardAction[];
    /**
     * Параметры изображения.
     */
    image?: ISberSmartAppCardImage;
    /**
     * Отступы.
     */
    paddings?: ISberSmartAppCardPadding;

    left?: {
        type: string,
        icon_vertical_gravity?: string,
        label?: ISberSmartAppCardText,
        icon_and_value?: {
            icon?: {
                address?: {
                    type: string,
                    url: string
                },
                size: {
                    width: string,
                    height: string
                },
                margin?: ISberSmartAppCardPadding
            }
            value?: ISberSmartAppCardText
        }
    };
    right?: any;

    content?: ISberSmartAppCardImage | ISberSmartAppCardText;
}

export interface ISberSmartAppCard {
    /**
     * Описание отступов карточки.
     */
    paddings?: ISberSmartAppCardPadding;
    /**
     * Указывает что карточка может отображаться как отключённая. По умолчанию false.
     */
    can_be_disabled?: boolean;
    /**
     * Тип карточки, который определяет наличие различных полей в объекте card.
     * Возможные значения:
     * gallery_card — горизонтальная галерея;
     * grid_card — карточка с сеткой ячеек.
     * list_card - Вертикальная карточка
     */
    type: 'gallery_card' | 'grid_card' | 'list_card'
    /**
     * Количество столбцов. По умолчанию 1 столбец.
     */
    columns?: number;
    /**
     * Ширина контента в терминах сеток.
     */
    item_width?: 'small' | 'medium' | 'large' | 'resizable'
    /**
     * Ячейки карточки. Минимум 1 ячейка.
     */
    items?: ISberSmartAppCardItem[];
    sells?: ISberSmartAppCardItem[];
}

export interface ISberSmartAppItem {
    /**
     * Карточка.
     */
    card?: ISberSmartAppCard;
    /**
     * Текст.
     */
    bubble?: ISberSmartAppBubble;
    /**
     * Команда ассистенту.
     */
    command?: object
}

export interface ISberSmartAppResponsePayload {
    /**
     * Текст, который ассистент озвучит пользователю.
     */
    pronounceText: string;
    /**
     * Указывает, что в тексте, который необходимо озвучить (поле pronounceText).
     * Поддерживаемые разметки;
     * application/text;
     * application/ssml.
     */
    pronounceTextType: string;
    /**
     * Эмоция ассистента, которую он показывает с помощью анимации кнопки.
     */
    emotion?: {
        /**
         * Идентификатор эмоции, определяющий эмоцию персонажа.
         */
        emotionId: TSberSmartAppEmotionId;
    },
    /**
     * Список элементов интерфейса, которые необходимо показать пользователю.
     */
    items?: ISberSmartAppItem[];
    /**
     * Предложения, которые смартап может сделать пользователю в зависимости от контекста диалога.
     * Предложения могут быть представлены в виде кнопок и карточек.
     * Важно! В интерфейсе SberBox предложения носят информационный характер. Оформляйте их в виде подсказок, а не кнопок.
     */
    suggestions?: {
        /**
         * Список кнопок с предложениями смартапа. Каждая кнопка представлена в виде отдельного объекта.
         */
        buttons: ISberSmartAppSuggestionButton[]
    }
    /**
     * Интент, который смартап получит в следующем ответе ассистента.
     */
    intent: string;
    /**
     * Имя смартапа, которое задается при создании проекта и отображается в каталоге приложений.
     */
    projectName: string;
    /**
     * Информация об устройстве пользователя.
     */
    device: ISberSmartAppDeviceInfo;
    /**
     * Код ошибки.
     */
    code?: number;
    /**
     * Указывает, что ассистент должен слушать пользователя после выполнения действия.
     * По умолчанию false.
     */
    auto_listening?: boolean;
    /**
     * Сообщает ассистенту о завершении работы смартапа. Ассистент интерпретирует отсутствие поля как false.
     * Возможные значения:
     * true — диалог завершён, следующее сообщение пользователя поступит в другое приложение;
     * false — диалог продолжается, сообщения пользователя передаются в приложение.
     */
    finished?: boolean;
}

export interface ISberSmartAppWebhookResponse {
    /**
     * Тип ответа. Определяет логику обработки.
     */
    messageName?: TSberResponseMessageName;
    /**
     * Идентификатор сессии, который обновляется каждый раз, когда в поле new_session приходит true.
     * При использовании совместно с messageId помогает гарантировать уникальность сообщения. В том числе если пользователь взаимодействует с несколькими поверхностями.
     */
    sessionId: string;
    /**
     * Идентификатор ответа смартапа. Должен быть таким же, как идентификатор запроса.
     */
    messageId: number;
    /**
     * Составной идентификатор пользователя.
     */
    uuid: ISberSmartAppUuId;
    /**
     * Объект с данными, которые зависят от типа сообщения.
     */
    payload?: ISberSmartAppResponsePayload;
}

export interface ISberSmartAppSession {
    device: ISberSmartAppDeviceInfo;
    meta: ISberSmartAppMetaInfo;
    sessionId: string;
    messageId: number;
    uuid: ISberSmartAppUuId;
    projectName: string;
}
