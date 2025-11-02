import { ImageTokens, SoundTokens } from './models';
import {
    AppContext,
    TAppType,
    T_ALISA,
    T_MARUSIA,
    T_MAXAPP,
    T_TELEGRAM,
    T_VK,
    T_VIBER,
} from './core';
import { MarusiaRequest, YandexImageRequest, YandexSoundRequest } from './api';

/**
 * Класс, предназначенный для предварительной загрузки медиаресурсов (изображений, звуков) для различных платформ.
 *
 * Этот класс позволяет загрузить файлы на серверы платформ и закэшировать их токены *до* начала обработки
 * пользовательских запросов, что помогает избежать превышения лимита времени библиотеки (1 секунда) при
 * первичной отправке медиафайлов в ответе.
 *
 * @example
 * // В точке входа приложения (например, index.ts)
 * import { Preload } from 'umbot';
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
 * // Теперь бот готов к работе, и первые вызовы с медиа будут быстрыми
 * bot.start('localhost', 3000);
 */
export class Preload {
    private _appContext: AppContext | undefined;

    /**
     * Создает экземпляр класса Preload.
     *
     * @param {AppContext} [appContext] - Контекст приложения, необходимый для доступа к БД и конфигурации.
     *                                   Может быть установлен позже через `setAppContext`.
     */
    constructor(appContext?: AppContext) {
        this.setAppContext(appContext);
    }

    /**
     * Устанавливает контекст приложения.
     *
     * @param {AppContext} [appContext] - Контекст приложения.
     */
    public setAppContext(appContext?: AppContext): void {
        this._appContext = appContext;
    }

    /**
     * Возвращает список платформ, для которых в конфигурации `AppContext` указаны токены.
     * Если передан массив `platforms`, результат фильтруется по этому списку.
     *
     * @param {TAppType[]} [platforms] - Массив типов платформ для фильтрации.
     * @returns {TAppType[]} Массив доступных платформ.
     * @private
     */
    protected _getPlatforms(platforms?: TAppType[]): TAppType[] {
        const result: TAppType[] = [];
        if (this._appContext) {
            const platformParams = this._appContext.platformParams;
            // Проверяем наличие токенов для каждой платформы
            if (platformParams.yandex_token) {
                if (!platforms || platforms.includes(T_ALISA)) {
                    result.push(T_ALISA);
                }
            }
            if (platformParams.marusia_token) {
                if (!platforms || platforms.includes(T_MARUSIA)) {
                    result.push(T_MARUSIA);
                }
            }
            if (platformParams.vk_token) {
                if (!platforms || platforms.includes(T_VK)) {
                    result.push(T_VK);
                }
            }
            if (platformParams.telegram_token) {
                if (!platforms || platforms.includes(T_TELEGRAM)) {
                    result.push(T_TELEGRAM);
                }
            }
            if (platformParams.viber_token) {
                if (!platforms || platforms.includes(T_VIBER)) {
                    result.push(T_VIBER);
                }
            }
            if (platformParams.max_token) {
                if (!platforms || platforms.includes(T_MAXAPP)) {
                    result.push(T_MAXAPP);
                }
            }
        }
        return result;
    }

    /**
     * Возвращает внутренний тип изображения, используемый в `ImageTokens`, для указанной платформы.
     *
     * @param {TAppType} platform - Тип платформы.
     * @returns {number | undefined} Тип изображения для `ImageTokens` или `undefined`, если платформа не поддерживается
     *                               или не требует предзагрузки (например, Telegram).
     * @private
     */
    public _getImageType(platform: TAppType): number | undefined {
        switch (platform) {
            case T_ALISA:
                return ImageTokens.T_ALISA;
            case T_MARUSIA:
                return ImageTokens.T_MARUSIA;
            case T_VK:
                return ImageTokens.T_VK;
            case T_MAXAPP:
                return ImageTokens.T_MAXAPP;
            case T_TELEGRAM:
                // Telegram отправляет файлы напрямую, предзагрузка не требуется.
                break;
        }
        return undefined;
    }

    /**
     * Возвращает внутренний тип звука, используемый в `SoundTokens`, для указанной платформы.
     *
     * @param {TAppType} platform - Тип платформы.
     * @returns {number | undefined} Тип звука для `SoundTokens` или `undefined`, если платформа не поддерживается
     *                               или не требует предзагрузки (например, Telegram).
     * @private
     */
    public _getSoundType(platform: TAppType): number | undefined {
        switch (platform) {
            case T_ALISA:
                return SoundTokens.T_ALISA;
            case T_MARUSIA:
                return SoundTokens.T_MARUSIA;
            case T_VK:
                return SoundTokens.T_VK;
            case T_TELEGRAM:
                // Telegram отправляет аудио напрямую, предзагрузка не требуется.
                break;
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
                    if (typeof type !== 'undefined') {
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
                    if (typeof type !== 'undefined') {
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
     * @returns {Promise<(string | null)[]>[]} Массив промисов, каждый из которых разрешается токеном изображения
     *                                        или `null` в случае ошибки или если платформа не поддерживается.
     */
    public loadImages(images: string[], platforms?: TAppType[]): Promise<string | null>[] {
        const allowedPlatforms = this._getPlatforms(platforms);
        const promises: Promise<string | null>[] = [];
        if (allowedPlatforms.length && this._appContext) {
            // Создаем один экземпляр ImageTokens и переиспользуем его
            const imageToken = new ImageTokens(this._appContext as AppContext);
            images.forEach((image) => {
                allowedPlatforms.forEach((platform) => {
                    const type = this._getImageType(platform);
                    // Проверяем, что тип определен перед установкой
                    if (typeof type !== 'undefined') {
                        imageToken.path = image;
                        imageToken.type = type;
                        // Добавляем промис в массив
                        promises.push(imageToken.getToken());
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
     * @returns {Promise<(string | null)[]>[]} Массив промисов, каждый из которых разрешается токеном звука
     *                                        или `null` в случае ошибки или если платформа не поддерживается.
     */
    public loadSounds(sounds: string[], platforms?: TAppType[]): Promise<string | null>[] {
        const allowedPlatforms = this._getPlatforms(platforms);
        const promises: Promise<string | null>[] = [];
        if (allowedPlatforms.length && this._appContext) {
            // Создаем один экземпляр SoundTokens и переиспользуем его
            const soundToken = new SoundTokens(this._appContext as AppContext);
            sounds.forEach((sound) => {
                allowedPlatforms.forEach((platform) => {
                    const type = this._getSoundType(platform);
                    // Проверяем, что тип определен перед установкой
                    if (typeof type !== 'undefined') {
                        soundToken.path = sound;
                        soundToken.type = type;
                        // Добавляем промис в массив
                        promises.push(soundToken.getToken());
                    }
                });
            });
        }
        return promises;
    }
}
