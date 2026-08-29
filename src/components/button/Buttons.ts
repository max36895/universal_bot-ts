import { IButtonType, getButton, getLinkButton } from './Button';
import { IButtonOptions } from './interfaces/IButton';
import { AppContext, TButtonProcessing } from '../../core';

/**
 * Дополнительные данные для кнопки
 */
export type TButtonPayload = Record<string, unknown> | string;

/**
 * @class Buttons
 * Класс для управления коллекцией кнопок и их отображением на различных платформах.
 *
 * Класс предоставляет функциональность для:
 * - Создания и управления коллекцией кнопок
 * - Адаптации кнопок под различные платформы
 * - Поддержки различных типов кнопок (интерактивные, ссылки)
 */
export class Buttons {
    /**
     * Значение флага `hide` для кнопки-ссылки (саджеста): `false`.
     */
    public static readonly B_LINK: boolean = false;

    /**
     * Значение флага `hide` для интерактивной кнопки: `true`.
     */
    public static readonly B_BTN: boolean = true;
    /**
     * Массив объектов IButtonType, представляющих все кнопки в коллекции.
     * @see IButtonType
     */
    public buttons: IButtonType[];

    /**
     * Контекст приложения
     */
    #appContext: AppContext;

    /**
     * Признак того, что разработчик явно попросил убрать клавиатуру.
     */
    #isRemove: boolean = false;

    /**
     * Создает новый экземпляр коллекции кнопок: инициализирует пустой массив
     * кнопок и сохраняет контекст приложения.
     * @param appContext Контекст приложения
     * ⚠️ Обычно НЕ создаётся вручную — автоматически передаётся через контроллер:
     * ```ts
     * // Правильно — через контроллер:
     * this.buttons.addBtn('caption');
     *
     * // НЕ рекомендуется — ручное создание:
     * new Buttons(this.appContext); // appContext берётся из контроллера
     * ```
     */
    public constructor(appContext: AppContext) {
        this.buttons = [];
        this.#appContext = appContext;
    }

    /**
     * Устанавливает контекст приложения.
     * @param {AppContext} appContext - Контекст приложения
     * @returns {this} Текущий экземпляр для цепочки вызовов
     */
    public setAppContext(appContext: AppContext): this {
        this.#appContext = appContext;
        return this;
    }

    /**
     * Очищает массив кнопок.
     *
     * Это именно «начать список заново», а не «убрать клавиатуру у пользователя»:
     * пустой список кнопок платформе не отправляется. Чтобы снять уже показанную
     * клавиатуру, используйте {@link remove}.
     * @returns {void}
     */
    public clear(): void {
        this.buttons = [];
        this.#isRemove = false;
    }

    /**
     * Просит платформу убрать ранее показанную клавиатуру.
     *
     * Нужен только там, где клавиатура «прилипает» к диалогу и живёт до следующего
     * явного изменения — это Telegram (reply-клавиатура) и ВКонтакте. У Viber, MAX,
     * Алисы, Маруси и SmartApp клавиатура привязана к конкретному сообщению или ответу
     * и исчезает сама, поэтому там вызов ничего не меняет и безопасен.
     *
     * Без этого метода снять клавиатуру было нельзя вообще: пустой список кнопок
     * платформе не отправляется, поэтому старая клавиатура висела у пользователя вечно.
     *
     * @returns {Buttons}
     *
     * @example
     * ```ts
     * // Диалог закончился — убираем клавиатуру
     * ctx.buttons.remove();
     * ctx.text = 'Спасибо, заказ оформлен!';
     * ```
     */
    public remove(): this {
        this.buttons = [];
        this.#isRemove = true;
        return this;
    }

    /**
     * Признак того, что клавиатуру нужно убрать (см. {@link remove}).
     */
    public get isRemove(): boolean {
        return this.#isRemove;
    }

    /**
     * Добавляет кнопку в коллекцию.
     *
     * @param {string | null} title - Текст кнопки
     * @param {string | null} url - URL для перехода
     * @param {TButtonPayload} payload - Дополнительные данные
     * @param {boolean} hide - Тип отображения кнопки
     * @param {IButtonOptions} options - Дополнительные параметры
     * @returns {Buttons}
     */
    #add(
        title: string | null,
        url: string | null,
        payload: TButtonPayload,
        hide: boolean = false,
        options: IButtonOptions = {},
    ): this {
        // Добавили кнопку — значит клавиатуру показываем, а не убираем.
        this.#isRemove = false;
        const button =
            hide === Buttons.B_LINK
                ? getLinkButton(this.#appContext, title, url, payload, options)
                : getButton(this.#appContext, title, url, payload, options);
        if (button) {
            this.buttons.push(button);
        }
        return this;
    }

    /**
     * Добавляет интерактивную кнопку в коллекцию.
     *
     * @param {string | null} title - Текст кнопки
     * @param {string | null} [url=''] - URL для перехода
     * @param {TButtonPayload} [payload=''] - Дополнительные данные
     * @param {IButtonOptions} [options={}] - Дополнительные параметры
     * @returns {Buttons}
     *
     * @example
     * ```ts
     * // Простая кнопка
     * buttons.addBtn('Нажми меня');
     *
     * // Кнопка с URL и payload
     * buttons.addBtn('Перейти', 'http://localhost', { action: 'navigate' });
     * ```
     */
    public addBtn(
        title: string | null,
        url: string | null = '',
        payload: TButtonPayload = '',
        options: IButtonOptions = {},
    ): this {
        return this.#add(title, url, payload, Buttons.B_BTN, options);
    }

    /**
     * Добавляет кнопку-ссылку в коллекцию.
     *
     * @param {string | null} title - Текст кнопки
     * @param {string | null} [url=''] - URL для перехода
     * @param {TButtonPayload} [payload=''] - Дополнительные данные
     * @param {IButtonOptions} [options={}] - Дополнительные параметры
     * @returns {Buttons}
     *
     * @example
     * ```ts
     * // Простая ссылка
     * buttons.addLink('Перейти на сайт', 'http://localhost');
     *
     * // Ссылка с payload
     * buttons.addLink('Документация', 'http://localhost', { section: 'api' });
     * ```
     */
    public addLink(
        title: string | null,
        url: string = '',
        payload: TButtonPayload = '',
        options: IButtonOptions = {},
    ): this {
        return this.#add(title, url, payload, Buttons.B_LINK, options);
    }

    /**
     * Возвращает кнопки в формате указанной платформы.
     *
     * Метод сам не преобразует кнопки: он передаёт массив во внешнюю функцию
     * `buttonProcessing` (её предоставляет адаптер платформы) и возвращает её результат.
     *
     * @param {TButtonProcessing<T | null, TType>} buttonProcessing - Функция обработки кнопок для платформы
     * @returns {T | null} Результат функции обработки (формат зависит от платформы) или null
     */
    public getButtons<T = unknown, TType = Record<string, unknown> | string | null>(
        buttonProcessing: TButtonProcessing<T | null, TType>,
    ): T | null {
        return buttonProcessing(this.buttons as IButtonType<TType>[]);
    }

    /**
     * Возвращает JSON-представление кнопок для указанной платформы.
     *
     * @param {TButtonProcessing} buttonProcessing - Функция обработки кнопок для платформы
     * @returns {string | null} JSON-строка кнопок или null если кнопок нет
     */
    public getButtonJson<T = unknown, TType = Record<string, unknown> | string | null>(
        buttonProcessing: TButtonProcessing<T | null, TType>,
    ): string | null {
        const btn = this.getButtons(buttonProcessing);
        if (btn != null) {
            return JSON.stringify(btn);
        }
        return null;
    }
}
