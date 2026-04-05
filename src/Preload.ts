/**
 * Модуль для предварительной загрузки медиаресурсов (изображений, звуков) на серверы платформ.
 *
 * Позволяет заранее получить и закэшировать токены медиафайлов, чтобы при ответе пользователю
 * не тратить время на загрузку. Особенно полезно для платформ с жёсткими тайм-аутами
 * (Алиса, Маруся, Сбер Салют), где время ответа ограничено 2–3 секундами.
 *
 * **Важно:** Для Telegram токен можно получить только отправив файл конкретному пользователю.
 * Используйте опцию `telegramUseId` в методах `loadImages` / `loadSounds`.
 *
 * @packageDocumentation
 * @module preload
 */
import { ImageTokens, SoundTokens } from './models';
import { AppContext, ITokenPlatform, TAppType } from './core';
import {
    MarusiaRequest,
    YandexImageRequest,
    YandexSoundRequest,
    T_ALISA,
    T_MARUSIA,
    T_VK,
    T_MAX_APP,
    T_TELEGRAM,
    T_VIBER,
    AlisaCard,
    MarusiaCard,
    VkCard,
    TelegramCard,
    MaxCard,
    AlisaSound,
    MarusiaSound,
    TelegramSound,
    VkSound,
} from './plugins';
import { BaseBotController, BotController } from './controller';

interface IImageMap {
    [T_ALISA]: typeof AlisaCard;
    [T_MARUSIA]: typeof MarusiaCard;
    [T_VK]: typeof VkCard;
    [T_MAX_APP]: typeof MaxCard;
    [T_TELEGRAM]: typeof TelegramCard;
}

const IMAGE_MAP: IImageMap = {
    [T_ALISA]: AlisaCard,
    [T_MARUSIA]: MarusiaCard,
    [T_VK]: VkCard,
    [T_MAX_APP]: MaxCard,
    [T_TELEGRAM]: TelegramCard,
};

interface ISoundMap {
    [T_ALISA]: typeof AlisaSound;
    [T_MARUSIA]: typeof MarusiaSound;
    [T_VK]: typeof VkSound;
    [T_TELEGRAM]: typeof TelegramSound;
}

const SOUND_MAP: ISoundMap = {
    [T_ALISA]: AlisaSound,
    [T_MARUSIA]: MarusiaSound,
    [T_VK]: VkSound,
    [T_TELEGRAM]: TelegramSound,
};

interface IPlatformMap {
    [T_ALISA]: 'alisa';
    [T_MARUSIA]: 'marusia';
    [T_VK]: 'vk';
    [T_TELEGRAM]: 'telegram';
    [T_VIBER]: 'viber';
    [T_MAX_APP]: 'max';
}

const PLATFORMS: IPlatformMap = {
    [T_ALISA]: 'alisa',
    [T_MARUSIA]: 'marusia',
    [T_VK]: 'vk',
    [T_TELEGRAM]: 'telegram',
    [T_VIBER]: 'viber',
    [T_MAX_APP]: 'max',
};

/**
 * Дополнительные опции для предзагрузчика
 */
export interface IOptions {
    /**
     * Пользователь Telegram, которому будет отправлено изображение для получения токена
     */
    telegramUseId?: string | number;
}

/**
 * Класс, предназначенный для предварительной загрузки медиаресурсов (изображений, звуков) для различных платформ.
 *
 * Этот класс позволяет загрузить файлы на серверы платформ и закэшировать их токены *до* начала обработки
 * пользовательских запросов, что помогает сократить время обработки пользовательского запроса при
 * первичной отправке медиафайлов в ответе.
 *
 * @example
 * // В точке входа приложения (например, index.ts)
 * import { Preload } from 'umbot/preload';
 *
 * // Предположим, appContext уже инициализирован
 * const preload = new Preload(appContext);
 *
 * // Загрузить изображения для Алисы и ВК
 * const imagePromises = preload.loadImages(['/path/to/img1.jpg', '/path/to/img2.png'], [T_ALISA, T_VK]);
 * // Загрузить звуки только для Маруси
 * const soundPromises = preload.loadSounds(['/path/to/sound1.mp3'], [T_MARUSIA]);
 *
 * // Запустить загрузку (все промисы выполняются параллельно)
 * try {
 *   await Promise.all(imagePromises);
 *   console.log('Изображения предзагружены');
 *   await Promise.all(soundPromises);
 *   console.log('Звуки предзагружены');
 * } catch (error) {
 *   console.error('Ошибка при предзагрузке:', error);
 * }
 *
 * // Теперь приложение готово к работе, и первые вызовы с медиа будут быстрыми
 * bot.start('localhost', 3000);
 */
