import { Model } from './db/Model';
import { mmApp } from '../mmApp';
import { IModelRules } from './interface';
import {
    IYandexRequestDownloadImage,
    MarusiaRequest,
    TelegramRequest,
    VkRequest,
    YandexImageRequest,
} from '../api';
import { Text } from '../utils/standard/Text';

/**
 * Интерфейс для внутреннего состояния модели изображений.
 * Определяет структуру данных для хранения информации об изображениях в базе данных.
 */
export interface IImageModelState {
    /**
     * Идентификатор/токен изображения.
     * Уникальный идентификатор, используемый для ссылки на изображение в API различных платформ.
     * @example "photo123456789" для Telegram, "123456789" для VK
     */
    imageToken: string;
    /**
     * Расположение изображения (url/директория).
     * Может быть URL-адресом изображения или путем к локальному файлу.
     * @example "https://example.com/image.jpg" или "/path/to/local/image.jpg"
     */
    path: string;
    /**
     * Тип платформы.
     * Определяет, для какой платформы предназначено изображение.
     * @see ImageTokens.T_ALISA
     * @see ImageTokens.T_VK
     * @see ImageTokens.T_TELEGRAM
     * @see ImageTokens.T_MARUSIA
     */
    type: string;
}

/**
 * Модель для управления изображениями в различных платформах.
 * Предоставляет единый интерфейс для работы с изображениями в Яндекс.Алисе, ВКонтакте, Telegram и Марусе.
 *
 * @class ImageTokens
 * @extends Model<IImageModelState>
 *
 * @example
 * // Создание и загрузка изображения для Telegram
 * const image = new ImageTokens();
 * image.path = '/path/to/image.jpg';
 * image.type = ImageTokens.T_TELEGRAM;
 * image.caption = 'Описание изображения';
 * const token = await image.getToken();
 */
export class ImageTokens extends Model<IImageModelState> {
    /**
     * Название таблицы для хранения данных об изображениях.
     * @private
     */
    private TABLE_NAME = 'ImageTokens';

    /**
     * Константы для определения типа платформы.
     * Используются для указания, для какой платформы предназначено изображение.
     */
    /** Тип платформы: Яндекс.Алиса */
    public static readonly T_ALISA = 0;
    /** Тип платформы: ВКонтакте */
    public static readonly T_VK = 1;
    /** Тип платформы: Telegram */
    public static readonly T_TELEGRAM = 2;
    /** Тип платформы: Маруся */
    public static readonly T_MARUSIA = 3;

    /**
     * Идентификатор/токен изображения.
     * Уникальный идентификатор, используемый для ссылки на изображение в API платформы.
     */
    public imageToken: string | null;

    /**
     * Расположение изображения (url/директория).
     * Может быть URL-адресом изображения или путем к локальному файлу.
     */
    public path: string | null;

    /**
     * Тип приложения, для которого загружена картинка.
     * Определяется одной из констант T_ALISA, T_VK, T_TELEGRAM или T_MARUSIA.
     */
    public type: number;

    /**
     * Описание изображения (Не обязательное поле).
     * Используется как подпись к изображению в некоторых платформах.
     */
    public caption: string | null;

    /**
     * Конструктор класса ImageTokens.
     * Инициализирует все поля значениями по умолчанию.
     */
    public constructor() {
        super();
        this.imageToken = null;
        this.path = null;
        this.type = ImageTokens.T_ALISA;
        this.caption = null;
    }

    /**
     * Возвращает название таблицы/файла с данными.
     *
     * @return {string} Название таблицы для хранения данных об изображениях
     */
    public tableName(): string {
        return this.TABLE_NAME;
    }

    /**
     * Определяет правила валидации для полей модели.
     *
     * @return {IModelRules[]} Массив правил валидации
     */
    public rules(): IModelRules[] {
        return [
            {
                name: ['imageToken', 'path'],
                type: 'string',
                max: 150,
            },
            {
                name: ['type'],
                type: 'integer',
            },
        ];
    }

    /**
     * Возвращает метки атрибутов таблицы.
     * Используется для отображения понятных названий полей.
     *
     * @return {IImageModelState} Объект с метками атрибутов
     */
    public attributeLabels(): IImageModelState {
        return {
            imageToken: 'ID',
            path: 'Image path',
            type: 'Type',
        };
    }

