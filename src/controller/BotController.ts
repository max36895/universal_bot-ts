/**
 * Модуль контроллера - основной компонент для обработки бизнес-логики вашего приложения
 */
import { Buttons, Card, Sound, Nlu } from '../components';
import { Text } from '../utils';
import { AppContext, IAppIntent, ICommandParam, TAppType, EMetric } from '../core';
import { FALLBACK_COMMAND, HELP_INTENT_NAME, WELCOME_INTENT_NAME } from '../core/constants';
import { isPromise } from '../utils/isPromise';
import { IGroupData, getGroupRegExpCompiled } from '../core/utils/CommandReg';

/*
 * Оптимизация производительности:
 * Если напрямую использовать переменные из другого модуля(например FALLBACK_COMMAND), то производительность может проседать.
 * За счет данного хака мы решаем эту проблемы добавляя локальную глобальную переменную, благодаря чему v8 не нужно делать доп расчеты.
 *
 * ВАЖНО: константы импортируются из листового модуля `../core/constants`, а НЕ из барреля `../core`.
 * Баррель `core` реэкспортирует `Bot` раньше констант, и при циклической загрузке
 * (core → Bot → controller → core) константы из барреля ещё `undefined`. Листовой модуль
 * без импортов всегда полностью инициализирован, поэтому захват значений безопасен.
 */
const DEFAULT_FALLBACK_COMMAND = FALLBACK_COMMAND;
const DEFAULT_HELP_INTENT_NAME = HELP_INTENT_NAME;
const DEFAULT_WELCOME_INTENT_NAME = WELCOME_INTENT_NAME;

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
 * ```ts
 * const status: TStatus = true; // операция успешна
 * const status: TStatus = false; // операция с ошибкой
 * const status: TStatus = null; // операция не выполнялась
 * ```
 */
export type TStatus = true | false | null;

/**
 * Интерфейс событий пользователя
 * Содержит информацию о различных действиях пользователя в приложении
 *
 * @remarks
 * События включают:
 * - Авторизацию пользователя
 * - Оценку приложения
 *
 * @example
 * ```ts
 * const userEvent: IUserEvent = {
 *   auth: { // Событие авторизации
 *     status: true // пользователь успешно авторизовался
 *   },
 *   rating: { // Событие с оценкой
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
 * Интерфейс для пользовательских данных
 * Расширяемый интерфейс для любых дополнительных данных, которые будут сохранены в БД/Локальное хранилище
 *
 * @remarks
 * Базовое поле:
 * - oldIntentName: название предыдущего интента. Актуально для случаев, когда в приложении есть какая-то последовательность действий.
 * Также данное значение можно использовать при регистрации обработчика на шаг(bot.step('...', ()=>{...})).
 *
 * Дополнительные поля могут быть добавлены через:
 * 1. Расширение интерфейса (extends)
 * 2. Индексную сигнатуру [key: string]: unknown. Не рекомендуется к использованию, так как в таком случае, теряются преимущества ts
 *
 * @example
 * ```ts
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
     * Используется для отслеживания контекста диалога, и реализации механизма для последовательного прохождения сценария приложения.
     *
     * @example
     * ```ts
     * this.userData.oldIntentName = 'greeting';
     * ```
     */
    oldIntentName?: string | null;

    /**
     * Дополнительные пользовательские данные.
     * Может содержать любые поля, специфичные для приложения
     * Важно! Если вы хотите чтобы поле было удалено, то необходимо в значение передавать null. Подобное связано с ограничением Алисы.
     */
    [key: string]: unknown;
}

/**
 * Интерфейс для пользовательских данных, хранящихся в локальном хранилище
 * Расширяемый интерфейс для любых дополнительных данных, которые будут сохранены в Локальное хранилище
 */
export interface IPlatformData {
    /**
     * Название предыдущего интента.
     * Специальное служебное поле: позволяет Bot восстановить шаг диалога
     * после сериализации state в локальное хранилище платформы.
     *
     * @internal — заполняется фреймворком, не предназначено для прямой записи в пользовательском коде.
     */
    oldIntentName?: string | null;
    /**
     * Дополнительные данные.
     * Может содержать любые поля, специфичные для приложения
     */
    [key: string]: unknown;
}

/**
 * Дополнительные опции для платформ
 */
export interface IPlatformOptions {
    /**
     * Текст ошибки
     */
    error?: string;
    /**
     * Время начала обработки запроса
     */
    timeStart?: number;
    /**
     * Флаг говорящий о том, что результат выполнения приложения был получен при обработке запроса
     */
    sendInInit?: string | object | null;

    /**
     * Нейтральные технические данные обработчика запроса.
     *
     * Адаптеры используют собственный ключ верхнего уровня, поэтому общий
     * контроллер не содержит сведений о форматах и идентификаторах платформ.
     */
    requestData?: Record<string, Record<string, unknown>>;

    /**
     * Поле куда должны сохраниться пользовательские данные
     */
    stateName?: string;
    /**
     * Флаг, говорящий о том, что в приложении может использоваться локальное хранилище платформы
     */
    isState?: boolean;
    /**
     * Флаг, говорящий о том, что приложение использует локальное хранилище платформы
     */
    usedLocalStorage?: boolean;
    /**
     * Информация о сессии пользователя
     */
    session?: object;

    /**
     * Идентификатор приложения
     */
    appId?: string;
    /**
     * ID callback-запроса
     */
    callbackQueryId?: string;

