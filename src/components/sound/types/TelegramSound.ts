import { TemplateSoundTypes } from './TemplateSoundTypes';
import { ISound } from '../interfaces';
import { Text, isFile } from '../../../utils';
import { mmApp } from '../../../mmApp';
import { TelegramRequest, TTelegramChatId, YandexSpeechKit } from '../../../api';
import { SoundTokens } from '../../../models/SoundTokens';

/**
 * @class TelegramSound
 * Класс для работы со звуками в платформе Telegram
 *
 * Предоставляет функциональность для:
 * - Отправки аудиофайлов в Telegram
 * - Преобразования текста в речь (TTS) через Yandex SpeechKit
 * - Отправки голосовых сообщений
 *
 * Основные возможности:
 * - Поддержка различных форматов аудио (MP3, WAV, OGG)
 * - Преобразование текста в речь через Yandex SpeechKit
 * - Отправка аудиофайлов по URL или из локального хранилища
 * - Поддержка голосовых сообщений
 *
 * @example
 * ```typescript
 * const telegramSound = new TelegramSound();
 *
 * // Отправка аудиофайла
 * const result = await telegramSound.getSounds([
 *     { key: 'music', sounds: ['path/to/music.mp3'] }
 * ]);
 *
 * // Преобразование текста в речь и отправка
 * const result = await telegramSound.getSounds([], 'Привет, это голосовое сообщение!');
 * ```
 */
export class TelegramSound implements TemplateSoundTypes {
    /**
     * Обрабатывает звуки и текст для отправки в Telegram
     *
     * @param {ISound[]} sounds - Массив звуков для обработки:
     * - key: уникальный идентификатор звука
     * - sounds: массив путей к звуковым файлам
     * @param {string} [text=''] - Исходный текст для TTS (опционально)
     * @returns {Promise<string[]>} - Массив идентификаторов отправленных аудио
     *
     * Правила обработки:
     * - Если передан текст, он преобразуется в речь через Yandex SpeechKit
     * - Если переданы звуки, они отправляются как аудиофайлы
     * - Поддерживаются локальные файлы и URL
     * - Для локальных файлов создается токен через SoundTokens
     *
     * @example
     * ```typescript
     * const telegramSound = new TelegramSound();
     *
     * // Отправка аудиофайла по URL
     * const result = await telegramSound.getSounds([
     *     { key: 'music', sounds: ['https://example.com/music.mp3'] }
     * ]);
     *
     * // Отправка локального аудиофайла
     * const result = await telegramSound.getSounds([
     *     { key: 'voice', sounds: ['/path/to/voice.ogg'] }
     * ]);
     *
     * // Преобразование текста в речь
     * const result = await telegramSound.getSounds([], 'Привет, это голосовое сообщение!');
     *
     * // Комбинирование звуков и текста
     * const result = await telegramSound.getSounds([
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
                    if (sound.sounds && sound.key) {
                        let sText: string | null = Text.getText(sound.sounds);
                        if (isFile(sText) || Text.isUrl(sText)) {
                            const sModel = new SoundTokens();
                            sModel.type = SoundTokens.T_TELEGRAM;
                            sModel.path = sText;
                            sText = await sModel.getToken();
                        } else {
                            await new TelegramRequest().sendAudio(
                                mmApp.params.user_id as TTelegramChatId,
                                sText,
                            );
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
            if (content) {
                await new TelegramRequest().sendAudio(
                    mmApp.params.user_id as TTelegramChatId,
                    content,
                );
            }
        }
        return data;
    }
}
