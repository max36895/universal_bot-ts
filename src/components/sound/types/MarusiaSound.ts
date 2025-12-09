import { TemplateSoundTypes } from './TemplateSoundTypes';
import { ISound } from '../interfaces';
import { Text, isFile } from '../../../utils';
import { SoundTokens } from '../../../models/SoundTokens';

/**
 * Массив стандартных звуков Маруси
 *
 * Содержит предопределенные звуки для различных категорий:
 * - Игровые звуки (победа, поражение, монеты и др.)
 * - Природные звуки (ветер, гром, дождь и др.)
 * - Звуки предметов (телефон, дверь, колокол и др.)
 * - Звуки животных (кошка, собака, лошадь и др.)
 */
const STANDARD_SOUNDS: ISound[] = [
    {
        key: '#game_win#',
        sounds: [
            '<speaker audio="marusia-sounds/game-win-1">',
            '<speaker audio="marusia-sounds/game-win-2">',
            '<speaker audio="marusia-sounds/game-win-3">',
        ],
    },
    {
        key: '#game_loss#',
        sounds: [
            '<speaker audio="marusia-sounds/game-loss-1">',
            '<speaker audio="marusia-sounds/game-loss-2">',
            '<speaker audio="marusia-sounds/game-loss-3">',
        ],
    },
    {
        key: '#game_boot#',
        sounds: ['<speaker audio="marusia-sounds/game-boot-1">'],
    },
    {
        key: '#game_coin#',
        sounds: [
            '<speaker audio="marusia-sounds/game-8-bit-coin-1">',
            '<speaker audio="marusia-sounds/game-8-bit-coin-2">',
        ],
    },
    {
        key: '#game_ping#',
        sounds: ['<speaker audio="marusia-sounds/game-ping-1">'],
    },
    {
        key: '#game_fly#',
        sounds: ['<speaker audio="marusia-sounds/game-8-bit-flyby-1">'],
    },
    {
        key: '#game_gun#',
        sounds: ['<speaker audio="marusia-sounds/game-8-bit-machine-gun-1">'],
    },
    {
        key: '#game_phone#',
        sounds: ['<speaker audio="marusia-sounds/game-8-bit-phone-1">'],
    },
    {
        key: '#game_powerup#',
        sounds: [
            '<speaker audio="marusia-sounds/game-powerup-1">',
            '<speaker audio="marusia-sounds/game-powerup-2">',
        ],
    },
    {
        key: '#nature_wind#',
        sounds: [
            '<speaker audio="marusia-sounds/nature-wind-1">',
            '<speaker audio="marusia-sounds/nature-wind-2">',
        ],
    },
    {
        key: '#nature_thunder#',
        sounds: [
            '<speaker audio="marusia-sounds/nature-thunder-1">',
            '<speaker audio="marusia-sounds/nature-thunder-2">',
        ],
    },
    {
        key: '#nature_jungle#',
        sounds: [
            '<speaker audio="marusia-sounds/nature-jungle-1">',
            '<speaker audio="marusia-sounds/nature-jungle-2">',
        ],
    },
    {
        key: '#nature_rain#',
        sounds: [
            '<speaker audio="marusia-sounds/nature-rain-1">',
            '<speaker audio="marusia-sounds/nature-rain-2">',
        ],
    },
    {
        key: '#nature_forest#',
        sounds: [
            '<speaker audio="marusia-sounds/nature-forest-1">',
            '<speaker audio="marusia-sounds/nature-forest-2">',
        ],
    },
    {
        key: '#nature_sea#',
        sounds: [
            '<speaker audio="marusia-sounds/nature-sea-1">',
            '<speaker audio="marusia-sounds/nature-sea-2">',
        ],
    },
    {
        key: '#nature_fire#',
        sounds: [
            '<speaker audio="marusia-sounds/nature-fire-1">',
            '<speaker audio="marusia-sounds/nature-fire-2">',
        ],
    },
    {
        key: '#nature_stream#',
        sounds: [
            '<speaker audio="marusia-sounds/nature-stream-1">',
            '<speaker audio="marusia-sounds/nature-stream-2">',
        ],
    },
    {
        key: '#thing_chainsaw#',
        sounds: [
            '<speaker audio="marusia-sounds/things-chainsaw-1">',
            '<speaker audio="marusia-sounds/things-explosion-1">',
            '<speaker audio="marusia-sounds/things-water-3">',
            '<speaker audio="marusia-sounds/things-water-1">',
            '<speaker audio="marusia-sounds/things-water-2">',
            '<speaker audio="marusia-sounds/things-switch-1">',
            '<speaker audio="marusia-sounds/things-switch-2">',
            '<speaker audio="marusia-sounds/things-gun-1">',
            '<speaker audio="marusia-sounds/transport-ship-horn-1">',
            '<speaker audio="marusia-sounds/transport-ship-horn-2">',
            '<speaker audio="marusia-sounds/things-door-1">',
            '<speaker audio="marusia-sounds/things-door-2">',
            '<speaker audio="marusia-sounds/things-glass-2">',
            '<speaker audio="marusia-sounds/things-bell-1">',
            '<speaker audio="marusia-sounds/things-bell-2">',
            '<speaker audio="marusia-sounds/things-car-1">',
            '<speaker audio="marusia-sounds/things-car-2">',
            '<speaker audio="marusia-sounds/things-sword-2">',
            '<speaker audio="marusia-sounds/things-sword-1">',
            '<speaker audio="marusia-sounds/things-sword-3">',
            '<speaker audio="marusia-sounds/things-siren-1">',
            '<speaker audio="marusia-sounds/things-siren-2">',
            '<speaker audio="marusia-sounds/things-old-phone-1">',
            '<speaker audio="marusia-sounds/things-old-phone-2">',
            '<speaker audio="marusia-sounds/things-glass-1">',
            '<speaker audio="marusia-sounds/things-construction-2">',
            '<speaker audio="marusia-sounds/things-construction-1">',
            '<speaker audio="marusia-sounds/things-phone-1">',
            '<speaker audio="marusia-sounds/things-phone-2">',
            '<speaker audio="marusia-sounds/things-phone-3">',
            '<speaker audio="marusia-sounds/things-phone-4">',
            '<speaker audio="marusia-sounds/things-phone-5">',
            '<speaker audio="marusia-sounds/things-toilet-1">',
            '<speaker audio="marusia-sounds/things-cuckoo-clock-2">',
            '<speaker audio="marusia-sounds/things-cuckoo-clock-1">',
        ],
    },
    {
        key: '#animals_all#',
        sounds: [
            '<speaker audio="marusia-sounds/animals-wolf-1">',
            '<speaker audio="marusia-sounds/animals-crow-1">',
            '<speaker audio="marusia-sounds/animals-crow-2">',
            '<speaker audio="marusia-sounds/animals-cow-1">',
            '<speaker audio="marusia-sounds/animals-cow-2">',
            '<speaker audio="marusia-sounds/animals-cow-3">',
            '<speaker audio="marusia-sounds/animals-cat-1">',
            '<speaker audio="marusia-sounds/animals-cat-2">',
            '<speaker audio="marusia-sounds/animals-cat-3">',
            '<speaker audio="marusia-sounds/animals-cat-4">',
            '<speaker audio="marusia-sounds/animals-cat-5">',
            '<speaker audio="marusia-sounds/animals-cuckoo-1">',
            '<speaker audio="marusia-sounds/animals-chicken-1">',
            '<speaker audio="marusia-sounds/animals-lion-1">',
            '<speaker audio="marusia-sounds/animals-lion-2">',
            '<speaker audio="marusia-sounds/animals-horse-1">',
            '<speaker audio="marusia-sounds/animals-horse-2">',
            '<speaker audio="marusia-sounds/animals-horse-galloping-1">',
            '<speaker audio="marusia-sounds/animals-horse-walking-1">',
            '<speaker audio="marusia-sounds/animals-frog-1">',
            '<speaker audio="marusia-sounds/animals-seagull-1">',
            '<speaker audio="marusia-sounds/animals-monkey-1">',
            '<speaker audio="marusia-sounds/animals-sheep-1">',
            '<speaker audio="marusia-sounds/animals-sheep-2">',
            '<speaker audio="marusia-sounds/animals-rooster-1">',
            '<speaker audio="marusia-sounds/animals-elephant-1">',
            '<speaker audio="marusia-sounds/animals-elephant-2">',
            '<speaker audio="marusia-sounds/animals-dog-1">',
            '<speaker audio="marusia-sounds/animals-dog-2">',
            '<speaker audio="marusia-sounds/animals-dog-3">',
            '<speaker audio="marusia-sounds/animals-dog-4">',
            '<speaker audio="marusia-sounds/animals-dog-5">',
            '<speaker audio="marusia-sounds/animals-owl-1">',
            '<speaker audio="marusia-sounds/animals-owl-2">',
        ],
    },
    {
        key: '#human_all#',
        sounds: [
            '<speaker audio="marusia-sounds/human-cheer-1">',
            '<speaker audio="marusia-sounds/human-cheer-2">',
            '<speaker audio="marusia-sounds/human-kids-1">',
            '<speaker audio="marusia-sounds/human-walking-dead-1">',
            '<speaker audio="marusia-sounds/human-walking-dead-2">',
            '<speaker audio="marusia-sounds/human-walking-dead-3">',
            '<speaker audio="marusia-sounds/human-cough-1">',
            '<speaker audio="marusia-sounds/human-cough-2">',
            '<speaker audio="marusia-sounds/human-laugh-1">',
            '<speaker audio="marusia-sounds/human-laugh-2">',
            '<speaker audio="marusia-sounds/human-laugh-3">',
            '<speaker audio="marusia-sounds/human-laugh-4">',
            '<speaker audio="marusia-sounds/human-laugh-5">',
            '<speaker audio="marusia-sounds/human-crowd-1">',
            '<speaker audio="marusia-sounds/human-crowd-2">',
            '<speaker audio="marusia-sounds/human-crowd-3">',
            '<speaker audio="marusia-sounds/human-crowd-4">',
            '<speaker audio="marusia-sounds/human-crowd-5">',
            '<speaker audio="marusia-sounds/human-crowd-7">',
            '<speaker audio="marusia-sounds/human-crowd-6">',
            '<speaker audio="marusia-sounds/human-sneeze-1">',
            '<speaker audio="marusia-sounds/human-sneeze-2">',
            '<speaker audio="marusia-sounds/human-walking-room-1">',
            '<speaker audio="marusia-sounds/human-walking-snow-1">',
        ],
    },
];

