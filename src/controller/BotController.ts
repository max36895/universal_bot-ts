import { Buttons } from '../components/button';
import { Card } from '../components/card';
import { Sound } from '../components/sound';
import { Nlu } from '../components/nlu';
import {
    HELP_INTENT_NAME,
    IAppIntent,
    mmApp,
    T_ALISA,
    T_MARUSIA,
    WELCOME_INTENT_NAME,
} from '../mmApp';
import { Text } from '../utils/standard/Text';

/**
 * Тип статуса операции.
 * @remarks
 * - true - операция выполнена успешно
 * - false - операция завершилась с ошибкой
 * - null - операция не выполнялась
 */
export type TStatus = true | false | null;

/**
 * Интерфейс для событий пользователя.
 * @remarks
 * Содержит информацию о различных действиях пользователя в приложении,
 * таких как авторизация и оценка приложения.
 */
export interface IUserEvent {
    /**
     * Информация об авторизации пользователя
     */
    auth?: {
        /**
         * Статус авторизации:
         * - true - авторизация успешна
         * - false - авторизация не удалась
         * - null - авторизация не выполнялась
         */
        status: TStatus;
    };
    /**
     * Информация об оценке приложения пользователем
     */
    rating?: {
        /**
         * Статус выставления оценки:
         * - true - оценка выставлена
         * - false - пользователь отказался от оценки
         * - null - оценка не запрашивалась
         */
        status: TStatus;
        /**
         * Числовое значение выставленной оценки
         */
        value?: number;
    };
}

/**
 * Интерфейс для хранения пользовательских данных.
 * @remarks
 * Расширяемый интерфейс для хранения любых дополнительных
 * данных, связанных с пользователем в процессе диалога.
 */
export interface IUserData {
    /**
     * Название предыдущего интента
     */
    oldIntentName?: string;

    /**
     * Дополнительные пользовательские данные
     */
    [key: string]: unknown;
}

/**
 * Абстрактный класс, от которого наследуются все классы, обрабатывающие логику приложения.
 * Предоставляет базовый функционал для обработки пользовательских запросов, управления состоянием
 * и взаимодействия с различными платформами.
 *
 * @remarks
 * BotController является ядром приложения и обеспечивает:
 * - Обработку пользовательских команд и интентов
 * - Управление состоянием диалога
 * - Работу с UI компонентами (кнопки, карточки)
 * - Поддержку различных платформ (Алиса, Маруся, Telegram и др.)
 * - Управление пользовательскими данными
 *
 * @example
 * ```typescript
 * class MyController extends BotController {
 *   // Обработка команды приветствия
 *   public action(intentName: string | null): void {
 *     if (intentName === WELCOME_INTENT_NAME) {
 *       this.text = 'Привет! Чем могу помочь?';
 *       this.buttons
 *         .addButton('Помощь')
 *         .addButton('Выход');
 *     }
 *   }
 * }
 * ```
 *
 * @class BotController
 */
