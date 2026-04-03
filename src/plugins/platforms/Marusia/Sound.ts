import { ISoundInfo, ISound, BotController, SoundConstants } from '../../../index';
import { getSoundToken, defaultSoundProcessing } from '../Base/utils';
import { MarusiaRequest } from '../API';
import { T_MARUSIA } from './constants';

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
        key: SoundConstants.S_AUDIO_GAME_WIN,
        sounds: [
            '<speaker audio="marusia-sounds/game-win-1">',
            '<speaker audio="marusia-sounds/game-win-2">',
            '<speaker audio="marusia-sounds/game-win-3">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_LOSS,
        sounds: [
            '<speaker audio="marusia-sounds/game-loss-1">',
            '<speaker audio="marusia-sounds/game-loss-2">',
            '<speaker audio="marusia-sounds/game-loss-3">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_BOOT,
        sounds: ['<speaker audio="marusia-sounds/game-boot-1">'],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_8_BIT_COIN,
        sounds: [
            '<speaker audio="marusia-sounds/game-8-bit-coin-1">',
            '<speaker audio="marusia-sounds/game-8-bit-coin-2">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_PING,
        sounds: ['<speaker audio="marusia-sounds/game-ping-1">'],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_8_BIT_FLYBY,
        sounds: ['<speaker audio="marusia-sounds/game-8-bit-flyby-1">'],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_8_BIT_MACHINE_GUN,
        sounds: ['<speaker audio="marusia-sounds/game-8-bit-machine-gun-1">'],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_8_BIT_PHONE,
        sounds: ['<speaker audio="marusia-sounds/game-8-bit-phone-1">'],
    },
    {
        key: SoundConstants.S_AUDIO_GAME_POWERUP,
        sounds: [
            '<speaker audio="marusia-sounds/game-powerup-1">',
            '<speaker audio="marusia-sounds/game-powerup-2">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_WIND,
        sounds: [
            '<speaker audio="marusia-sounds/nature-wind-1">',
            '<speaker audio="marusia-sounds/nature-wind-2">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_THUNDER,
        sounds: [
            '<speaker audio="marusia-sounds/nature-thunder-1">',
            '<speaker audio="marusia-sounds/nature-thunder-2">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_JUNGLE,
        sounds: [
            '<speaker audio="marusia-sounds/nature-jungle-1">',
            '<speaker audio="marusia-sounds/nature-jungle-2">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_RAIN,
        sounds: [
            '<speaker audio="marusia-sounds/nature-rain-1">',
            '<speaker audio="marusia-sounds/nature-rain-2">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_FOREST,
        sounds: [
            '<speaker audio="marusia-sounds/nature-forest-1">',
            '<speaker audio="marusia-sounds/nature-forest-2">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_SEA,
        sounds: [
            '<speaker audio="marusia-sounds/nature-sea-1">',
            '<speaker audio="marusia-sounds/nature-sea-2">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_FIRE,
        sounds: [
            '<speaker audio="marusia-sounds/nature-fire-1">',
            '<speaker audio="marusia-sounds/nature-fire-2">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_NATURE_STREAM,
        sounds: [
            '<speaker audio="marusia-sounds/nature-stream-1">',
            '<speaker audio="marusia-sounds/nature-stream-2">',
        ],
    },
    {
        key: SoundConstants.S_AUDIO_THING_CHAINSAW,
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
        key: SoundConstants.S_AUDIO_NATURE_ANIMALS,
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
        key: SoundConstants.S_AUDIO_NATURE_HUMAN,
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
 * Получение токена, необходимого для воспроизведения звуков в Марусе
 * @param controller Контроллер приложения
 * @param path Путь до аудиофайла
 */
export async function getSoundInDB(
    controller: BotController,
    path: string,
): Promise<string | null> {
    return getSoundToken(path, T_MARUSIA, controller, async (model) => {
        const mImage = new MarusiaRequest(controller.appContext);
        const uploadLink = await mImage.marusiaGetAudioUploadLink();
        if (!uploadLink) {
            return null;
        }

        const upload = await mImage.upload(uploadLink.audio_upload_link, path);
        if (!upload) {
            return null;
        }

        const sound = await mImage.marusiaCreateAudio(upload);
        if (sound?.id) {
            model.soundToken = sound.id;
            if (await model.save(true)) {
                return model.soundToken;
            }
        }
        return null;
    });
}

/**
 * Получение корректного ответа для озвучивания запроса пользователю Маруси
 * @param soundInfo Информация необходимая для обработки аудио
 */
export function soundProcessing(soundInfo: ISoundInfo): string {
    return defaultSoundProcessing(soundInfo, STANDARD_SOUNDS);
}
