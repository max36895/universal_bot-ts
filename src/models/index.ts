/**
 * Модуль для моделей, которые работают с базой данных.
 *
 * Предоставляет набор моделей и интерфейсов для:
 * - Работы с базами данных
 * - Управления токенами изображений и звуков
 * - Хранения и обработки пользовательских данных
 *
 * @example
 * ```ts
 * import { db, ImageTokens, SoundTokens, UsersData } from './models';
 *
 * // Работа с базой данных
 * const connection = await db.connect();
 *
 * // Работа с токенами изображений
 * const imageTokens = new ImageTokens();
 * await imageTokens.save('user123', 'image-token-123');
 *
 * // Работа с токенами звуков
 * const soundTokens = new SoundTokens(appContext);
 * await soundTokens.get('user123');
 *
 * // Работа с данными пользователей
 * const usersData = new UsersData(appContext);
 * await usersData.set('user123', { name: 'John' });
 * ```
 */

export * from './db';
export * from './interface';
export * from './ImageTokens';
export * from './SoundTokens';
export * from './UsersData';
