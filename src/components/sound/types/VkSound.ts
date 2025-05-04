import { ISound } from '../interfaces';
import { TemplateSoundTypes } from './TemplateSoundTypes';
import { Text, isFile } from '../../../utils';
import { SoundTokens } from '../../../models/SoundTokens';
import { YandexSpeechKit } from '../../../api/YandexSpeechKit';

/**
 * @class VkSound
 * Класс для работы со звуками в платформе ВКонтакте
 *
 * Предоставляет функциональность для:
 * - Отправки аудиофайлов во ВКонтакте
 * - Преобразования текста в речь (TTS) через Yandex SpeechKit
 * - Отправки голосовых сообщений
 *
 * Основные возможности:
 * - Поддержка различных форматов аудио (MP3, WAV, OGG)
 * - Преобразование текста в речь через Yandex SpeechKit
 * - Отправка аудиофайлов по URL или из локального хранилища
 * - Поддержка голосовых сообщений
 * - Создание токенов для аудиофайлов через SoundTokens
 *
 * @example
 * ```typescript
 * const vkSound = new VkSound();
 *
 * // Отправка аудиофайла
 * const result = await vkSound.getSounds([
 *     { key: 'music', sounds: ['path/to/music.mp3'] }
 * ]);
 *
 * // Преобразование текста в речь и отправка
 * const result = await vkSound.getSounds([], 'Привет, это голосовое сообщение!');
 * ```
 */
export class VkSound implements TemplateSoundTypes {
    /**
     * Обрабатывает звуки и текст для отправки во ВКонтакте
     *
     * @param {ISound[]} sounds - Массив звуков для обработки:
     * - key: уникальный идентификатор звука
     * - sounds: массив путей к звуковым файлам
     * @param {string} [text=''] - Исходный текст для TTS (опционально)
     * @returns {Promise<string[]>} - Массив токенов для отправленных аудио
     *
     * Правила обработки:
     * - Если передан текст, он преобразуется в речь через Yandex SpeechKit
     * - Если переданы звуки, они отправляются как аудиофайлы
     * - Поддерживаются локальные файлы и URL
     * - Для всех аудио создаются токены через SoundTokens
     * - Токены имеют тип T_VK
     *
     * @example
     * ```typescript
     * const vkSound = new VkSound();
     *
     * // Отправка аудиофайла по URL
     * const result = await vkSound.getSounds([
     *     { key: 'music', sounds: ['https://example.com/music.mp3'] }
     * ]);
     *
     * // Отправка локального аудиофайла
     * const result = await vkSound.getSounds([
     *     { key: 'voice', sounds: ['/path/to/voice.ogg'] }
     * ]);
     *
     * // Преобразование текста в речь
     * const result = await vkSound.getSounds([], 'Привет, это голосовое сообщение!');
     *
     * // Комбинирование звуков и текста
     * const result = await vkSound.getSounds([
     *     { key: 'intro', sounds: ['/path/to/intro.mp3'] }
     * ], 'А теперь послушайте сообщение');
     * ```
     */
    public async getSounds(sounds: ISound[], text: string = ''): Promise<string[]> {
        const data: string[] = [];
        if (sounds) {
            for (let i = 0; i < sounds.length; i++) {
                const sound = sounds[i];
                if (sound) {
                    if (typeof sound.sounds !== 'undefined' && typeof sound.key !== 'undefined') {
                        let sText: string | null = Text.getText(sound.sounds);
                        if (isFile(sText) || Text.isUrl(sText)) {
                            const sModel = new SoundTokens();
                            sModel.type = SoundTokens.T_VK;
                            sModel.path = sText;
                            sText = await sModel.getToken();
                        }

                        if (sText) {
                            data.push(sText);
                        }
                    }
                }
            }
        }
        if (text) {
            const speechKit = new YandexSpeechKit();
            const content = await speechKit.getTts(text);
            let sText = null;
            if (content) {
                const sModel = new SoundTokens();
                sModel.type = SoundTokens.T_VK;
                sModel.isAttachContent = true;
                sModel.path = content;
                sText = await sModel.getToken();
            }
            if (sText) {
                data.push(sText);
            }
        }
        return data;
    }
}
