import { ISound } from '../interfaces';

/**
 * @interface TemplateSoundTypes
 * Шаблонный интерфейс для обработки звуков в различных платформах
 *
 * Предоставляет унифицированный интерфейс для работы со звуками в разных платформах:
 * - Алиса: преобразование текста в речь (TTS) и воспроизведение звуков
 * - Маруся: преобразование текста в речь (TTS) и воспроизведение звуков
 * - Сбер: преобразование текста в речь (TTS) и воспроизведение звуков
 * - Telegram: отправка аудиофайлов и голосовых сообщений
 * - Viber: отправка аудиофайлов и голосовых сообщений
 * - VK: отправка аудиофайлов и голосовых сообщений
 *
 * Основные возможности:
 * - Поддержка различных форматов звуков (MP3, WAV, OGG)
 * - Преобразование текста в речь (TTS)
 * - Воспроизведение предзаписанных звуков
 * - Отправка аудиофайлов
 * - Поддержка голосовых сообщений
 *
 * @example
 * ```typescript
 * // Реализация для Алисы
 * class AlisaSound implements TemplateSoundTypes {
 *     async getSounds(sounds: ISound[], text?: string): Promise<string> {
 *         // Обработка звуков и текста для Алисы
 *         return text || '';
 *     }
 * }
 *
 * // Реализация для Telegram
 * class TelegramSound implements TemplateSoundTypes {
 *     async getSounds(sounds: ISound[], text?: string): Promise<object> {
 *         // Обработка звуков для Telegram
 *         return { audio: 'path/to/audio.mp3' };
 *     }
 * }
 *
 * // Использование
 * const alisaSound = new AlisaSound();
 * const result = await alisaSound.getSounds([
 *     { key: 'greeting', sounds: ['alisa_sounds/greeting'] }
 * ], 'Привет!');
 * ```
 */
export interface TemplateSoundTypes {
    /**
     * Получение звуков для воспроизведения или отправки
     *
     * @param {ISound[]} sounds - Массив звуков для обработки:
     * - key: уникальный идентификатор звука
     * - sounds: массив путей к звуковым файлам
     * @param {string} [text] - Исходный текст для TTS (опционально)
     * @returns {Promise<any>} - Результат обработки звуков:
     * - Для Алисы/Маруси/Сбера: строка с текстом для TTS
     * - Для Telegram/Viber/VK: объект с данными для отправки
     *
     * Поддерживаемые форматы:
     * - MP3: аудиофайлы в формате MP3
     * - WAV: аудиофайлы в формате WAV
     * - OGG: аудиофайлы в формате OGG
     *
     * Правила обработки:
     * - Если передан текст, он имеет приоритет над звуками
     * - Если звуки не найдены, возвращается пустой результат
     * - Для TTS текст может быть модифицирован под платформу
     *
     * @example
     * ```typescript
     * const soundHandler = new AlisaSound();
     *
     * // Обработка звуков для Алисы с TTS
     * const ttsResult = await soundHandler.getSounds([
     *     { key: 'greeting', sounds: ['alisa_sounds/greeting'] }
     * ], 'Привет! Как дела?');
     * // ttsResult: "Привет! Как дела?"
     *
     * // Обработка звуков для Алисы без TTS
     * const soundResult = await soundHandler.getSounds([
     *     { key: 'notification', sounds: ['alisa_sounds/notification'] }
     * ]);
     * // soundResult: "alisa_sounds/notification"
     *
     * // Обработка звуков для Telegram
     * const telegramHandler = new TelegramSound();
     * const telegramResult = await telegramHandler.getSounds([
     *     { key: 'music', sounds: ['telegram_sounds/music.mp3'] }
     * ]);
     * // telegramResult: { audio: 'telegram_sounds/music.mp3' }
     *
     * // Обработка звуков для VK
     * const vkHandler = new VkSound();
     * const vkResult = await vkHandler.getSounds([
     *     { key: 'voice', sounds: ['vk_sounds/voice.ogg'] }
     * ]);
     * // vkResult: { voice: 'vk_sounds/voice.ogg' }
     * ```
     */
    getSounds(sounds: ISound[], text?: string): Promise<any>;
}
