/**
 * Интерфейсы для работы с Яндекс Марусей
 * Определяют структуру данных для взаимодействия с API Маруси
 *
 * Основные компоненты:
 * - Запросы (IMarusiaWebhookRequest)
 * - Ответы (IMarusiaWebhookResponse)
 * - Сессии (IMarusiaSession)
 * - Состояния (IMarusiaRequestState)
 * - Компоненты интерфейса (кнопки, карточки, изображения)
 *
 * @module platforms/interfaces/IMarusia
 */

import { TButtonPayload } from '../../components/button/interfaces';

/**
 * Интерфейс для именованных сущностей в запросе
 * Используется для извлечения структурированных данных из текста пользователя
 */
export interface IMarusiaEntities {
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
     * Формат зависит от типа сущности
     */
    value: object;
}

/**
 * Интерфейс для обработки естественного языка (NLU)
 * Содержит результаты анализа текста пользователя
 */
export interface IMarusiaNlu {
    /** Массив слов из фразы пользователя */
    tokens?: string[];
    /** Массив найденных именованных сущностей */
    entities?: IMarusiaEntities[];
    /** Распознанные намерения пользователя */
    intents?: object;
}

/**
 * Интерфейс для данных сессии
 * Содержит информацию о текущем диалоге с пользователем
 */
export interface IMarusiaSession {
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
}

/**
 * Интерфейс для состояния приложения
 * Определяет где хранятся данные:
 * - session: данные сессии
 * - user: данные пользователя
 */
export interface IMarusiaRequestState {
    /** Данные сессии */
    session?: object | string;
    /** Данные пользователя */
    user?: object | string;
}

/**
 * Интерфейс для метаданных запроса
 * Содержит информацию об устройстве и окружении
 */
export interface IMarusiaRequestMeta {
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
 * Интерфейс для данных запроса
 * Содержит информацию о сообщении пользователя
 */
export interface IMarusiaRequest {
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
     * Слова и именованные сущности
     */
    nlu?: IMarusiaNlu;
}

/**
 * Интерфейс для вебхук-запроса
 * Полный формат входящего запроса от Маруси
 */
export interface IMarusiaWebhookRequest {
    /** Метаданные устройства */
    meta: IMarusiaRequestMeta;
    /** Данные запроса пользователя */
    request: IMarusiaRequest;
    /** Данные сессии */
    session: IMarusiaSession;
    /** Событие связки аккаунтов */
    account_linking_complete_event?: boolean;
    /** Состояние приложения */
    state?: IMarusiaRequestState;
    /** Версия протокола (текущая: 1.0) */
    version: string;
}

/**
 * Интерфейс для кнопки
 * Определяет внешний вид и поведение кнопки
 */
export interface IMarusiaButton {
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
 * Интерфейс для кнопки на карточке
 * Определяет поведение при нажатии на изображение
 */
export interface IMarusiaButtonCard {
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
 * Базовый интерфейс для изображения
 * Определяет общие свойства для всех типов карточек
 */
export interface IMarusiaImage {
    /**
     * Тип карточки
     * - BigImage: одно изображение
     * - ItemsList: список изображений (1-5)
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
     * Игнорируется для ItemsList
     */
    description?: string;

    /**
     * Свойства при нажатии
     * Игнорируется для ItemsList
     */
    button?: IMarusiaButtonCard;
}

/**
 * Интерфейс для большого изображения
 * Одно изображение с заголовком и описанием
 */
export interface IMarusiaBigImage extends IMarusiaImage {
    /** Тип карточки */
    type: 'BigImage';
}

/**
 * Интерфейс для списка изображений
 * От 1 до 5 изображений с заголовком
 */
export interface IMarusiaItemsList {
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
    items?: IMarusiaImage[];

    /**
     * Кнопка под списком
     */
    footer?: {
        /** Текст кнопки (макс. 64 символа) */
        text: string;
        /** Свойства кнопки */
        button?: IMarusiaButtonCard;
    };
}

/**
 * Интерфейс для ответа навыка
 * Определяет формат ответа пользователю
 */
export interface IMarusiaResponse {
    /**
     * Текст ответа
     * Максимум 1024 символа
     * Используется если карточка не отображается
     */
    text: string;

    /**
     * Текст для озвучивания
     * Максимум 1024 символа
     * Поддерживает SSML и звуки
     */
    tts?: string;

    /**
     * Карточка с изображением
     * Отображается вместо текста
     */
    card?: IMarusiaBigImage | IMarusiaItemsList;

    /**
     * Кнопки
     * Отображаются после ответа
     */
    buttons?: IMarusiaButton[] | null;

    /**
     * Завершить сессию
     * true: завершить диалог
     * false: продолжить диалог
     */
    end_session: boolean;
}

/**
 * Интерфейс для данных сессии в ответе
 * Содержит информацию о текущей сессии
 */
export interface IMarusiaSessionResponse {
    /** ID сессии */
    session_id: string;
    /** ID сообщения */
    message_id: number;
    /** ID пользователя */
    user_id: string;
}

/**
 * Интерфейс для вебхук-ответа
 * Полный формат исходящего ответа для Маруси
 */
export interface IMarusiaWebhookResponse {
    /** Данные сессии */
    session_state?: object | string;
    /** Данные пользователя */
    user_state_update?: object | string;
    /** Ответ пользователю */
    response?: IMarusiaResponse;
    /** Версия протокола (текущая: 1.0) */
    version: string;
    /** Информация о сессии */
    session?: IMarusiaSessionResponse;
}
