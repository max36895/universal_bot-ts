import { ImageTokens, SoundTokens } from '../../../models';
import { BotController } from '../../../controller';
import { ISoundInfo } from '../../../core';
import { isFile, Text } from '../../../utils';
import { IButtonType, IEffect, ISound } from '../../../components';
import { IAlisaRequest } from '../Alisa/interfaces/IAlisaPlatform';

/**
 * Callback для загрузки изображения на платформу.
 * Вызывается только при cache miss — когда токен для файла ещё не был сгенерирован.
 *
 * @param model - Модель ImageTokens для сохранения токена в БД
 * @returns Токен загруженного изображения или null при ошибке
 *
 * @example
 * ```ts
 * const cb: TImageCallback = async (model) => {
 *     const api = new MyPlatformApi(appContext);
 *     const result = await api.uploadImage(model.path);
 *     if (result?.id) {
 *         model.imageToken = result.id;
 *         await model.save(true);
 *         return model.imageToken;
 *     }
 *     return null;
 * };
 * ```
 */
export type TImageCallback = (model: ImageTokens) => Promise<string | null>;

/**
 * Возвращает токен для изображения.
 * В случае, если найти токен в базе не удалось, отрабатывает обработчик, который отправляет запрос на получение токена.
 * @param path Путь до изображения
 * @param platform Платформа для которой нужно получить токен
 * @param controller Контроллер приложения
 * @param cb Обработчик, который вернет токен.
 * @returns Токен из БД, результат обработчика `cb` либо `null`, если путь пуст
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
 * Callback для загрузки аудио на платформу.
 * Вызывается только при cache miss — когда токен для файла ещё не был сгенерирован.
 *
 * @param model - Модель SoundTokens для сохранения токена в БД
 * @returns Токен загруженного аудио или null при ошибке
 *
 * @example
 * ```ts
 * const cb: TSoundCallback = async (model) => {
 *     const api = new MyPlatformApi(appContext);
 *     const result = await api.uploadAudio(model.path);
 *     if (result?.id) {
 *         model.soundToken = result.id;
 *         await model.save(true);
 *         return model.soundToken;
 *     }
 *     return null;
 * };
 * ```
 */
export type TSoundCallback = (model: SoundTokens) => Promise<string | null>;

/**
 * Возвращает токен для аудио.
 * В случае, если найти токен в базе не удалось, отрабатывает обработчик, который отправляет запрос на получение токена.
 * @param path Путь до аудиофайла
 * @param platform Платформа для которой нужно получить токен
 * @param controller Контроллер приложения
 * @param cb Обработчик, который вернет токен.
 * @returns Токен из БД, результат обработчика `cb` либо `null`, если путь пуст
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
 * Ищет в тексте команды паузы вида `#pause_<[ms]>#` (например, `#pause_<[500]>#`)
 * и заменяет их на SSML-формат `sil <[ms]>`, поддерживаемый голосовыми платформами.
 *
 * @param {string} text - Текст, который будет озвучен пользователю
 * @returns {string} - Строка с паузой в формате sil <[ms]>
 */
