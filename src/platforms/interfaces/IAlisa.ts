/**
 * Интерфейсы для работы с Яндекс Алисой.
 * Определяют структуру данных для взаимодействия с API Алисы
 *
 * Основные компоненты:
 * - Запросы (IAlisaWebhookRequest)
 * - Ответы (IAlisaWebhookResponse)
 * - Сессии (IAlisaSession)
 * - Состояния (IAlisaRequestState)
 * - Компоненты интерфейса (кнопки, карточки, изображения)
 *
 * @module platforms/interfaces/IAlisa
 */

import { TButtonPayload } from '../../components/button/interfaces';

/**
 * Интерфейс для именованных сущностей в запросе.
 * Используется для извлечения структурированных данных из текста пользователя
 */
export interface IAlisaEntities {
    /**
     * Позиция сущности в массиве слов
     * Нумерация начинается с 0
     */
    tokens?: {
        /** Индекс первого слова сущности */
        start: number;
        /** Индекс первого слова после сущности */
        end: number;
    };

    /**
     * Тип именованной сущности
     * Поддерживаемые типы:
     * - YANDEX.DATETIME: дата и время
     * - YANDEX.FIO: фамилия, имя, отчество
     * - YANDEX.GEO: местоположение
     * - YANDEX.NUMBER: число
     */
    type: string;

    /**
     * Значение сущности
     * Формат зависит от типа сущности:
     * - YANDEX.DATETIME: { year: number, month: number, day: number, ... }
     * - YANDEX.FIO: { first_name: string, last_name: string, ... }
     * - YANDEX.GEO: { country: string, city: string, ... }
     * - YANDEX.NUMBER: number
     *
     * @example
     * ```typescript
     * // Для YANDEX.DATETIME
     * value: { year: 2024, month: 3, day: 15 }
     *
     * // Для YANDEX.FIO
     * value: { first_name: "Иван", last_name: "Иванов" }
     *
     * // Для YANDEX.GEO
     * value: { country: "Россия", city: "Москва" }
     *
     * // Для YANDEX.NUMBER
     * value: 42
     * ```
     */
    value: object | number;
}

/**
 * Интерфейс для обработки естественного языка (NLU)
 * Содержит результаты анализа текста пользователя
 */
export interface IAlisaNlu {
    /** Массив слов из фразы пользователя */
    tokens?: string[];
    /** Массив найденных именованных сущностей */
    entities?: IAlisaEntities[];
    /**
     * Распознанные намерения пользователя.
     * Каждый интент содержит слоты с параметрами
     *
     * @example
     * ```typescript
     * intents: {
     *     "YANDEX.CONFIRM": {
     *         slots: []
     *     },
     *     "YANDEX.REJECT": {
     *         slots: []
     *     },
     *     "YANDEX.DATETIME": {
     *         slots: [{
     *             type: "YANDEX.DATETIME",
     *             value: { year: 2024 }
     *         }]
     *     }
     * }
     * ```
     */
    intents?: object;
}

/**
 * Интерфейс для данных сессии.
 * Содержит информацию о текущем диалоге с пользователем
 */
export interface IAlisaSession {
    /**
     * Признак новой сессии
     * true - начало нового диалога
     * false - продолжение существующего диалога
     */
    new: boolean;

    /**
     * ID сообщения в сессии
     * Максимум 8 символов
     * Увеличивается с каждым запросом
     */
    message_id: number;

    /**
     * Уникальный ID сессии
     * Максимум 64 символа
     */
    session_id: string;

    /**
     * ID навыка
     * Присваивается при создании навыка
     */
    skill_id: string;

    /**
     * ID пользователя
     * Максимум 64 символа
     * Уникален для пары "приложение-пользователь"
     */
    user_id?: string;

    /**
     * Данные авторизованного пользователя.
     * Присутствует только если пользователь авторизован
     */
    user?: {
        /**
         * ID пользователя Яндекса
         * Уникален для пары "пользователь-навык"
         */
        user_id: string;

        /**
         * OAuth токен для авторизации.
         * Используется для связки аккаунтов
         */
        access_token: string;
    };

    /**
     * Данные о приложении
     */
    application?: {
        /**
         * ID экземпляра приложения
         * Максимум 64 символа
         * Уникален для пары "приложение-навык"
         */
        application_id: string;
    };
}

/**
 * Интерфейс для состояния приложения.
 * Определяет где хранятся данные:
 * - session: данные сессии
 * - user: данные пользователя
 * - application: данные приложения
 */
