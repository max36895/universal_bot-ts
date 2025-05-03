import { TemplateButtonTypes } from './TemplateButtonTypes';
import { IAlisaButton, IAlisaButtonCard } from '../../../platforms/interfaces';
import { Text } from '../../../utils/standard/Text';
import { Button } from '../Button';

/**
 * @class AlisaButton
 * Класс для работы с кнопками в навыке Алисы
 *
 * Предоставляет функциональность для создания и отображения кнопок в интерфейсе Алисы:
 * - Поддержка обычных кнопок и кнопок для карточек
 * - Автоматическое ограничение длины текста (до 64 символов) и URL (до 1024 символов)
 * - Поддержка payload для передачи данных
 * - Возможность скрытия кнопок
 *
 * @extends {TemplateButtonTypes}
 *
 * @example
 * ```typescript
 * const alisaButton = new AlisaButton();
 *
 * // Создание обычных кнопок (возвращает массив IAlisaButton[])
 * alisaButton.isCard = false;
 * alisaButton.buttons = [
 *     // Создание кнопки-ссылки (сайджест)
 *     new Button('Перейти на сайт', 'https://example.com/1'),
 *     // Создание интерактивной кнопки
 *     new Button('Нажми меня', '', { action: 'action1' })
 * ];
 * const buttons = alisaButton.getButtons();
 * // buttons: [
 * //   {
 * //     title: 'Перейти на сайт',
 * //     url: 'https://example.com/1',
 * //     hide: false // сайджест-кнопка
 * //   },
 * //   {
 * //     title: 'Нажми меня',
 * //     payload: { action: 'action1' },
 * //     hide: true // интерактивная кнопка
 * //   }
 * // ]
 *
 * // Создание кнопки для карточки (возвращает один объект IAlisaButtonCard)
 * alisaButton.isCard = true;
 * alisaButton.buttons = [
 *     new Button('Подробнее', 'https://example.com/details', { action: 'details' })
 * ];
 * const cardButton = alisaButton.getButtons();
 * // cardButton: {
 * //   text: 'Подробнее',
 * //   url: 'https://example.com/details',
 * //   payload: { action: 'details' }
 * // }
 * ```
 */
export class AlisaButton extends TemplateButtonTypes {
    /**
     * Флаг использования кнопок для карточки
     * - true: возвращает одну кнопку для карточки (IAlisaButtonCard)
     * - false: возвращает массив обычных кнопок (IAlisaButton[])
     * @defaultValue false
     *
     * @example
     * ```typescript
     * const alisaButton = new AlisaButton();
     *
     * // Режим обычных кнопок (массив)
     * alisaButton.isCard = false;
     * const buttons = alisaButton.getButtons();
     * // buttons: IAlisaButton[]
     *
     * // Режим кнопки карточки (один объект)
     * alisaButton.isCard = true;
     * const cardButton = alisaButton.getButtons();
     * // cardButton: IAlisaButtonCard
     * ```
     */
    public isCard: boolean;

    /**
     * Конструктор класса
     *
     * Инициализирует экземпляр класса с отключенным режимом карточки
     */
    public constructor() {
        super();
        this.isCard = false;
    }

    /**
     * Создание кнопки в формате Алисы
     *
     * @private
     * @param {Button} button - Исходная кнопка для преобразования
     * @returns {IAlisaButtonCard | IAlisaButton | null} - Кнопка в формате Алисы или null, если кнопка невалидна
     *
     * Формат кнопок:
     * - Обычные кнопки (IAlisaButton):
     *   - title: Текст кнопки (до 64 символов)
     *   - url: Ссылка для перехода (до 1024 символов)
     *   - payload: Произвольные данные для обработки нажатия
     *   - hide: Тип кнопки (false - сайджест, true - интерактивная)
     *
     * - Кнопка карточки (IAlisaButtonCard):
     *   - text: Текст кнопки (до 64 символов)
     *   - url: Ссылка для перехода (до 1024 символов)
     *   - payload: Произвольные данные для обработки нажатия
     *
     * @example
     * ```typescript
     * const button = new Button();
     * button.initBtn('Тест', 'https://example.com', { action: 'test' });
     * const alisaButton = new AlisaButton();
     *
     * // Создание обычной кнопки
     * const result = alisaButton['_getButton'](button);
     * // result: {
     * //   title: 'Тест',
     * //   url: 'https://example.com',
     * //   payload: { action: 'test' },
     * //   hide: true // интерактивная кнопка
     * // }
     *
     * // Создание кнопки для карточки
     * alisaButton.isCard = true;
     * const cardResult = alisaButton['_getButton'](button);
     * // cardResult: {
     * //   text: 'Тест',
     * //   url: 'https://example.com',
     * //   payload: { action: 'test' }
     * // }
     * ```
     */
    protected _getButton(button: Button): IAlisaButtonCard | IAlisaButton | null {
        const title = Text.resize(button.title || '', 64);
        if (title) {
            let object: IAlisaButtonCard | IAlisaButton;
            if (this.isCard) {
                object = <IAlisaButtonCard>{
                    text: title,
                };
            } else {
                object = <IAlisaButton>{
                    title,
                    hide: button.hide,
                };
            }
            if (button.payload) {
                object.payload = button.payload;
            }
            if (button.url) {
                object.url = Text.resize(button.url, 1024);
            }
            return object;
        }
        return null;
    }

    /**
     * Получение кнопок в формате Алисы
     *
     * @returns {IAlisaButton[] | IAlisaButtonCard | null} - Массив обычных кнопок или одна кнопка для карточки
     *
     * Формат возвращаемых данных зависит от значения isCard:
     * - isCard = false: возвращает массив обычных кнопок (IAlisaButton[])
     * - isCard = true: возвращает одну кнопку для карточки (IAlisaButtonCard)
     *
     * @example
     * ```typescript
     * const alisaButton = new AlisaButton();
     *
     * // Получение обычных кнопок (массив)
     * alisaButton.isCard = false;
     * alisaButton.buttons = [
     *     // Создание кнопки-ссылки (сайджест)
     *     new Button('Перейти на сайт', 'https://example.com/1'),
     *     // Создание интерактивной кнопки
     *     new Button('Нажми меня', '', { action: 'action1' })
     * ];
     * const buttons = alisaButton.getButtons();
     * // buttons: [
     * //   {
     * //     title: 'Перейти на сайт',
     * //     url: 'https://example.com/1',
     * //     hide: false // сайджест-кнопка
     * //   },
     * //   {
     * //     title: 'Нажми меня',
     * //     payload: { action: 'action1' },
     * //     hide: true // интерактивная кнопка
     * //   }
     * // ]
     *
     * // Получение кнопки для карточки (один объект)
     * alisaButton.isCard = true;
     * alisaButton.buttons = [
     *     new Button('Подробнее', 'https://example.com/details', { action: 'details' })
     * ];
     * const cardButton = alisaButton.getButtons();
     * // cardButton: {
     * //   text: 'Подробнее',
     * //   url: 'https://example.com/details',
     * //   payload: { action: 'details' }
     * // }
     * ```
     */
    public getButtons(): IAlisaButton[] | IAlisaButtonCard | null {
        const objects: IAlisaButton[] = [];
        if (this.isCard) {
            if (this.buttons.length) {
                return this._getButton(this.buttons[0]);
            }
        } else {
            this.buttons.forEach((button) => {
                const object: IAlisaButton | null = this._getButton(button);
                if (object) {
                    objects.push(object);
                }
            });
        }
        return objects;
    }
}