export function getPause(text: string): string {
    return text.replace(PAUSE_REG, (_, ms: string) => `sil <[${ms}]>`);
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
 * ```ts
 * // Замена одиночного звука
 * const text = replaceSound(
 *     '#game_win#',
 *     '<speaker audio="alice-sounds-game-win-1.opus">',
 *     'Поздравляем #game_win# с победой!'
 * );
 *
 * // Замена на массив звуков
 * const text = replaceSound(
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
 * Удаляет SSML-разметку звуков из текста: теги `<speaker ...>` и паузы `sil <[N]>`.
 * Пользовательские ключи вида `#ключ#` не удаляются.
 *
 * @param {string} text - Исходный текст
 * @returns {string} - Текст без SSML-разметки звуков
 *
 * @example
 * ```ts
 * // Удаление SSML-тегов звуков
 * const text = removeSound('Текст <speaker audio="a.opus"> без звуков');
 * // Результат: 'Текст  без звуков'
 * ```
 */
export function removeSound(text: string): string {
    if (text.includes('speaker') || text.includes('sil')) {
        return text.replace(/<speaker[^>]*>|sil\s*<\[\d+]>/gi, '');
    }
    return text;
}

/**
 * Возвращает текст, который нужно отправить в чат-платформу.
 *
 * Ядро копирует `text` в `tts` только для голосовых платформ, а обратного копирования
 * не было: разработчик, заполнивший в общей бизнес-логике только `ctx.tts`, получал
 * на Telegram, VK, Viber и MAX **полное молчание** — сообщение просто не отправлялось.
 * Поэтому при пустом `text` берём `tts`, предварительно убрав из него звуковую
 * SSML-разметку, которая в чате бессмысленна.
 *
 * @param text Текст ответа (`controller.text`)
 * @param tts Озвучиваемый текст (`controller.tts`)
 * @returns Текст для отправки в чат
 *
 * @example
 * ```ts
 * getChatText('', 'Привет <speaker audio="a.opus">'); // -> 'Привет'
 * getChatText('Привет', 'что угодно'); // -> 'Привет'
 * ```
 */
export function getChatText(text: string, tts: string | null): string {
    if (text) {
        return text;
    }
    if (!tts) {
        return '';
    }
    // Убираем только то, что заведомо является разметкой: теги <speaker>, паузы sil
    // и директиву #pause_<[мс]>#. Произвольные пользовательские ключи звуков вида
    // #my_sound# здесь не известны, поэтому их не трогаем.
    return removeSound(tts.replace(PAUSE_REG, '')).trim();
}

/**
 * Базовый метод для обработки tts.
 * Основная задача метода - найти все ключи в запросе, и заменить их на корректные звуки/эффекты.
 * По умолчанию используется в Алисе и Марусе.
 * @param soundInfo - Информация необходимая для обработки аудио
 * @param defaultSounds - Стандартные звуки
 * @param defaultEffects - Стандартные эффекты
 * @returns Обработанный текст с подставленными звуками и эффектами
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
                soundInfo.text = soundInfo.text.replaceAll(item.key, item.effect);
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
            if (
                typeof sound === 'object' &&
                sound.sounds !== undefined &&
                sound.key !== undefined
            ) {
                const sText: string = Text.getText(sound.sounds);
                if (sText) {
                    res = replaceSound(sound.key, sText, res);
                }
            }
        }
    }
    return res;
}

/**
 * Базовая обработка аудио: получает токены звуков через `getSoundInDB`
 * и собирает их в массив строк для отправки платформе.
 *
 * @param soundInfo - Описание звуков для обработки (из контроллера)
 * @param controller - Контроллер приложения
 * @param getSoundInDB - Функция-обработчик, которая возвращает токен аудио по пути
 * @returns Массив готовых аудио-строк в формате конкретной платформы
 */
export async function getBaseDataSoundProcessing(
    soundInfo: ISoundInfo,
    controller: BotController,
    getSoundInDB: (controller: BotController, path: string) => Promise<string | null>,
): Promise<string[]> {
    const { sounds } = soundInfo;
    const data: string[] = [];
    if (sounds) {
        for (let i = 0; i < sounds.length; i++) {
            const sound = sounds[i];
            if (sound.sounds !== undefined && sound.key !== undefined) {
                let sText: string | null = Text.getText(sound.sounds);
                if (Text.isUrl(sText) || (await isFile(sText))) {
                    sText = await getSoundInDB(controller, sText);
                }

                if (sText) {
                    data.push(sText);
                }
            }
        }
    }
    return data;
}

/**
 * Базовая функция, которая инициализирует команду пользователя.
 * Обрабатывает различные типы запросов и сохраняет команду в контроллере
 * @param request Объект запроса от пользователя
 * @param controller Контроллер приложения
 */
export function initUserCommand(request: IAlisaRequest, controller: BotController): void {
    if (request.type === 'SimpleUtterance') {
        controller.userCommand = request.command?.trim() || '';
        // `?.` обязателен: malformed-запрос без original_utterance проходит
        // isPlatformOnQuery (проверяются только request/version/session),
        // и раньше здесь падал TypeError, уходивший на платформу как 500.
        controller.originalUserCommand = request.original_utterance?.trim() || '';
    } else {
        if (typeof request.payload === 'string') {
            controller.userCommand = request.payload;
            controller.originalUserCommand = request.payload;
        } else {
            controller.userCommand = request.command?.trim() || '';
            controller.originalUserCommand = request.original_utterance?.trim() || '';
        }
        controller.payload = request.payload;
    }
    if (!controller.userCommand) {
        controller.userCommand = controller.originalUserCommand;
    }
}

/**
 * Возвращает корректный массив кнопок с учетом лимита
 * @param {TButton[]} buttons - Массив кнопок
 * @param {number} limit - Максимальное количество кнопок
 */
export function getCorrectButtons<TButton = IButtonType>(
    buttons: TButton[],
    limit: number = 10,
): TButton[] {
    if (buttons && buttons.length > limit) {
        return buttons.slice(0, limit);
    }
    return buttons;
}

/**
 * Проверяет, что payload можно безопасно передать в JSON платформы.
 *
 * @param payload Данные кнопки.
 * @param platform Название платформы для диагностического сообщения.
 * @param appContext Контекст приложения для логирования.
 * @returns Строковое представление payload или `null`, если значение не сериализуется.
 */
export function serializePlatformPayload(
    payload: unknown,
    platform: string,
    appContext?: { logWarn(message: string, meta?: Record<string, unknown>): void },
): string | null {
    try {
        const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
        if (serialized !== undefined) {
            return serialized;
        }
    } catch (error) {
        appContext?.logWarn(`[${platform}] payload кнопки не сериализуется и будет пропущен.`, {
            error,
        });
        return null;
    }
    appContext?.logWarn(`[${platform}] payload кнопки не сериализуется и будет пропущен.`);
    return null;
}

/**
 * Возвращает изолированное техническое хранилище адаптера для текущего запроса.
 *
 * Общий контроллер не должен знать о полях конкретных транспортов, поэтому
 * каждый адаптер хранит их только под собственным ключом.
 *
 * @param controller Контроллер текущего запроса
 * @param adapterKey Уникальный ключ адаптера
 * @returns Объект технических данных адаптера
 *
 * @example
 * ```ts
 * const data = getPlatformRequestData<{ callbackId?: string }>(controller, 'my_adapter');
 * data.callbackId = 'callback-123';
 * ```
 */
export function getPlatformRequestData<T extends Record<string, unknown>>(
    controller: BotController,
    adapterKey: string,
): T {
    const requestData = (controller.platformOptions.requestData ??= {});
    const stored = requestData[adapterKey];
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
        return stored as T;
    }
    const result: T = {} as T;
    requestData[adapterKey] = result;
    return result;
}

/**
 * Утилита для безопасного преобразования строки в объект
 * @param {Record<string, unknown> | object | string | null | undefined} data - Данные для преобразования
 * @returns Разобранный объект либо исходное значение (строку) при невозможности разбора; null не возвращается
 */
export function tryParse<TResult = Record<string, unknown>>(
    data: Record<string, unknown> | object | string | null | undefined,
): TResult | null {
    const rawPayload = data;
    if (typeof rawPayload === 'string') {
        const trimmedPayload = rawPayload.trim();
        if (trimmedPayload[0] === '{' || trimmedPayload[0] === '[') {
            try {
                return JSON.parse(rawPayload);
            } catch {
                return rawPayload as unknown as TResult;
            }
        }
    }
    return rawPayload as TResult;
}
