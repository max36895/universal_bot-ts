/**
 * Набор различных утилит
 *
 * В набор также входят утилиты, которые позволяют разработчику быстрее и удобнее разрабатывать продукт.
 * Среди которых есть компонент для работы с текстом.
 * Рассмотрим его подробнее.
 *
 * ### Text
 * Класс со статическими методами, упрощающий работу с текстом. В классе предусмотрена возможность по обрезанию текста, поиск вхождений, а также другие полезные методы.
 * #### Обрезание текста
 * ```typescript
 * import {Text} from './standard/Text';
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
 * import {Text} from './standard/Text';
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
 * import {Text} from './standard/Text';
 * Text.textSimilarity('test', 'test', 90); // -> {persent: 100, index: 0, status: true, text: 'test'};
 * Text.textSimilarity('test', 'demo', 90); // -> {index: null, status: false, text: null};
 * ```
 *
 * #### Добавление правильного окончания
 * Возвращает нужный текст с нужным окончанием, в зависимости от числа
 * ```typescript
 * import {Text} from './standard/Text';
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
 * @module utils
 */
export * from './standard/util';
export * from './standard/Text';