export abstract class BotController<TUserData extends IUserData = IUserData> {
    /**
     * Компонент, позволяющий отображать кнопки пользователю.
     * @see Buttons Смотри тут
     */
    public buttons: Buttons;
    /**
     * Компонент, позволяющий отображать карточки пользователю.
     * @see Card Смотри тут
     */
    public card: Card;
    /**
     * Текст, отображаемый пользователю.
     */
    public text: string;
    /**
     * Текст, воспроизводимый пользователю.
     * !!! Важно, если переменная заполняется для типов приложения отличных от голосовых ассистентов, то отправляется запрос в yandex speechkit для преобразования текста в речь.
     * Полученный звук отправляется пользователю как аудио сообщение.
     */
    public tts: string | null;
    /**
     * Обработанный [nlu](https://www.maxim-m.ru/glossary/nlu)
     * @see Nlu Смотри тут
     */
    public nlu: Nlu;
    /**
     * Звуки, присутствующие в приложении.
     * @see Sound Смотри тут
     */
    public sound: Sound;
    /**
     * Идентификатор пользователя.
     */
    public userId: string | number | null;
    /**
     * Пользовательский токен. Инициализируется когда пользователь авторизовался (Актуально для Алисы).
     */
    public userToken: string | null;
    /**
     * Meta данные пользователя.
     */
    public userMeta: any;
    /**
     * Id сообщения(Порядковый номер сообщения), необходимый для определения начала нового диалога с приложением.
     */
    public messageId: number | string | null;
    /**
     * Запрос пользователя в нижнем регистре.
     */
    public userCommand: string | null;
    /**
     * Оригинальный запрос пользователя.
     */
    public originalUserCommand: string | null;
    /**
     * Дополнительные параметры к запросу.
     */
    public payload: object | string | null | undefined;
    /**
     * Пользовательские данные, хранящиеся в приложении. (Данный хранятся в базе данных либо в файле, тип зависит от параметра mmApp.isSaveDb).
     */
    public userData: TUserData;
    /**
     * Определяет необходимость запроса авторизации для пользователя (Актуально для Алисы).
     */
    public isAuth: boolean;
    /**
     * Определяет статус пользовательских событий, таких как успешная авторизация, либо оценка приложения.
     */
    public userEvents: IUserEvent | null;
    /**
     * Пользовательское локальное хранилище (Актуально для Алисы и Маруси и Сбера).
     */
    public state: object | string | null;
    /**
     * Определяет наличие экрана.
     */
    public isScreen: boolean;
    /**
     * Определяет состояние завершения сессии.
     */
    public isEnd: boolean;
    /**
     * Определяет необходимость отправки запроса к api сервиса. Актуально для Vk и Telegram. Используется в случае, когда все запросы были отправлены в логике приложения, и дополнительных запросов делать не нужно.
     */
    public isSend: boolean;
    /**
     * Полученный запрос.
     */
    public requestObject: object | string | null;

    /**
     * Идентификатор предыдущего действия пользователя.
     */
    public oldIntentName: string | null;

    /**
     * Идентификатор текущего действия пользователя.
     * В случае, когда не нужно сохранять идентификатор предыдущей команды, необходимо значение установить в null
     */
    public thisIntentName: string | null;

    /**
     * Определяет эмоцию, с которой будет общаться приложение с пользователем. Актуально для Сбер.
     */
    public emotion: string | null;

    /**
     * Определяет манеру общения с пользователем. Общаемся на "Вы" или на "ты".
     * Возможные значения:
     * "official" - Официальный тон общения(на Вы)
     * "no_official" - Общаемся на ты
     * null - можно использовать любой тон
     * Актуально для Сбер
     * @defaultValue null
     */
    public appeal: 'official' | 'no_official' | null;
    /**
     * Отправляет запрос на оценку приложения
     * @defaultValue false
     */
    public isSendRating: boolean;

    protected constructor() {
        this.buttons = new Buttons();
        this.card = new Card();
        this.nlu = new Nlu();
        this.sound = new Sound();

        this.text = '';
        this.tts = null;
        this.userId = null;
        this.userToken = null;
        this.userMeta = null;
        this.userCommand = null;
        this.originalUserCommand = null;
        this.isScreen = true;
        this.isEnd = false;
        this.messageId = null;
        this.userData = {} as TUserData;
        this.state = null;
        this.isAuth = false;
        this.isSend = true;
        this.requestObject = null;
        this.oldIntentName = null;
        this.thisIntentName = null;
        this.emotion = null;
        this.appeal = null;
        this.payload = null;
        this.isSendRating = false;
        this.userEvents = null;
    }

    /**
     * Получение всех обрабатываемых команд приложения.
     *
     * @return {IAppIntent[]}
     * @private
     */
    protected static _intents(): IAppIntent[] {
        return mmApp.params.intents || [];
    }

    /**
     * Определяет интент на основе пользовательского ввода.
     *
     * @param {string | null} text Текст, в котором происходит поиск вхождений
     * @returns {string | null} Название найденного интента или null, если интент не найден
     *
     * @remarks
     * Метод проверяет текст на соответствие всем зарегистрированным интентам.
     * Для каждого интента проверяются его слоты (ключевые фразы) с учетом
     * настройки is_pattern (использование регулярных выражений).
     *
     * @example
     * ```typescript
     * const intent = BotController._getIntent("помощь");
     * // Вернет "HELP_INTENT_NAME", если есть соответствующий интент
     * ```
     * @protected
     */
    protected static _getIntent(text: string | null): string | null {
        if (!text) {
            return null;
        }
        const intents: IAppIntent[] = BotController._intents();
        for (const intent of intents) {
            if (Text.isSayText(intent.slots || [], text, intent.is_pattern || false)) {
                return intent.name;
            }
        }
        return null;
    }

