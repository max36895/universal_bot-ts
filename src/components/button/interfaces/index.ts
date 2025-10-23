/**
 * Модуль, содержащий интерфейсы для работы с кнопками на различных платформах.
 *
 * Этот модуль экспортирует следующие интерфейсы:
 *
 * 1. **IButton** - базовый интерфейс для кнопок, используемый на всех платформах
 *    - Определяет основные свойства кнопки (title, text, url, payload)
 *    - Содержит типы для дополнительных данных и опций
 *
 * 2. **IViberButton** - интерфейс для кнопок Viber
 *    - Определяет специфичные для Viber свойства (Columns, Rows, ActionType)
 *    - Содержит интерфейс для объекта клавиатуры Viber
 *
 * 3. **IVkButton** - интерфейс для кнопок ВКонтакте
 *    - Определяет специфичные для VK свойства (action, color, hash)
 *    - Содержит интерфейсы для действий кнопок и объекта клавиатуры
 *
 * @example
 * ```typescript
 * import { IButton, IViberButton, IVkButton } from './interfaces';
 *
 * // Создание базовой кнопки
 * const button: IButton = {
 *     title: 'Нажми меня',
 *     payload: { action: 'click' }
 * };
 *
 * // Создание кнопки Viber
 * const viberButton: IViberButton = {
 *     Text: 'Нажми меня',
 *     ActionType: 'reply',
 *     ActionBody: 'button_click'
 * };
 *
 * // Создание кнопки VK
 * const vkButton: IVkButton = {
 *     action: {
 *         type: 'text',
 *         label: 'Нажми меня'
 *     },
 *     color: 'primary'
 * };
 * ```
 */
export * from './IButton';
export * from './IViberButton';
export * from './IVkButton';