/**
 * @class MarusiaSound
 * Класс для работы со звуками в платформе Маруся
 *
 * Предоставляет функциональность для:
 * - Воспроизведения стандартных звуков Маруси
 * - Преобразования текста в речь (TTS)
 * - Управления паузами в речи
 * - Замены звуковых токенов в тексте
 *
 * Основные возможности:
 * - Поддержка стандартных звуков Маруси (игры, природа, предметы, животные)
 * - Управление паузами в речи
 * - Замена звуковых токенов в тексте
 * - Поддержка пользовательских звуков
 *
 * @example
 * ```typescript
 * const marusiaSound = new MarusiaSound();
 *
 * // Воспроизведение стандартного звука
 * const result = await marusiaSound.getSounds([
 *     { key: '#game_win#', sounds: [] }
 * ], 'Поздравляем с победой!');
 * ```
 */
export class MarusiaSound extends TemplateSoundTypes {
    /**
     * Флаг использования стандартных звуков Маруси
     *
     * При значении true используются стандартные звуки Маруси,
     * при false - только пользовательские звуки
     *
     * @default true
     *
     * @example
     * ```typescript
     * const marusiaSound = new MarusiaSound();
     * marusiaSound.isUsedStandardSound = false; // Отключение стандартных звуков
     * ```
     */
    public isUsedStandardSound: boolean = true;

