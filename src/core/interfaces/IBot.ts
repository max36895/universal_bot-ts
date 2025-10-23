/**
 * Интерфейсы и типы для работы с ботом.
 * Определяют основные контракты и структуры данных для взаимодействия с ботом
 */

/**
 * Тип содержимого запроса к боту
 * Определяет возможные форматы данных, которые могут быть переданы боту
 *
 * @remarks
 * Возможные значения:
 * - string: JSON или текстовое содержимое запроса
 *   ```typescript
 *   const content: TBotContent = '{"text": "Привет, бот!"}';
 *   ```
 * - boolean: Флаг состояния запроса
 *   ```typescript
 *   const content: TBotContent = true; // запрос успешно обработан
 *   ```
 * - null: Пустой запрос или ошибка
 *   ```typescript
 *   const content: TBotContent = null; // запрос не содержит данных
 *   ```
 */
export type TBotContent = boolean | string | null;

/**
 * Тип авторизационного токена.
 * Определяет формат данных для авторизации пользователя
 *
 * @remarks
 * Возможные значения:
 * - string: Валидный токен авторизации
 *   ```typescript
 *   const auth: TBotAuth = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
 *   ```
 * - null: Пользователь не авторизован или авторизация не требуется
 *   ```typescript
 *   const auth: TBotAuth = null; // авторизация отсутствует
 *   ```
 */
export type TBotAuth = string | null;