export class Preload {
    private _appContext: AppContext | undefined;
    private readonly _controller: BotController;

    /**
     * Создает экземпляр класса Preload.
     *
     * @param {AppContext} [appContext] - Контекст приложения, необходимый для доступа к БД и конфигурации.
     *                                   Может быть установлен позже через `setAppContext`.
     */
    constructor(appContext?: AppContext) {
        this.setAppContext(appContext);
        this._controller = new BaseBotController(appContext as AppContext);
    }

    /**
     * Устанавливает контекст приложения.
     *
     * @param {AppContext} [appContext] - Контекст приложения.
     */
    public setAppContext(appContext?: AppContext): void {
        this._appContext = appContext;
        this._controller.setAppContext(appContext as AppContext);
    }

    /**
     * Возвращает список платформ, для которых в конфигурации `AppContext` указаны токены.
     * Если передан массив `platforms`, результат фильтруется по этому списку.
     *
     * @param {TAppType[]} [platforms] - Массив типов платформ для фильтрации.
     * @returns {TAppType[]} Массив доступных платформ.
     */
    protected _getPlatforms(platforms?: TAppType[]): TAppType[] {
        const result: TAppType[] = [];
        if (this._appContext) {
            const platformParams = this._appContext.appConfig.tokens;
            // Проверяем наличие токенов для каждой платформы
            Object.keys(PLATFORMS).forEach((key) => {
                if (
                    platformParams[PLATFORMS[key as keyof IPlatformMap] as keyof ITokenPlatform]
                        ?.token
                ) {
                    if (!platforms || platforms.includes(key)) {
                        result.push(key);
                    }
                }
            });
        }
        return result;
    }

    /**
     * Возвращает внутренний тип изображения, используемый в `ImageTokens`, для указанной платформы.
     *
     * @param {TAppType} platform - Тип платформы.
     * @returns {number | undefined} Тип изображения для `ImageTokens` или `undefined`, если платформа не поддерживается
     *                               или не требует предзагрузки (например, Telegram).
     */
    protected _getImageType(platform: TAppType): string | undefined {
        switch (platform) {
            case T_ALISA:
                return T_ALISA;
            case T_MARUSIA:
                return T_MARUSIA;
            case T_VK:
                return T_VK;
            case T_MAX_APP:
                return T_MAX_APP;
            case T_TELEGRAM:
                return T_TELEGRAM;
        }
        return undefined;
    }

    /**
     * Возвращает внутренний тип звука, используемый в `SoundTokens`, для указанной платформы.
     *
     * @param {TAppType} platform - Тип платформы.
     * @returns {number | undefined} Тип звука для `SoundTokens` или `undefined`, если платформа не поддерживается
     *                               или не требует предзагрузки (например, Telegram).
     */
    protected _getSoundType(platform: TAppType): string | undefined {
        switch (platform) {
            case T_ALISA:
                return T_ALISA;
            case T_MARUSIA:
                return T_MARUSIA;
            case T_VK:
                return T_VK;
            case T_TELEGRAM:
                return T_TELEGRAM;
        }
        return undefined;
    }

