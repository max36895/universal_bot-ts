/**
 * Модуль контроллера - основной компонент для обработки бизнес-логики бота
 *
 * @module controller/BotController
 */
import { Buttons } from '../components/button';
import { Card } from '../components/card';
import { Sound } from '../components/sound';
import { Nlu } from '../components/nlu';
import { Text } from '../utils/standard/Text';
import {
    AppContext,
    HELP_INTENT_NAME,
    IAppIntent,
    T_ALISA,
    T_MARUSIA,
    WELCOME_INTENT_NAME,
} from '../core/AppContext';

/**
 * Тип статуса операции
 * Определяет результат выполнения операции
 *
 * @remarks
 * Возможные значения:
 * - true: операция выполнена успешно
 * - false: операция завершилась с ошибкой
 * - null: операция не выполнялась
 *
 * @example
 * ```typescript
 * const status: TStatus = true; // операция успешна
 * const status: TStatus = false; // операция с ошибкой
 * const status: TStatus = null; // операция не выполнялась
 * ```
 */
export type TStatus = true | false | null;

/**
 * Интерфейс для событий пользователя
 * Содержит информацию о различных действиях пользователя в приложении
 *
 * @remarks
 * События включают:
 * - Авторизацию пользователя
 * - Оценку приложения
 *
 * @example
 * ```typescript
 * const userEvent: IUserEvent = {
 *   auth: {
 *     status: true // пользователь успешно авторизовался
 *   },
 *   rating: {
 *     status: true,
 *     value: 5 // пользователь поставил оценку 5
 *   }
 * };
 * ```
 */
export interface IUserEvent {
    /**
     * Информация об авторизации пользователя.
     * Содержит статус авторизации и дополнительные данные
     */
    auth?: {
        /**
         * Статус авторизации
         * @remarks
         * - true: авторизация успешна
         * - false: авторизация не удалась
         * - null: авторизация не выполнялась
         */
        status: TStatus;
    };
    /**
     * Информация об оценке приложения пользователем.
     * Содержит статус оценки и её значение
     */
    rating?: {
        /**
         * Статус выставления оценки
         * @remarks
         * - true: оценка выставлена
         * - false: пользователь отказался от оценки
         * - null: оценка не запрашивалась
         */
        status: TStatus;
        /**
         * Числовое значение выставленной оценки
         * @remarks
         * Обычно от 1 до 5
         */
        value?: number;
    };
}

/**
 * Интерфейс для хранения пользовательских данных
 * Расширяемый интерфейс для хранения любых дополнительных данных
 *
 * @remarks
 * Базовые поля:
 * - oldIntentName: название предыдущего интента
 *
 * Дополнительные поля могут быть добавлены через:
 * 1. Расширение интерфейса (extends)
 * 2. Индексную сигнатуру [key: string]: unknown
 *
 * @example
 * ```typescript
 * // Способ 1: Расширение интерфейса
 * interface MyUserData extends IUserData {
 *   name: string;
 *   preferences: {
 *     language: string;
 *     theme: string;
 *   };
 * }
 *
 * // Способ 2: Использование индексной сигнатуры
 * interface DynamicUserData extends IUserData {
 *   [key: string]: unknown;
 * }
 *
 * const userData: MyUserData = {
 *   oldIntentName: 'greeting',
 *   name: 'John',
 *   preferences: {
 *     language: 'ru',
 *     theme: 'dark'
 *   }
 * };
 *
 * const dynamicData: DynamicUserData = {
 *   oldIntentName: 'greeting',
 *   customField1: 'value1',
 *   customField2: 42,
 *   customObject: {
 *     nested: true
 *   }
 * };
 * ```
 */
export interface IUserData {
    /**
     * Название предыдущего интента.
     * Используется для отслеживания контекста диалога
     *
     * @example
     * ```typescript
     * this.oldIntentName = 'greeting';
     * ```
     */
    oldIntentName?: string;

    /**
     * Дополнительные пользовательские данные.
     * Может содержать любые поля, специфичные для приложения
     */
    [key: string]: unknown;
}

