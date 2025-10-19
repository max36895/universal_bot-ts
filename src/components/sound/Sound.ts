import { TemplateSoundTypes } from './types/TemplateSoundTypes';
import { AlisaSound } from './types/AlisaSound';
import { TelegramSound } from './types/TelegramSound';
import { VkSound } from './types/VkSound';
import { ViberSound } from './types/ViberSound';
import { ISound } from './interfaces';
import { MarusiaSound } from './types/MarusiaSound';
import {
    AppContext,
    T_ALISA,
    T_MARUSIA,
    T_SMARTAPP,
    T_TELEGRAM,
    T_USER_APP,
    T_VIBER,
    T_VK,
    T_MAXAPP,
} from '../../core/AppContext';

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
 * // Использование своих звуков
 * sound.sounds = [
 *     // Звук колокольчика
 *     {
 *         key: '#myKey#',
 *         sounds: ['<speaker audio="alice-xxx">']
 *     },
 * ];
 * // Получение текста со звуками
 * const result = await sound.getSounds('Текст сообщения #myKey#');
 * ```
 */
export class Sound {
    /**
     * Массив звуков для воспроизведения.
     * Каждый элемент массива представляет собой объект с параметрами звука.
     *
     * @type {ISound[]}
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
     * Контекст приложения.
     */
    protected _appContext: AppContext;

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
    public constructor(appContext: AppContext) {
        this.sounds = [];
        this.isUsedStandardSound = true;
        this._appContext = appContext;
    }

    /**
     * Устанавливает контекст приложения
     * @param appContext
     */
    public setAppContext(appContext: AppContext): Sound {
        this._appContext = appContext;
        return this;
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
     * @param {string | null} text - Исходный текст для обработки
     * @param {TemplateSoundTypes | null} [userSound=null] - Пользовательский класс для обработки звуков
     * @returns {Promise<any>} Текст с встроенными звуками или исходный текст
     *
     * @example
     * ```typescript
     * const sound = new Sound();
     * sound.sounds = [
     *     { key: 'mySound', sounds: ['my_sound'] },
     * ];
     * const result = await sound.getSounds('mySound');
     * // my_sound
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
        switch (this._appContext.appType) {
            case T_ALISA:
                sound = new AlisaSound(this._appContext);
                sound.isUsedStandardSound = this.isUsedStandardSound;
                break;

            case T_MARUSIA:
                sound = new MarusiaSound(this._appContext);
                sound.isUsedStandardSound = this.isUsedStandardSound;
                break;

            case T_VK:
                sound = new VkSound(this._appContext);
                break;

            case T_TELEGRAM:
                sound = new TelegramSound(this._appContext);
                break;

            case T_VIBER:
                sound = new ViberSound(this._appContext);
                break;

            case T_SMARTAPP:
                sound = null;
                break;

            case T_MAXAPP:
                sound = null;
                break;

            case T_USER_APP:
                sound = userSound;
                break;
        }
        if (sound) {
            const res = await sound.getSounds(this.sounds, text);
            if (res) {
                return res.replace(/((?:^|\s)#\w+#(?:\s|$))/g, '');
            }
            return res;
        }
        return text;
    }
}
