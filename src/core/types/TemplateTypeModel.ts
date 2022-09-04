import {BotController} from "../../controller/BotController";

/**
 * @class TemplateTypeModel
 *
 * Абстрактный класс, который унаследуют все классы, отвечающие за инициализацию параметров, и обработку запросов пользователя.
 */
export abstract class TemplateTypeModel {
    /**
     * Строка с ошибками, произошедшими при работе приложения.
     */
    protected error: string | null;
    /**
     * Время начала работы приложения.
     */
    protected timeStart: number | null;
    /**
     * Класс с логикой приложения.
     */
    protected controller: BotController;
    /**
     * Использование локального хранилища как БД.
     */
    public isUsedLocalStorage: boolean;
    /**
     * Отправка запроса сразу после инициализации. Если не null, то никакие команды пользователя не обрабатываются.
     */
    public sendInInit: any;

    constructor() {
        // @ts-ignore
        this.controller = null;
        this.error = null;
        this._initProcessingTime();
        this.isUsedLocalStorage = false;
        this.sendInInit = null;
        this.timeStart = null;
    }

    /**
     * Устанавливает в контроллер значение для tts
     * @private
     */
    protected async _initTTS(): Promise<void> {
        if (this.controller.sound.sounds.length || this.controller.sound.isUsedStandardSound) {
            if (this.controller.tts === null) {
                this.controller.tts = this.controller.text;
            }
            this.controller.tts = await this.controller.sound.getSounds(this.controller.tts);
        }
    }

    /**
     * Установка начального времени.
     * Необходимо для определения времени выполнения программы.
     */
    private _initProcessingTime(): void {
        this.timeStart = Date.now();
    }

    /**
     * Получить время выполнения программы.
     *
     * @return number
     * @api
     */
    public getProcessingTime(): number {
        return Date.now() - (this.timeStart as number);
    }

    /**
     * Получение текста с ошибкой при выполнении программы.
     *
     * @return string
     * @api
     */
    public getError(): string | null {
        return this.error;
    }

    /**
     * Инициализация основных параметров. В случае успешной инициализации, вернет true, иначе false.
     *
     * @param {Object} query Запрос пользователя.
     * @param {BotController} controller Ссылка на класс с логикой навык/бота.
     * @return Promise<boolean>
     * @api
     */
    public abstract init(query: any, controller: BotController): Promise<boolean>;

    /**
     * Получение ответа, который отправится пользователю. В случае с Алисой, Марусей и Сбер, возвращается json. С остальными типами, ответ отправляется непосредственно на сервер.
     *
     * @return {Promise<Object|string>}
     */
    public abstract getContext(): Promise<Object | string>;

    /**
     * Отправка ответа для выставления оценки приложения. Актуально для Сбер. Для остальных приложений вызовется getContext()
     *
     * @return {Promise<Object|string>}
     */
    public getRatingContext(): Promise<Object | string> {
        return this.getContext();
    }

    /**
     * Доступно ли использование локального хранилища.
     * Если доступно, и используется опция для сохранения данных в хранилище,
     * тогда пользовательские данные не будут сохраняться в БД.
     *
     * @return boolean
     * @api
     */
    public isLocalStorage(): boolean {
        return false;
    }

    /**
     * Возвращаем данные из хранилища.
     *
     * @return Promise<object | string>
     * @api
     */
    public getLocalStorage(): Promise<object | string | null> {
        return Promise.resolve(null);
    }

    /**
     * Сохранение данных в хранилище.
     *
     * @param data сохраняемые данные
     * @return Promise<void>
     * @api
     */
    public async setLocalStorage(data: any): Promise<void> {
    }
}