    /**
     * Подготавливает промисы для удаления изображений с серверов платформ и из базы данных.
     *
     * Этот метод *не запускает* выполнение промисов. Для выполнения удаления необходимо
     * использовать `Promise.all()` или `Promise.allSettled()` с возвращаемым массивом.
     *
     * @param {string[]} images - Массив путей к файлам изображений для удаления.
     * @param {TAppType[]} [platforms] - Массив типов платформ для фильтрации. Если не указан, обрабатываются все доступные.
     * @returns {Promise<boolean>[]} Массив промисов, каждый из которых разрешается `true` при успешном удалении
     *                              или `false` при ошибке.
     */
    public removeImages(images: string[], platforms?: TAppType[]): Promise<boolean>[] {
        const allowedPlatforms = this._getPlatforms(platforms);
        const promises: Promise<boolean>[] = [];
        if (allowedPlatforms.length && this._appContext) {
            const imageTokensModel = new ImageTokens(this._appContext);
            images.forEach((image) => {
                allowedPlatforms.forEach((platform) => {
                    const type = this._getImageType(platform);
                    if (type !== undefined) {
                        const removePromise = (async (): Promise<boolean> => {
                            try {
                                const tokenRecord = await imageTokensModel.where({
                                    path: image,
                                    type,
                                });
                                if (tokenRecord && imageTokensModel.imageToken) {
                                    let apiRequest;
                                    let req;
                                    if (platform === T_ALISA || platform === T_MARUSIA) {
                                        if (platform === T_ALISA) {
                                            apiRequest = new YandexImageRequest(
                                                null,
                                                null,
                                                this._appContext as AppContext,
                                            );
                                            req = await apiRequest.deleteImage(
                                                imageTokensModel.imageToken,
                                            );
                                        } else {
                                            apiRequest = new MarusiaRequest(
                                                this._appContext as AppContext,
                                            );
                                            req = await apiRequest.marusiaDeletePicture(
                                                imageTokensModel.imageToken,
                                            );
                                        }
                                        if (req) {
                                            await imageTokensModel.remove();
                                        }
                                        // eslint-disable-next-line require-atomic-updates
                                        imageTokensModel.imageToken = null;
                                    }
                                }
                                return true;
                            } catch (error) {
                                this._appContext?.logError(
                                    `Ошибка при удалении изображения "${image}" на платформе ${platform}:`,
                                    error as Record<string, unknown>,
                                );
                                return false;
                            }
                        })();

                        promises.push(removePromise);
                    }
                });
            });
        }
        return promises;
    }

    /**
     * Подготавливает промисы для удаления звуков с серверов платформ и из базы данных.
     *
     * Этот метод *не запускает* выполнение промисов. Для выполнения удаления необходимо
     * использовать `Promise.all()` или `Promise.allSettled()` с возвращаемым массивом.
     *
     * @param {string[]} sounds - Массив путей к файлам звуков для удаления.
     * @param {TAppType[]} [platforms] - Массив типов платформ для фильтрации. Если не указан, обрабатываются все доступные.
     * @returns {Promise<boolean>[]} Массив промисов, каждый из которых разрешается `true` при успешном удалении
     *                              или `false` при ошибке.
     */
    public removeSounds(sounds: string[], platforms?: TAppType[]): Promise<boolean>[] {
        const allowedPlatforms = this._getPlatforms(platforms);
        const promises: Promise<boolean>[] = [];
        if (allowedPlatforms.length && this._appContext) {
            const soundTokensModel = new SoundTokens(this._appContext);
            sounds.forEach((sound) => {
                allowedPlatforms.forEach((platform) => {
                    const type = this._getSoundType(platform);
                    if (type !== undefined) {
                        const removePromise = (async (): Promise<boolean> => {
                            try {
                                // Аналогично removeImages, но для SoundTokens
                                const tokenRecord = await soundTokensModel.where({
                                    path: sound,
                                    type,
                                }); // Предполагаем метод getOneByPathAndType
                                if (tokenRecord && soundTokensModel.soundToken) {
                                    let apiRequest;
                                    let req;
                                    if (platform === T_ALISA || platform === T_MARUSIA) {
                                        if (platform === T_ALISA) {
                                            apiRequest = new YandexSoundRequest(
                                                null,
                                                null,
                                                this._appContext as AppContext,
                                            );
                                            req = await apiRequest.deleteSound(
                                                soundTokensModel.soundToken,
                                            );
                                        } else {
                                            apiRequest = new MarusiaRequest(
                                                this._appContext as AppContext,
                                            );
                                            req = await apiRequest.marusiaDeleteAudio(
                                                soundTokensModel.soundToken,
                                            );
                                        }
                                        if (req) {
                                            await soundTokensModel.remove();
                                        }
                                        // eslint-disable-next-line require-atomic-updates
                                        soundTokensModel.soundToken = null;
                                    }
                                }
                                return true;
                            } catch (error) {
                                this._appContext?.logError(
                                    `Ошибка при удалении звука "${sound}" на платформе ${platform}:`,
                                    error as Record<string, unknown>,
                                );
                                return false;
                            }
                        })();

                        promises.push(removePromise);
                    }
                });
            });
        }
        return promises;
    }

