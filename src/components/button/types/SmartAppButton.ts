import { TemplateButtonTypes } from './TemplateButtonTypes';
import { Text } from '../../../utils/standard/Text';
import {
    ISberSmartAppCardAction,
    ISberSmartAppSuggestionButton,
} from '../../../platforms/interfaces';

/**
 * @class SmartAppButton
 * Класс для работы с кнопками в Сбер SmartApp
 *
 * Предоставляет функциональность для создания и отображения кнопок в Сбер SmartApp:
 * - Поддержка различных типов кнопок (текст, deep link, server action)
 * - Автоматическое ограничение длины текста кнопок (до 64 символов)
 * - Поддержка payload для передачи данных
 * - Возможность использования кнопок в карточках
 *
 * @extends {TemplateButtonTypes}
 *
 * @example
 * ```typescript
 * const smartAppButton = new SmartAppButton();
 *
 * // Создание текстовой кнопки
 * smartAppButton.buttons = [
 *     new Button('Ответить', null, {
 *         payload: 'custom_payload'
 *     })
 * ];
 * const textResult = smartAppButton.getButtons();
 * // textResult: [{
 * //   title: 'Ответить',
 * //   action: {
 * //     type: 'server_action',
 * //     server_action: 'custom_payload'
 * //   }
 * // }]
 *
 * // Создание кнопки-ссылки
 * smartAppButton.buttons = [
 *     new Button('Открыть сайт', 'https://example.com', { action: 'link' })
 * ];
 * const linkResult = smartAppButton.getButtons();
 * // linkResult: [{
 * //   title: 'Открыть сайт',
 * //   action: {
 * //     type: 'text',
 * //     text: 'Открыть сайт'
 * //   }
 * // }]
 * ```
 */
export class SmartAppButton extends TemplateButtonTypes {
    /**
     * Флаг использования кнопок в карточке
     *
     *                              - true: кнопки для карточки (один из типов: text, deep_link)
     *                              - false: кнопки-подсказки (массив кнопок с действиями)
     *
     * @defaultValue false
     *
     * @example
     * ```typescript
     * const smartAppButton = new SmartAppButton();
     *
     * // Создание кнопки для карточки
     * smartAppButton.isCard = true;
     * smartAppButton.buttons = [
     *     new Button('Открыть сайт', 'https://example.com')
     * ];
     * const cardResult = smartAppButton.getButtons();
     * // cardResult: {
     * //   type: 'deep_link',
     * //   deep_link: 'https://example.com'
     * // }
     *
     * // Создание текстовой кнопки для карточки
     * smartAppButton.isCard = true;
     * smartAppButton.buttons = [
     *     new Button('Подтвердить')
     * ];
     * const textCardResult = smartAppButton.getButtons();
     * // textCardResult: {
     * //   type: 'text',
     * //   text: 'Подтвердить'
     * // }
     * ```
     */
    public isCard: boolean;

    /**
     * Конструктор класса SmartAppButton
     *
     * Инициализирует экземпляр класса с отключенным режимом карточки
     *
     * @example
     * ```typescript
     * const smartAppButton = new SmartAppButton();
     * console.log(smartAppButton.isCard); // false
     * ```
     */
    public constructor() {
        super();
        this.isCard = false;
    }

    /**
     * Получение кнопок в формате Сбер SmartApp
     *
     * @returns {ISberSmartAppSuggestionButton[] | ISberSmartAppCardAction} - Объект с кнопками:
     *                                                                        - Для обычных кнопок: массив кнопок-подсказок
     *                                                                        - Для карточки: одна кнопка (text или deep_link)
     *
     * Поддерживаемые типы кнопок:
     * - text: Текстовая кнопка
     * - deep_link: Кнопка-ссылка
     * - server_action: Кнопка с серверным действием
     *
     * Правила формирования кнопок:
     * - Текст кнопки автоматически обрезается до 64 символов
     * - Для карточки поддерживается только одна кнопка
     * - При наличии payload создается кнопка типа server_action
     * - При наличии URL создается кнопка типа deep_link
     *
     * @example
     * ```typescript
     * const smartAppButton = new SmartAppButton();
     *
     * // Создание кнопок-подсказок
     * smartAppButton.buttons = [
     *     new Button('Подтвердить', null, { payload: 'confirm' }),
     *     new Button('Отменить', null, { payload: 'cancel' })
     * ];
     * const suggestionsResult = smartAppButton.getButtons();
     * // suggestionsResult: [
     * //   {
     * //     title: 'Подтвердить',
     * //     action: {
     * //       type: 'server_action',
     * //       server_action: 'confirm'
     * //     }
     * //   },
     * //   {
     * //     title: 'Отменить',
     * //     action: {
     * //       type: 'server_action',
     * //       server_action: 'cancel'
     * //     }
     * //   }
     * // ]
     *
     * // Создание кнопки для карточки с deep link
     * smartAppButton.isCard = true;
     * smartAppButton.buttons = [
     *     new Button('Открыть приложение', 'sberapp://example.com')
     * ];
     * const deepLinkResult = smartAppButton.getButtons();
     * // deepLinkResult: {
     * //   type: 'deep_link',
     * //   deep_link: 'sberapp://example.com'
     * // }
     * ```
     */
    public getButtons(): ISberSmartAppSuggestionButton[] | ISberSmartAppCardAction {
        const objects: ISberSmartAppSuggestionButton[] = [];
        if (this.isCard) {
            const button = this.buttons[0];
            if (button) {
                if (button.url) {
                    return {
                        deep_link: button.url,
                        type: 'deep_link',
                    };
                } else {
                    const text = Text.resize(button.title || '', 64);
                    if (text) {
                        return {
                            text,
                            type: 'text',
                        };
                    }
                }
            }
        } else {
            this.buttons.forEach((button) => {
                const title = Text.resize(button.title || '', 64);
                if (title) {
                    const object: ISberSmartAppSuggestionButton = {
                        title,
                    };
                    if (button.payload) {
                        object.action = {
                            server_action: button.payload,
                            type: 'server_action',
                        };
                    } else {
                        object.action = {
                            text: title,
                            type: 'text',
                        };
                    }
                    objects.push(object);
                }
            });
        }
        return objects;
    }
}
