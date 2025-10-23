/**
 * # Компоненты
 *
 * Компоненты представляют собой модульную систему для работы с различными аспектами бота.
 * Они разделяются на две основные категории:
 *
 * 1. **Системные компоненты** - отвечают за базовую функциональность бота:
 *    - Отображение карточек
 *    - Работа с изображениями
 *    - Управление кнопками
 *    - Воспроизведение звуков
 *    - Обработка NLU (Natural Language Understanding)
 *
 * 2. **Дополнительные компоненты** - предоставляют расширенную функциональность:
 *    - Навигация по меню
 *    - Управление состоянием
 *    - Работа с данными
 *
 * > **Важно**: Системные компоненты рекомендуется использовать только через BotController.
 *
 * ## Дополнительные компоненты
 *
 * Дополнительные компоненты разработаны для упрощения разработки и расширения возможностей бота.
 *
 * ### Navigation
 *
 * Класс для управления навигацией по элементам меню. Особенно полезен при работе с большими списками элементов,
 * где требуется постраничная навигация и обработка выбора пользователя.
 *
 * #### Основные возможности:
 * - Постраничная навигация по элементам
 * - Определение выбранного элемента
 * - Поддержка различных типов данных через дженерики
 * - Гибкая настройка количества отображаемых элементов
 *
 * #### Примеры использования
 *
 * 1. **Стандартная навигация**
 * ```typescript
 * import { Navigation } from './standard/Navigation';
 *
 * const elements: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
 * const maxVisibleElements: number = 5;
 * const nav = new Navigation<number>(maxVisibleElements);
 *
 * // Получение элементов для первой страницы
 * const showElements: number[] = nav.getPageElements(elements);
 * console.log(showElements); // -> [1, 2, 3, 4, 5]
 * ```
 *
 * 2. **Навигация с командами**
 * ```typescript
 * import { Navigation } from './standard/Navigation';
 *
 * const elements: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
 * const maxVisibleElements: number = 5;
 * const nav = new Navigation<number>(maxVisibleElements);
 *
 * // Навигация вперед
 * let showElements = nav.getPageElements(elements, 'Дальше');
 * console.log(showElements); // -> [6, 7, 8, 9, 0]
 *
 * // Навигация назад
 * showElements = nav.getPageElements(elements, 'Назад');
 * console.log(showElements); // -> [1, 2, 3, 4, 5]
 * ```
 *
 * 3. **Управление текущей страницей**
 * ```typescript
 * import { Navigation } from './standard/Navigation';
 *
 * const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
 * const maxVisibleElements = 5;
 * const nav = new Navigation<number>(maxVisibleElements);
 *
 * // Установка текущей страницы
 * nav.thisPage = 1;
 *
 * // Проверка границ навигации
 * let showElements = nav.getPageElements(elements, 'Дальше');
 * console.log(nav.thisPage); // -> 1 (не выходит за пределы)
 *
 * showElements = nav.getPageElements(elements, 'Назад');
 * console.log(nav.thisPage); // -> 0
 * ```
 *
 * 4. **Выбор элемента из списка**
 * ```typescript
 * import { Navigation } from './standard/Navigation';
 *
 * const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
 * const maxVisibleElements = 5;
 * const nav = new Navigation<number>(maxVisibleElements);
 *
 * // Выбор элемента на текущей странице
 * nav.thisPage = 1;
 * let selectedElement = nav.selectedElement(elements, '1');
 * console.log(selectedElement); // -> 6
 * ```
 *
 * 5. **Работа с объектами**
 * ```typescript
 * import { Navigation } from './standard/Navigation';
 *
 * interface MenuItem {
 *     title: string;
 *     desc: string;
 * }
 *
 * const elements: MenuItem[] = [
 *     { title: 'title 1', desc: 'desc 1' },
 *     { title: 'title 2', desc: 'desc 2' },
 *     { title: 'title 3', desc: 'desc 3' },
 *     { title: 'title 4', desc: 'desc 4' }
 * ];
 *
 * const maxVisibleElements = 2;
 * const nav = new Navigation<MenuItem>(maxVisibleElements);
 *
 * // Поиск по свойству объекта
 * let selectedElement = nav.selectedElement(elements, 'title 1', 'title');
 * console.log(selectedElement); // -> { title: 'title 1', desc: 'desc 1' }
 * ```
 *
 * ## Системные компоненты
 *
 * Системные компоненты обеспечивают базовую функциональность бота и доступны через BotController.
 *
 * ### Доступные компоненты:
 *
 * - **Кнопки** (`./button`) - управление интерактивными элементами
 * - **Карточки** (`./card`) - отображение структурированной информации
 * - **Изображения** (`./image`) - работа с графическим контентом
 * - **NLU** (`./nlu`) - обработка естественного языка
 * - **Звуки** (`./sound`) - управление аудио контентом
 *
 * > **Примечание**: Для использования системных компонентов рекомендуется обращаться к соответствующим
 * > методам BotController, которые обеспечивают правильную интеграцию с платформами.
 */

export * from './button';
export * from './card';
export * from './image/Image';
export * from './nlu';
export * from './sound';
export * from './standard';
