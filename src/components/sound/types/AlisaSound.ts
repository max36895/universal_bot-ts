import { TemplateSoundTypes } from './TemplateSoundTypes';
import { ISound } from '../interfaces';
import { Text, isFile } from '../../../utils';
import { SoundTokens } from '../../../models/SoundTokens';

/**
 * Массив стандартных звуков Алисы
 *
 * Содержит предопределенные звуки для различных категорий:
 * - Игровые звуки (победа, поражение, монеты и др.)
 * - Природные звуки (ветер, гром, дождь и др.)
 * - Звуки предметов (телефон, дверь, колокол и др.)
 * - Звуки животных
 */
const STANDARD_SOUNDS: ISound[] = [
    {
        key: '#game_win#',
        sounds: [
            '<speaker audio="alice-sounds-game-win-1.opus">',
            '<speaker audio="alice-sounds-game-win-2.opus">',
            '<speaker audio="alice-sounds-game-win-3.opus">',
        ],
    },
    {
        key: '#game_loss#',
        sounds: [
            '<speaker audio="alice-sounds-game-loss-1.opus">',
            '<speaker audio="alice-sounds-game-loss-2.opus">',
            '<speaker audio="alice-sounds-game-loss-3.opus">',
        ],
    },
    {
        key: '#game_boot#',
        sounds: ['<speaker audio="alice-sounds-game-boot-1.opus">'],
    },
    {
        key: '#game_coin#',
        sounds: [
            '<speaker audio="alice-sounds-game-8-bit-coin-1.opus">',
            '<speaker audio="alice-sounds-game-8-bit-coin-2.opus">',
        ],
    },
    {
        key: '#game_ping#',
        sounds: ['<speaker audio="alice-sounds-game-ping-1.opus">'],
    },
    {
        key: '#game_fly#',
        sounds: ['<speaker audio="alice-sounds-game-8-bit-flyby-1.opus">'],
    },
    {
        key: '#game_gun#',
        sounds: ['<speaker audio="alice-sounds-game-8-bit-machine-gun-1.opus">'],
    },
    {
        key: '#game_phone#',
        sounds: ['<speaker audio="alice-sounds-game-8-bit-phone-1.opus">'],
    },
    {
        key: '#game_powerup#',
        sounds: [
            '<speaker audio="alice-sounds-game-powerup-1.opus">',
            '<speaker audio="alice-sounds-game-powerup-2.opus">',
        ],
    },
    {
        key: '#nature_wind#',
        sounds: [
            '<speaker audio="alice-sounds-nature-wind-1.opus">',
            '<speaker audio="alice-sounds-nature-wind-2.opus">',
        ],
    },
    {
        key: '#nature_thunder#',
        sounds: [
            '<speaker audio="alice-sounds-nature-thunder-1.opus">',
            '<speaker audio="alice-sounds-nature-thunder-2.opus">',
        ],
    },
    {
        key: '#nature_jungle#',
        sounds: [
            '<speaker audio="alice-sounds-nature-jungle-1.opus">',
            '<speaker audio="alice-sounds-nature-jungle-2.opus">',
        ],
    },
    {
        key: '#nature_rain#',
        sounds: [
            '<speaker audio="alice-sounds-nature-rain-1.opus">',
            '<speaker audio="alice-sounds-nature-rain-2.opus">',
        ],
    },
    {
        key: '##',
        sounds: [
            '<speaker audio="alice-sounds-nature-forest-1.opus">',
            '<speaker audio="alice-sounds-nature-forest-2.opus">',
        ],
    },
    {
        key: '#nature_sea#',
        sounds: [
            '<speaker audio="alice-sounds-nature-sea-1.opus">',
            '<speaker audio="alice-sounds-nature-sea-2.opus">',
        ],
    },
    {
        key: '#nature_fire#',
        sounds: [
            '<speaker audio="alice-sounds-nature-fire-1.opus">',
            '<speaker audio="alice-sounds-nature-fire-2.opus">',
        ],
    },
    {
        key: '#nature_stream#',
        sounds: [
            '<speaker audio="alice-sounds-nature-stream-1.opus">',
            '<speaker audio="alice-sounds-nature-stream-2.opus">',
        ],
    },
    {
        key: '#thing_chainsaw#',
        sounds: [
            '<speaker audio="alice-sounds-things-chainsaw-1.opus">',
            '<speaker audio="alice-sounds-things-explosion-1.opus">',
            '<speaker audio="alice-sounds-things-water-3.opus">',
            '<speaker audio="alice-sounds-things-water-1.opus">',
            '<speaker audio="alice-sounds-things-water-2.opus">',
            '<speaker audio="alice-sounds-things-switch-1.opus">',
            '<speaker audio="alice-sounds-things-switch-2.opus">',
            '<speaker audio="alice-sounds-things-gun-1.opus">',
            '<speaker audio="alice-sounds-transport-ship-horn-1.opus">',
            '<speaker audio="alice-sounds-transport-ship-horn-2.opus">',
            '<speaker audio="alice-sounds-things-door-1.opus">',
            '<speaker audio="alice-sounds-things-door-2.opus">',
            '<speaker audio="alice-sounds-things-glass-2.opus">',
            '<speaker audio="alice-sounds-things-bell-1.opus">',
            '<speaker audio="alice-sounds-things-bell-2.opus">',
            '<speaker audio="alice-sounds-things-car-1.opus">',
            '<speaker audio="alice-sounds-things-car-2.opus">',
            '<speaker audio="alice-sounds-things-sword-2.opus">',
            '<speaker audio="alice-sounds-things-sword-1.opus">',
            '<speaker audio="alice-sounds-things-sword-3.opus">',
            '<speaker audio="alice-sounds-things-siren-1.opus">',
            '<speaker audio="alice-sounds-things-siren-2.opus">',
            '<speaker audio="alice-sounds-things-old-phone-1.opus">',
            '<speaker audio="alice-sounds-things-old-phone-2.opus">',
            '<speaker audio="alice-sounds-things-glass-1.opus">',
            '<speaker audio="alice-sounds-things-construction-2.opus">',
            '<speaker audio="alice-sounds-things-construction-1.opus">',
            '<speaker audio="alice-sounds-things-phone-1.opus">',
            '<speaker audio="alice-sounds-things-phone-2.opus">',
            '<speaker audio="alice-sounds-things-phone-3.opus">',
            '<speaker audio="alice-sounds-things-phone-4.opus">',
            '<speaker audio="alice-sounds-things-phone-5.opus">',
            '<speaker audio="alice-sounds-things-toilet-1.opus">',
            '<speaker audio="alice-sounds-things-cuckoo-clock-2.opus">',
            '<speaker audio="alice-sounds-things-cuckoo-clock-1.opus">',
        ],
    },
    {
        key: '#animals_all#',
        sounds: [
            '<speaker audio="alice-sounds-animals-wolf-1.opus">',
            '<speaker audio="alice-sounds-animals-crow-1.opus">',
            '<speaker audio="alice-sounds-animals-crow-2.opus">',
            '<speaker audio="alice-sounds-animals-cow-1.opus">',
            '<speaker audio="alice-sounds-animals-cow-2.opus">',
            '<speaker audio="alice-sounds-animals-cow-3.opus">',
            '<speaker audio="alice-sounds-animals-cat-1.opus">',
            '<speaker audio="alice-sounds-animals-cat-2.opus">',
            '<speaker audio="alice-sounds-animals-cat-3.opus">',
            '<speaker audio="alice-sounds-animals-cat-4.opus">',
            '<speaker audio="alice-sounds-animals-cat-5.opus">',
            '<speaker audio="alice-sounds-animals-cuckoo-1.opus">',
            '<speaker audio="alice-sounds-animals-chicken-1.opus">',
            '<speaker audio="alice-sounds-animals-lion-1.opus">',
            '<speaker audio="alice-sounds-animals-lion-2.opus">',
            '<speaker audio="alice-sounds-animals-horse-1.opus">',
            '<speaker audio="alice-sounds-animals-horse-2.opus">',
            '<speaker audio="alice-sounds-animals-horse-galloping-1.opus">',
            '<speaker audio="alice-sounds-animals-horse-walking-1.opus">',
            '<speaker audio="alice-sounds-animals-frog-1.opus">',
            '<speaker audio="alice-sounds-animals-seagull-1.opus">',
            '<speaker audio="alice-sounds-animals-monkey-1.opus">',
            '<speaker audio="alice-sounds-animals-sheep-1.opus">',
            '<speaker audio="alice-sounds-animals-sheep-2.opus">',
            '<speaker audio="alice-sounds-animals-rooster-1.opus">',
            '<speaker audio="alice-sounds-animals-elephant-1.opus">',
            '<speaker audio="alice-sounds-animals-elephant-2.opus">',
            '<speaker audio="alice-sounds-animals-dog-1.opus">',
            '<speaker audio="alice-sounds-animals-dog-2.opus">',
            '<speaker audio="alice-sounds-animals-dog-3.opus">',
            '<speaker audio="alice-sounds-animals-dog-4.opus">',
            '<speaker audio="alice-sounds-animals-dog-5.opus">',
            '<speaker audio="alice-sounds-animals-owl-1.opus">',
            '<speaker audio="alice-sounds-animals-owl-2.opus">',
        ],
    },
    {
        key: '#human_all#',
        sounds: [
            '<speaker audio="alice-sounds-human-cheer-1.opus">',
            '<speaker audio="alice-sounds-human-cheer-2.opus">',
            '<speaker audio="alice-sounds-human-kids-1.opus">',
            '<speaker audio="alice-sounds-human-walking-dead-1.opus">',
            '<speaker audio="alice-sounds-human-walking-dead-2.opus">',
            '<speaker audio="alice-sounds-human-walking-dead-3.opus">',
            '<speaker audio="alice-sounds-human-cough-1.opus">',
            '<speaker audio="alice-sounds-human-cough-2.opus">',
            '<speaker audio="alice-sounds-human-laugh-1.opus">',
            '<speaker audio="alice-sounds-human-laugh-2.opus">',
            '<speaker audio="alice-sounds-human-laugh-3.opus">',
            '<speaker audio="alice-sounds-human-laugh-4.opus">',
            '<speaker audio="alice-sounds-human-laugh-5.opus">',
            '<speaker audio="alice-sounds-human-crowd-1.opus">',
            '<speaker audio="alice-sounds-human-crowd-2.opus">',
            '<speaker audio="alice-sounds-human-crowd-3.opus">',
            '<speaker audio="alice-sounds-human-crowd-4.opus">',
            '<speaker audio="alice-sounds-human-crowd-5.opus">',
            '<speaker audio="alice-sounds-human-crowd-7.opus">',
            '<speaker audio="alice-sounds-human-crowd-6.opus">',
            '<speaker audio="alice-sounds-human-sneeze-1.opus">',
            '<speaker audio="alice-sounds-human-sneeze-2.opus">',
            '<speaker audio="alice-sounds-human-walking-room-1.opus">',
            '<speaker audio="alice-sounds-human-walking-snow-1.opus">',
        ],
    },
    {
        key: '#music_all#',
        sounds: [
            '<speaker audio="alice-music-harp-1.opus">',
            '<speaker audio="alice-music-drums-1.opus">',
            '<speaker audio="alice-music-drums-2.opus">',
            '<speaker audio="alice-music-drums-3.opus">',
            '<speaker audio="alice-music-drum-loop-1.opus">',
            '<speaker audio="alice-music-drum-loop-2.opus">',
            '<speaker audio="alice-music-tambourine-80bpm-1.opus">',
            '<speaker audio="alice-music-tambourine-100bpm-1.opus">',
            '<speaker audio="alice-music-tambourine-120bpm-1.opus">',
            '<speaker audio="alice-music-bagpipes-1.opus">',
            '<speaker audio="alice-music-bagpipes-2.opus">',
            '<speaker audio="alice-music-guitar-c-1.opus">',
            '<speaker audio="alice-music-guitar-e-1.opus">',
            '<speaker audio="alice-music-guitar-g-1.opus">',
            '<speaker audio="alice-music-guitar-a-1.opus">',
            '<speaker audio="alice-music-gong-1.opus">',
            '<speaker audio="alice-music-gong-2.opus">',
            '<speaker audio="alice-music-horn-2.opus">',
            '<speaker audio="alice-music-violin-c-1.opus">',
            '<speaker audio="alice-music-violin-c-2.opus">',
            '<speaker audio="alice-music-violin-a-1.opus">',
            '<speaker audio="alice-music-violin-e-1.opus">',
            '<speaker audio="alice-music-violin-d-1.opus">',
            '<speaker audio="alice-music-violin-b-1.opus">',
            '<speaker audio="alice-music-violin-g-1.opus">',
            '<speaker audio="alice-music-violin-f-1.opus">',
            '<speaker audio="alice-music-horn-1.opus">',
            '<speaker audio="alice-music-piano-c-1.opus">',
            '<speaker audio="alice-music-piano-c-2.opus">',
            '<speaker audio="alice-music-piano-a-1.opus">',
            '<speaker audio="alice-music-piano-e-1.opus">',
            '<speaker audio="alice-music-piano-d-1.opus">',
            '<speaker audio="alice-music-piano-b-1.opus">',
            '<speaker audio="alice-music-piano-g-1.opus">',
        ],
    },
];

