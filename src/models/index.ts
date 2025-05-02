/**
 * Модуль моделей данных
 *
 * Предоставляет набор моделей и интерфейсов для:
 * - Работы с базами данных
 * - Управления токенами изображений и звуков
 * - Хранения и обработки пользовательских данных
 *
 * @module models
 *
 * @example
 * ```typescript
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
 * const soundTokens = new SoundTokens();
 * await soundTokens.get('user123');
 *
 * // Работа с данными пользователей
 * const usersData = new UsersData();
 * await usersData.set('user123', { name: 'John' });
 * ```
 */

export * as db from './db';
export * from './interface';
export * from './ImageTokens';
export * from './SoundTokens';
export * from './UsersData';
