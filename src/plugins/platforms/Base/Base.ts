import { BasePlugin } from '../../Base';
import {
    AppContext,
    IPlatformAdapter,
    BotController,
    BaseBotController,
    IDatabaseInfo,
} from '../../../index';

/**
 * Тип ответа, который может вернуть адаптер после обработки запроса
 */
export type TContent = object | string | Promise<object | string>;

/**
 * Дополнительные опции, которые передаются в конструктор адаптера
 */
export interface IOptions {
    /**
     * Любое свойство в необходимо для работы формате
     */
    [key: string]: unknown;
}

export const EMPTY_QUERY_ERROR =
    'Получено пустое тело запроса от платформы, дальнейшая корректная работа не возможно. Скорей всего запрос пришел не от платформы.';
export const EMPTY_CONTEXT_ERROR =
    'Не указан контекст приложения, дальнейшая работа приложения не доступна. Проверьте корректность настройки приложения.';

/**
 * Базовый адаптер для создания навыков/ботов для собственной платформы (WeChat, WhatsApp, Slack и др.).
 *
 * Чтобы подключить другую платформу, которая не поставляется из коробки, унаследуйтесь от класса и реализуйте
 * все абстрактные методы. Адаптер автоматически зарегистрируется в системе
 * при подключении через `bot.use(new MyPlatformAdapter())`.
 *
 * === Обязательные методы ===
 * - {@link isPlatformOnQuery} — определяет, относится ли запрос к платформе или нет
 * - {@link setQueryData} — обрабатывает запрос и заполняет `controller` данными
 * - {@link getContent} — формирует ответ в формате платформы
 *
 * === Опциональные ===
 * - {@link getQueryExample} — генерирует пример запроса необходимого для тестов
 * - {@link isLocalStorage}, {@link getLocalStorage}, {@link setLocalStorage} — если платформа поддерживает сохранение локального состояния
 * - {@link soundProcessing} — кастомная обработка TTS/звуков (для голосовых платформ, или отправка аудиофайла в боте).
 *
 * @see Bot
 * @see BotController
 * @see BasePlatform
 */