/**
 * @class AlisaSound
 * Класс для работы со звуками в платформе Алиса
 *
 * Предоставляет функциональность для:
 * - Воспроизведения стандартных звуков Алисы
 * - Применения звуковых эффектов к тексту
 * - Преобразования текста в речь (TTS)
 * - Управления паузами в речи
 *
 * Основные возможности:
 * - Поддержка стандартных звуков Алисы (игры, природа, предметы, животные)
 * - Применение звуковых эффектов (стена, хомяк, мегафон и др.)
 * - Управление паузами в речи
 * - Замена звуковых токенов в тексте
 * - Поддержка пользовательских звуков
 *
 * @example
 * ```typescript
 * const alisaSound = new AlisaSound();
 *
 * // Воспроизведение стандартного звука
 * const result = await alisaSound.getSounds([
 *     {
 *         key: '#game_win#',
 *         sounds: [
 *             '<speaker audio="alice-sounds-game-win-1.opus">',
 *             '<speaker audio="alice-sounds-game-win-2.opus">',
 *             '<speaker audio="alice-sounds-game-win-3.opus">'
 *         ]
 *     }
 * ], 'Поздравляем с победой!');
 * // result: '<speaker audio="alice-sounds-game-win-1.opus">Поздравляем с победой!</speaker>'
 *
 * // Применение звукового эффекта
 * const effectText = `${alisaSound.S_EFFECT_MEGAPHONE}Внимание!${alisaSound.S_EFFECT_END}`;
 * // effectText: '<speaker effect="megaphone">Внимание!</speaker>'
 *
 * // Добавление паузы
 * const textWithPause = 'Привет' + AlisaSound.getPause(1000) + 'мир!';
 * // textWithPause: 'Привет sil <[1000]>`мир!</speaker>'
 *
 * // Комбинирование эффектов и пауз
 * const complexText = `${alisaSound.S_EFFECT_MEGAPHONE}Внимание!${alisaSound.S_EFFECT_END}` +
 *     AlisaSound.getPause(1000) +
 *     `${alisaSound.S_EFFECT_PITCH_DOWN}Важное сообщение${alisaSound.S_EFFECT_END}`;
 * // complexText: '<speaker effect="megaphone">Внимание!</speaker>sil <[1000]>`<speaker effect="pitch_down">Важное сообщение</speaker>'
 * ```
 */
