/**
 * Абстрактный контроллер, обрабатывающий логику приложения
 * @module controller/BotController
 */
import {Buttons} from "../components/button";
import {Card} from "../components/card";
import {Sound} from "../components/sound";
import {Nlu} from "../components/nlu";
import {HELP_INTENT_NAME, IAppIntent, mmApp, T_ALISA, T_MARUSIA, WELCOME_INTENT_NAME} from "../core/mmApp";
import {Text} from "../components/standard/Text";

/**
 * Абстрактный класс, от которого наследуются все классы, обрабатывающие логику приложения.
 * @class BotController
 */
export abstract class BotController {
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
     * !Важно, если переменная заполняется для типов приложения отличных от голосовых ассистентов, то отправляется запрос в yandex speechkit для преобразования текста в речь.
     * Полученный звук отправляется пользователю как аудио сообщение.
     */
    public tts: string | null;
    /**
     * Обработанный nlu.
     * @link [nlu](https://www.maxim-m.ru/glossary/nlu)
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
    public userData: any;
    /**
     * Определяет необходимость запроса авторизации для пользователя (Актуально для Алисы).
     */
    public isAuth: boolean;
    /**
     * Определяет успешность авторизации пользователя (Актуально для Алисы).
     */
    public isAuthSuccess: true | false | null;
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
     * @default null
     */
    public appeal: "official" | "no_official" | null;
    /**
     * Отправляет запрос на оценку приложения
     * @default false
     */
    public isSendRating;

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
        this.userData = null;
        this.state = null;
        this.isAuth = false;
        this.isAuthSuccess = null;
        this.isSend = true;
        this.requestObject = null;
        this.oldIntentName = null;
        this.thisIntentName = null;
        this.emotion = null;
        this.appeal = null;
        this.payload = null;
        this.isSendRating = false;
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
     * Поиск нужной команды в пользовательском запросе.
     * В случае успеха вернет название действия.
     *
     * @param {string} text Текст, в котором происходит поиск вхождений.
     * @return {string}
     * @private
     */
    protected static _getIntent(text: string | null): string | null {
        if (!text) {
            return null;
        }
        const intents: IAppIntent[] = BotController._intents();
        for (const intent of intents) {
            if (Text.isSayText((intent.slots || []), text, (intent.is_pattern || false))) {
                return intent.name;
            }
        }
        return null;
    }

    /**
     * Обработка пользовательских команд.
     *
     * Если не удалось найти обрабатываемых команд в запросе, то в indentName придет null
     * В таком случае стоит смотреть на предыдущую команду пользователя, либо вернуть текст помощи.
     *
     * @param {string} intentName Название действия.
     */
    public abstract action(intentName: string | null): void;

    /**
     * Запуск приложения.
     * @api
     */
    public run(): void {
        let intent: string | null = BotController._getIntent(this.userCommand);
        if (intent === null && this.originalUserCommand && this.userCommand !== this.originalUserCommand) {
            intent = BotController._getIntent(this.originalUserCommand.toLowerCase());
        }
        if (intent === null && this.messageId === 0) {
            intent = WELCOME_INTENT_NAME;
        }
        /**
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
        if (this.tts === null && (mmApp.appType === T_ALISA || mmApp.appType === T_MARUSIA)) {
            this.tts = this.text;
        }
    }
}
