import { ISoundInfo, Text, ISound, BotController, SoundConstants, IEffect } from '../../../index';
import { getSoundToken, defaultSoundProcessing } from '../Base/utils';
import { T_ALISA } from './constants';
import { YandexSoundRequest } from '../API';

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
        key: SoundConstants.S_AUDIO_GAME_WIN,
        sounds: [
            '<speaker audio="alice-sounds-game-win-1.opus">',
            '<speaker audio="alice-sounds-game-win-2.opus">',
            '<speaker audio="alice-sounds-game-win-3.opus">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_LOSS,
        sounds: [
            '<speaker audio="alice-sounds-game-loss-1.opus">',
            '<speaker audio="alice-sounds-game-loss-2.opus">',
            '<speaker audio="alice-sounds-game-loss-3.opus">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_BOOT,
        sounds: ['<speaker audio="alice-sounds-game-boot-1.opus">'],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_8_BIT_COIN,
        sounds: [
            '<speaker audio="alice-sounds-game-8-bit-coin-1.opus">',
            '<speaker audio="alice-sounds-game-8-bit-coin-2.opus">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_PING,
        sounds: ['<speaker audio="alice-sounds-game-ping-1.opus">'],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_8_BIT_FLYBY,
        sounds: ['<speaker audio="alice-sounds-game-8-bit-flyby-1.opus">'],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_8_BIT_MACHINE_GUN,
        sounds: ['<speaker audio="alice-sounds-game-8-bit-machine-gun-1.opus">'],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_8_BIT_PHONE,
        sounds: ['<speaker audio="alice-sounds-game-8-bit-phone-1.opus">'],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_POWERUP,
        sounds: [
            '<speaker audio="alice-sounds-game-powerup-1.opus">',
            '<speaker audio="alice-sounds-game-powerup-2.opus">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_WIND,
        sounds: [
            '<speaker audio="alice-sounds-nature-wind-1.opus">',
            '<speaker audio="alice-sounds-nature-wind-2.opus">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_THUNDER,
        sounds: [
            '<speaker audio="alice-sounds-nature-thunder-1.opus">',
            '<speaker audio="alice-sounds-nature-thunder-2.opus">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_JUNGLE,
        sounds: [
            '<speaker audio="alice-sounds-nature-jungle-1.opus">',
            '<speaker audio="alice-sounds-nature-jungle-2.opus">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_RAIN,
        sounds: [
            '<speaker audio="alice-sounds-nature-rain-1.opus">',
            '<speaker audio="alice-sounds-nature-rain-2.opus">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_FOREST,
        sounds: [
            '<speaker audio="alice-sounds-nature-forest-1.opus">',
            '<speaker audio="alice-sounds-nature-forest-2.opus">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_SEA,
        sounds: [
            '<speaker audio="alice-sounds-nature-sea-1.opus">',
            '<speaker audio="alice-sounds-nature-sea-2.opus">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_FIRE,
        sounds: [
            '<speaker audio="alice-sounds-nature-fire-1.opus">',
            '<speaker audio="alice-sounds-nature-fire-2.opus">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_STREAM,
        sounds: [
            '<speaker audio="alice-sounds-nature-stream-1.opus">',
            '<speaker audio="alice-sounds-nature-stream-2.opus">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_THING_CHAINSAW,
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
        key: SoundConstants.S_AUDIO_NATURE_ANIMALS,
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
        key: SoundConstants.S_AUDIO_NATURE_HUMAN,
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
        key: SoundConstants.S_AUDIO_MUSIC,
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

const STANDARD_EFFECTS: IEffect[] = [
    {
        key: SoundConstants.S_EFFECT_BEHIND_THE_WALL,
        effect: '<speaker effect="behind_the_wall">',
    },
    {
        key: SoundConstants.S_EFFECT_HAMSTER,
        effect: '<speaker effect="hamster">',
    },
    {
        key: SoundConstants.S_EFFECT_MEGAPHONE,
        effect: '<speaker effect="megaphone">',
    },
    {
        key: SoundConstants.S_EFFECT_PITCH_DOWN,
        effect: '<speaker effect="pitch_down">',
    },
    {
        key: SoundConstants.S_EFFECT_PSYCHODELIC,
        effect: '<speaker effect="psychodelic">',
    },
    {
        key: SoundConstants.S_EFFECT_PULSE,
        effect: '<speaker effect="pulse">',
    },
    {
        key: SoundConstants.S_EFFECT_TRAIN_ANNOUNCE,
        effect: '<speaker effect="train_announce"',
    },
    {
        key: SoundConstants.S_EFFECT_END,
        effect: '<speaker effect="-">',
    },
];

/**
 * Заменяет звуковой токен в тексте на соответствующий звук
 *
 * @param {string} key - Ключ звука для замены
 * @param {string | string[]} value - Значение или массив значений для замены
 * @param {string} text - Исходный текст
 * @returns {string} - Текст с замененными звуками
 *
 * @example
 * ```ts
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
export function replaceSound(key: string, value: string | string[], text: string): string {
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
 * ```ts
 * // Удаление звуковых токенов
 * const text = AlisaSound.removeSound('Текст #game_win# без #nature_rain# звуков');
 * // Результат: 'Текст без звуков'
 * ```
 */
export function removeSound(text: string): string {
    if (text.includes('speaker') || text.includes('sil')) {
        return text.replace(/<speaker[^>]*>|sil\s*<\[\d+]>/gi, '');
    }
    return text;
}

/**
 * Получение токена, необходимого для воспроизведения звуков в Алисе
 * @param controller Контроллер приложения
 * @param path Путь до аудиофайла
 */
export async function getSoundInDB(
    controller: BotController,
    path: string,
): Promise<string | null> {
    return getSoundToken(path, T_ALISA, controller, async (model) => {
        const yandexApi = new YandexSoundRequest(
            controller.appContext.appConfig.tokens[T_ALISA].token,
            controller.platformOptions.appId,
            controller.appContext,
        );
        const res = await yandexApi.downloadSoundFile(path);
        if (res?.id) {
            model.soundToken = res.id;
            if (await model.save(true)) {
                return model.soundToken;
            }
        }
        return null;
    });
}

/**
 * Получение корректного ответа для озвучивания запроса пользователю Алисы
 * @param soundInfo Информация необходимая для обработки аудио
 */
export function soundProcessing(soundInfo: ISoundInfo): string {
    return defaultSoundProcessing(soundInfo, STANDARD_SOUNDS, STANDARD_EFFECTS);
}