    /**
     * Ищет и выполняет команду, соответствующую пользовательскому запросу.
     *
     * @returns {string | null} Ключ найденной команды или null, если команда не найдена
     *
     * @remarks
     * Метод проверяет пользовательский ввод на соответствие всем зарегистрированным
     * командам в mmApp.commands. При нахождении соответствия:
     * 1. Выполняется callback-функция команды
     * 2. Если callback возвращает текст, он сохраняется в this.text
     * 3. Возвращается ключ найденной команды
     *
     * @example
     * ```typescript
     * // Пример регистрации команды
     * mmApp.commands["start"] = {
     *   slots: ["начать", "старт"],
     *   cb: (cmd, controller) => "Начинаем работу!"
     * };
     *
     * // В контроллере
     * const cmdKey = this._getCommand(); // Вернет "start" при соответствующем вводе
     * ```
     * @protected
     */
    protected _getCommand(): string | null {
        if (!this.userCommand) {
            return null;
        }
        const commandKeys = Object.keys(mmApp.commands);
        if (commandKeys.length) {
            for (let i = 0; i < commandKeys.length; i++) {
                if (
                    Text.isSayText(
                        mmApp.commands[commandKeys[i]].slots || [],
                        this.userCommand,
                        mmApp.commands[commandKeys[i]].isPattern || false,
                    )
                ) {
                    const res = mmApp.commands[commandKeys[i]].cb?.(this.userCommand, this);
                    if (res) {
                        this.text = res;
                    }
                    return commandKeys[i];
                }
            }
        }
        return null;
    }

    /**
     * Абстрактный метод для обработки пользовательских команд и интентов.
     *
     * @param {string | null} intentName Название интента для обработки
     * @param {boolean} [isCommand=false] Флаг, указывающий является ли intentName командой
     *
     * @remarks
     * Этот метод должен быть реализован в дочерних классах для определения
     * конкретной логики обработки команд и интентов. Он вызывается после
     * определения интента или команды в методе run().
     *
     * @example
     * ```typescript
     * class MyController extends BotController {
     *   action(intentName: string | null, isCommand = false): void {
     *     if (isCommand && intentName === "start") {
     *       this.text = "Добро пожаловать!";
     *     } else if (intentName === "HELP_INTENT") {
     *       this.text = "Чем могу помочь?";
     *     }
     *   }
     * }
     * ```
     * @abstract
     */
    abstract action(intentName: string | null, isCommand?: boolean): void;

    /**
     * Основной метод обработки пользовательского запроса.
     *
     * @remarks
     * Метод выполняет следующие действия:
     * 1. Проверяет наличие команды в пользовательском вводе
     * 2. Если команда не найдена, определяет интент
     * 3. Вызывает метод action() с найденным интентом/командой
     * 4. Обновляет oldIntentName в пользовательских данных
     *
     * @example
     * ```typescript
     * const controller = new MyController();
     * controller.userCommand = "помощь";
     * controller.run();
     * // Определит интент и вызовет action() с соответствующими параметрами
     * ```
     * @public
     */
    public run(): void {
        const commandResult = this._getCommand();
        if (commandResult) {
            this.action(commandResult, true);
        } else {
            let intent: string | null = BotController._getIntent(this.userCommand);
            if (
                intent === null &&
                this.originalUserCommand &&
                this.userCommand !== this.originalUserCommand
            ) {
                intent = BotController._getIntent(this.originalUserCommand.toLowerCase());
            }
            if (intent === null && this.messageId === 0) {
                intent = WELCOME_INTENT_NAME;
            }
            /*
             * Для стандартных действий параметры заполняются автоматически. Есть возможность переопределить их в action() по названию действия
             */
            switch (intent) {
                case WELCOME_INTENT_NAME:
                    this.text = Text.getText(mmApp.params.welcome_text || '');
                    break;

                case HELP_INTENT_NAME:
                    this.text = Text.getText(mmApp.params.help_text || '');
                    break;
            }

            this.action(intent as string);
        }
        if (this.tts === null && (mmApp.appType === T_ALISA || mmApp.appType === T_MARUSIA)) {
            this.tts = this.text;
        }
    }
}
