import {Model} from "./db/Model";
import {mmApp} from "../core";
import {IModelRules} from "./interface/IModel";
import {
    YandexImageRequest,
    IYandexRequestDownloadImage,
    TelegramRequest,
    VkRequest
} from "../api";
import {Text} from "../components/standard/Text";

/**
 * @class ImageTokens
 *
 * Модель для взаимодействия со всеми изображениями.
 */
export class ImageTokens extends Model {
    private TABLE_NAME = 'ImageTokens';
    public static readonly T_ALISA = 0;
    public static readonly T_VK = 1;
    public static readonly T_TELEGRAM = 2;
    public static readonly T_MARUSIA = 3;

    /**
     * Идентификатор/токен изображения.
     */
    public imageToken: string;
    /**
     * Расположение изображения (url/директория).
     */
    public path: string;
    /**
     * Тип приложения, для которого загружена картинка.
     */
    public type: number;
    /**
     * Описание изображения (Не обязательное поле).
     */
    public caption: string;

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
     * Создание таблицы бд для хранения загруженных картинок.
     *
     * @return boolean|mysqli_result|null
     * @api
     */
    public createTable() {
        /*if (IS_SAVE_DB) {
            const sql = `CREATE TABLE IF NOT EXISTS \`${this.tableName()}\` (
  \`imageToken\` VARCHAR(150) COLLATE utf8_unicode_ci NOT NULL,
  \`path\` VARCHAR(150) COLLATE utf8_unicode_ci DEFAULT NULL,
  \`type\` INT(3) NOT NULL,
  PRIMARY KEY (\`imageToken\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`;
            return this.query(sql);
        }
        return null;*/
    }

    /**
     * Удаление таблицы бд для хранения загруженных картинок.
     *
     * @return boolean|mysqli_result|null
     * @api
     */
    public dropTable() {
        /*if (IS_SAVE_DB) {
            return this.query(`DROP TABLE IF EXISTS \`${this.tableName()}\`;`);
        }
        return null;*/
    }

    /**
     * Название таблицы/файла с данными.
     *
     * @return string
     * @api
     */
    public tableName(): string {
        return this.TABLE_NAME;
    }

    /**
     * Основные правила для полей.
     *
     * @return IModelRules[]
     * @api
     */
    public rules(): IModelRules[] {
        return [
            {
                name: ['imageToken', 'path'],
                type: 'string',
                max: 150
            },
            {
                name: ['type'],
                type: 'integer',
            }
        ];
    }

    /**
     * Название атрибутов таблицы.
     *
     * @return object
     * @api
     */
    public attributeLabels(): object {
        return {
            imageToken: 'ID',
            path: 'Image path',
            type: 'Type'
        };
    }

    /**
     * Получение идентификатора/токена изображения.
     *
     * @return {Promise<string>}
     * @api
     */
    public async getToken(): Promise<string> {
        const where = {path: this.path, type: this.type};
        switch (this.type) {
            case ImageTokens.T_ALISA:
                if (await this.whereOne(where)) {
                    return this.imageToken;
                } else {
                    const yImage = new YandexImageRequest(mmApp.params.yandex_token || null, mmApp.params.app_id || null);
                    let res: IYandexRequestDownloadImage = null;
                    if (Text.isSayText(['http\:\/\/', 'https\:\/\/'], this.path)) {
                        res = await yImage.downloadImageUrl(this.path);
                    } else {
                        res = await yImage.downloadImageFile(this.path);
                    }
                    if (res) {
                        this.imageToken = res.id;
                        if (this.save(true)) {
                            return this.imageToken;
                        }
                    }
                }
                break;

            case ImageTokens.T_VK:
            case ImageTokens.T_MARUSIA: // TODO не понятно как получить токен, возможно также и в вк
                where.type = ImageTokens.T_VK;
                if (await this.whereOne(where)) {
                    return this.imageToken;
                } else {
                    const vkApi = new VkRequest();
                    const uploadServerResponse = await vkApi.photosGetMessagesUploadServer(mmApp.params.user_id);
                    if (uploadServerResponse) {
                        const uploadResponse = await vkApi.upload(uploadServerResponse.upload_url, this.path);
                        if (uploadResponse) {
                            const photo = await vkApi.photosSaveMessagesPhoto(uploadResponse.photo, uploadResponse.server, uploadResponse.hash);
                            if (photo) {
                                this.imageToken = `photo${photo.owner_id}_${photo.id}`;
                                if (this.save(true)) {
                                    return this.imageToken;
                                }
                            }
                        }
                    }
                }
                break;

            case ImageTokens.T_TELEGRAM:
                const telegramApi = new TelegramRequest();
                if (await this.whereOne(where)) {
                    await telegramApi.sendPhoto(mmApp.params.user_id, this.imageToken, this.caption);
                    return this.imageToken;
                } else {
                    const photo = await telegramApi.sendPhoto(mmApp.params.user_id, this.path, this.caption);
                    if (photo && photo.ok) {
                        if (typeof photo.result.photo.file_id !== 'undefined') {
                            this.imageToken = photo.result.photo.file_id;
                            if (this.save(true)) {
                                return this.imageToken;
                            }
                        }
                    }
                }
                break;
        }
        return null;
    }
}