export class AlisaSound extends TemplateSoundTypes {
    /**
     * Флаг использования стандартных звуков Алисы
     *
     * При значении true используются стандартные звуки Алисы,
     * при false - только пользовательские звуки
     *
     * @default true
     *
     * @example
     * ```typescript
     * const alisaSound = new AlisaSound();
     * alisaSound.isUsedStandardSound = false; // Отключение стандартных звуков
     * ```
     */
    public isUsedStandardSound: boolean = true;

    /**
     * Эффект "за стеной" для текста
     *
     * Применяет эффект звучания из-за стены к тексту
     *
     * @example
     * ```typescript
     * const text = `${alisaSound.S_EFFECT_BEHIND_THE_WALL}Текст за стеной${alisaSound.S_EFFECT_END}`;
     * // text: '<speaker effect="behind_the_wall">Текст за стеной</speaker>'
     * ```
     */
    public readonly S_EFFECT_BEHIND_THE_WALL = '<speaker effect="behind_the_wall">';

    /**
     * Эффект "хомяк" для текста
     *
     * Применяет эффект голоса хомяка к тексту
     *
     * @example
     * ```typescript
     * const text = `${alisaSound.S_EFFECT_HAMSTER}Пи-пи-пи${alisaSound.S_EFFECT_END}`;
     * // text: '<speaker effect="hamster">Пи-пи-пи</speaker>'
     * ```
     */
    public readonly S_EFFECT_HAMSTER = '<speaker effect="hamster">';

