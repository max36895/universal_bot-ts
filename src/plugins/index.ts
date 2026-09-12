export {
    BasePlatform as BasePlatformAdapter,
    type TContent,
    type IOptions as IAdapterOptions,
    EMPTY_CONTEXT_ERROR,
    EMPTY_QUERY_ERROR,
} from './platforms/Base/Base';
export { type TApiMethod, type TApiFacade, makePlatformApi } from './platforms/Base/apiFacade';
// Фабрики фасадов живут в папках своих платформ; диспетчер makePlatformApi
// (Base/apiFacade) реэкспортирует их для ручного использования.
export { makeTelegramApi } from './platforms/Telegram/apiFacade';
export { makeVkApi } from './platforms/VK/apiFacade';
export { makeMaxApi } from './platforms/Max/apiFacade';
export { makeViberApi } from './platforms/Viber/apiFacade';

/**
 * Хелперы для адаптеров платформ: getImageToken/getSoundToken, нормализация payload, сопоставление типов апдейтов с TEventType.
 */
export * as pUtils from './platforms/Base/utils';

export { SmartAppAdapter } from './platforms/SmartApp/Adapter';
/**
 * Константы адаптера Сбер SmartApp: лимит bubble-текста 250 символов.
 */
export * as SmartAppConstants from './platforms/SmartApp/constants';
export * from './platforms/SmartApp/interfaces/ISmartAppPlatform';
/**
 * Построение кнопок SmartApp: до 8 кнопок-подсказок с server_action и deep_link.
 */
export * as SmartAppButton from './platforms/SmartApp/Button';
/**
 * Обработка звуков SmartApp: маркеры звуков вычищаются, текст отправляется с типом application/ssml.
 */
export * as SmartAppSound from './platforms/SmartApp/Sound';
/**
 * Построение карточек SmartApp: list_card с image_cell_view/text_cell_view, только URL-изображения.
 */
export * as SmartAppCard from './platforms/SmartApp/Card';
export { T_SMART_APP } from './platforms/SmartApp/constants';

export { TelegramAdapter } from './platforms/Telegram/Adapter';
export * from './platforms/Telegram/interfaces/ITelegramPlatform';
/**
 * Построение кнопок Telegram: inline-клавиатуры до 40 кнопок, callback_data 1–64 байта, style (Bot API 9.4+).
 */
export * as TelegramButton from './platforms/Telegram/Button';
/**
 * Обработка звуков Telegram: TTS синтезируется через Yandex SpeechKit и отправляется аудиофайлом.
 */
export * as TelegramSound from './platforms/Telegram/Sound';
/**
 * Построение карточек Telegram: sendPhoto для одиночного фото, sendMediaGroup для 2–10 изображений.
 */
export * as TelegramCard from './platforms/Telegram/Card';
export {
    T_TELEGRAM,
    T_FORMAT_HTML,
    T_FORMAT_MARKDOWN,
    TG_STYLE_DESTRUCTIVE,
    TG_STYLE_PRIMARY,
    TG_STYLE_SECONDARY,
} from './platforms/Telegram/constants';
export { escapeMarkdownV2, escapeHtml } from './platforms/API/TelegramRequest';

export { MarusiaAdapter } from './platforms/Marusia/Adapter';
/**
 * Константы адаптера Маруси: лимиты текста/TTS (1024) и состояния (3584 байта).
 */
export * as MarusiaConstants from './platforms/Marusia/constants';
export * from './platforms/Marusia/interfaces/IMarusiaPlatform';
/**
 * Построение кнопок Маруси: лимит 10 кнопок, title до 64 символов, payload до 4096 байт.
 */
export * as MarusiaButton from './platforms/Marusia/Button';
/**
 * Обработка звуков Маруси: стандартные звуки marusia-sounds и загруженные аудиофайлы через marusia.createAudio.
 */
export * as MarusiaSound from './platforms/Marusia/Sound';
/**
 * Построение карточек Маруси: BigImage, ItemsList (до 5) и ImageGallery (до 7 изображений).
 */
export * as MarusiaCard from './platforms/Marusia/Card';
export { T_MARUSIA } from './platforms/Marusia/constants';

export { AlisaAdapter } from './platforms/Alisa/Adapter';
/**
 * Константы адаптера Алисы: лимиты текста/TTS (1024) и состояния (1 КБ на тип).
 */
export * as AlisaConstants from './platforms/Alisa/constants';
export * from './platforms/Alisa/interfaces/IAlisaPlatform';
/**
 * Построение кнопок Алисы: лимит 10 кнопок, title до 64 символов, payload до 4096 байт, URL до 1024 байт.
 */
export * as AlisaButton from './platforms/Alisa/Button';
/**
 * Обработка звуков Алисы: стандартные звуки, `<speaker>` и TTS-эффекты в озвучке.
 */
export * as AlisaSound from './platforms/Alisa/Sound';
/**
 * Построение карточек Алисы: BigImage, ItemsList (до 5) и ImageGallery (до 10) с лимитами протокола Яндекс.Диалогов.
 */
export * as AlisaCard from './platforms/Alisa/Card';
export { T_ALISA } from './platforms/Alisa/constants';

export { ViberAdapter } from './platforms/Viber/Adapter';
export * from './platforms/Viber/interfaces/IViberPlatform';
/**
 * Построение кнопок Viber: rich_media-сетка 6×7, до 6 кнопок в текущей реализации адаптера.
 */
export * as ViberButton from './platforms/Viber/Button';
/**
 * Обработка звуков Viber: soundProcessing возвращает `null` — платформа не поддерживает аудиосообщения.
 */
export * as ViberSound from './platforms/Viber/Sound';
/**
 * Построение карточек Viber: rich_media с min_api_version 7 и лимитом тела запроса 30 КБ.
 */
export * as ViberCard from './platforms/Viber/Card';
export { T_VIBER } from './platforms/Viber/constants';

export { MaxAdapter } from './platforms/Max/Adapter';
export * from './platforms/Max/interfaces/IMaxPlatform';
/**
 * Построение кнопок MAX: до 30 рядов по одной кнопке, текст обязателен, URL до 2048 символов.
 */
export * as MaxButton from './platforms/Max/Button';
/**
 * Обработка звуков MAX: TTS через Yandex SpeechKit, аудиофайлы через /uploads.
 */
export * as MaxSound from './platforms/Max/Sound';
/**
 * Построение карточек MAX: загрузка изображений через /uploads, до 12 вложений в сообщении.
 */
export * as MaxCard from './platforms/Max/Card';
export { T_MAX_APP } from './platforms/Max/constants';

export { VkAdapter, clearVkUserCache } from './platforms/VK/Adapter';
export * from './platforms/VK/interfaces/IVkPlatform';
/**
 * Построение клавиатуры VK: label до 40 символов, payload до 255 байт, цвета и группировка в ряды.
 */
export * as VkButton from './platforms/VK/Button';
/**
 * Обработка звуков VK: загрузка аудио через docs.getMessagesUploadServer и отправка вложением.
 */
export * as VkSound from './platforms/VK/Sound';
/**
 * Построение карусели VK: до 10 элементов, токены изображений через photos.saveMessagesPhoto.
 */
export * as VkCard from './platforms/VK/Card';
export { T_VK } from './platforms/VK/constants';

export * from './platforms/API/index';

export { voicePlatforms } from './platforms/voicePlatforms';
export { fullPlatforms } from './platforms/fullPlatforms';
export { botPlatforms } from './platforms/botPlatforms';
export { adapters } from './platforms/adapters';

export * from './db';
