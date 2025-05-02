import { TemplateSoundTypes } from './TemplateSoundTypes';
import { ISound } from '../interfaces';
import { Text } from '../../../utils/standard/Text';
import { mmApp } from '../../../mmApp';
import { ViberRequest } from '../../../api/ViberRequest';

/**
 * @class ViberSound
 * Класс для работы со звуками в платформе Viber
 *
 * Предоставляет функциональность для:
 * - Отправки аудиофайлов в Viber
 * - Отправки голосовых сообщений
 *
 * Основные возможности:
 * - Поддержка различных форматов аудио (MP3, WAV, OGG)
 * - Отправка аудиофайлов по URL или из локального хранилища
 * - Поддержка голосовых сообщений
 *
 * @example
 * ```typescript
 * const viberSound = new ViberSound();
 *
 * // Отправка аудиофайла
 * const result = await viberSound.getSounds([
 *     { key: 'music', sounds: ['path/to/music.mp3'] }
 * ]);
 * ```
 */
export class ViberSound implements TemplateSoundTypes {
    /**
     * Обрабатывает звуки для отправки в Viber
     *
     * @param {ISound[]} sounds - Массив звуков для обработки:
     *                           - key: уникальный идентификатор звука
     *                           - sounds: массив путей к звуковым файлам
     * @param {string} [_=''] - Исходный текст (не используется)
     * @returns {Promise<string[]>} - Пустой массив (звуки отправляются напрямую)
     *
     * Правила обработки:
     * - Звуки отправляются как файлы через ViberRequest
     * - Поддерживаются локальные файлы и URL
     * - Текст в параметре text игнорируется
     *
     * @example
     * ```typescript
     * const viberSound = new ViberSound();
     *
     * // Отправка аудиофайла по URL
     * const result = await viberSound.getSounds([
     *     { key: 'music', sounds: ['https://example.com/music.mp3'] }
     * ]);
     *
     * // Отправка локального аудиофайла
     * const result = await viberSound.getSounds([
     *     { key: 'voice', sounds: ['/path/to/voice.ogg'] }
     * ]);
     *
     * // Отправка нескольких аудиофайлов
     * const result = await viberSound.getSounds([
     *     { key: 'intro', sounds: ['/path/to/intro.mp3'] },
     *     { key: 'main', sounds: ['/path/to/main.mp3'] }
     * ]);
     * ```
     */
    public async getSounds(sounds: ISound[], _: string = ''): Promise<string[]> {
        if (sounds) {
            sounds.forEach((sound) => {
                if (sound) {
                    if (typeof sound.sounds !== 'undefined' && typeof sound.key !== 'undefined') {
                        const sText = Text.getText(sound.sounds);
                        new ViberRequest().sendFile(<string>mmApp.params.user_id, sText);
                    }
                }
            });
        }
        /*
        if (text) {
            speechKit = new YandexSpeechKit();
            content = speechKit.getTts(text);
            if (content) {
                (new ViberRequest()).sendFile(mmApp.params['user_id'], content);
            }
        }*/
        return [];
    }
}