    /**
     * Эффект "мегафон" для текста
     *
     * Применяет эффект звучания через мегафон к тексту
     *
     * @example
     * ```typescript
     * const text = `${alisaSound.S_EFFECT_MEGAPHONE}Внимание!${alisaSound.S_EFFECT_END}`;
     * // text: '<speaker effect="megaphone">Внимание!</speaker>'
     * ```
     */
    public readonly S_EFFECT_MEGAPHONE = '<speaker effect="megaphone">';

    /**
     * Эффект "низкий тон" для текста
     *
     * Применяет эффект пониженного тона к тексту
     *
     * @example
     * ```typescript
     * const text = `${alisaSound.S_EFFECT_PITCH_DOWN}Глубокий голос${alisaSound.S_EFFECT_END}`;
     * // text: '<speaker effect="pitch_down">Глубокий голос</speaker>'
     * ```
     */
    public readonly S_EFFECT_PITCH_DOWN = '<speaker effect="pitch_down">';

    /**
     * Эффект "психоделический" для текста
     *
     * Применяет психоделический эффект к тексту
     *
     * @example
     * ```typescript
     * const text = `${alisaSound.S_EFFECT_PSYCHODELIC}Трип${alisaSound.S_EFFECT_END}`;
     * // text: '<speaker effect="psychodelic">Трип</speaker>'
     * ```
     */
    public readonly S_EFFECT_PSYCHODELIC = '<speaker effect="psychodelic">';