/**
 * Абстрактный класс контроллера бота
 * Предоставляет базовый функционал для обработки пользовательских запросов
 *
 * @remarks
 * Основные возможности:
 * - Обработка пользовательских команд и интентов
 * - Управление состоянием диалога
 * - Работа с UI компонентами (кнопки, карточки)
 * - Поддержка различных платформ (Алиса, Маруся, Telegram и др.)
 * - Управление пользовательскими данными
 *
 * @example
 * ```typescript
 * // Определение пользовательских данных
 * interface MyUserData extends IUserData {
 *   score: number;
 *   level: number;
 *   preferences: {
 *     language: string;
 *     theme: string;
 *   };
 * }
 *
 * class MyController extends BotController<MyUserData> {
 *   public action(intentName: string | null): void {
 *     try {
 *       // Обработка приветствия
 *       if (intentName === WELCOME_INTENT_NAME) {
 *         // Текстовый ответ
 *         this.text = 'Привет! Чем могу помочь?';
 *
 *         // Добавление кнопок
 *         this.buttons
 *           .addBtn('Помощь')
 *           .addBtn('Выход');
 *
 *         // Добавление карточки
 *         this.card
 *           .addImage('xxx', 'Добро пожаловать!', 'Выберите действие:')
 *           .addButton('Начать игру')
 *
 *         // Установка пользовательских данных
 *         this.userData = {
 *           score: 0,
 *           level: 1,
 *           preferences: {
 *             language: 'ru',
 *             theme: 'light'
 *           }
 *         };
 *
 *         // Добавление звука
 *         this.sound.add('welcome.mp3');
 *
 *         return;
 *       }
 *
 *       // Обработка команды помощи
 *       if (intentName === HELP_INTENT_NAME) {
 *         this.text = 'Я могу помочь вам с...';
 *         this.buttons.addBtn('Назад');
 *         return;
 *       }
 *
 *       // Обработка NLU
 *       const nluResult = this.nlu.getIntent();
 *       if (nluResult) {
 *         // Обработка интента
 *         this.text = `Вы сказали: ${nluResult}`;
 *       }
 *
 *       // Обработка пользовательских событий
 *       if (this.userEvents?.auth?.status) {
 *         this.text = 'Вы успешно авторизовались!';
 *       }
 *
 *       // Обработка оценки
 *       if (this.userEvents?.rating?.status) {
 *         const rating = this.userEvents.rating.value;
 *         this.text = `Спасибо за оценку ${rating}!`;
 *       }
 *
 *     } catch (error) {
 *       // Обработка ошибки
 *       this.text = 'Произошла ошибка. Попробуйте позже.';
 *     }
 *   }
 * }
 * ```
 *
 * @class BotController
 * @template TUserData Тип пользовательских данных, по умолчанию {@link IUserData}
 */
export abstract class BotController<TUserData extends IUserData = IUserData> {
    /**
     * Локальное хранилище с данными. Используется в случаях, когда нужно сохранить данные пользователя, но userData приложением не поддерживается.
     * В случае если данные хранятся в usetData и store, пользователю вернятеся информация из userData.
     */
    public store: Record<string, unknown> | undefined;
    /**
     * Компонент для отображения кнопок пользователю.
     * Позволяет создавать интерактивные элементы управления
     *
     * @see Buttons
     * @example
     * ```typescript
     * this.buttons
     *   .addBtn('Помощь')
     *   .addBtn('Выход');
     * ```
     */
    public buttons: Buttons;

    /**
     * Компонент для отображения карточек пользователю
     * Позволяет создавать визуальные элементы с изображениями и текстом
     *
     * @see Card
     * @example
     * ```typescript
     * this.card
     *   .addImage('url/to/image.jpg', 'Заголовок', 'Описание')
     * ```
     */
    public card: Card;

