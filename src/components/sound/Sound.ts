import { TemplateSoundTypes } from './types/TemplateSoundTypes';
import {
    mmApp,
    T_ALISA,
    T_MARUSIA,
    T_SMARTAPP,
    T_TELEGRAM,
    T_USER_APP,
    T_VIBER,
    T_VK,
} from '../../mmApp';
import { AlisaSound } from './types/AlisaSound';
import { TelegramSound } from './types/TelegramSound';
import { VkSound } from './types/VkSound';
import { ViberSound } from './types/ViberSound';
import { ISound } from './interfaces';
import { MarusiaSound } from './types/MarusiaSound';

/**
 * @class Sound
 * Класс для обработки и воспроизведения звуков в различных платформах.
 *
 * Основные возможности:
 * - Поддержка различных платформ (Алиса, Маруся, VK, Telegram, Viber)
 * - Использование стандартных и пользовательских звуков
 * - Встраивание звуков в текстовые сообщения
 * - Гибкая настройка звукового сопровождения
 *
 * Ограничения по платформам:
 *
 * Алиса:
 * - Аудиофайлы: MP3, до 1MB
 * - Длительность: до 30 секунд
 * - Стандартные звуки: <speaker audio="alice-xxx">
 * - Синтез речи: SSML-разметка
 *
 * Маруся:
 * - Аудиофайлы: MP3, до 1MB
 * - Длительность: до 30 секунд
 * - Стандартные звуки: <speaker audio="marusia-xxx">
 * - Синтез речи: SSML-разметка
 *
 * VK:
 * - Аудиофайлы: MP3, OGG, до 20MB
 * - Длительность: до 5 минут
 * - Голосовые сообщения: OGG (opus)
 *
 * Telegram:
 * - Аудиофайлы: MP3, M4A, до 50MB
 * - Длительность: без ограничений
 * - Голосовые сообщения: OGG (opus)
 *
 * Viber:
 * - Аудиофайлы: MP3, WAV, до 10MB
 * - Длительность: до 3 минут
 *
 * @example
 * ```typescript
 * import { Sound } from './components/sound/Sound';
 *
 * // Создание экземпляра
 * const sound = new Sound();
 *
 * // Использование стандартных звуков Алисы
 * sound.sounds = [
 *     // Звук колокольчика
 *     {
 *         type: 'audio',
 *         speaker: 'alice-sounds-game-win-1'
 *     },
 *     // Синтез речи с эмоциями
 *     {
 *         type: 'tts',
 *         text: '<speaker effect="pitch_down">Привет!</speaker>'
 *     }
 * ];
 *
 * // Использование стандартных звуков Маруси
 * sound.sounds = [
 *     // Звук успеха
 *     {
 *         type: 'audio',
 *         speaker: 'marusia-sounds-success-1'
 *     },
 *     // Синтез речи с паузами
 *     {
 *         type: 'tts',
 *         text: 'Привет! <break time="2s"/> Как дела?'
 *     }
 * ];
 *
 * // Комбинирование разных типов звуков
 * sound.sounds = [
 *     // Аудиофайл
 *     {
 *         type: 'audio',
 *         url: 'https://example.com/music.mp3'
 *     },
 *     // Синтез речи
 *     {
 *         type: 'tts',
 *         text: 'Это фоновая музыка'
 *     },
 *     // Голосовое сообщение для Telegram
 *     {
 *         type: 'voice',
 *         file_id: 'AwADBAADbXXX'
 *     },
 *     // Аудиосообщение для VK
 *     {
 *         type: 'audio_message',
 *         audio_id: '123456_789012'
 *     }
 * ];
 *
 * // Получение текста со звуками
 * const result = await sound.getSounds('Текст сообщения');
 * ```
 */
export class Sound {
    /**
     * Массив звуков для воспроизведения.
     * Каждый элемент массива представляет собой объект с параметрами звука.
     *
     * @type {ISound[]}
     *
     * Поддерживаемые типы звуков:
     *
     * 1. Аудиофайл:
     * ```typescript
     * {
     *     type: 'audio',
     *     url: string    // URL аудиофайла
     * }
     * ```
     *
     * 2. Стандартный звук (Алиса/Маруся):
     * ```typescript
     * {
     *     type: 'audio',
     *     speaker: string  // ID стандартного звука
     * }
     * ```
     *
     * 3. Синтез речи:
     * ```typescript
     * {
     *     type: 'tts',
     *     text: string   // Текст для синтеза
     * }
     * ```
     *
     * 4. Голосовое сообщение Telegram:
     * ```typescript
     * {
     *     type: 'voice',
     *     file_id: string  // ID файла в Telegram
     * }
     * ```
     *
     * 5. Аудиосообщение VK:
     * ```typescript
     * {
     *     type: 'audio_message',
     *     audio_id: string  // ID аудио в VK
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Стандартные звуки Алисы
     * sound.sounds = [
     *     { type: 'audio', speaker: 'alice-sounds-game-win-1' },  // Победа
     *     { type: 'audio', speaker: 'alice-sounds-game-loss-1' }, // Проигрыш
     *     { type: 'audio', speaker: 'alice-sounds-game-8-bit-1' } // 8-бит
     * ];
     *
     * // Стандартные звуки Маруси
     * sound.sounds = [
     *     { type: 'audio', speaker: 'marusia-sounds-game-win-1' },  // Победа
     *     { type: 'audio', speaker: 'marusia-sounds-game-loss-1' }, // Проигрыш
     *     { type: 'audio', speaker: 'marusia-sounds-game-8-bit-1' } // 8-бит
     * ];
     *
     * // Синтез речи с SSML
     * sound.sounds = [
     *     {
     *         type: 'tts',
     *         text: `
     *             <speak>
     *                 <break time="1s"/>
     *                 <emphasis level="strong">Важный текст</emphasis>
     *                 <prosody rate="slow">Медленный текст</prosody>
     *                 <audio src="https://example.com/sound.mp3"/>
     *             </speak>
     *         `
     *     }
     * ];
     * ```
     */
    public sounds: ISound[];