    /**
     * Получает или создает токен изображения для указанной платформы.
     * Метод автоматически определяет тип платформы и использует соответствующий API
     * для загрузки и получения токена изображения.
     *
     * @return {Promise<string>} Токен изображения или null в случае ошибки
     *
     * @example
     * // Загрузка изображения для Telegram
     * const image = new ImageTokens();
     * image.path = '/path/to/image.jpg';
     * image.type = ImageTokens.T_TELEGRAM;
     * const token = await image.getToken();
     * if (token) {
     *     console.log('Изображение успешно загружено, токен:', token);
     * }
     */
    public async getToken(): Promise<string | null> {
        const where = { path: this.path, type: this.type };
        switch (this.type) {
            case ImageTokens.T_ALISA:
                if (await this.whereOne(where)) {
                    return this.imageToken;
                } else {
                    const yImage = new YandexImageRequest(
                        mmApp.params.yandex_token || null,
                        mmApp.params.app_id || null,
                    );
                    let res: IYandexRequestDownloadImage | null = null;
                    if (this.path) {
                        if (Text.isUrl(this.path)) {
                            res = await yImage.downloadImageUrl(this.path);
                        } else {
                            res = await yImage.downloadImageFile(this.path);
                        }
                    }
                    if (res) {
                        this.imageToken = res.id;
                        if (await this.save(true)) {
                            return this.imageToken;
                        }
                    }
                }
                break;

            case ImageTokens.T_MARUSIA:
                where.type = ImageTokens.T_MARUSIA;
                if (await this.whereOne(where)) {
                    return this.imageToken;
                } else if (this.path) {
                    const marusiaApi = new MarusiaRequest();
                    const uploadServerResponse = await marusiaApi.marusiaGetPictureUploadLink();
                    if (uploadServerResponse) {
                        const uploadResponse = await marusiaApi.upload(
                            uploadServerResponse.picture_upload_link,
                            this.path,
                        );
                        if (uploadResponse) {
                            const photo = await marusiaApi.marusiaSavePicture(
                                uploadResponse.photo as string,
                                uploadResponse.server,
                                uploadResponse.hash,
                            );
                            if (photo) {
                                this.imageToken = photo.photo_id;
                                if (await this.save(true)) {
                                    return this.imageToken;
                                }
                            }
                        }
                    }
                }
                break;

            case ImageTokens.T_VK:
                where.type = ImageTokens.T_VK;
                if (await this.whereOne(where)) {
                    return this.imageToken;
                } else if (this.path) {
                    const vkApi = new VkRequest();
                    const uploadServerResponse = await vkApi.photosGetMessagesUploadServer(
                        mmApp.params.user_id as string,
                    );
                    if (uploadServerResponse) {
                        const uploadResponse = await vkApi.upload(
                            uploadServerResponse.upload_url,
                            this.path,
                        );
                        if (uploadResponse) {
                            const photo = await vkApi.photosSaveMessagesPhoto(
                                uploadResponse.photo as string,
                                uploadResponse.server,
                                uploadResponse.hash,
                            );
                            if (photo) {
                                this.imageToken = `photo${photo.owner_id}_${photo.id}`;
                                if (await this.save(true)) {
                                    return this.imageToken;
                                }
                            }
                        }
                    }
                }
                break;

            case ImageTokens.T_TELEGRAM: {
                const telegramApi = new TelegramRequest();
                if (await this.whereOne(where)) {
                    await telegramApi.sendPhoto(
                        mmApp.params.user_id as string,
                        this.imageToken as string,
                        this.caption,
                    );
                    return this.imageToken;
                } else if (this.path) {
                    const photo = await telegramApi.sendPhoto(
                        mmApp.params.user_id as string,
                        this.path,
                        this.caption,
                    );
                    if (photo && photo.ok && photo.result.photo) {
                        if (typeof photo.result.photo.file_id !== 'undefined') {
                            this.imageToken = photo.result.photo.file_id;
                            if (await this.save(true)) {
                                return this.imageToken;
                            }
                        }
                    }
                }
                break;
            }
        }
        return null;
    }
}
