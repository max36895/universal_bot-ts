import { Model } from './db/Model';
import { IModelRules } from './interface';
import { MarusiaRequest, MaxRequest, TelegramRequest, VkRequest, YandexImageRequest } from '../api';
import { Text } from '../utils/standard/Text';
import { AppContext } from '../core/AppContext';

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
     * Тип платформы: Max
     * */
    public static readonly T_MAXAPP = 4;

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
    public constructor(appContext: AppContext) {
        super(appContext);
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
        const { path, type } = this;
        if (!path) return null;

        const where = { path, type };
        const exists = await this.whereOne(where);
        if (exists && this.imageToken) {
            return this._handleExistingToken(type);
        }

        switch (type) {
            case ImageTokens.T_ALISA:
                return this._uploadToAlisa(path);
            case ImageTokens.T_MARUSIA:
                return this._uploadToMarusia(path);
            case ImageTokens.T_VK:
                return this._uploadToVk(path);
            case ImageTokens.T_MAXAPP:
                return this._uploadToMax(path);
            case ImageTokens.T_TELEGRAM:
                return this._uploadToTelegram(path);
            default:
                this._log('ImageTokens.getToken(): Неизвестный тип платформы');
                return null;
        }
    }

    // --- Вспомогательные методы (маленькие, специализированные) ---

    private async _handleExistingToken(type: number): Promise<string> {
        if (type === ImageTokens.T_TELEGRAM && this.imageToken) {
            await new TelegramRequest(this._appContext).sendPhoto(
                this._appContext.platformParams.user_id as string,
                this.imageToken,
                this.caption || undefined,
            );
        }
        return this.imageToken!;
    }

    private async _uploadToAlisa(path: string): Promise<string | null> {
        const yImage = new YandexImageRequest(
            this._appContext.platformParams.yandex_token || null,
            this._appContext.platformParams.app_id || null,
            this._appContext,
        );

        if (path) {
            const res = Text.isUrl(path)
                ? await yImage.downloadImageUrl(path)
                : await yImage.downloadImageFile(path);

            if (res?.id) {
                this.imageToken = res.id;
                if (await this.save(true)) {
                    return this.imageToken;
                }
            }
        }
        return null;
    }

    private async _uploadToMarusia(path: string): Promise<string | null> {
        const api = new MarusiaRequest(this._appContext);
        const uploadLink = await api.marusiaGetPictureUploadLink();
        if (!uploadLink) {
            return null;
        }

        const upload = await api.upload(uploadLink.picture_upload_link, path);
        if (!upload) {
            return null;
        }

        const picture = await api.marusiaSavePicture(upload.photo, upload.server, upload.hash);
        if (picture?.photo_id) {
            this.imageToken = picture.photo_id;
            if (await this.save(true)) {
                return this.imageToken;
            }
        }
        return null;
    }

    private async _uploadToVk(path: string): Promise<string | null> {
        const api = new VkRequest(this._appContext);
        const server = await api.photosGetMessagesUploadServer(
            this._appContext.platformParams.user_id as string,
        );
        if (!server?.upload_url) {
            return null;
        }

        const upload = await api.upload(server.upload_url, path);
        if (!upload?.photo) {
            return null;
        }

        const photo = await api.photosSaveMessagesPhoto(upload.photo, upload.server, upload.hash);
        if (photo?.id) {
            this.imageToken = `photo${photo.owner_id}_${photo.id}`;
            if (await this.save(true)) {
                return this.imageToken;
            }
        }
        return null;
    }

    private async _uploadToMax(path: string): Promise<string | null> {
        const api = new MaxRequest(this._appContext);
        const upload = await api.upload(path, 'image');
        if (upload?.token || upload?.url) {
            this.imageToken = upload.token || upload.url;
            if (await this.save(true)) {
                return this.imageToken;
            }
        }
        return null;
    }

    private async _uploadToTelegram(path: string): Promise<string | null> {
        const api = new TelegramRequest(this._appContext);
        const photo = await api.sendPhoto(
            this._appContext.platformParams.user_id as string,
            path,
            this.caption || undefined,
        );

        if (photo?.ok && photo.result?.photo?.file_id) {
            this.imageToken = photo.result.photo.file_id;
            if (await this.save(true)) {
                return this.imageToken;
            }
        }
        return null;
    }

    private _log(error: string): void {
        this._appContext.saveLog('ImageTokens.log', error);
    }
}
