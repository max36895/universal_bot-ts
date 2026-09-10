/**
 * Версия API Алисы
 */
export const VERSION: string = '1.0';

/**
 * Идентификатор платформы Яндекс.Алиса (ключ в appConfig.tokens).
 */
export const T_ALISA = 'alisa';

/**
 * Тип карточки Алисы: одно большое изображение с заголовком, описанием и опциональной кнопкой.
 *
 * Используется как значение поля `type` в `IAlisaResponse.response.card`.
 *
 * @example
 * ```ts
 * import { AlisaConstants, IAlisaBigImage } from 'umbot/plugins';
 * const { ALISA_CARD_BIG_IMAGE } = AlisaConstants;
 *
 * const card: IAlisaBigImage = {
 *     type: ALISA_CARD_BIG_IMAGE,
 *     image_id: '123456/abcdef',
 *     title: 'Заголовок',
 *     description: 'Описание'
 * };
 * ```
 */
export const ALISA_CARD_BIG_IMAGE = 'BigImage';

/**
 * Тип карточки Алисы: список элементов.
 * Каждый элемент содержит изображение, заголовок, описание и опциональную кнопку.
 *
 * Используется как значение поля `type` в `IAlisaResponse.response.card`.
 *
 * @example
 * ```ts
 * import { AlisaConstants, IAlisaItemsList } from 'umbot/plugins';
 * const { ALISA_CARD_ITEMS_LIST } = AlisaConstants;
 *
 * const card: IAlisaItemsList = {
 *     type: ALISA_CARD_ITEMS_LIST,
 *     header: { text: 'Товары' },
 *     items: [
 *         { image_id: '123456/1', title: 'Товар 1' },
 *         { image_id: '123456/2', title: 'Товар 2' }
 *     ]
 * };
 * ```
 */
export const ALISA_CARD_ITEMS_LIST = 'ItemsList';

/**
 * Максимальное число элементов в `ItemsList`. Адаптер обрезает список
 * до лимита (slice), поэтому платформа лишних элементов не видит.
 */
export const ALISA_MAX_IMAGES = 5;

/**
 * Максимальное число изображений в `ImageGallery`. Адаптер обрезает галерею
 * до лимита (slice), поэтому платформа лишних изображений не видит.
 */
export const ALISA_MAX_GALLERY_IMAGES = 10;

/**
 * Лимит JSON-состояния в Алисе.
 * Платформа отклоняет `session_state` и `user_state_update` больше 1 КБ.
 */
export const ALISA_STATE_MAX_BYTES = 1024;
