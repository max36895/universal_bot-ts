/**
 * @module components/sound
 * Модуль для работы со звуками и мелодиями в приложении.
 *
 * Основные компоненты:
 * - Sound: Основной класс для обработки и воспроизведения звуков
 * - TemplateSoundTypes: Базовый класс для создания пользовательских обработчиков звуков
 * - Платформо-зависимые классы:
 *   - AlisaSound: Обработка звуков для Алисы
 *   - MarusiaSound: Обработка звуков для Маруси
 *   - TelegramSound: Обработка звуков для Telegram
 *   - ViberSound: Обработка звуков для Viber
 *   - VkSound: Обработка звуков для VK
 *
 * @example
 * ```typescript
 * import { Sound, AlisaSound } from './components/sound';
 *
 * // Создание экземпляра Sound
 * const sound = new Sound();
 *
 * // Использование платформо-зависимого класса
 * const alisaSound = new AlisaSound();
 * ```
 */

export * from './interfaces';

export * from './types/AlisaSound';
export * from './types/MarusiaSound';
export * from './types/TelegramSound';
export * from './types/TemplateSoundTypes';
export * from './types/ViberSound';
export * from './types/VkSound';

export * from './Sound';