    /**
     * Текст, отображаемый пользователю
     * Основной способ коммуникации с пользователем
     *
     * @example
     * ```typescript
     * this.text = 'Привет! Чем могу помочь?';
     * ```
     */
    public text: string = '';

    /**
     * Текст для преобразования в речь.
     * Используется для голосовых ассистентов
     *
     * @remarks
     * Для неголосовых платформ текст будет преобразован в речь
     * через Yandex SpeechKit и отправлен как аудио сообщение
     *
     * @example
     * ```typescript
     * this.tts = 'Привет! Я голосовой ассистент.';
     * ```
     */
    public tts: string | null = null;

    /**
     * Обработанный NLU (Natural Language Understanding)
     * Содержит результаты обработки естественного языка
     *
     * @see Nlu
     */
    public nlu: Nlu;

    /**
     * Компонент для работы со звуками.
     * Позволяет добавлять звуковые эффекты и музыку
     *
     * @see Sound
     */
    public sound: Sound;

    /**
     * Идентификатор пользователя
     * Уникальный идентификатор для каждого пользователя
     *
     * @example
     * ```typescript
     * this.userId = 'user_123';
     * ```
     */
    public userId: string | number | null = null;

    /**
     * Пользовательский токен авторизации
     * Используется для авторизованных запросов (например, в Алисе)
     *
     * @example
     * ```typescript
     * this.userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
     * ```
     */
    public userToken: string | null = null;

    /**
     * Метаданные пользователя
     * Дополнительная информация о пользователе
     *
     * @example
     * ```typescript
     * this.userMeta = {
     *   timezone: 'Europe/Moscow',
     *   locale: 'ru-RU'
     * };
     * ```
     */
    public userMeta: any = null;

    /**
     * ID сообщения
     * Используется для определения начала нового диалога
     *
     * @example
     * ```typescript
     * this.messageId = 12345;
     * ```
     */
    public messageId: number | string | null = null;

    /**
     * Запрос пользователя в нижнем регистре
     * Нормализованный текст запроса
     *
     * @example
     * ```typescript
     * this.userCommand = 'привет бот';
     * ```
     */
    public userCommand: string | null = null;

    /**
     * Оригинальный запрос пользователя
     * Текст запроса без изменений
     *
     * @example
     * ```typescript
     * this.originalUserCommand = 'Привет, бот!';
     * ```
     */
    public originalUserCommand: string | null = null;

    /**
     * Дополнительные параметры запроса
     * Может содержать любые дополнительные данные
     *
     * @example
     * ```typescript
     * this.payload = {
     *   source: 'mobile',
     *   version: '1.0'
     * };
     * ```
     */
    public payload: object | string | null | undefined = null;

    /**
     * Пользовательские данные
     * Хранятся в базе данных или файле
     *
     * @remarks
     * Тип хранения зависит от параметра appContext.isSaveDb
     *
     * @example
     * ```typescript
     * this.userData = {
     *   name: 'John',
     *   preferences: {
     *     language: 'ru'
     *   }
     * };
     * ```
     */
    public userData: TUserData = {} as TUserData;

    /**
     * Флаг необходимости авторизации
     * Определяет, требуется ли авторизация пользователя
     *
     * @example
     * ```typescript
     * this.isAuth = true; // требуется авторизация
     * ```
     */
    public isAuth: boolean = false;

    /**
     * Статус пользовательских событий
     * Содержит информацию об авторизации и оценке
     *
     * @see IUserEvent
     * @example
     * ```typescript
     * this.userEvents = {
     *   auth: { status: true },
     *   rating: { status: true, value: 5 }
     * };
     * ```
     */
    public userEvents: IUserEvent | null = null;

    /**
     * Пользовательское локальное хранилище
     * Используется для Алисы, Маруси и Сбера
     *
     * @example
     * ```typescript
     * this.state = {
     *   lastIntent: 'greeting',
     *   step: 1
     * };
     * ```
     */
    public state: object | string | null = null;

    /**
     * Флаг наличия экрана
     * Определяет, доступен ли экран пользователю
     *
     * @example
     * ```typescript
     * this.isScreen = true; // экран доступен
     * ```
     */
    public isScreen: boolean = false;

