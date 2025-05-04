/**
 * @module components/card
 * Модуль, содержащий компоненты для работы с карточками на различных платформах.
 *
 * Этот модуль экспортирует следующие компоненты:
 *
 * 1. **Card** - основной класс для работы с карточками
 *    - Создание и управление карточками
 *    - Добавление изображений и кнопок
 *    - Адаптация под различные платформы
 *
 * 2. **Платформо-специфичные классы карточек**:
 *    - AlisaCard - карточки для Алисы
 *    - MarusiaCard - карточки для Маруси
 *    - SmartAppCard - карточки для Сбер SmartApp
 *    - TelegramCard - карточки для Telegram
 *    - ViberCard - карточки для Viber
 *    - VkCard - карточки для ВКонтакте
 *
 * 3. **TemplateCardTypes** - базовый класс для создания пользовательских карточек
 *
 * @example
 * ```typescript
 * import { Card } from './card';
 *
 * // Создание карточки
 * const card = new Card();
 * card.setTitle('Название товара')
 *     .setDescription('Описание товара')
 *     .addImage('product.jpg', 'Изображение товара', 'Описание изображения')
 *     .addButton('Купить');
 *
 * // Получение данных карточки для текущей платформы
 * const cardData = await card.getCards();
 * ```
 */
export * from './types/AlisaCard';
export * from './types/MarusiaCard';
export * from './types/SmartAppCard';
export * from './types/TelegramCard';
export * from './types/TemplateCardTypes';
export * from './types/ViberCard';
export * from './types/VkCard';

export * from './Card';
