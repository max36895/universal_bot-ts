import { ISoundInfo } from '../../../index';

/**
 * Удаляет маркеры звуков из TTS SmartApp: платформа не поддерживает их встраивание.
 * @param soundInfo Текст и зарегистрированные звуки
 * @returns Произносимый текст без неподдерживаемых маркеров
 */
export function soundProcessing(soundInfo: ISoundInfo): string {
    return soundInfo.sounds.reduce(
        (text, sound) => text.split(sound.key).join(' '),
        soundInfo.text,
    );
}