    /**
     * Флаг завершения сессии
     * Определяет, нужно ли завершить диалог
     *
     * @example
     * ```typescript
     * this.isEnd = true; // завершить диалог
     * ```
     */
    public isEnd: boolean = false;

    /**
     * Флаг необходимости отправки запроса к API
     * Используется для Vk и Telegram
     *
     * @remarks
     * Если true, все запросы уже отправлены в логике приложения
     *
     * @example
     * ```typescript
     * this.isSend = true; // запросы уже отправлены
     * ```
     */
    public isSend: boolean = false;

    /**
     * Полученный запрос
     * Содержит оригинальный объект запроса
     *
     * @example
     * ```typescript
     * this.requestObject = {
     *   command: 'start',
     *   payload: { source: 'mobile' }
     * };
     * ```
     */
    public requestObject: object | string | null = null;

    /**
     * Название текущего интента.
     * Определяет текущее состояние диалога
     *
     * @example
     * ```typescript
     * this.thisIntentName = 'help';
     * ```
     */
    public thisIntentName: string | null = null;

    /**
     * Эмоция для голосового ответа
     * Используется для голосовых ассистентов
     *
     * @example
     * ```typescript
     * this.emotion = 'good';
     * ```
     */
    public emotion: string | null = null;

    /**
     * Стиль обращения к пользователю
     * Определяет формальность общения
     *
     * @remarks
     * Возможные значения:
     * - 'official': официальное обращение
     * - 'no_official': неофициальное обращение
     * - null: стиль не определен
     *
     * @example
     * ```typescript
     * this.appeal = 'official'; // официальное обращение
     * ```
     */
    public appeal: 'official' | 'no_official' | null = null;

    /**
     * Флаг отправки запроса на оценку
     * Определяет, нужно ли запросить оценку у пользователя
     *
     * @example
     * ```typescript
     * this.isSendRating = true; // запросить оценку
     * ```
     */
    public isSendRating: boolean = false;

    /**
     * Название предыдущего интента.
     * Используется для отслеживания контекста диалога
     *
     * @example
     * ```typescript
     * this.oldIntentName = 'greeting';
     * ```
     */
    public oldIntentName: string | null = null;

    /**
     * Контекст приложения
     */
    public appContext: AppContext | undefined;

    /**
     * Создает новый экземпляр контроллера.
     * Инициализирует все необходимые компоненты
     *
     * @protected
     */
    protected constructor() {
        this.buttons = new Buttons(this.appContext as AppContext);
        this.card = new Card(this.appContext as AppContext);
        this.sound = new Sound(this.appContext as AppContext);
        this.nlu = new Nlu();
    }

    /**
     * Устанавливает контекст приложения
     * @param appContext
     */
    public setAppContext(appContext: AppContext | undefined): BotController {
        this.appContext = appContext;
        this.buttons.setAppContext(appContext as AppContext);
        this.card.setAppContext(appContext as AppContext);
        this.sound.setAppContext(appContext as AppContext);
        return this;
    }

    /**
     * Очищает все временные данные необходимы для отправки ответа.
     */
    public clearStoreData(): void {
        this.buttons.clear();
        this.card.clear();
        this.nlu.setNlu({});
        this.text = '';
        this.tts = null;
        this.userId = null;
        this.userToken = null;
        this.userMeta = null;
        this.messageId = null;
        this.userCommand = null;
        this.originalUserCommand = null;
        this.payload = null;
        this.userData = {} as TUserData;
        this.isAuth = false;
        this.userEvents = null;
        this.state = null;
        this.isScreen = false;
        this.isEnd = false;
        this.isSend = false;
        this.requestObject = null;
        this.oldIntentName = null;
        this.thisIntentName = null;
        this.emotion = null;
        this.appeal = null;
        this.isSendRating = false;
    }

