import { TemplateButtonTypes } from './TemplateButtonTypes';
import { IVkButton, IVkButtonObject } from '../interfaces';
import { Button } from '../Button';

/**
 * @class VkButton
 * Класс для работы с кнопками в ВКонтакте
 *
 * Предоставляет функциональность для создания и отображения кнопок в ВКонтакте:
 * - Поддержка различных типов кнопок (текст, ссылка, оплата)
 * - Группировка кнопок по группам
 * - Настройка цветов кнопок
 * - Поддержка payload для передачи данных
 * - Возможность скрытия кнопок
 *
 * @extends {TemplateButtonTypes}
 *
 * @example
 * ```typescript
 * const vkButton = new VkButton();
 *
 * // Создание текстовой кнопки
 * const textButton = new Button();
 * textButton.initBtn('Текстовая кнопка', '', null, { color: 'primary' });
 * vkButton.buttons = [textButton];
 * const textResult = vkButton.getButtons();
 * // textResult: {
 * //   one_time: true,
 * //   buttons: [{
 * //     action: { type: 'text', label: 'Текстовая кнопка' },
 * //     color: 'primary'
 * //   }]
 * // }
 *
 * // Создание кнопки-ссылки
 * const linkButton = new Button();
 * linkButton.initLink('Открыть сайт', 'https://example.com');
 * vkButton.buttons = [linkButton];
 * const linkResult = vkButton.getButtons();
 * // linkResult: {
 * //   one_time: true,
 * //   buttons: [{
 * //     action: { type: 'link', label: 'Открыть сайт', link: 'https://example.com' }
 * //   }]
 * // }
 * ```
 */
export class VkButton extends TemplateButtonTypes {
    /**
     * Ключ для группировки кнопок
     *
     * @readonly
     *
     * @example
     * ```typescript
     * const vkButton = new VkButton();
     *
     * // Группировка кнопок
     * const button1 = new Button();
     * button1.initBtn('Кнопка 1', '', null, { [VkButton.GROUP_NAME]: '0' });
     *
     * const button2 = new Button();
     * button2.initBtn('Кнопка 2', '', null, { [VkButton.GROUP_NAME]: '0' });
     *
     * const button3 = new Button();
     * button3.initBtn('Кнопка 3', '', null, { [VkButton.GROUP_NAME]: '1' });
     *
     * vkButton.buttons = [button1, button2, button3];
     * const result = vkButton.getButtons();
     * // result: {
     * //   one_time: true,
     * //   buttons: [
     * //     [{ action: { type: 'text', label: 'Кнопка 1' } },
     * //      { action: { type: 'text', label: 'Кнопка 2' } }],
     * //     [{ action: { type: 'text', label: 'Кнопка 3' } }]
     * //   ]
     * // }
     * ```
     */
    public static readonly GROUP_NAME = '_group';

    /**
     * Получение кнопок в формате ВКонтакте
     *
     * @returns {IVkButtonObject} - Объект с кнопками в формате ВКонтакте:
     *                              - one_time: флаг одноразовой клавиатуры
     *                              - buttons: массив кнопок или групп кнопок
     *
     * Поддерживаемые типы кнопок:
     * - text: Текстовая кнопка
     * - link: Кнопка-ссылка
     * - pay: Кнопка оплаты
     *
     * Поддерживаемые цвета кнопок:
     * - primary: Основной цвет
     * - secondary: Вторичный цвет
     * - negative: Отрицательный цвет
     * - positive: Положительный цвет
     *
     * @example
     * ```typescript
     * const vkButton = new VkButton();
     *
     * // Создание кнопки оплаты
     * const payButton = new Button();
     * payButton.initBtn('Оплатить', '', null, {
     *     type: Button.VK_TYPE_PAY,
     *     hash: 'payment_hash'
     * });
     * vkButton.buttons = [payButton];
     * const payResult = vkButton.getButtons();
     * // payResult: {
     * //   one_time: true,
     * //   buttons: [{
     * //     action: { type: 'pay', label: 'Оплатить' },
     * //     hash: 'payment_hash'
     * //   }]
     * // }
     *
     * // Создание кнопок с разными цветами
     * const confirmButton = new Button();
     * confirmButton.initBtn('Подтвердить', '', null, { color: 'positive' });
     *
     * const cancelButton = new Button();
     * cancelButton.initBtn('Отменить', '', null, { color: 'negative' });
     *
     * vkButton.buttons = [confirmButton, cancelButton];
     * const colorResult = vkButton.getButtons();
     * // colorResult: {
     * //   one_time: true,
     * //   buttons: [
     * //     { action: { type: 'text', label: 'Подтвердить' }, color: 'positive' },
     * //     { action: { type: 'text', label: 'Отменить' }, color: 'negative' }
     * //   ]
     * // }
     * ```
     */
    public getButtons(): IVkButtonObject {
        const groups: number[] = [];
        const buttons: IVkButton[] | IVkButton[][] = [];
        let index = 0;
        this.buttons.forEach((button) => {
            if (button.type === null) {
                if (button.hide === Button.B_LINK) {
                    button.type = Button.VK_TYPE_LINK;
                } else {
                    button.type = Button.VK_TYPE_TEXT;
                }
            }
            let object: IVkButton = {
                action: {
                    type: button.type,
                },
            };
            if (button.url) {
                object.action.type = Button.VK_TYPE_LINK;
                object.action.link = button.url;
            }
            object.action.label = button.title;
            if (button.payload) {
                if (typeof button.payload === 'string') {
                    object.action.payload = button.payload;
                } else {
                    object.action.payload = { ...button.payload };
                }
            }

            if (typeof button.payload.color !== 'undefined' && !button.url) {
                object.color = button.payload.color;
            }
            if (button.type === Button.VK_TYPE_PAY) {
                object.hash = button.payload.hash || null;
            }
            object = { ...object, ...button.options };
            const groupOptions = button.options[VkButton.GROUP_NAME];
            if (typeof groupOptions !== 'undefined') {
                if (typeof object[VkButton.GROUP_NAME] !== 'undefined') {
                    delete object[VkButton.GROUP_NAME];
                }
                if (typeof groups[+groupOptions] !== 'undefined') {
                    (<IVkButton[]>buttons[groups[+groupOptions]]).push(object);
                } else {
                    groups[+groupOptions] = index;
                    buttons[index] = [object];
                    index++;
                }
            } else {
                buttons[index] = object;
                index++;
            }
            if (object.action.payload && typeof object.action.payload !== 'string') {
                object.action.payload = JSON.stringify(object.action.payload);
            }
        });

        return {
            one_time: !!buttons.length,
            buttons: buttons,
        };
    }
}
