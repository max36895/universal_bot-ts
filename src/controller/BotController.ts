import {Buttons} from "../components/button/Buttons";
import {Card} from "../components/card/Card";
import {Sound} from "../components/sound/Sound";
import {Nlu} from "../components/nlu/Nlu";
import {HELP_INTENT_NAME, IAppIntent, mmApp, T_ALISA, T_MARUSIA, WELCOME_INTENT_NAME} from "../core/mmApp";
import {Text} from "../components/standard/Text";

/**
 * Абстрактный класс, который должны унаследовать все классы, обрабатывающие логику приложения.
 * @class BotController
 */
export abstract class BotController {
    /**
     * Кнопки отображаемые в приложении.
     * @see Buttons Смотри тут
     */
    public buttons: Buttons;
    /**
     * Карточки отображаемые в приложении.
     * @see Card Смотри тут
     */
    public card: Card;
    /**
     * Текст который отобразится пользователю.
     */
    public text: string;
    /**
     * Текст который услышит пользователь.
     * !Важно, если переменная заполняется для других типов приложения, тогда отправляется запрос в yandex speechkit для преобразования текста в звук.
     * Полученный звук отправляется пользователю как аудио сообщение.
     */
    public tts: string;
    /**
     * Обработанный nlu в приложении.
     * @link [nlu](https://www.maxim-m.ru/glossary/nlu)
     * @see Nlu Смотри тут
     */
    public nlu: Nlu;
    /**
     * Звуки которые будут присутствовать в приложении.
     * @see Sound Смотри тут
     */
    public sound: Sound;
    /**
     * Идентификатор пользователя.
     */
    public userId: string | number;
    /**
     * Пользовательский токен. Инициализируется когда пользователь авторизовался (Актуально для Алисы).
     */
    public userToken: string;
    /**
     * Meta данные пользователя.
     */
    public userMeta: any;
    /**
     * Id сообщения(Порядковый номер сообщения), необходим для того, чтобы понять в 1 раз пишет пользователь или нет.
     */
    public messageId: number | string;
    /**
     * Запрос пользователя в нижнем регистре.
     */
    public userCommand: string;
    /**
     * Оригинальный запрос пользователя.
     */
    public originalUserCommand: string;
    /**
     * Дополнительные параметры к запросу.
     */
    public payload: object;
    /**
     * Пользовательские данные, сохраненные в приложении (Хранятся в бд либо в файле. Зависит от параметра mmApp.isSaveDb).
     */
    public userData: any;
    /**
     * Запросить авторизацию для пользователя или нет (Актуально для Алисы).
     */
    public isAuth: boolean;
    /**
     * Проверка что авторизация пользователя прошла успешно (Актуально для Алисы).
     */
    public isAuthSuccess: true | false | null;
    /**
     * Пользовательское локальное хранилище (Актуально для Алисы).
     */
    public state: object | string;
    /**
     * Наличие экрана.
     */
    public isScreen: boolean;
    /**
     * Завершение сессии.
     */
    public isEnd: boolean;
    /**
     * Отправлять в конце запрос или нет. (Актуально для Vk и Telegram) False тогда, когда все запросы отправлены внутри логики приложения, и больше ничего отправлять не нужно.
     */
    public isSend: boolean;
    /**
     * Полученный запрос.
     */
    public requestObject: object | string;

    /**
     * Идентификатор предыдущего действия пользователя.
     */
    public oldIntentName: string;

    /**
     * Идентификатор текущего действия пользователя.
     */
    public thisIntentName: string;

    /**
     * Эмоция, с которой будет общаться приложение. Актуально для Сбер.
     */
    public emotion: string;

    /**
     * Манера общения с пользователем. Общаемся на "Вы" или на "ты".
     * Возможные значения:
     * "official" - официальный тон общения(на Вы)
     * "no_official" - Общаемся на ты
     * null - можно использовать любой тон
     */
    public appeal: "official" | "no_official";

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
    }

    /**
     * Получение всех обрабатываемых команд приложения.
     *
     * @return IAppIntent[]
     */
    protected _intents(): IAppIntent[] {
        return mmApp.params.intents || [];
    }

    /**
     * Поиск нужной команды в пользовательском запросе.
     * В случае успеха вернет название действия.
     *
     * @param {string} text Текст, в котором происходит поиск вхождений.
     * @return string|null
     */
    protected _getIntent(text: string): string {
        const intents: IAppIntent[] = this._intents();
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
     * Если intentName === null, значит не удалось найти обрабатываемых команд в запросе.
     * В таком случе стоит смотреть либо на предыдущую команду пользователя.
     * Либо вернуть текст помощи.
     *
     * @param {string} intentName Название действия.
     */
    public abstract action(intentName: string): void;

    /**
     * Запуск приложения.
     * @api
     */
    public run(): void {
        let intent: string = this._getIntent(this.userCommand);
        if (intent === null && this.messageId == 0) {
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

        this.action(intent);
        if (this.tts === null && (mmApp.appType === T_ALISA || mmApp.appType === T_MARUSIA)) {
            this.tts = this.text;
        }
    }
}
