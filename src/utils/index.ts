/**
 * Модуль утилит - набор вспомогательных инструментов для разработки
 *
 * Модуль содержит:
 * - Утилиты для работы с текстом
 * - Стандартные утилиты для работы с данными
 * - Инструменты для конфигурации
 *
 * ### Text
 * Класс для работы с текстом, предоставляющий статические методы для:
 * - Обрезки текста
 * - Поиска вхождений
 * - Проверки схожести текстов
 * - Работы с окончаниями слов
 *
 * #### Обрезка текста
 * ```typescript
 * import { Text } from './standard/Text';
 *
 * const text = 'testing long long text';
 *
 * // Обрезка с троеточием
 * Text.resize(text, 7); // -> 'test...'
 *
 * // Обрезка без троеточия
 * Text.resize(text, 7, false); // -> 'testing'
 * ```
 *
 * #### Поиск вхождений
 * Метод для поиска подстроки или массива подстрок в тексте
 * ```typescript
 * import { Text } from './standard/Text';
 *
 * const text = 'testing long long text';
 *
 * // Поиск одной подстроки
 * Text.isSayText('test', text); // -> true
 *
 * // Поиск одной из подстрок
 * Text.isSayText(['and', 'test'], text); // -> true
 *
 * // Поиск по регулярному выражению
 * Text.isSayText(['and', '\\btest\\b'], text, true); // -> true
 * ```
 *
 * #### Проверка схожести текстов
 * Метод для определения степени схожести двух текстов
 * ```typescript
 * import { Text } from './standard/Text';
 *
 * // Тексты совпадают на 100%
 * Text.textSimilarity('test', 'test', 90);
 * // -> {
 * //   percent: 100,
 * //   index: 0,
 * //   status: true,
 * //   text: 'test'
 * // }
 *
 * // Тексты не совпадают
 * Text.textSimilarity('test', 'demo', 90);
 * // -> {
 * //   index: null,
 * //   status: false,
 * //   text: null
 * // }
 * ```
 *
 * #### Работа с окончаниями слов
 * Метод для выбора правильного окончания слова в зависимости от числа
 * ```typescript
 * import { Text } from './standard/Text';
 *
 * const titles = [
 *   'Яблоко',  // 1
 *   'Яблока',  // 2-4
 *   'Яблок'    // 5-20
 * ];
 *
 * Text.getEnding(1, titles);    // -> 'Яблоко'
 * Text.getEnding(2, titles);    // -> 'Яблока'
 * Text.getEnding(10, titles);   // -> 'Яблок'
 *
 * // Принудительный выбор формы
 * Text.getEnding(10, titles, 0); // -> 'Яблоко'
 * ```
 *
 * @module utils
 */
export * from './standard/util';
export * from './standard/Text';
