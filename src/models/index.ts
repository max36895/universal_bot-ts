/**
 * Модуль для моделей, которые работают с базой данных.
 *
 * Предоставляет набор моделей и интерфейсов для:
 * - Работы с базами данных через модели (Model)
 * - Управления токенами изображений и звуков (ImageTokens, SoundTokens)
 * - Хранения и обработки пользовательских данных (UsersData)
 *
 * @example
 * ```ts
 * import { AppContext, UsersData, ImageTokens } from './models';
 *
 * const appContext = new AppContext();
 *
 * // Работа с данными пользователей
 * const usersData = new UsersData(appContext);
 * usersData.userId = 'user123';
 * usersData.platform = 'telegram';
 * if (await usersData.getOne()) {
 *     console.log(usersData.data); // данные пользователя
 * }
 *
 * // Работа с токенами изображений
 * const imageTokens = new ImageTokens(appContext);
 * const found = await imageTokens.selectOne(); // поиск по заданным полям модели
 * ```
 */

export * from './db';
export * from './interface';
export * from './ImageTokens';
export * from './SoundTokens';
export * from './UsersData';