    /**
     * Явно заданный текст всплывающего уведомления для callback-запроса.
     * Если поле не задано, адаптер только подтверждает callback без показа текста.
     */
    callbackNotificationText?: string;

    /**
     * ID callback-события (для callback-кнопок)
     */
    eventId?: string;
    /**
     * Версия api с которой работает платформа. Для случаев, когда сама платформа говорит какая версия api должна быть
     */
    apiVersion?: string | number;
    /**
     * ID чата для платформ, поддерживающих групповые чаты (например, Max, Telegram)
     */
    chatId?: number;
    /**
     * IP-адрес клиента, с которого пришёл webhook-запрос.
     * Заполняется фреймворком в `webhookHandle` из сокета HTTP-запроса.
     * Используется middleware `ipFilter`. При вызове `run()` напрямую не заполняется.
     */
    clientIp?: string;
}

/**
 * Контроллер приложения – главный класс для реализации единой бизнес-логики вашего приложения. Именно в этом классе обрабатывается вся логика вашего приложения, которая потом передается в саму платформу, будь то голосовой навык для Алисы, либо чат-бот для VK.
 *
 * Этот класс связывает входящие запросы от пользователя с вашей бизнес‑логикой.
 * Вы наследуетесь от `BotController`, переопределяете метод {@link action} и получаете доступ ко всем инструментам:
 * кнопкам, карточкам, состоянию диалога, пользовательским данным, NLU и многому другому.
 *
 * Адаптеры платформ (например, `AlisaAdapter`) автоматически наполняют контроллер данными,
 * вызывают внутренний метод `{@link run}` (он вызывает ваш `action()`), а затем формируют ответ на основе заполненных вами полей (`text`, `buttons`, `card` и т.д.).
 *
 * **Ключевая особенность:** вся логика вашего голосового навыка или бота описывается в одном месте – в методе `action()`.
 * Фреймворк сам позаботится о маршрутизации: команды, интенты, шаги диалога – всё придёт в `action` с соответствующим флагом.
 *
 * @remarks
 * Основные возможности:
 * - Обработка пользовательских команд и интентов
 * - Управление состоянием диалога
 * - Работа с UI компонентами (кнопки, карточки)
 * - Управление пользовательскими данными
 *
 * @example
 * ```ts
 * import { BotController } from 'umbot';
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
 * @see {@link action} – переопределите этот метод, чтобы добавить свою логику.
 * @see Bot – основной класс приложения, управляющий адаптерами и контроллерами.
 */
export abstract class BotController<
    TUserData extends IUserData = IUserData,
    TPlatformState extends IPlatformData = IPlatformData,