    /**
     * Эффект "пульс" для текста
     *
     * Применяет эффект пульсации к тексту
     *
     * @example
     * ```typescript
     * const text = `${alisaSound.S_EFFECT_PULSE}Пульсирующий текст${alisaSound.S_EFFECT_END}`;
     * // text: '<speaker effect="pulse">Пульсирующий текст</speaker>'
     * ```
     */
    public readonly S_EFFECT_PULSE = '<speaker effect="pulse">';

    /**
     * Эффект "вокзал" для текста
     *
     * Применяет эффект объявления на вокзале к тексту
     *
     * @example
     * ```typescript
     * const text = `${alisaSound.S_EFFECT_TRAIN_ANNOUNCE}Поезд отправляется${alisaSound.S_EFFECT_END}`;
     * // text: '<speaker effect="train_announce">Поезд отправляется</speaker>'
     * ```
     */
    public readonly S_EFFECT_TRAIN_ANNOUNCE = '<speaker effect="train_announce">';

    /**
     * Маркер окончания эффекта
     *
     * Используется для завершения любого звукового эффекта
     *
     * @example
     * ```typescript
     * const text = `${alisaSound.S_EFFECT_MEGAPHONE}Текст с эффектом${alisaSound.S_EFFECT_END}`;
     * // text: '<speaker effect="megaphone">Текст с эффектом</speaker>'
     * ```
     */
    public readonly S_EFFECT_END = '<speaker effect="-">';

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
     * Создает паузу в речи указанной длительности
     *
     * @param {number} milliseconds - Длительность паузы в миллисекундах
     * @returns {string} - Строка с паузой в формате Алисы
     *
     * @example
     * ```typescript
     * // Создание паузы в 1 секунду
     * const text = 'Привет' + AlisaSound.getPause(1000) + 'мир!';
     *
     * // Создание паузы в 2.5 секунды
     * const text = 'Первый' + AlisaSound.getPause(2500) + 'второй';
     * ```
     */
    public static getPause(milliseconds: number): string {
        return `sil <[${milliseconds}]>`;
    }

