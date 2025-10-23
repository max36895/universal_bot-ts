/**
 * Стандартные компоненты для работы с текстом и навигацией.
 *
 * Основные компоненты:
 * - Navigation: Класс для навигации по элементам меню или списка
 *   - Поддержка постраничной навигации
 *   - Поиск элементов по тексту или номеру
 *   - Управление отображением элементов
 *   - Обработка команд навигации
 *
 * @example
 * ```typescript
 * import { Navigation } from './components/standard';
 *
 * // Создание экземпляра Navigation
 * const navigation = new Navigation<{id: number, name: string}>(3);
 *
 * // Использование навигации
 * const elements = [
 *   { id: 1, name: 'Элемент 1' },
 *   { id: 2, name: 'Элемент 2' },
 *   { id: 3, name: 'Элемент 3' }
 * ];
 *
 * // Получение элементов текущей страницы
 * const pageElements = navigation.getPageElements(elements);
 * ```
 */
export * from './Navigation';
