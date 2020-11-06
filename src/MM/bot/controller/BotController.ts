import {Buttons} from "../components/button/Buttons";
import {Card} from "../components/card/Card";
import {Sound} from "../components/sound/Sound";
import {Nlu} from "../components/nlu/Nlu";
import {HELP_INTENT_NAME, IAppIntent, mmApp, T_ALISA, T_MARUSIA, WELCOME_INTENT_NAME} from "../core/mmApp";
import {Text} from "../components/standard/Text";

export abstract class BotController {
    /**
     * Кнопки отображаемые в приложении
     * @var buttons Кнопки отображаемые в приложении
     * @see Buttons Смотри тут
     */
    public buttons: Buttons;
    /**
     * Карточки отображаемые в приложении.
     * @var card Карточки отображаемые в приложении.
     * @see Card Смотри тут
     */
    public card: Card;
    /**
     * Текст который увидит пользователь.
     * @var text
     */
    public text: string;
    /**
     * Текст который услышит пользователь.
     * @var tts Текст который услышит пользователь.
     * !Важно, если переменная заполняется для других типов приложения, тогда отправляется запрос в yandex speechkit для преобразования текста в звук.
     * Полученный звук отправляется пользователю как аудио сообщение.
     */
    public tts: string;
    /**
     * Обработанный nlu в приложении.
     * @var nlu Обработанный nlu в приложении.
     * @link [nlu](https://www.maxim-m.ru/glossary/nlu)
     * @see Nlu Смотри тут
     */
    public nlu: Nlu;
    /**
     * Звуки в приложении.
     * @var sound Звуки в приложении.
     * @see Sound Смотри тут
     */
    public sound: Sound;
    /**
     * Идентификатор пользователя.
     * @var userId Идентификатор пользователя.
     */
    public userId: string | number;
    /**
     * Пользовательский токен. Инициализируется тогда, когда пользователь авторизован (Актуально для Алисы).
     * @var userToken Пользовательский токен. Инициализируется тогда, когда пользователь авторизован (Актуально для Алисы).
     */
    public userToken: string;
    /**
     * Meta данные пользователя.
     * @var userMeta Meta данные пользователя.
     */
    public userMeta: any;
    /**
     * Id сообщения(Порядковый номер сообщения), необходим для того, чтобы понять в 1 раз пишет пользователь или нет.
     * @var messageId Id сообщения(Порядковый номер сообщения), необходим для того, чтобы понять в 1 раз пишет пользователь или нет.
     */
    public messageId: number | string;
    /**
     * Запрос пользователь в нижнем регистре.
     * @var userCommand Запрос пользователь в нижнем регистре.
     */
    public userCommand: string;
    /**
     * Оригинальный запрос пользователя.
     * @var originalUserCommand Оригинальный запрос пользователя.
     */
    public originalUserCommand: string;
    /**
     * Дополнительные параметры запроса.
     * @var payload Дополнительные параметры запроса.
     */
    public payload: object;
    /**
     * Пользовательские данные (Хранятся в бд либо в файле. Зависит от параметра mmApp.isSaveDb).
     * @var userData Пользовательские данные (Хранятся в бд либо в файле. Зависит от параметра mmApp.isSaveDb).
     */
    public userData: any;
    /**
     * Запросить авторизацию пользователя или нет (Актуально для Алисы).
     * @var isAuth Запросить авторизацию пользователя или нет (Актуально для Алисы).
     */
    public isAuth: boolean;
    /**
     * Проверка что авторизация пользователя прошла успешно (Актуально для Алисы).
     * @var isAuthSuccess Проверка что авторизация пользователя прошла успешно (Актуально для Алисы).
     */
    public isAuthSuccess: true | false | null;
    /**
     * Пользовательское хранилище (Актуально для Алисы).
     * @var state Пользовательское хранилище (Актуально для Алисы).
     */
    public state: object | string;
    /**
     * Если ли экран (Актуально для Алисы).
     * @var isScreen Если ли экран (Актуально для Алисы).
     */
    public isScreen: boolean;
    /**
     * Завершение сессии (Актуально для Алисы).
     * @var isEnd Завершение сессии (Актуально для Алисы).
     */
    public isEnd: boolean;
    /**
     * Отправлять в конце запрос или нет. (Актуально для Vk и Telegram) False тогда, когда все запросы отправлены внутри логики приложения, и больше ничего отправлять не нужно.
     * @var isSend Отправлять в конце запрос или нет. (Актуально для Vk и Telegram) False тогда, когда все запросы отправлены внутри логики приложения, и больше ничего отправлять не нужно.
     */
    public isSend: boolean;
    /**
     * Полученный запрос.
     * @var requestObject Полученный запрос.
     */
    public requestObject: object | string;

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
    }

    /**
     * Получение всех обрабатываемых команд приложения.
     *
     * @return array
     */
    protected _intents(): IAppIntent[] {
        return mmApp.params.intents || [];
    }

    /**
     * Поиск нужной команды в  пользовательском запросе.
     * В случае успеха вернет название действия.
     *
     * @param text Текст, в котором происходит поиск вхождений.
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
     * Если intentName === null, значит не удалось найти обрабатываемых команд в тексте.
     * В таком случе стоит смотреть либо на предыдущую команду пользователя(которая сохранена в бд).
     * Либо вернуть текст помощи.
     *
     * @param intentName Название действия.
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
