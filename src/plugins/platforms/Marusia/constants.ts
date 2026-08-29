/**
 * Версия API Маруси
 */
export const VERSION: string = '1.0';

export const T_MARUSIA = 'marusia';
export const MARUSIA_CARD_BIG_IMAGE = 'BigImage';

export const MARUSIA_CARD_ITEMS_LIST = 'ItemsList';

export const MARUSIA_MAX_IMAGES = 5;

/**
 * Максимальное количество изображений в галерее Маруси.
 * При превышении этого количества лишние изображения будут отброшены.
 */
export const MARUSIA_MAX_GALLERY_IMAGES = 7;

/**
 * Максимальный размер state в байтах для Marusia API.
 * Значение оставлено по историческому контракту адаптера: открытая документация
 * Маруси сейчас не позволяет надёжно подтвердить паритет с лимитом Алисы.
 */
export const MARUSIA_STATE_MAX_BYTES = 3584;
