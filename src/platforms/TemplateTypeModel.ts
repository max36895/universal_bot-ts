import { BotController } from '../controller';

/**
 * Абстрактный базовый класс для работы с платформами
 * Определяет общий интерфейс для инициализации и обработки запросов пользователя
 * @abstract
 * @class TemplateTypeModel
 */
export abstract class TemplateTypeModel {
    /**
     * Текст ошибки, возникшей при работе приложения
     * @protected
     */
    protected error: string | null;

    /**
     * Время начала обработки запроса в миллисекундах
     * @protected
     */
    protected timeStart: number | null;

    /**
     * Контроллер с логикой приложения
     * @protected
     */
    protected controller: BotController;

    /**
     * Флаг использования локального хранилища вместо БД
     * Используются стандартные механизмы хранения данных платформы
     * @public
     */
    public isUsedLocalStorage: boolean;

    /**
     * Данные для немедленной отправки после инициализации
     * Если не null, команды пользователя не обрабатываются
     * Используется для проверки работоспособности приложения
     * @public
     */
    public sendInInit: any;

    /**
     * Создает экземпляр класса
     * Инициализирует базовые параметры и время начала обработки
     */
    constructor() {
        this.controller = {} as BotController;
        this.error = null;
        this._initProcessingTime();
        this.isUsedLocalStorage = false;
        this.sendInInit = null;
        this.timeStart = null;
    }

    /**
     * Инициализирует TTS (Text-to-Speech) в контроллере
     * Обрабатывает звуки и стандартные звуковые эффекты
     * @protected
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
     * Устанавливает время начала обработки запроса
     * Используется для измерения времени выполнения
     * @private
     */
    private _initProcessingTime(): void {
        this.timeStart = Date.now();
    }

    /**
     * Получает время выполнения запроса в миллисекундах
     * @returns {number} Время выполнения запроса
     */
    public getProcessingTime(): number {
        return Date.now() - (this.timeStart as number);
    }

    /**
     * Получает текст ошибки, возникшей при выполнении программы
     * @returns {string | null} Текст ошибки или null
     */
    public getError(): string | null {
        return this.error;
    }

    /**
     * Инициализирует основные параметры для работы с запросом
     * @param query Запрос пользователя
     * @param controller Контроллер с логикой приложения
     * @returns {Promise<boolean>} true при успешной инициализации, false при ошибке
     * @abstract
     */
    public abstract init(query: any, controller: BotController<any>): Promise<boolean>;

    /**
     * Формирует ответ для отправки пользователю
     * @returns {Promise<object | string>} Ответ в формате платформы
     * @abstract
     */
    public abstract getContext(): Promise<object | string>;

    /**
     * Формирует ответ для оценки приложения
     * По умолчанию вызывает getContext()
     * @returns {Promise<object | string>} Ответ в формате платформы
     */
    public getRatingContext(): Promise<object | string> {
        return this.getContext();
    }

    /**
     * Проверяет доступность локального хранилища
     * @returns {boolean} true если хранилище доступно и используется
     */
    public isLocalStorage(): boolean {
        return false;
    }

    /**
     * Получает данные из локального хранилища
     * @returns {Promise<object | string | null>} Данные из хранилища или null
     */
    public getLocalStorage(): Promise<object | string | null> {
        return Promise.resolve(null);
    }

    /**
     * Сохраняет данные в локальное хранилище
     * @param data Данные для сохранения
     */
    public async setLocalStorage(data: any): Promise<void> {}
}