    /**
     * Подготавливает промисы для загрузки и кэширования изображений для указанных платформ.
     *
     * Этот метод *не запускает* выполнение промисов. Для выполнения загрузки необходимо
     * использовать `Promise.all()` или `Promise.allSettled()` с возвращаемым массивом.
     *
     * @param {string[]} images - Массив путей к файлам изображений для загрузки.
     * @param {TAppType[]} [platforms] - Массив типов платформ для фильтрации. Если не указан, обрабатываются все доступные.
     * @param opts - Дополнительные опции для загрузки. Так как в Telegram не получить токен без отправки файла пользователю, можно отправить файл произвольному пользователю, который будет передан в свойстве.
     * @returns {Promise<(string | null)[]>[]} Массив промисов, каждый из которых разрешается токеном изображения
     *                                        или `null` в случае ошибки или если платформа не поддерживается.
     */
    public loadImages(
        images: string[],
        platforms?: TAppType[],
        opts?: IOptions,
    ): Promise<string | null>[] {
        const allowedPlatforms = this._getPlatforms(platforms);
        const promises: Promise<string | null>[] = [];
        if (allowedPlatforms.length && this._appContext) {
            // Создаем один экземпляр ImageTokens и переиспользуем его
            const imageToken = new ImageTokens(this._appContext);
            images.forEach((image) => {
                allowedPlatforms.forEach((platform) => {
                    const type = this._getImageType(platform);
                    // Проверяем, что тип определен перед установкой
                    if (type !== undefined) {
                        imageToken.path = image;
                        imageToken.platform = type;
                        if (type === T_TELEGRAM) {
                            if (opts?.telegramUseId) {
                                this._controller.userId = opts.telegramUseId;
                                promises.push(
                                    TelegramCard.getImageInDB(this._controller, image, ''),
                                );
                            }
                        } else {
                            // Добавляем промис в массив
                            promises.push(
                                IMAGE_MAP[type as keyof IImageMap].getImageInDB(
                                    this._controller,
                                    image,
                                    '',
                                ),
                            );
                        }
                    }
                });
            });
        }
        return promises;
    }

    /**
     * Подготавливает промисы для загрузки и кэширования звуков для указанных платформ.
     *
     * Этот метод *не запускает* выполнение промисов. Для выполнения загрузки необходимо
     * использовать `Promise.all()` или `Promise.allSettled()` с возвращаемым массивом.
     *
     * @param {string[]} sounds - Массив путей к файлам звуков для загрузки.
     * @param {TAppType[]} [platforms] - Массив типов платформ для фильтрации. Если не указан, обрабатываются все доступные.
     * @param opts - Дополнительные опции для загрузки. Так как в телеграм не получить токен без отправки файла пользователю, можно отправить файл произвольному пользователю, который будет передан в свойстве.
     * @returns {Promise<(string | null)[]>[]} Массив промисов, каждый из которых разрешается токеном звука
     *                                        или `null` в случае ошибки или если платформа не поддерживается.
     */
    public loadSounds(
        sounds: string[],
        platforms?: TAppType[],
        opts?: IOptions,
    ): Promise<string | null>[] {
        const allowedPlatforms = this._getPlatforms(platforms);
        const promises: Promise<string | null>[] = [];
        if (allowedPlatforms.length && this._appContext) {
            // Создаем один экземпляр SoundTokens и переиспользуем его
            const soundToken = new SoundTokens(this._appContext);
            sounds.forEach((sound) => {
                allowedPlatforms.forEach((platform) => {
                    const type = this._getSoundType(platform);
                    // Проверяем, что тип определен перед установкой
                    if (type !== undefined) {
                        soundToken.path = sound;
                        soundToken.platform = type;
                        if (type === T_TELEGRAM) {
                            if (opts?.telegramUseId) {
                                this._controller.userId = opts.telegramUseId;
                                promises.push(TelegramSound.getSoundInDB(this._controller, sound));
                            }
                        } else {
                            // Добавляем промис в массив
                            promises.push(
                                SOUND_MAP[type as keyof ISoundMap].getSoundInDB(
                                    this._controller,
                                    sound,
                                ),
                            );
                        }
                    }
                });
            });
        }
        return promises;
    }
}