export interface IAlisaRequestState {
    /**
     * Данные сессии
     */
    session?: object | string;
    /**
     * Данные пользователя
     */
    user?: object | string;
    /**
     * Данные приложения
     */
    application?: object | string;
}

/**
 * Интерфейс для метаданных запроса.
 * Содержит информацию об устройстве и окружении
 */
export interface IAlisaRequestMeta {
    /** Язык в POSIX-формате (макс. 64 символа) */
    locale: string;
    /** Часовой пояс (макс. 64 символа) */
    timezone: string;
    /** ID устройства и приложения (макс. 1024 символа) */
    client_id: string;

    /**
     * Доступные интерфейсы устройства
     */
    interfaces: {
        /** Поддержка экрана и браузера */
        screen?: object;
        /** Поддержка платежей */
        payments?: object | null;
        /** Поддержка связки аккаунтов */
        account_linking: object | null;
    };
}

/**
 * Интерфейс для данных запроса.
 * Содержит информацию о сообщении пользователя
 */
export interface IAlisaRequest {
    /**
     * Обработанный текст запроса
     * Очищен от знаков препинания
     * Числа преобразованы в числовой формат
     */
    command: string;

    /**
     * Исходный текст запроса
     * Максимум 1024 символа
     */
    original_utterance: string;

    /**
     * Тип ввода
     * - SimpleUtterance: голосовой ввод
     * - ButtonPressed: нажатие кнопки
     */
    type: 'SimpleUtterance' | 'ButtonPressed';

    /**
     * Характеристики реплики
     */
    markup?: {
        /**
         * Признак криминального подтекста
         * true: содержит угрозы, самоубийство и т.д.
         */
        dangerous_context?: boolean;
    };

    /**
     * Данные с нажатой кнопки
     * Максимум 4096 байт
     */
    payload?: object | string;

    /**
     * Результаты анализа текста
     * Содержит:
     * - tokens: массив слов из фразы
     * - entities: найденные именованные сущности
     * - intents: распознанные намерения
     *
     * @example
     * ```typescript
     * nlu: {
     *     tokens: ["завтра", "в", "15", "часов"],
     *     entities: [{
     *         type: "YANDEX.DATETIME",
     *         value: { day: 1, day_is_relative: true, hour: 15 }
     *     }],
     *     intents: {
     *         "YANDEX.CONFIRM": { slots: [] }
     *     }
     * }
     * ```
     */
    nlu?: IAlisaNlu;
}

/**
 * Интерфейс для вебхук-запроса.
 * Полный формат входящего запроса от Алисы
 */
export interface IAlisaWebhookRequest {
    /** Метаданные устройства */
    meta: IAlisaRequestMeta;
    /** Данные запроса пользователя */
    request: IAlisaRequest;
    /** Данные сессии */
    session: IAlisaSession;
    /** Событие связки аккаунтов */
    account_linking_complete_event?: boolean;
    /** Состояние приложения */
    state?: IAlisaRequestState;
    /** Версия протокола (текущая: 1.0) */
    version: string;
}

/**
 * Интерфейс для кнопки.
 * Определяет внешний вид и поведение кнопки
 */
export interface IAlisaButton {
    /**
     * Текст кнопки
     * Максимум 64 символа
     * Отправляется как команда при нажатии
     */
    title?: string;

    /**
     * Данные для обработчика
     * Максимум 4096 байт
     */
    payload?: TButtonPayload;

    /**
     * URL для перехода
     * Максимум 1024 байта
     */
    url?: string;

    /**
     * Скрывать после нажатия
     * @defaultValue false
     */
    hide?: boolean;
}

/**
 * Интерфейс для кнопки на карточке.
 * Определяет поведение при нажатии на изображение
 */
export interface IAlisaButtonCard {
    /**
     * Команда при нажатии
     * Максимум 64 символа
     */
    text?: string;

    /**
     * Данные для обработчика
     * Максимум 4096 байт
     */
    payload?: TButtonPayload;

    /**
     * URL для перехода
     * Максимум 1024 байта
     */
    url?: string;
}

/**
 * Базовый интерфейс для изображения.
 * Определяет общие свойства для всех типов карточек
 */
export interface IAlisaImage {
    /**
     * Тип карточки
     * - BigImage: одно изображение
     * - ItemsList: список изображений (1-5)
     * - ImageGallery: галерея (1-7)
     */
    type?: string;

    /**
     * ID изображения
     * Только для BigImage
     */
    image_id?: string;

    /**
     * Заголовок
     * Максимум 128 символов
     * Игнорируется для ItemsList
     */
    title: string;

