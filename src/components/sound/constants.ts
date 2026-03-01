/**
 * Воспроизвести звук загрузки
 */
export const S_AUDIO_GAME_BOOT = '#game_boot#';
/**
 * Воспроизвести звук получения очка
 */
export const S_AUDIO_GAME_8_BIT_COIN = '#game_coin#';
/**
 * Воспроизвести звук поражения
 */
export const S_AUDIO_GAME_LOSS = '#game_loss#';
/**
 * Воспроизвести звук ping
 */
export const S_AUDIO_GAME_PING = '#game_ping#';
/**
 * Воспроизвести звук победы
 */
export const S_AUDIO_GAME_WIN = '#game_win#';
/**
 * Воспроизвести звук полета
 */
export const S_AUDIO_GAME_8_BIT_FLYBY = '#game_fly#';
/**
 * Воспроизвести звук выстрела
 */
export const S_AUDIO_GAME_8_BIT_MACHINE_GUN = '#game_gun#';
/**
 * Воспроизвести звук звонка телефона
 */
export const S_AUDIO_GAME_8_BIT_PHONE = '#game_phone#';
/**
 * Воспроизвести звук powerup
 */
export const S_AUDIO_GAME_POWERUP = '#game_powerup#';

/**
 * Воспроизвести звук ветра
 */
export const S_AUDIO_NATURE_WIND = '#nature_wind#';
/**
 * Воспроизвести звук молнии
 */
export const S_AUDIO_NATURE_THUNDER = '#nature_thunder#';
/**
 * Воспроизвести звук jungle
 */
export const S_AUDIO_NATURE_JUNGLE = '#nature_jungle#';
/**
 * Воспроизвести звук дождя
 */
export const S_AUDIO_NATURE_RAIN = '#nature_rain#';
/**
 * Воспроизвести звук леса
 */
export const S_AUDIO_NATURE_FOREST = '#nature_forest#';
/**
 * Воспроизвести звук моря
 */
export const S_AUDIO_NATURE_SEA = '#nature_sea#';
/**
 * Воспроизвести звук огня
 */
export const S_AUDIO_NATURE_FIRE = '#nature_fire#';
/**
 * Воспроизвести звук потока
 */
export const S_AUDIO_NATURE_STREAM = '#nature_stream#';

/**
 * Воспроизвести звук пилы
 */
export const S_AUDIO_THING_CHAINSAW = '#thing_chainsaw#';
/**
 * Воспроизвести звук животного
 */
export const S_AUDIO_NATURE_ANIMALS = '#animals_all#';
/**
 * Воспроизвести звук человека
 */
export const S_AUDIO_NATURE_HUMAN = '#human_all#';
/**
 * Воспроизвести мелодию
 */
export const S_AUDIO_MUSIC = '#music_all#';

/**
 * Эффект "за стеной" для текста
 *
 * Применяет эффект звучания из-за стены к тексту
 */
export const S_EFFECT_BEHIND_THE_WALL = '#effect_behind_the_wall#';

/**
 * Эффект "хомяк" для текста
 *
 * Применяет эффект голоса хомяка к тексту
 */
export const S_EFFECT_HAMSTER = '#effect_hamster#';

/**
 * Эффект "мегафон" для текста
 *
 * Применяет эффект звучания через мегафон к тексту
 */
export const S_EFFECT_MEGAPHONE = '#effect_megaphone#';

/**
 * Эффект "низкий тон" для текста
 *
 * Применяет эффект пониженного тона к тексту
 */
export const S_EFFECT_PITCH_DOWN = '#effect_pitch_down#';

/**
 * Эффект "психоделический" для текста
 *
 * Применяет психоделический эффект к тексту
 */
export const S_EFFECT_PSYCHODELIC = '#effect_psychodelic#';

/**
 * Эффект "пульс" для текста
 *
 * Применяет эффект пульсации к тексту
 */
export const S_EFFECT_PULSE = '#effect_pulse#';

/**
 * Эффект "вокзал" для текста
 *
 * Применяет эффект объявления на вокзале к тексту
 */
export const S_EFFECT_TRAIN_ANNOUNCE = '#effect_train_announce#';

/**
 * Маркер окончания эффекта
 *
 * Используется для завершения любого звукового эффекта
 */
export const S_EFFECT_END = '#effect_end#';

/**
 * Создает паузу в речи указанной длительности
 *
 * @param {number} milliseconds - Длительность паузы в миллисекундах
 * @returns {string} - Строка с паузой в формате Алисы
 *
 * @example
 * ```ts
 * // Создание паузы в 1 секунду
 * const text = 'Привет' + getPause(1000) + 'мир!';
 *
 * // Создание паузы в 2.5 секунды
 * const text = 'Первый' + getPause(2500) + 'второй';
 * ```
 */
export function getPause(milliseconds: number): string {
    return `#pause_<[${milliseconds}]>#`;
}
