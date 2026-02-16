import { ImageTokens, SoundTokens } from '../../../models';
import { BotController } from '../../../controller';
import { ISoundInfo } from '../../../core';
import { Text } from '../../../utils';
import { replaceSound } from '../Alisa/Sound';
import { IEffect, ISound } from '../../../components';

/**
 * Тип для обработки запроса для загрузки изображения
 */
type TImageCallback = (model: ImageTokens) => Promise<string | null>;

/**
 * Возвращает токен для изображения.
 * В случае, если найти токен в базе не удалось, отрабатывает обработчик, который отправляет запрос на получение токена.
 * @param path Путь до изображения
 * @param platform Платформа для которой нужно получить токен
 * @param controller Контроллер приложения
 * @param cb Обработчик, который вернет токен.
 */
export async function getImageToken(
    path: string,
    platform: string,
    controller: BotController,
    cb: TImageCallback,
): Promise<string | null> {
    if (path) {
        const model = new ImageTokens(controller.appContext);
        model.platform = platform;
        model.path = path;
        const query = await model.whereOne({
            platform,
            path,
        });
        if (query && model.imageToken) {
            return model.imageToken;
        }
        return cb(model);
    }
    return null;
}

/**
 * Тип для обработки запроса для загрузки аудио
 */
type TSoundCallback = (model: SoundTokens) => Promise<string | null>;

/**
 * Возвращает токен для аудио.
 * В случае, если найти токен в базе не удалось, отрабатывает обработчик, который отправляет запрос на получение токена.
 * @param path Путь до аудиофайла
 * @param platform Платформа для которой нужно получить токен
 * @param controller Контроллер приложения
 * @param cb Обработчик, который вернет токен.
 */
export async function getSoundToken(
    path: string,
    platform: string,
    controller: BotController,
    cb: TSoundCallback,
): Promise<string | null> {
    if (path) {
        const model = new SoundTokens(controller.appContext);
        model.platform = platform;
        model.path = path;
        const query = await model.whereOne({
            platform,
            path,
        });
        if (query && model.soundToken) {
            return model.soundToken;
        }
        return cb(model);
    }
    return null;
}

const PAUSE_REG = /#pause_<\[(\d+)]>#/g;

/**
 * Ищет в запросе команду для паузы, и заменяет ее на корректный вид(sil).
 *
 * @param {string} text - Текст, который будет озвучен пользователю
 * @returns {string} - Строка с паузой в формате sil <[ms]>
 */
export function getPause(text: string): string {
    return text.replace(PAUSE_REG, (_, ms: string) => `sil <[${ms}]>`);
}

/**
 * Базовый метод для обработки tts.
 * Основная задача метода - найти все ключи в запросе, и заменить их на корректные звуки/эффекты.
 * По умолчанию используется в Алисе и Марусе.
 * @param soundInfo - Информация необходимая для обработки аудио
 * @param defaultSounds - Стандартные звуки
 * @param defaultEffects - Стандартные эффекты
 */

/**
 * Базовый метод для обработки tts.
 * Основная задача метода - найти все ключи в запросе, и заменить их на корректные звуки/эффекты.
 * По умолчанию используется в Алисе и Марусе.
 * @param soundInfo - Информация необходимая для обработки аудио
 * @param defaultSounds - Стандартные звуки
 * @param defaultEffects - Стандартные эффекты
 */
export function defaultSoundProcessing(
    soundInfo: ISoundInfo,
    defaultSounds: ISound[],
    defaultEffects?: IEffect[],
): string {
    let updSounds: ISound[] = [];
    if (soundInfo.sounds.length) {
        updSounds = [...soundInfo.sounds, ...(soundInfo.usedStandardSound ? defaultSounds : [])];
    } else if (soundInfo.usedStandardSound) {
        updSounds = defaultSounds;
    }
    // Если в тексте нет "#", и никто не задал свои звуки,
    // то считаем что звук никто не вставляет, поэтому доп обработка не требуется.
    // По-хорошему, всегда стоит смотреть на наличие #, и при ее отсутствии не выполнять ничего, но могут быть места, где ключ может сильно отличаться.
    const usedSoundEffect = soundInfo.text.includes('#');
    if (usedSoundEffect) {
        if (defaultEffects) {
            defaultEffects.forEach((item) => {
                soundInfo.text = soundInfo.text.replace(new RegExp(item.key, 'g'), item.effect);
            });
        }
        soundInfo.text = getPause(soundInfo.text);
    } else if (!soundInfo.sounds.length) {
        return soundInfo.text;
    }
    let res = soundInfo.text;
    if (updSounds.length) {
        for (let i = 0; i < updSounds.length; i++) {
            const sound = updSounds[i];
            if (typeof sound === 'object') {
                if (typeof sound.sounds !== 'undefined' && typeof sound.key !== 'undefined') {
                    const sText: string = Text.getText(sound.sounds);
                    if (sText) {
                        res = replaceSound(sound.key, sText, res);
                    }
                }
            }
        }
    }
    return res;
}