    /**
     * Воспроизвести звук загрузки
     */
    public static readonly S_AUDIO_GAME_BOOT = '#game_boot#';
    /**
     * Воспроизвести звук получения очка
     */
    public static readonly S_AUDIO_GAME_8_BIT_COIN = '#game_coin#';
    /**
     * Воспроизвести звук поражения
     */
    public static readonly S_AUDIO_GAME_LOSS = '#game_loss#';
    /**
     * Воспроизвести звук ping
     */
    public static readonly S_AUDIO_GAME_PING = '#game_ping#';
    /**
     * Воспроизвести звук победы
     */
    public static readonly S_AUDIO_GAME_WIN = '#game_win#';
    /**
     * Воспроизвести звук полета
     */
    public static readonly S_AUDIO_GAME_8_BIT_FLYBY = '#game_fly#';
    /**
     * Воспроизвести звук выстрела
     */
    public static readonly S_AUDIO_GAME_8_BIT_MACHINE_GUN = '#game_gun#';
    /**
     * Воспроизвести звук звонка телефона
     */
    public static readonly S_AUDIO_GAME_8_BIT_PHONE = '#games_phone#';
    /**
     * Воспроизвести звук powerup
     */
    public static readonly S_AUDIO_GAME_POWERUP = '#games_powerup#';

    /**
     * Воспроизвести звук ветра
     */
    public static readonly S_AUDIO_NATURE_WIND = '#nature_wind#';
    /**
     * Воспроизвести звук молнии
     */
    public static readonly S_AUDIO_NATURE_THUNDER = '#nature_thunder#';
    /**
     * Воспроизвести звук jungle
     */
    public static readonly S_AUDIO_NATURE_JUNGLE = '#nature_jungle#';
    /**
     * Воспроизвести звук дождя
     */
    public static readonly S_AUDIO_NATURE_RAIN = '#nature_rain#';
    /**
     * Воспроизвести звук леса
     */
    public static readonly S_AUDIO_NATURE_FOREST = '#nature_forest#';
    /**
     * Воспроизвести звук моря
     */
    public static readonly S_AUDIO_NATURE_SEA = '#nature_sea#';
    /**
     * Воспроизвести звук огня
     */
    public static readonly S_AUDIO_NATURE_FIRE = '#nature_fire#';
    /**
     * Воспроизвести звук потока
     */
    public static readonly S_AUDIO_NATURE_STREAM = '#nature_stream#';

