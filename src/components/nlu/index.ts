/**
 * @module components/nlu
 * Модуль для обработки естественного языка (NLU) и извлечения сущностей из текста.
 *
 * Основные компоненты:
 * - Nlu: Основной класс для обработки NLU
 *   - Извлечение имен, дат, времени и геолокации
 *   - Распознавание встроенных интентов
 *   - Поиск контактной информации
 *   - Кэширование результатов
 *
 * - Интерфейсы:
 *   - INlu: Основной интерфейс для данных NLU
 *   - INluDateTime: Интерфейс для даты и времени
 *   - INluFIO: Интерфейс для ФИО
 *   - INluGeo: Интерфейс для геолокации
 *   - INluIntent: Интерфейс для интентов
 *   - INluIntents: Интерфейс для списка интентов
 *   - INluResult: Интерфейс для результатов
 *   - INluThisUser: Интерфейс для информации о пользователе
 *
 * @example
 * ```typescript
 * import { Nlu } from './components/nlu';
 *
 * // Создание экземпляра Nlu
 * const nlu = new Nlu();
 *
 * // Обработка запроса с именем и датой
 * nlu.setNlu({
 *     entities: [
 *         {
 *             type: 'YANDEX.FIO',
 *             value: { first_name: 'Иван', last_name: 'Иванов' }
 *         },
 *         {
 *             type: 'YANDEX.DATETIME',
 *             value: { year: 2024, month: 3, day: 15 }
 *         }
 *     ]
 * });
 *
 * // Получение имени
 * const fio = nlu.getFio();
 * if (fio.status) {
 *     console.log(fio.result[0].first_name); // "Иван"
 * }
 *
 * // Получение даты
 * const dateTime = nlu.getDateTime();
 * if (dateTime.status) {
 *     console.log(dateTime.result[0].year); // 2024
 * }
 * ```
 */
export * from './interfaces/INlu';
export * from './Nlu';