    /**
     * Обрабатывает звуки и текст для воспроизведения в Алисе
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
     * const alisaSound = new AlisaSound();
     *
     * // Воспроизведение стандартного звука с текстом
     * const result = await alisaSound.getSounds([
     *     { key: AlisaSound.S_AUDIO_GAME_WIN, sounds: [] }
     * ], 'Поздравляем с победой!');
     *
     * // Воспроизведение пользовательского звука
     * const result = await alisaSound.getSounds([
     *     { key: 'custom', sounds: ['path/to/sound.opus'] }
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
        if (updSounds && updSounds.length) {
            for (let i = 0; i < updSounds.length; i++) {
                const sound = updSounds[i];
                if (typeof sound === 'object') {
                    if (typeof sound.sounds !== 'undefined' && typeof sound.key !== 'undefined') {
                        let sText: string = Text.getText(sound.sounds);
                        /*
                         * Не стоит так делать, так как нужно время, пока Yandex обработает звуковую дорожку.
                         * Лучше загружать звуки через консоль администратора!
                         * @see (https://dialogs.yandex.ru/developer/skills/<skill_id>/resources/sounds) Смотри тут
                         */
                        if (isFile(sText) || Text.isUrl(sText)) {
                            const sModel = new SoundTokens(this._appContext);
                            sModel.type = SoundTokens.T_ALISA;
                            sModel.path = sText;
                            sText = `<speaker audio="${await sModel.getToken()}">`;
                        }

                        if (sText) {
                            res = AlisaSound.replaceSound(sound.key, sText, res);
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
     * const text = AlisaSound.replaceSound(
     *     '#game_win#',
     *     '<speaker audio="alice-sounds-game-win-1.opus">',
     *     'Поздравляем #game_win# с победой!'
     * );
     *
     * // Замена на массив звуков
     * const text = AlisaSound.replaceSound(
     *     '#nature_rain#',
     *     [
     *         '<speaker audio="alice-sounds-nature-rain-1.opus">',
     *         '<speaker audio="alice-sounds-nature-rain-2.opus">'
     *     ],
     *     'На улице #nature_rain# идет дождь'
     * );
     * ```
     */
    public static replaceSound(key: string, value: string | string[], text: string): string {
        return Text.textReplace(key, value, text);
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
     * const text = AlisaSound.removeSound('Текст #game_win# без #nature_rain# звуков');
     * // Результат: 'Текст без звуков'
     * ```
     */
    public static removeSound(text: string): string {
        return text.replace(
            /(<speaker audio="([^"]+)">)|(<speaker effect="([^"]+)">)|(sil <\[\d+]>)/gim,
            '',
        );
    }
}
