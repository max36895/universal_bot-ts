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
 * Интерфейс для внутреннего состояния модели.
 */
export interface IImageModelState {
    /**
     * Идентификатор/токен изображения.
     */
    imageToken: string;
    /**
     * Расположение изображения (url/директория).
     */
    path: string;
    /**
     * Тип платформы.
     */
    type: string;
}

/**
 * Модель для взаимодействия со всеми изображениями.
 * @class ImageTokens
 */
export class ImageTokens extends Model<IImageModelState> {
    /**
     * Название таблицы для хранения данных
     * @private
     */
    private TABLE_NAME = 'ImageTokens';
    /**
     * Тип платформы: Яндекс.Алиса
     * @readonly
     */
    public static readonly T_ALISA = 0;
    /** Тип платформы: ВКонтакте */
    public static readonly T_VK = 1;
    /** Тип платформы: Telegram */
    public static readonly T_TELEGRAM = 2;
    /**
     * Тип платформы: Маруся
     */
    public static readonly T_MARUSIA = 3;

    /**
     * Идентификатор/токен изображения.
     */
    public imageToken: string | null;
    /**
     * Расположение изображения (url/директория).
     */
    public path: string | null;
    /**
     * Тип приложения, для которого загружена картинка.
     */
    public type: number;
    /**
     * Описание изображения (Не обязательное поле).
     */
    public caption: string | null;

    /**
     * ImageTokens constructor.
     */
    public constructor() {
        super();
        this.imageToken = null;
        this.path = null;
        this.type = ImageTokens.T_ALISA;
        this.caption = null;
    }

    /**
     * Название таблицы/файла с данными.
     *
     * @return string
     */
    public tableName(): string {
        return this.TABLE_NAME;
    }

    /**
     * Основные правила для полей.
     *
     * @return IModelRules[]
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
     * Название атрибутов таблицы.
     *
     * @return {IImageModelState}
     */
    public attributeLabels(): IImageModelState {
        return {
            imageToken: 'ID',
            path: 'Image path',
            type: 'Type',
        };
    }

    /**
     * Получение идентификатора/токена изображения.
     *
     * @return {Promise<string>}
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
