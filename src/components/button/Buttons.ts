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
     * Константа для создания кнопки в виде ссылки (сайджест).
     */
    public static readonly B_LINK: boolean = false;

    /**
     * Константа для создания кнопки в виде интерактивной кнопки.
     */
    public static readonly B_BTN: boolean = true;
    /**
     * Массив объектов Button, представляющих все кнопки в коллекции.
     * @see Button
     */
    public buttons: IButtonType[];

    /**
     * Контекст приложения.
     */
    #appContext: AppContext;

    /**
     * Создает новый экземпляр коллекции кнопок.
     * Инициализирует все массивы и устанавливает тип кнопок по умолчанию для Алисы.
     * @param appContext Контекст приложения.
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
     * @param appContext
     */
    public setAppContext(appContext: AppContext): this {
        this.#appContext = appContext;
        return this;
    }

    /**
     * Очищает массив кнопок.
     * @returns {void}
     */
    public clear(): void {
        this.buttons = [];
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
     * @param {string} title - Текст кнопки
     * @param {string} [url=''] - URL для перехода
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
     * buttons.addBtn('Перейти', 'https://example.com', { action: 'navigate' });
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
     * @param {string} title - Текст кнопки
     * @param {string} [url=''] - URL для перехода
     * @param {TButtonPayload} [payload=''] - Дополнительные данные
     * @param {IButtonOptions} [options={}] - Дополнительные параметры
     * @returns {Buttons}
     *
     * @example
     * ```ts
     * // Простая ссылка
     * buttons.addLink('Перейти на сайт', 'https://example.com');
     *
     * // Ссылка с payload
     * buttons.addLink('Документация', 'https://docs.example.com', { section: 'api' });
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
     * Возвращает массив кнопок, адаптированный для указанной платформы.
     *
     * @param buttonProcessing
     */
    public getButtons<T = unknown, TType = Record<string, unknown> | string | null>(
        buttonProcessing: TButtonProcessing<T | null, TType>,
    ): T | null {
        return buttonProcessing(this.buttons as IButtonType<TType>[]);
    }

    /**
     * Возвращает JSON-представление кнопок для указанной платформы.
     *
     * @param buttonProcessing - Тип кнопок (платформа)
     */
    public getButtonJson<T = unknown, TType = Record<string, unknown> | string | null>(
        buttonProcessing: TButtonProcessing<T | null, TType>,
    ): string | null {
        const btn: object[] | null = this.getButtons(buttonProcessing) as object[] | null;
        if (btn?.length) {
            return JSON.stringify(btn);
        }
        return null;
    }
}