export abstract class BasePlatform<TQuery = unknown>
    extends BasePlugin
    implements IPlatformAdapter<TQuery>
{
    /**
     * Время ответа навыка в миллисекундах при превышении этого времени, будет отправлено предупреждение
     */
    protected WARMING_TIME_REQUEST = 2000;
    /**
     * Максимальное время ответа навыка в миллисекундах при превышении этого времени, будет отправлена ошибка
     */
    protected MAX_TIME_REQUEST = 2900;

    protected _token?: string;
    protected _platformOptions?: IOptions;
    /**
     * Определят лимит платформы.
     * В значение указывается количество запросов, которое можно отправить платформе за 1 секунду.
     * В случае если у платформы нет ограничений, можно указать 0 или null.
     * По умолчанию null
     */
    limit: number | null = null;

    /**
     * Контекст приложения
     */
    appContext?: AppContext<unknown, TQuery>;
    /**
     * Имя платформы
     */
    platformName: string = 'unknown';
    /**
     * Определяет тип платформы(голосовая или чат-бот)
     */
    isVoice = true;

    constructor(platformToken?: string, additionalPlatformOptions?: IOptions) {
        super();
        this._token = platformToken;
        this._platformOptions = additionalPlatformOptions;
    }

    /**
     * Инициализация адаптера.
     * Определять не обязательно. Стоит указывать в случаях, когда нужно выполнить доп логику, например указать токены или писать какую-то статистику по использованию.
     * @param appContext
     */
    init(appContext: AppContext<IDatabaseInfo, TQuery>): void {
        appContext.platforms[this.platformName] = this;
        this.appContext = appContext;
    }

    /**
     * Генерирует пример входящего запроса для локального тестирования навыка/бота.
     * Позволяет эмулировать запрос от платформы с заданным текстом, ID пользователя, номером сообщения и состоянием.
     * Необходимо указывать для того, чтобы можно было корректно проверить работоспособность приложения.
     *
     * Обязательно определите метод, если планируется тестирования приложения через инструменты предоставляемые платформой. Это существенно упростит процесс разработки приложения.
     * @param query Запрос пользователя
     * @param userId Идентификатор пользователя
     * @param count Порядковый номер запроса
     * @param state Данные из локального хранилища
     */
    getQueryExample(
        query: string,
        userId: string,
        count: number,
        state: Record<string, unknown> | string,
    ): Record<string, unknown> {
        // Формат запроса от вашей платформы
        return {
            text: query,
            userId,
            messageId: count,
            state,
        };
    }

    /**
     * Возвращает признак того, соответствует ли запрос текущей платформе или нет
     *
     * @example Telegram
     * ```ts
     * isPlatformOnQuery(query, headers) {
     *   return headers?.['x-telegram-bot-api-secret-token'] === this._token;
     * }
     * ```
     *
     * @example Алиса (тело содержит "meta.session_id")
     * ```ts
     * isPlatformOnQuery(query) {
     *   return typeof query === 'object' && query.meta?.session_id;
     * }
     * ```
     * @param query Запрос, который пришел в приложение
     * @param headers Заголовок с которым был отправлен запрос
     * @returns `true`, если запрос относится к этой платформе, иначе `false`
     */
    abstract isPlatformOnQuery(query: TQuery, headers?: Record<string, unknown>): boolean;

    /**
     * Обрабатывает входящий запрос и заполняет контроллер данными.
     *
     * Обязательно установите:
     * - `controller.text` — текст сообщения пользователя
     * - `controller.userId` — уникальный ID пользователя
     * - `controller.platform` = this.platformName
     *
     * Опционально:
     * - `controller.intent` — если платформа присылает интент
     * - `controller.entities` — извлечённые сущности
     * - `controller.session` — данные сессии
     *
     * @returns `false`, если запрос повреждён или не может быть обработан; иначе `true`
     * @param query Запрос от платформы
     * @param controller Контроллер приложения
     */
    abstract setQueryData(query: TQuery, controller: BotController): boolean | Promise<boolean>;

    /**
     * Формирует тело ответа для отправки пользователю.
     *
     * Возвращает платформо-специфичный ответ (например, JSON для Алисы).
     * Для платформ, которые отправляют ответ напрямую (например, Telegram через `sendMessage`),
     * метод может возвращать `{ ok: true }` или аналог.
     *
     * @param controller - контроллер с готовым ответом
     * @param stateData - данные для локального хранилища
     * @returns ответ в формате, понятном платформе
     */
    abstract getContent(
        controller: BotController,
        stateData?: Record<string, unknown> | null,
    ): TContent;

    /**
     * Формирует ответ с оценкой
     * @param controller - контроллер приложения
     */
    public getRatingContext(controller: BotController): TContent {
        return this.getContent(controller);
    }

    /**
     * Отправка текста пользователю
     * Этот метод используется для активных рассылок — когда бот инициирует диалог первым (например, уведомление).
     * В методе реализована механика преобразования текстового значения `controllerOrText` в контроллер, а также базовый механизм для отправки ответа.
     *
     * Переопределять данный метод не рекомендуется. Переопределить стоит только в том случае, если по каким-то технических условиям текущая реализация метода вам не подходит.
     *
     * Если платформа не поддерживает возможность начать диалог самостоятельно, то можно оставить метод пустым, либо вывести любую заглушку.
     * @param userId Ид пользователя, которому нужно отправить сообщение
     * @param controllerOrText Контроллер приложения или текст. Если необходимо отправить просто текст, можно передать строку, в случае, если необходимо передать картинку звук и тд, то необходимо корректно заполнить контроллер.
     */
    send(userId: string | number, controllerOrText: BotController | string): TContent | boolean {
        let controller: BotController;
        if (typeof controllerOrText === 'string') {
            controller = new BaseBotController(this.appContext as AppContext);
            controller.text = controllerOrText;
        } else {
            controller = controllerOrText;
        }
        if (!controller.userId) {
            controller.userId = userId;
        }
        return this.getContent(controller);
    }

    /**
     * Устанавливает время начала обработки запроса.
     * Используется для измерения времени обработки запроса
     */
    #initProcessingTime(controller: BotController): void {
        controller.platformOptions.timeStart = Date.now();
    }

    /**
     * Устанавливает время начала обработки запроса.
     * Используется для измерения времени выполнения
     */
    public updateTimeStart(controller: BotController): void {
        this.#initProcessingTime(controller);
    }

    /**
     * Получает время выполнения запроса в миллисекундах
     * @returns {number} Время выполнения запроса
     */
    public getProcessingTime(controller: BotController): number {
        return Date.now() - (controller.platformOptions.timeStart as number);
    }

    /**
     * При превышении установленного времени исполнения, пишет информацию в лог
     * После вызова getContent() автоматически проверяется время выполнения.
     * Если оно превышает 2000 мс — пишется warning, если >2900 мс — ошибка.
     */
    protected _timeLimitLog(controller: BotController): void {
        const timeEnd: number = this.getProcessingTime(controller);
        if (timeEnd >= this.MAX_TIME_REQUEST) {
            controller.platformOptions.error = `${this.constructor.name}:getContent(): Превышено ограничение на отправку ответа. Время ответа составило: ${timeEnd / 1000} сек.`;
        } else if (timeEnd >= this.WARMING_TIME_REQUEST) {
            this.appContext?.logWarn(
                `${this.constructor.name}:getContent(): Время ответа составило: ${timeEnd / 1000} сек, рекомендуется проверить нагрузку на сервер, либо корректность работы самого навыка.`,
            );
        }
    }

    /**
     * Дополнительная обработка для звуков.
     * В данном методе стоит реализовать логику, с помощью которой будут наложены дополнительные эффекты для озвучивания текста пользователю
     * @param _controller
     */
    soundProcessing(_controller: BotController): void {
        // custom logic
    }

    /**
     * Инициализирует TTS (Text-to-Speech) в контроллере.
     * Обрабатывает звуки и стандартные звуковые эффекты
     * @param controller Тип приложения
     * @protected
     */
    protected async _initTTS(controller: BotController): Promise<void> {
        if (controller.sound.sounds.length || controller.sound.isUsedStandardSound) {
            controller.tts ??= controller.text;
            return this.soundProcessing(controller);
        }
    }

    /**
     * Указывает, поддерживает ли платформа локальное хранилище.
     *
     * @param _controller - контроллер приложения
     * @returns `true`, если локальное хранилище доступно
     */
    isLocalStorage(_controller: BotController): boolean {
        return false;
    }

    /**
     * Получает данные из локального хранилища платформы.
     *
     * @param _controller - контроллер приложения
     * @returns данные, сохранённые ранее
     */
    getLocalStorage<TStorageResult = unknown>(
        _controller: BotController,
    ): TStorageResult | Promise<TStorageResult> {
        return null as TStorageResult;
    }

    /**
     * Сохраняет данные в локальное хранилище платформы.
     *
     * @param _data - данные для сохранения
     * @param _controller - контроллер приложения
     */
    setLocalStorage<TStorageData>(_data: TStorageData, _controller: BotController): void {
        /* TODO document why this method 'setLocalStorage' is empty */
    }

    /**
     * Флаг, указывающий, что платформа голосовая (например, Алиса, Маруся).
     */
    static isVoice(): boolean {
        return true;
    }
}