> {
    #buttons: Buttons | undefined;
    #card: Card | undefined;
    #nlu: Nlu | undefined;
    #sound: Sound | undefined;

    /**
     * Текст, который будет отображен пользователю.
     * Основной способ коммуникации с пользователем, так как именно этот текст пользователь увидит в интерфейсе.
     *
     * @example
     * ```ts
     * this.text = 'Привет! Чем могу помочь?';
     * ```
     */
    public text: string = '';

    /**
     * Текст, который пользователь может услышать.
     * Для голосовых платформ, озвучка будет произведена силами самой платформы, для не голосовых платформ, поведение зависит непосредственно от реализации адаптера.
     * Так для некоторых стандартных адаптеров, в случае заполнения поля и указания токена yandex SpeechKit, будет отправлен запрос на преобразование текста в аудиофайл, после чего аудиофайл будет отправлен пользователю.
     *
     * @example
     * ```ts
     * this.tts = 'Привет! Я голосовой ассистент.';
     * ```
     */
    public tts: string | null = null;

    /**
     * Уникальный идентификатор пользователя.
     *
     * @example
     * ```ts
     * this.userId = 'user_123';    // Telegram (string)
     * this.userId = 123456789;     // VK (number)
     * this.userId = null;          // не удалось получить информацию
     * ```
     */
    public userId: string | number | null = null;

    /**
     * Пользовательский токен авторизации.
     * Используется для авторизованных запросов (например, в Алисе).
     *
     * @example
     * ```ts
     * this.userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
     * ```
     */
    public userToken: string | null = null;

    /**
     * Дополнительная информация о пользователе.
     *
     * @example
     * ```ts
     * this.userMeta = {
     *   timezone: 'Europe/Moscow',
     *   locale: 'ru-RU'
     * };
     * ```
     */
    public userMeta: unknown | null = null;

    /**
     * ID сообщения.
     * Используется для определения начала нового диалога.
     *
     * @example
     * ```ts
     * this.messageId = 12345;
     * ```
     */
    public messageId: number | string | null = null;

    /**
     * Запрос пользователя в нижнем регистре.
     *
     * @example
     * ```ts
     * this.userCommand = 'привет мир';
     * ```
     */
    public userCommand: string | null = null;

    /**
     * Оригинальный запрос пользователя.
     * Текст запроса без изменений, включая регистр и знаки препинания.
     *
     * @example
     * ```ts
     * this.originalUserCommand = 'Привет, мир!';
     * ```
     */
    public originalUserCommand: string | null = null;

    /**
     * Дополнительные параметры запроса.
     * Может содержать любые дополнительные данные полученные от платформы.
     *
     * @example
     * ```ts
     * this.payload = {
     *   source: 'mobile',
     *   version: '1.0'
     * };
     * ```
     */
    public payload: Record<string, unknown> | string | null | undefined = null;

    /**
     * Пользовательские данные, которые были сохранены.
     *
     * @example
     * ```ts
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
     * Флаг необходимости авторизации.
     * Определяет, требуется ли авторизация пользователя или нет.
     *
     * @example
     * ```ts
     * this.isAuth = true; // требуется авторизация
     * ```
     */
    public isAuth: boolean = false;

    /**
     * Пользовательские события.
     * Содержит информацию об авторизации или оценке.
     *
     * @see IUserEvent
     * @example
     * ```ts
     * this.userEvents = {
     *   auth: { status: true },
     *   rating: { status: true, value: 5 }
     * };
     * ```
     */
    public userEvents: IUserEvent | null = null;

    /**
     * Пользовательское локальное хранилище.
     * Используется для временного хранения данных, специфичных для текущего диалога.
     * Работает только при включённой опции `isLocalStorage: true` в конфигурации.
     * bot.setAppConfig({
     *    isLocalStorage: true,
     * });
     *
     * **Правила синхронизации с базой данных (если подключена):**
     * - Если заполнены и `userData`, и `state`:
     *   - `userData` сохраняется в БД,
     *   - `state` сохраняется в локальное хранилище платформы.
     * - Если заполнен только `userData` (а `state` пуст или равен `userData`):
     *   - данные сохраняются только в БД (состояние платформы не обновляется).
     * - Если заполнен только `state`:
     *   - данные сохраняются только в локальное хранилище.
     *
     * **При загрузке данных:**
     * 1. Если есть данные из локального хранилища и из БД, они попадают соответственно в `state` и `userData`.
     * 2. Если есть только данные из хранилища, они копируются и в `userData`, и в `state` (для удобства).
     * 3. Если есть только данные из БД, они записываются в `userData`.
     *
     * @see {@link userData} — для постоянного хранения данных пользователя.
     *
     * @example
     * ```ts
     * this.state = {
     *   lastIntent: 'greeting',
     *   step: 1
     * };
     * ```
     */
    public state: TPlatformState | null = null;

    /**
     * Определяет, запущено ли приложение с колонки или с устройства с экраном.
     *
     * @example
     * ```ts
     * this.isScreen = true; // экран доступен
     * ```
     */
    public isScreen: boolean = false;

    /**
     * Флаг, определяющий необходимость завершения диалога. Актуально когда необходимо принудительно завершить диалог с пользователем.
     * Поддержка работы флага зависит от платформы.
     *
     * @example
     * ```ts
     * this.isEnd = true; // завершить диалог
     * ```
     */
    public isEnd: boolean = false;

    /**
     * Флаг, указывающий, что ответ уже отправлен через API и не требуется автоматическая отправка. Как правило, данный флаг стоит использовать для платформ, которые не ждут ответ в виде возвращаемого содержимого, а ожидают что к самой платформе будет отправлен запрос. Например, чат-бот для Telegram, для отображения результата пользователю, отправляется запрос к платформе с нужным содержимым.
     *
     * @remarks
     * Если указано true, значит все необходимые запросы уже отправлены в логике приложения, и дополнительно пользователю ничего отправлять не нужно.
     *
     * @example
     * ```ts
     * this.skipAutoReply = true; // запросы уже отправлены
     * ```
     */
    public skipAutoReply: boolean = false;

    /**
     * Полученный запрос от платформы.
     * Содержит оригинальный объект запроса.
     *
     * @example
     * ```ts
     * this.requestObject = {
     *   command: 'start',
     *   payload: { source: 'mobile' }
     * };
     * ```
     */
    public requestObject: Record<string, unknown> | string | unknown | null = null;

    /**
     * Название текущего интента.
     * Определяет следующий шаг диалога.
     *
     * @example
     * ```ts
     * this.thisIntentName = 'help';
     * ```
     */
    public thisIntentName: string | null = null;

    /**
     * Эмоция для голосового ответа.
     * Используется для платформ, которые поддерживают данное поведение.
     *
     * @example
     * ```ts
     * this.emotion = 'good';
     * ```
     */
    public emotion: string | null = null;

    /**
     * Стиль обращения к пользователю.
     * Определяет формальность общения, используется для платформ, которые поддерживают данное поведение.
     *
     * @remarks
     * Возможные значения:
     * - 'official': официальное обращение
     * - 'no_official': неофициальное обращение
     * - null: стиль не определен
     *
     * @example
     * ```ts
     * this.appeal = 'official'; // официальное обращение
     * ```
     */
    public appeal: 'official' | 'no_official' | null = null;

    /**
     * Флаг отправки запроса на оценку.
     * Определяет, нужно ли запросить оценку у пользователя.
     * Используется для платформ, которые поддерживают данное поведение.
     *
     * @example
     * ```ts
     * this.isSendRating = true; // запросить оценку
     * ```
     */
    public isSendRating: boolean = false;

    /**
     * Название предыдущего интента/команды, полученное из `userData.oldIntentName`.
     * Используется для отслеживания контекста диалога.
     *
     * @remarks
     * **КАК ЭТО РАБОТАЕТ:**
     * 1. В конце обработки каждого запроса, `this.thisIntentName` сохраняется в `userData.oldIntentName`
     * 2. При следующем запросе это значение копируется в `this.oldIntentName`
     * 3. Используется для определения, с какого шага продолжить диалог
     *
     * **ТИПИЧНОЕ ИСПОЛЬЗОВАНИЕ:**
     * - Возврат к предыдущему шагу
     * - Многошаговые формы ("вернуться назад")
     * - Диалоги с контекстом
     * - Использование в шагах `bot.addStep()`
     *
     * @example
     * ```ts
     * // Пример: Многошаговая регистрация
     * class RegistrationBot extends BotController {
     *   public action(intentName: string | null): void {
     *     // Определяем на каком шаге находимся
     *     const previousStep = this.oldIntentName;
     *
     *     if (previousStep === 'enter_name') {
     *       // Пользователь только что ввел имя, спрашиваем email
     *       this.userData.name = this.userCommand;
     *       this.text = 'Отлично! Теперь введите ваш email:';
     *       this.thisIntentName = 'enter_email'; // Сохранится для следующего шага
     *     } else if (previousStep === 'enter_email') {
     *       // Пользователь ввел email, завершаем регистрацию
     *       this.userData.email = this.userCommand;
     *       this.text = 'Регистрация завершена!';
     *     }
     *   }
     * }
     *
     * // Пример: Кнопка "Назад"
     * if (intentName === 'back') {
     *   // Возвращаемся к предыдущему шагу
     *   switch(this.oldIntentName) {
     *     case 'product_list':
     *       this.text = 'Выберите категорию:';
     *       break;
     *     case 'category_list':
     *       this.text = 'Добро пожаловать!';
     *       break;
     *   }
     * }
     * ```
     */
    public oldIntentName: string | null = null;

    /**
     * Контекст приложения.
     */
    public appContext: AppContext;

    /**
     * Платформа от которой был получен запрос.
     */
    public appType: TAppType | null = null;

    /**
     * Дополнительные опции платформы.
     * ⚠️ Внутреннее свойство. Заполняется адаптером платформы.
     * Не предназначено для прямого использования в пользовательском коде.
     */
    public platformOptions: IPlatformOptions = {};

    #getCustomRegExp: RegExpConstructor | undefined;

    /**
     * Создает новый экземпляр контроллера.
     * Инициализирует все необходимые компоненты.
     */
    constructor(appContext?: AppContext) {
        // Для корректности выставляем контекст по умолчанию.
        this.appContext = appContext || new AppContext();
        this.#getCustomRegExp = this.appContext.command.getCustomRegExp();
    }

    /**
     * Компонент для отображения различных кнопок пользователю.
     * Позволяет создавать интерактивные элементы управления в приложении.
     *
     * @remarks
     * ## 🎯 ТИПИЧНОЕ ИСПОЛЬЗОВАНИЕ:
     * - Навигация по меню
     * - Быстрые ответы (Да/Нет)
     * - Выбор из вариантов
     * - Быстрое действие/команда
     *
     *
     * @see Buttons
     * @example
     * ```ts
     * this.buttons
     *   .addBtn('Помощь')
     *   .addBtn('Выход');
     * ```
     */
    get buttons(): Buttons {
        if (!this.#buttons) {
            this.#buttons = new Buttons(this.appContext);
        }
        return this.#buttons;
    }

    /**
     * Флаг возвращающий информацию о том, были ли инициализированы кнопки или нет
     * @returns {boolean} true если кнопки были инициализированы
     */
    isButtonsInit(): boolean {
        return !!this.#buttons;
    }

    /**
     * Компонент для отображения карточек пользователю.
     * Позволяет создавать визуальные элементы с изображениями и текстом.
     * Также при указании нескольких изображений, они автоматически преобразуются в карточку.
     *
     * @remarks
     * ## 🎯 КОГДА ИСПОЛЬЗОВАТЬ:
     * - Каталог товаров/услуг
     * - Галерея изображений
     * - Карточки статей/новостей
     * - Навигация
     *
     * @see Card
     * @example
     * ```ts
     * // КАТАЛОГ ТОВАРОВ (интернет-магазин):
     * this.text = 'Популярные товары:';
     * this.card
     *   .addImage(
     *     'http://localhost/iphone.jpg',
     *     'iPhone 15 Pro',
     *     '99 990 ₽\nЭкран 6.1", процессор A17 Pro'
     *   )
     *   .addButton('Купить')
     *
     *   .addImage(
     *     'http://localhost/macbook.jpg',
     *     'MacBook Air M2',
     *     '124 990 ₽\n13.6", 8ГБ RAM, 256ГБ SSD'
     *   )
     *   .addButton('Купить');
     *
     * // ГАЛЕРЕЯ ФОТОГРАФИЙ:
     * this.text = 'Наши работы:';
     * this.card
     *   .addImage('photo1.jpg', 'Свадьба', 'Иван и Мария')
     *   .addImage('photo2.jpg', 'Выпускной', 'Школа №123')
     *   .addImage('photo3.jpg', 'Корпоратив', 'Компания "Рога и копыта"');
     *
     * // КАРТОЧКИ НОВОСТЕЙ:
     * this.card
     *   .addImage(
     *     'news1.jpg',
     *     'Новое обновление',
     *     'Добавлена оплата картой и доставка',
     *     {
     *         title: 'Перейти',
     *         url: 'http://localhost/news/1'
     *     }
     *   )
     * ```
     */
    get card(): Card {
        if (!this.#card) {
            this.#card = new Card(this.appContext);
        }
        return this.#card;
    }

    /**
     * Флаг возвращающий информацию о том, были ли инициализированы карточки или нет
     * @returns {boolean} true если карточки были инициализированы
     */
    isCardInit(): boolean {
        return !!this.#card;
    }

    /**
     * Компонент для работы со звуками.
     * Позволяет добавлять звуковые эффекты и музыку. Используется вместе с tts.
     *
     * @see Sound
     */
    get sound(): Sound {
        if (!this.#sound) {
            this.#sound = new Sound();
        }
        return this.#sound;
    }

    /**
     * Флаг возвращающий информацию о том, были ли инициализированы звуки или нет
     * @returns {boolean} true если звуки были инициализированы
     */
    isSoundInit(): boolean {
        return !!this.#sound;
    }

    /**
     * Обработанный NLU (Natural Language Understanding).
     * Содержит результаты обработки естественного языка, как правило, данные заполняются самой платформой.
     *
     * @see Nlu
     */
    get nlu(): Nlu {
        if (!this.#nlu) {
            this.#nlu = new Nlu();
        }
        return this.#nlu;
    }

    /**
     * Флаг возвращающий информацию о том, были ли инициализирован nlu или нет
     * @returns {boolean} true если NLU был инициализирован
     */
    isNluInit(): boolean {
        return !!this.#nlu;
    }

    /**
     * Устанавливает контекст приложения.
     * @param {AppContext} appContext - Контекст приложения
     */
    public setAppContext(appContext: AppContext): this {
        if (appContext) {
            this.appContext = appContext;
            this.#getCustomRegExp = this.appContext.command.getCustomRegExp();
            if (this.#buttons) {
                this.#buttons.setAppContext(appContext);
            }
            if (this.#card) {
                this.#card.setAppContext(appContext);
            }
        }
        return this;
    }

    /**
     * Полностью сбрасывает состояние контроллера, включая текст ответа, пользовательские данные, состояние диалога и внутренние флаги.
     */
    public clearStoreData(): void {
        if (this.#buttons) {
            this.buttons.clear();
        }
        if (this.#card) {
            this.card.clear();
        }
        if (this.isNluInit()) {
            // Второй аргумент обязателен: без него в Nlu остаётся кэш разобранных
            // сущностей предыдущего запроса и getFio()/getGeo() вернут чужие данные.
            this.nlu.setNlu({}, true);
        }
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
        this.skipAutoReply = false;
        this.requestObject = null;
        this.oldIntentName = null;
        this.thisIntentName = null;
        this.emotion = null;
        this.appeal = null;
        this.isSendRating = false;
        // platformOptions — технические данные конкретного запроса (requestData адаптеров,
        // sendInInit, session, stateName, error). Без сброса они утекают в следующий
        // запрос: например, VK-подтверждение возвращалось бы в ответ на любое сообщение.
        this.platformOptions = {};
    }

    /**
     * Возвращает список всех зарегистрированных интентов.
     *
     * @returns {IAppIntent[]} Массив интентов
     */
    protected _intents(): IAppIntent[] {
        return this.appContext?.platformParams.intents || [];
    }

    /**
     * Находит нужный интент по тексту запроса.
     *
     * @param {string | null} text - Текст запроса
     * @returns {string | null} Название интента или null
     */
    protected _getIntent(text: string | null): string | null {
        if (!text) {
            return null;
        }
        const start = this.#getStartMetric();
        const intents: IAppIntent[] = this._intents();
        for (let i = 0; i < intents.length; i++) {
            const intent = intents[i];
            if (
                Text.isSayText(
                    intent.slots || [],
                    text,
                    intent.is_pattern,
                    false,
                    this.#getCustomRegExp,
                )
            ) {
                if (this.appContext.usedMetric) {
                    this.appContext.logMetric(EMetric.GET_INTENT, performance.now() - start, {
                        intent,
                        status: true,
                    });
                }
                return intent.name;
            }
        }
        if (this.appContext.usedMetric) {
            this.appContext.logMetric(EMetric.GET_INTENT, performance.now() - start, {
                status: false,
            });
        }
        return null;
    }

    /**
     * Запуск кастомной обработки команд.
     * @param startTimer — Время начала обработки (для замера метрик)
     * @private
     */
    #sendCustomCommandResolver(startTimer: number): void | null | Promise<void | null> {
        if (this.appContext.command.customCommandResolver) {
            const res = this.appContext.command.customCommandResolver(
                this.userCommand as string,
                this.appContext.commands,
            );
            const cb = (result: string | null): void | null | Promise<void> => {
                const command = result ? this.appContext.commands.get(result) : null;
                if (result && command) {
                    const res = this.#commandExecute(result, command);
                    if (res) {
                        return res
                            .then(() => {
                                if (this.appContext?.usedMetric) {
                                    this.appContext.logMetric(
                                        EMetric.GET_COMMAND,
                                        performance.now() - startTimer,
                                        {
                                            result,
                                            status: true,
                                        },
                                    );
                                }
                                this._actionMetric(result, true);
                            })
                            .catch((error) => {
                                this.appContext.logError(
                                    `BotController: Произошла ошибка во время обработки команды "${result}". Текст ошибки: "${error}"`,
                                    {
                                        error,
                                    },
                                );
                            });
                    }
                    if (this.appContext?.usedMetric) {
                        this.appContext.logMetric(
                            EMetric.GET_COMMAND,
                            performance.now() - startTimer,
                            {
                                result,
                                status: true,
                            },
                        );
                    }
                    this._actionMetric(result, true);
                } else if (this.appContext?.usedMetric) {
                    this.appContext.logMetric(EMetric.GET_COMMAND, performance.now() - startTimer, {
                        status: false,
                    });
                }
                // null или неизвестное имя означают, что custom resolver не нашёл команду.
                // Явный null нужен run(), чтобы продолжить цепочку intent → fallback → welcome.
                if (!result || !command) {
                    return null;
                }
            };
            if (isPromise(res)) {
                return res.then(cb);
            }
            return cb(res);
        }
        return null;
    }

    #commandCb(commandName: string, command: ICommandParam, start: number): void | Promise<void> {
        if (!command) {
            return;
        }
        const ex = this.#commandExecute(commandName, command);
        if (ex) {
            return ex
                .then(() => {
                    if (this.appContext?.usedMetric) {
                        this.appContext.logMetric(EMetric.GET_COMMAND, performance.now() - start, {
                            commandName,
                            status: true,
                        });
                    }
                    this._actionMetric(commandName, true);
                })
                .catch((err) => {
                    this.appContext.logError(
                        `BotController: Произошла ошибка во время обработки команды "${commandName}". Текст ошибки: "${err}"`,
                        {
                            err,
                        },
                    );
                });
        }
        if (this.appContext?.usedMetric) {
            this.appContext.logMetric(EMetric.GET_COMMAND, performance.now() - start, {
                commandName,
                status: true,
            });
        }
        this._actionMetric(commandName, true);
    }

    #getStartMetric(): number {
        return this.appContext.usedMetric ? performance.now() : 0;
    }

    #getExactCommand(start: number): void | null | Promise<void> {
        const tCommandName = this.appContext.command.getExactMatchCommand(
            this.userCommand as string,
        );
        if (tCommandName) {
            const command = this.appContext.commands.get(tCommandName);
            if (command) {
                return this.#commandCb(tCommandName, command, start);
            }
        }
        return null;
    }

    /**
     * Извлекает нужную команду из запроса.
     *
     * @returns {void | null | Promise<void>} найденная команда или null если не удалось найти команду
     */
    protected _getCommand(): void | null | Promise<void | null> {
        if (!this.userCommand || !this.appContext.commands) {
            return null;
        }
        const start = this.#getStartMetric();
        const commandReg = this.appContext.command;
        if (commandReg.customCommandResolver) {
            return this.#sendCustomCommandResolver(start);
        }
        const exactCommand = this.#getExactCommand(start);
        if (exactCommand !== null) {
            return exactCommand;
        }

        let contCount = 0;
        // Используем локальные переменные чтобы избежать повторных getter-вызовов
        // в hot path, которые приводят к деоптимизации через "generic named access".
        const commands = commandReg.commands as Map<string, ICommandParam>;
        const regexpGroups = commandReg.regexpGroup as Map<string, IGroupData>;
        const useDirectRegExp = commands.size < 500;
        const getCustomRegExp = this.#getCustomRegExp;

        for (const [commandName, command] of commands) {
            if (commandName === DEFAULT_FALLBACK_COMMAND || !command || contCount !== 0) {
                if (contCount) {
                    contCount--;
                }
                continue;
            }
            if (!command.slots || command.slots.length === 0) {
                continue;
            }
            if (command.isPattern) {
                const groups = regexpGroups.get(commandName);

                if (groups) {
                    contCount = groups.commands.length - 1;
                    const groupRes = this.#searchCommandsInGroup(groups, this.userCommand, start);
                    if (groupRes !== null) {
                        return groupRes;
                    }
                    continue;
                }
            }
            const slots = command.regExp || command.slots;
            const isPattern = command.isPattern;
            const directRegExp = command.isRegExpString || useDirectRegExp;
            if (Text.isSayText(slots, this.userCommand, isPattern, directRegExp, getCustomRegExp)) {
                return this.#commandCb(commandName, command, start);
            }
        }
        if (this.appContext.usedMetric) {
            this.appContext.logMetric(EMetric.GET_COMMAND, performance.now() - start, {
                status: false,
            });
        }
        return null;
    }

    #searchCommandsInGroup(
        groups: IGroupData,
        userCommand: string,
        startTimer: number,
    ): void | null | Promise<void> {
        // Компиляция с кэшем: строковые паттерны групп больше не пересобираются
        // на каждый запрос (горячий путь поиска команд).
        const reg = getGroupRegExpCompiled(groups, this.#getCustomRegExp);
        if (!reg) {
            return null;
        }
        const match = reg.exec(userCommand);
        if (match) {
            // Находим первую совпавшую подгруппу (index в массиве parts)
            const commands = this.appContext.commands;
            for (const key in match.groups) {
                if (match.groups[key] !== undefined) {
                    const commandName = groups.commands[+key.slice(1)];
                    if (commandName && commands.has(commandName)) {
                        return this.#commandCb(
                            commandName,
                            commands.get(commandName) as ICommandParam,
                            startTimer,
                        );
                    }
                }
            }
        }
        return null;
    }

    /**
     * Основной метод, в котором вы реализуете логику вашего голосового навыка или бота.
     *
     * Этот метод вызывается фреймворком автоматически после того, как запрос пользователя
     * был распознан как команда, интент или шаг диалога.
     * В параметр `intentName` передаётся имя команды.
     * Флаги `isCommand` и `isStep` позволяют различить источник вызова.
     * Используется для более глубокой логики приложения, например можно использовать в качестве логирования, если все обработчики реализованы через команды.
     * Либо использовать в качестве обработки команд, что не рекомендуется, так как из-за подобного подхода, размер метода может быть большим.
     *
     * Метод необходимо обязательно реализовать в дочерних классах.
     *
     * ⚠️ Метод вызывается синхронно: фреймворк не дожидается возвращаемого значения.
     * Не объявляйте его `async` — всё, что выполнится после первого `await`, не попадёт
     * в ответ пользователю. Если `action()` всё же вернёт Promise, фреймворк напишет
     * предупреждение в лог, а ошибки промиса будут залогированы вместо unhandledRejection.
     * Для асинхронной логики используйте `addCommand`/`addStep` — их колбэки фреймворк ожидает.
     *
     * @param {string | null} intentName - Название интента или команды
     * @param {boolean} [isCommand=false] - Флаг, указывающий что это команда
     * @param {boolean} [isStep=false] - Флаг, указывающий что это шаг
     *
     * @example
     * ```ts
     * // Пример с обработкой интентов
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
     *
     * // Пример с логированием
     * class MyController extends BotController {
     *   public action(intentName: string | null, isCommand?: boolean, isStep?: boolean): void {
     *     console.log(`Прошли по ${isCommand ? 'команде' : isStep ? 'шагу' : 'интенту'} с именем: ${intentName}`);
     *   }
     * }
     * ```
     */
    abstract action(intentName: string | null, isCommand?: boolean, isStep?: boolean): void;

    /**
     * Выполнение команды.
     * @param commandName — Имя команды для выполнения
     * @param command — Параметры зарегистрированной команды
     */
    #commandExecute(commandName: string, command?: ICommandParam): void | Promise<void> {
        const errorCb = (e: Error | Record<string, unknown>): void => {
            this.appContext.logError(
                `BotController: Произошла ошибка во время обработки команды "${commandName}". Текст ошибки: "${e}"`,
                {
                    e,
                },
            );
            this.text = 'Не удалось выполнить команду. Попробуйте ещё раз.';
        };
        try {
            if (command) {
                const res = command?.cb?.(this.userCommand as string, this);
                if (isPromise(res)) {
                    return res
                        .then((result) => {
                            if (result) {
                                this.text = result;
                            }
                        })
                        .catch(errorCb);
                }
                if (res) {
                    this.text = res;
                }
            }
        } catch (e) {
            errorCb(e as Record<string, unknown>);
        }
    }

    /**
     * Запуск обработки пользовательских команд с учетом метрик.
     * @param {string | null} commandName - Имя команды
     * @param {boolean} isCommand - Является ли обработка командой (а не шагом)
     * @param {boolean} isStep - Является ли обработка шагом диалога
     */
    protected _actionMetric(
        commandName: string | null,
        isCommand: boolean = false,
        isStep: boolean = false,
    ): void {
        const start = this.appContext?.usedMetric ? performance.now() : 0;
        const res = this.action(commandName, isCommand, isStep) as void | Promise<void>;
        if (isPromise(res)) {
            // Типичная ловушка: async-вариант action() компилируется без ошибки,
            // но фреймворк не дожидается результата, и всё после первого await
            // молча не попадало в ответ. Вместо тишины предупреждаем и вешаем catch,
            // чтобы ошибка в пользовательском промисе не стала unhandledRejection.
            this.appContext?.logWarn(
                'BotController: action() вернул Promise. Метод action() должен быть синхронным: ' +
                    'всё, что выполнится после первого await, не попадёт в ответ. ' +
                    'Для асинхронной логики используйте колбэки addCommand/addStep/addForm — они поддерживают async.',
            );
            res.catch((error) => {
                this.appContext?.logError(
                    `BotController: Произошла ошибка внутри async action(). Текст ошибки: "${error}"`,
                    { error },
                );
            });
        }
        if (this.appContext?.usedMetric) {
            this.appContext.logMetric(EMetric.ACTION, performance.now() - start, {
                commandName,
                platform: this.appType,
                isCommand,
            });
        }
    }

    /**
     * Обработка зарегистрированных шагов.
     * @private
     */
    #stepResolver(): void | null | Promise<void> {
        if (this.appContext.steps.size) {
            const intents = this.nlu.getIntents();
            let step = this.oldIntentName ? this.appContext.steps.get(this.oldIntentName) : null;
            if (!step && intents) {
                for (const intent in intents) {
                    if (this.appContext.steps.has(intent)) {
                        step = this.appContext.steps.get(intent);
                    }
                }
            }
            if (step) {
                let res: void | Promise<void> | false;
                try {
                    res = step.cb(this);
                } catch (error) {
                    this.appContext.logError(
                        `BotController: Произошла ошибка во время обработки шага "${step.stepName}". Текст ошибки: "${error}"`,
                        {
                            error,
                        },
                    );
                    this.text = 'Не удалось выполнить шаг диалога. Попробуйте ещё раз.';
                    return;
                }
                if (res) {
                    return res
                        .then(() => {
                            this._actionMetric(step.stepName, false, true);
                        })
                        .catch((error) => {
                            this.appContext.logError(
                                `BotController: Произошла ошибка во время обработки шага "${step.stepName}". Текст ошибки: "${error}"`,
                                {
                                    error,
                                },
                            );
                            // Без fallback-текста платформа получила бы пустой ответ.
                            // Не затираем текст, если обработчик успел его задать до ошибки.
                            if (!this.text) {
                                this.text = 'Не удалось выполнить шаг диалога. Попробуйте ещё раз.';
                            }
                        });
                } else if (res === false) {
                    // Если передали false, значит хотят чтобы шаг не выполнялся, и дальше пошла логика с обработкой команд.
                    // Как правило, нужно в случаях, когда был записан какой-то шаг, и диалог открыли заново. В таком случае сам шаг отрабатывать не нужно.
                    return null;
                }
                this._actionMetric(step.stepName, false, true);
                return;
            }
        }
        return null;
    }

    /**
     * Обрабатывает интенты и fallback-команду.
     * Вызывается из {@link run}, когда не сработал ни активный шаг, ни одна из команд.
     * Если интент не найден и `messageId === 0` (начало диалога), используется welcome-интент.
     *
     * @returns {void | Promise<void>} Может быть асинхронным
     */
    #runIntentOrFallback(): void | Promise<void> {
        let intent: string | null = this._getIntent(this.userCommand);
        const fallbackCommand = this.appContext?.commands.get(DEFAULT_FALLBACK_COMMAND);
        if (!intent && fallbackCommand) {
            const res = this.#commandExecute(DEFAULT_FALLBACK_COMMAND, fallbackCommand);
            if (isPromise(res)) {
                return res.then(() => {
                    this._actionMetric(DEFAULT_FALLBACK_COMMAND, true);
                });
            }
            this._actionMetric(DEFAULT_FALLBACK_COMMAND, true);
            return res;
        }
        // if (
        //     intent === null &&
        //     this.originalUserCommand &&
        //     this.userCommand !== this.originalUserCommand
        // ) {
        //     // Защита на случай, если сам запроса не был найден, но на самом деле должен был отработать.
        //     // По хорошему стоит пересмотреть эту механику, и возможно удалить ее.
        //     intent = this._getIntent(this.originalUserCommand.toLowerCase());
        // }
        if (intent === null && this.messageId === 0) {
            intent = DEFAULT_WELCOME_INTENT_NAME;
        }
        let command: ICommandParam | undefined;
        /*
         * Для стандартных действий параметры заполняются автоматически.
         * Есть возможность переопределить их в action() по названию действия
         */
        switch (intent) {
            case DEFAULT_WELCOME_INTENT_NAME:
                command = this.appContext.commands.get(DEFAULT_WELCOME_INTENT_NAME);
                if (command) {
                    return this.#commandCb(
                        DEFAULT_WELCOME_INTENT_NAME,
                        command,
                        this.#getStartMetric(),
                    );
                }
                this.text = Text.getText(this.appContext.platformParams.welcome_text);
                break;

            case DEFAULT_HELP_INTENT_NAME:
                command = this.appContext.commands.get(DEFAULT_HELP_INTENT_NAME);
                if (command) {
                    return this.#commandCb(
                        DEFAULT_HELP_INTENT_NAME,
                        command,
                        this.#getStartMetric(),
                    );
                }
                this.text = Text.getText(this.appContext.platformParams.help_text);
                break;
        }

        this._actionMetric(intent);
    }

    /**
     * Основной метод обработки запроса, вызываемый автоматически фреймворком.
     *
     * @remarks
     * **КРАТКИЙ ОБЗОР РАБОТЫ:**
     * 1. Пользователь отправляет сообщение → платформа → Bot.run()
     * 2. `run()` определяет тип запроса (команда/интент/шаг)
     * 3. Вызывается ваш метод `action()` с результатом
     * 4. Вы заполняете поля ответа (`text`, `buttons`, `card`)
     * 5. Bot отправляет ответ пользователю
     *
     * **ЧТО НЕ НУЖНО ДЕЛАТЬ:**
     * - ❌ Не вызывайте `run()` вручную в своем коде
     * - ❌ Не переопределяйте этот метод
     * - ✅ Переопределяйте только метод `action()` для своей логики
     *
     * **ПОСЛЕДОВАТЕЛЬНОСТЬ ОБРАБОТКИ ВНУТРИ run():**
     * ```
     * run()
     *   ├── Шаг 1: Проверяет есть ли активный шаг
     *   │     → Если есть → вызывает action(stepName, false, true)
     *   ├── Шаг 2: Ищет команду
     *   │     → Если нашел → вызывает action(commandName, true, false)
     *   ├── Шаг 3: Ищет интент
     *   │     → Если нашел → вызывает action(intentName, false, false)
     *   └── Шаг 4: Если ничего не нашел → Fallback команда
     * ```
     *
     * @example
     * ```ts
     * // ВАШ КОД (контроллер):
     * class MyController extends BotController {
     *   public action(intentName: string | null): void {
     *     // Ваша логика здесь
     *     this.text = "Ответ пользователю";
     *   }
     * }
     *
     * // КОД ФРЕЙМВОРКА (не ваш):
     * // Когда приходит запрос от пользователя:
     * const controller = new MyController();
     * {...}; // Наполняет контроллер данными. Как правило, этим занимается адаптер платформы
     * await controller.run(); // Автоматически вызывает ваш action()
     * const response = ...; // Адаптер формирует ответ в зависимости от состояния контроллера
     * ```
     *
     * @returns {void | Promise<void>} Может быть асинхронным
     */
    public run(): void | Promise<void> {
        const stepResult = this.#stepResolver();
        if (stepResult !== null) {
            return stepResult;
        }
        const commandResult = this._getCommand();
        if (isPromise(commandResult)) {
            return commandResult.then((result) => {
                if (result === null) {
                    return this.#runIntentOrFallback();
                }
            });
        }
        if (commandResult !== null) {
            return commandResult;
        }
        return this.#runIntentOrFallback();
    }
}
