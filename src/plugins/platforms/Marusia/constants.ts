/**
 * Версия API Маруси
 */
export const VERSION: string = '1.0';

/**
 * Идентификатор платформы Маруся (ключ в appConfig.tokens).
 */
export const T_MARUSIA = 'marusia';

/**
 * Тип карточки Маруси: BigImage (одно изображение).
 */
export const MARUSIA_CARD_BIG_IMAGE = 'BigImage';

/**
 * Тип карточки Маруси: ItemsList (список до 5 элементов).
 */
export const MARUSIA_CARD_ITEMS_LIST = 'ItemsList';

/**
 * Максимальное количество элементов в ItemsList.
 */
export const MARUSIA_MAX_IMAGES = 5;

/**
 * Максимальное количество изображений в галерее Маруси.
 * При превышении этого количества лишние изображения будут отброшены.
 */
export const MARUSIA_MAX_GALLERY_IMAGES = 7;

/**
 * Максимальный размер state в байтах для Marusia API.
 * Значение по контракту адаптера: открытая документация Маруси не
 * подтверждает паритет с лимитом Алисы.
 */
export const MARUSIA_STATE_MAX_BYTES = 3584;
