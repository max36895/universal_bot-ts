import {BotController} from "../../controller/BotController";

/**
 * Class TemplateTypeModel
 * @package bot\core\types
 *
 * Абстрактный класс, который унаследуют все классы, отвечающие за инициализацию параметров, и обработку запросов пользователя.
 */
export abstract class TemplateTypeModel {
    /**
     * Строка с ошибками, произошедшими при работе приложения.
     * @var string error
     */
    protected error: string;
    /**
     * Время начала работы приложения.
     * @var number timeStart
     */
    protected timeStart: number;
    /**
     * Класс с логикой приложения.
     * @var BotController controller
     */
    protected controller: BotController;
    /**
     * Использование локального хранилища как БД.
     * @var boolean isUsedLocalStorage
     */
    public isUsedLocalStorage: boolean;
    /**
     * Отправка запроса сразу после инициализации. Если не null, то никакие команды пользователя не обрабатываются.
     * @var any sendInInit
     */
    public sendInInit: any;

    constructor() {
        this.controller = null;
        this.error = null;
        this._initProcessingTime();
        this.isUsedLocalStorage = false;
        this.sendInInit = null;
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
        return Date.now() - this.timeStart;
    }

    /**
     * Получение текста с ошибкой при выполнении программы.
     *
     * @return string
     * @api
     */
    public getError(): string {
        return this.error;
    }

    /**
     * Инициализация основных параметров и компонентов контроллера.
     *
     * @param {any} content Запрос пользователя. В основном json строка.
     * @param {BotController} controller Ссылка на класс с логикой навык/бота.
     * @return boolean
     */
    public abstract init(content: any, controller: BotController): boolean;

    /**
     * Отправка ответа пользователю.
     *
     * @return string
     */
    public abstract getContext(): any;

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
     * Возвращает данные из хранилища.
     *
     * @return object | string
     * @api
     */
    public getLocalStorage(): object | string {
        return null;
    }
}