    /**
     * Флаг использования стандартных звуков.
     * Если true, используются стандартные звуки платформы.
     * Актуально для Алисы и Маруси.
     *
     * @type {boolean}
     * @default true
     * @example
     * ```typescript
     * // Использовать стандартные звуки
     * sound.isUsedStandardSound = true;
     *
     * // Использовать только пользовательские звуки
     * sound.isUsedStandardSound = false;
     * ```
     */
    public isUsedStandardSound: boolean;

    /**
     * Конструктор класса Sound.
     * Инициализирует пустой массив звуков и включает использование стандартных звуков.
     *
     * @example
     * ```typescript
     * const sound = new Sound();
     * // sound.sounds = []
     * // sound.isUsedStandardSound = true
     * ```
     */
    public constructor() {
        this.sounds = [];
        this.isUsedStandardSound = true;
    }

    /**
     * Получает текст с встроенными звуками для конкретной платформы.
     *
     * Процесс работы:
     * 1. Проверяет наличие текста
     * 2. Определяет тип приложения
     * 3. Создает соответствующий обработчик звуков
     * 4. Применяет звуки к тексту
     *
     * Поддерживаемые платформы:
     *
     * Алиса:
     * - Возвращает текст в формате SSML
     * - Поддерживает стандартные звуки через <speaker audio="...">
     * - Поддерживает эффекты синтеза речи
     *
     * Маруся:
     * - Возвращает текст в формате SSML
     * - Поддерживает стандартные звуки через <speaker audio="...">
     * - Поддерживает эффекты синтеза речи
     *
     * VK:
     * - Возвращает объект с текстом и attachment для аудио
     * - Поддерживает аудиосообщения и обычные аудиофайлы
     *
     * Telegram:
     * - Возвращает массив сообщений с текстом и аудио
     * - Поддерживает голосовые сообщения и аудиофайлы
     *
     * Viber:
     * - Возвращает массив сообщений с текстом и аудио
     * - Поддерживает только аудиофайлы
     *
     * @param {string | null} text - Исходный текст для обработки
     * @param {TemplateSoundTypes | null} [userSound=null] - Пользовательский класс для обработки звуков
     * @returns {Promise<any>} Текст с встроенными звуками или исходный текст
     *
     * @example
     * ```typescript
     * // Алиса: SSML с эффектами
     * const sound = new Sound();
     * sound.sounds = [
     *     { type: 'audio', speaker: 'alice-sounds-game-win-1' },
     *     { type: 'tts', text: '<speaker effect="pitch_down">Победа!</speaker>' }
     * ];
     * const result = await sound.getSounds('Поздравляю!');
     * // <speak>
     * //   <speaker audio="alice-sounds-game-win-1"/>
     * //   <speaker effect="pitch_down">Победа!</speaker>
     * //   Поздравляю!
     * // </speak>
     *
     * // VK: Аудиосообщение с текстом
     * sound.sounds = [
     *     { type: 'audio_message', audio_id: '123456_789012' }
     * ];
     * const result = await sound.getSounds('Слушайте!');
     * // {
     * //   message: 'Слушайте!',
     * //   attachment: 'audio_message123456_789012'
     * // }
     *
     * // Telegram: Голосовое сообщение
     * sound.sounds = [
     *     { type: 'voice', file_id: 'AwADBAADbXXX' }
     * ];
     * const result = await sound.getSounds('Внимание!');
     * // [
     * //   { type: 'voice', voice: 'AwADBAADbXXX' },
     * //   { type: 'text', text: 'Внимание!' }
     * // ]
     * ```
     */
    public async getSounds(
        text: string | null,
        userSound: TemplateSoundTypes | null = null,
    ): Promise<any> {
        if (!text) {
            return '';
        }
        let sound: any = null;
        switch (mmApp.appType) {
            case T_ALISA:
                sound = new AlisaSound();
                sound.isUsedStandardSound = this.isUsedStandardSound;
                break;

            case T_MARUSIA:
                sound = new MarusiaSound();
                sound.isUsedStandardSound = this.isUsedStandardSound;
                break;

            case T_VK:
                sound = new VkSound();
                break;

            case T_TELEGRAM:
                sound = new TelegramSound();
                break;

            case T_VIBER:
                sound = new ViberSound();
                break;

            case T_SMARTAPP:
                sound = null;
                break;

            case T_USER_APP:
                sound = userSound;
                break;
        }
        if (sound) {
            return await sound.getSounds(this.sounds, text);
        }
        return text;
    }
}