    /**
     * Описание
     * Максимум 256 символов
     * Игнорируется для ItemsList и ImageGallery
     */
    description?: string;

    /**
     * Свойства при нажатии.
     * Игнорируется для ItemsList и ImageGallery
     */
    button?: IAlisaButtonCard;
}

/**
 * Интерфейс для большого изображения
 * Одно изображение с заголовком и описанием
 */
export interface IAlisaBigImage extends IAlisaImage {
    /** Тип карточки */
    type: 'BigImage';
}

/**
 * Интерфейс для списка изображений
 * От 1 до 5 изображений с заголовком
 */
export interface IAlisaItemsList {
    /** Тип карточки */
    type: 'ItemsList';

    /**
     * Заголовок списка
     */
    header?: {
        /** Текст заголовка (макс. 64 символа) */
        text: string;
    };

    /**
     * Изображения
     * От 1 до 5 элементов
     */
    items?: IAlisaImage[];

    /**
     * Кнопка под списком
     */
    footer?: {
        /** Текст кнопки (макс. 64 символа) */
        text: string;
        /** Свойства кнопки */
        button?: IAlisaButtonCard;
    };
}

/**
 * Интерфейс для галереи изображений
 * От 1 до 7 изображений
 */
export interface IAlisaImageGallery {
    /** Тип карточки */
    type: 'ImageGallery';

    /**
     * Изображения
     * От 1 до 7 элементов
     */
    items?: IAlisaImage[];
}

/**
 * Интерфейс для ответа навыка.
 * Определяет формат ответа пользователю
 */
export interface IAlisaResponse {
    /**
     * Текст ответа
     * Максимум 1024 символа
     * Используется если карточка не отображается
     */
    text: string;

    /**
     * Текст для озвучивания
     * Максимум 1024 символа
     * Поддерживает SSML и звуки:
     * - <speak>: корневой тег
     * - <say-as>: произношение чисел, дат и т.д.
     * - <audio>: вставка звуков
     * - <voice>: выбор голоса
     *
     * @example
     * ```typescript
     * // Простой текст
     * tts: "Привет, как дела?"
     *
     * // С SSML
     * tts: "<speak>Привет! <say-as interpret-as=\"date\">2024-03-15</say-as></speak>"
     *
     * // Со звуком
     * tts: "<speak>Слушайте <audio src=\"sound.mp3\">звук</audio></speak>"
     *
     * // С голосом
     * tts: "<speak><voice name=\"alena\">Привет!</voice></speak>"
     * ```
     */
    tts?: string;

    /**
     * Карточка с изображением
     * Отображается вместо текста
     * Поддерживает три типа:
     * - BigImage: одно изображение с заголовком и описанием
     * - ItemsList: список из 1-5 изображений
     * - ImageGallery: галерея из 1-7 изображений
     *
     * @example
     * ```typescript
     * // Одно изображение
     * card: {
     *     type: "BigImage",
     *     image_id: "123456",
     *     title: "Заголовок",
     *     description: "Описание",
     *     button: {
     *         text: "Подробнее",
     *         url: "https://example.com"
     *     }
     * }
     *
     * // Список изображений
     * card: {
     *     type: "ItemsList",
     *     header: { text: "Список" },
     *     items: [
     *         { title: "Изображение 1", image_id: "1" },
     *         { title: "Изображение 2", image_id: "2" }
     *     ],
     *     footer: {
     *         text: "Ещё",
     *         button: { text: "Показать" }
     *     }
     * }
     *
     * // Галерея
     * card: {
     *     type: "ImageGallery",
     *     items: [
     *         { title: "Изображение 1", image_id: "1" },
     *         { title: "Изображение 2", image_id: "2" }
     *     ]
     * }
     * ```
     */
    card?: IAlisaBigImage | IAlisaItemsList | IAlisaImageGallery;

    /**
     * Кнопки
     * Отображаются после ответа
     */
    buttons?: IAlisaButton[] | null;

    /**
     * Завершить сессию
     * true: завершить диалог
     * false: продолжить диалог
     */
    end_session: boolean;
}

/**
 * Интерфейс для вебхук-ответа.
 * Полный формат исходящего ответа для Алисы
 */
export interface IAlisaWebhookResponse {
    /** Ответ пользователю */
    response?: IAlisaResponse;
    /** Данные сессии */
    session_state?: object | string;
    /** Данные приложения */
    application_state?: object | string;
    /** Данные пользователя */
    user_state_update?: object | string;
    /** Версия протокола (текущая: 1.0) */
    version: string;
    /** Начать авторизацию */
    start_account_linking?: any;
}
