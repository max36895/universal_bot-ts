/**
 * Модуль для работы со звуками и мелодиями в приложении.
 *
 * Основные компоненты:
 * - Sound: основной класс для обработки и воспроизведения звуков
 * - SoundConstants: именованный набор стандартных звуков и эффектов платформ
 *   (константы S_AUDIO_*, S_EFFECT_* и функция SoundConstants.getPause(ms) для пауз в TTS)
 */

export * from './interfaces';

export * from './Sound';

export * as SoundConstants from './constants';