    /**
     * Обрабатывает звуки и текст для воспроизведения в Марусе
     *
     * @param {ISound[]} sounds - Массив звуков для обработки
     * @param {string} text - Исходный текст для TTS
     * @returns {Promise<string>} - Обработанный текст со звуками
     *
     * Правила обработки:
     * - Если передан текст, он имеет приоритет над звуками
     * - Если звуки не найдены, возвращается исходный текст
     * - Стандартные звуки добавляются только если isUsedStandardSound = true
     *
     * @example
     * ```typescript
     * const marusiaSound = new MarusiaSound();
     *
     * // Воспроизведение стандартного звука с текстом
     * const result = await marusiaSound.getSounds([
     *     { key: MarusiaSound.S_AUDIO_GAME_WIN, sounds: [] }
     * ], 'Поздравляем с победой!');
     *
     * // Воспроизведение пользовательского звука
     * const result = await marusiaSound.getSounds([
     *     { key: 'custom', sounds: ['path/to/sound'] }
     * ], 'Текст с пользовательским звуком');
     * ```
     */
    public async getSounds(sounds: ISound[], text: string): Promise<string> {
        let updSounds: ISound[] = [];
        if (sounds.length) {
            updSounds = [...sounds, ...(this.isUsedStandardSound ? STANDARD_SOUNDS : [])];
        } else if (this.isUsedStandardSound) {
            updSounds = STANDARD_SOUNDS;
        }
        let res = text;
        if (updSounds.length) {
            for (let i = 0; i < updSounds.length; i++) {
                const sound = updSounds[i];
                if (typeof sound === 'object') {
                    if (typeof sound.sounds !== 'undefined' && typeof sound.key !== 'undefined') {
                        let sText: string = Text.getText(sound.sounds);
                        /*
                         * Не стоит так делать, так как нужно время, пока Vk обработает звуковую дорожку.
                         * Лучше загружать звуки через консоль администратора!
                         * @see (https://vk.ru/dev/marusia_skill_docs10) Смотри тут
                         */
                        if (isFile(sText) || Text.isUrl(sText)) {
                            const sModel = new SoundTokens(this._appContext);
                            sModel.type = SoundTokens.T_MARUSIA;
                            sModel.path = sText;
                            sText = `<speaker audio_vk_id="${await sModel.getToken()}">`;
                        }

                        if (sText) {
                            res = MarusiaSound.replaceSound(sound.key, sText, res);
                        }
                    }
                }
            }
        }
        return res;
    }

    /**
     * Заменяет звуковой токен в тексте на соответствующий звук
     *
     * @param {string} key - Ключ звука для замены
     * @param {string | string[]} value - Значение или массив значений для замены
     * @param {string} text - Исходный текст
     * @returns {string} - Текст с замененными звуками
     *
     * @example
     * ```typescript
     * // Замена одиночного звука
     * const text = MarusiaSound.replaceSound(
     *     '#game_win#',
     *     '<speaker audio="marusia-sounds/game-win-1">',
     *     'Поздравляем #game_win# с победой!'
     * );
     *
     * // Замена на массив звуков
     * const text = MarusiaSound.replaceSound(
     *     '#nature_rain#',
     *     [
     *         '<speaker audio="marusia-sounds/nature-rain-1">',
     *         '<speaker audio="marusia-sounds/nature-rain-2">'
     *     ],
     *     'На улице #nature_rain# идет дождь'
     * );
     * ```
     */
    public static replaceSound(key: string, value: string | string[], text: string): string {
        if (text.includes(key)) {
            return Text.textReplace(key, value, text);
        }
        return text;
    }

    /**
     * Удаляет все звуковые токены из текста
     *
     * @param {string} text - Исходный текст
     * @returns {string} - Текст без звуковых токенов
     *
     * @example
     * ```typescript
     * // Удаление звуковых токенов
     * const text = MarusiaSound.removeSound('Текст #game_win# без #nature_rain# звуков');
     * // Результат: 'Текст без звуков'
     * ```
     */
    public static removeSound(text: string): string {
        if (text.includes('speaker')) {
            return text.replace(
                /(<speaker audio="([^"]+)">)|(<speaker audio_vk_id="([^"]+)">)/gimu,
                '',
            );
        }
        return text;
    }
}