    /**
     * Возвращает список доступных интентов.
     * Определяет все возможные команды и их обработчики
     *
     * @returns {IAppIntent[]} Массив интентов
     *
     * @protected
     *
     * @example
     * ```typescript
     * const intents = BotController._intents();
     * // [
     * //   { name: 'greeting', slots: ['привет', 'здравствуйте'] },
     * //   { name: 'help', slots: ['помощь', 'справка'] }
     * // ]
     * ```
     */
    protected _intents(): IAppIntent[] {
        return this.appContext?.platformParams.intents || [];
    }

    /**
     * Определяет интент по тексту запроса.
     * Сопоставляет текст с доступными интентами
     *
     * @param {string | null} text - Текст запроса
     * @returns {string | null} Название интента или null
     *
     * @protected
     *
     * @example
     * ```typescript
     * const intent = BotController._getIntent('привет');
     * // 'greeting'
     * ```
     */
    protected _getIntent(text: string | null): string | null {
        if (!text) {
            return null;
        }
        const intents: IAppIntent[] = this._intents();
        for (const intent of intents) {
            if (Text.isSayText(intent.slots || [], text, intent.is_pattern || false)) {
                return intent.name;
            }
        }
        return null;
    }

    /**
     * Получает команду из запроса пользователя
     * Извлекает команду из текста запроса
     *
     * @returns {string | null} Команда или null
     *
     * @protected
     *
     * @example
     * ```typescript
     * const command = this._getCommand();
     * // 'start'
     * ```
     */
    protected _getCommand(): string | null {
        if (!this.userCommand || !this.appContext?.commands) {
            return null;
        }
        for (const [commandName, command] of this.appContext.commands) {
            if (
                command &&
                Text.isSayText(command.slots || [], this.userCommand, command.isPattern || false)
            ) {
                const res = command.cb?.(this.userCommand, this);
                if (res) {
                    this.text = res;
                }
                return commandName;
            }
        }
        return null;
    }

    /**
     * Абстрактный метод для обработки пользовательских команд и интентов.
     * Должен быть реализован в дочерних классах
     *
     * @param {string | null} intentName - Название интента или команды
     * @param {boolean} [isCommand=false] - Флаг, указывающий что это команда
     *
     * @example
     * ```typescript
     * class MyController extends BotController {
     *   public action(intentName: string | null): void {
     *     if (intentName === 'greeting') {
     *       this.text = 'Привет!';
     *     } else if (intentName === 'help') {
     *       this.text = 'Помощь:';
     *       this.buttons.addBtn('Назад');
     *     }
     *   }
     * }
     * ```
     */
    abstract action(intentName: string | null, isCommand?: boolean): void;

    /**
     * Запускает обработку запроса.
     * Определяет тип запроса и вызывает соответствующий обработчик
     *
     * @example
     * ```typescript
     * this.run();
     * // Обрабатывает запрос и формирует ответ
     * ```
     */
    public run(): void {
        const commandResult = this._getCommand();
        if (commandResult) {
            this.action(commandResult, true);
        } else {
            let intent: string | null = this._getIntent(this.userCommand);
            if (
                intent === null &&
                this.originalUserCommand &&
                this.userCommand !== this.originalUserCommand
            ) {
                intent = this._getIntent(this.originalUserCommand.toLowerCase());
            }
            if (intent === null && this.messageId === 0) {
                intent = WELCOME_INTENT_NAME;
            }
            /*
             * Для стандартных действий параметры заполняются автоматически. Есть возможность переопределить их в action() по названию действия
             */
            switch (intent) {
                case WELCOME_INTENT_NAME:
                    this.text = Text.getText(this.appContext?.platformParams.welcome_text || '');
                    break;

                case HELP_INTENT_NAME:
                    this.text = Text.getText(this.appContext?.platformParams.help_text || '');
                    break;
            }

            this.action(intent as string);
        }
        if (
            this.tts === null &&
            (this.appContext?.appType === T_ALISA || this.appContext?.appType === T_MARUSIA)
        ) {
            this.tts = this.text;
        }
    }
}
