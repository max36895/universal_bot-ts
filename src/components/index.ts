/**
 * # Компоненты
 * Компоненты необходимы для корректной работы движка, а также упрощают разработку. Разделяются на 2 категории:
 * 1. Системные компоненты, отвечающие за корректное отображение карточек, картинок, кнопок, а также воспроизведение звуков.
 * 2. Дополнительные компоненты, упрощающие работу с текстом и навигацией.
 * Не рекомендуется использовать в своем коде системные компоненты, не входящие в BotController.
 *
 * ## Дополнительные компоненты
 * Дополнительные компоненты позволяют разработчику быстрее и удобнее разрабатывать продукт. На данный момент, реализован компонент для работы с текстом, а также компонент, упрощающий навигацию.
 * Рассмотрим их подробнее.
 *
 * ### Text
 * Класс со статическими методами, упрощающий работу с текстом. В классе предусмотрена возможность по обрезанию текста, поиск вхождений, а также другие полезные методы.
 * #### Обрезание текста
 * ```typescript
 * import {Text} from "./standard/Text";
 * const text: string = 'testing long long text';
 * // Обрезание текста троеточием
 * Text.resize(text, 7); // -> test...
 * // Обрезание текста без троеточия
 * Text.resize(text, 7, false); // -> testing
 * ```
 *
 * #### Поиск вхождений
 * Производит поиск вхождения в тексте. В случае успеха возвращает true, иначе false
 * ```typescript
 * import {Text} from "./standard/Text";
 * const text: string = 'testing long long text';
 * // Поиск определенного значения
 * Text.isSayText('test', text); // -> true
 * // Поиск одного из возможных значений
 * Text.isSayText(['and', 'test'], text); // -> true
 * // Поиск по регулярному выражению
 * Text.isSayText(['and', '\btest\b'], text, true); // -> true
 * ```
 *
 * #### Схожесть текста
 * Проверяет 2 текста на сходство.
 * Возвращает объект вида:
 * {\
 * 'status' => boolean, Статус выполнения\
 * 'index' => number|string, В каком тексте значение совпало, либо максимально. При передаче строки вернет 0\
 * 'text' => string, Текст, который совпал\
 * 'percent' => number, На сколько процентов текста похожи\
 * }
 * ```typescript
 * import {Text} from "./standard/Text";
 * Text.textSimilarity('test', 'test', 90); // -> {persent: 100, index: 0, status: true, text: 'test'};
 * Text.textSimilarity('test', 'demo', 90); // -> {index: null, status: false, text: null};
 * ```
 *
 * #### Добавление правильного окончания
 * Возвращает нужный текст с нужным окончанием, в зависимости от числа
 * ```typescript
 * import {Text} from "./standard/Text";
 * const titles: string[] = [
 *  'Яблоко',
 *  'Яблока',
 *  'Яблок'
 * ];
 * Text.getEnding(1, titles); // -> Яблоко
 * Text.getEnding(2, titles); // -> Яблока
 * Text.getEnding(10, titles); // -> Яблок
 * // Всегда выбирается определенное значение.
 * Text.getEnding(10, titles, 0); // -> Яблоко
 * ```
 *
 * ### Navigation
 * Класс отвечающий за навигацию по элементам меню. Удобен в том случае, если в приложении есть карточки с большим количеством элементов и нужна возможность для их навигации.
 * Класс позволяет не только перемещаться по различным страницам, а также определяет на какой из элементов списка нажал пользователь.
 * Для удобства работы, при создании класса, стоит указывать дженерик, с тем типом, с которым происходит работа
 *
 * #### Примеры использования
 * Стандартная навигация
 * ```typescript
 * import {Navigation} from "./standard/Navigation";
 * const elements: number[] = [1,2,3,4,5,6,7,8,9,0]; // Массив с элементами
 * const maxVisibleElements: number = 5; // Количество отображаемых элементов
 * const nav = new Navigation<number>(maxVisibleElements); // Подключаем класс с навигацией
 * const showElements: number[] = nav.nav(elements); // Получение отображаемых элементов
 * console.log(showElements); // -> [1,2,3,4,5]
 * ```
 *
 * Навигация с отслеживанием команд "Дальше" или "Назад"
 * ```typescript
 * import {Navigation} from "./standard/Navigation";
 * const elements: number[] = [1,2,3,4,5,6,7,8,9,0];
 * const maxVisibleElements: number = 5;
 * const nav = new Navigation<number>(maxVisibleElements);
 * let showElements: number[] = nav.nav(elements, 'Спасибо');
 * console.log(showElements); // -> [1,2,3,4,5]
 * showElements = nav.nav(elements, 'Дальше');
 * console.log(showElements); // -> [6,7,8,9,0]
 * showElements = nav.nav(elements, 'Назад');
 * console.log(showElements); // -> [1,2,3,4,5]
 * ```
 *
 * Навигация с отслеживанием текущей страницы пользователя
 * ```typescript
 * import {Navigation} from "./standard/Navigation";
 * const elements = [1,2,3,4,5,6,7,8,9,0];
 * const maxVisibleElements = 5;
 * const nav = new Navigation<number>(maxVisibleElements);
 * nav.thisPage = 1; // Устанавливаем текущую страницу на 2.
 * let showElements = nav.nav(elements, 'Дальше');
 * console.log(nav.thisPage); // -> 1, так как мы не можем выйти за максимальное количество страниц
 * showElements = nav.nav(elements, 'Назад');
 * console.log(nav.thisPage); // -> 0
 * ```
 *
 * Выбор пользователем определенного элемента списка
 * ```typescript
 * import {Navigation} from "./standard/Navigation";
 * const elements = [1,2,3,4,5,6,7,8,9,0];
 * const maxVisibleElements = 5;
 * const nav = new Navigation<number>(maxVisibleElements);
 * nav.thisPage = 1;
 * let selectedElement = nav.selectedElement(elements, '1');
 * console.log(selectedElement); // -> 6
 * nav.thisPage = 0;
 * selectedElement = nav.selectedElement(elements, '1');
 * console.log(selectedElement); // -> 1
 * ```
 *
 * Если передается массив массивов, то можно указать ключ для поиска.
 * ```typescript
 * import {Navigation} from "./standard/Navigation";
 * const elements = [
 *  {
 *      title: 'title 1',
 *      desc: 'desc 1'
 *  },
 *  {
 *      title: 'title 2',
 *      desc: 'desc 2'
 *  },
 *  {
 *      title: 'title 3',
 *      desc: 'desc 3'
 *  },
 *  {
 *      title: 'title 4',
 *      desc: 'desc 4'
 *  }
 * ];
 * const maxVisibleElements = 2;
 * const nav = new Navigation(maxVisibleElements);
 * let selectedElement = nav.selectedElement(elements, 'title 1', 'title');
 * console.log(selectedElement); // -> {title: 'title 1', desc: 'desc 1'}
 * nav.thisPage = 1;
 * selectedElement = nav.selectedElement(elements, 'title 4', 'title', 1);
 * console.log(selectedElement); // -> {title: 'title 4', desc: 'desc 4'}
 * ```
 *
 * ## Системные компоненты
 * К системным компонентам относятся:
 * - Кнопки
 * - Карточки
 * - Картинки
 * - NLU
 * - Звуки
 * Компоненты необходимы для корректной работы движка. А именно отвечают за корректное отображение результатов.
 * Все необходимые системные компоненты доступны в BotController.
 * @module components
 */

export * from './button';
export * from './card';
export * from './image/Image';
export * from './nlu';
export * from './sound';
export * from './standard';
