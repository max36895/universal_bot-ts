/**
 * Class ImageTokens
 * @package bot\models
 *
 * Модель для взаимодействия со всеми картинками.
 */
import {Model} from "./db/Model";
import {mmApp} from "../core/mmApp";
import {IModelRules} from "./interface/IModel";
import {YandexImageRequest} from "../api/YandexImageRequest";
import {Text} from "../components/standard/Text";
import {IYandexRequestDownloadImage} from "../api/interfaces/IYandexApi";
import {TelegramRequest} from "../api/TelegramRequest";
import {VkRequest} from "../api/VkRequest";

export class ImageTokens extends Model {
    private TABLE_NAME = 'ImageTokens';
    public static readonly T_ALISA = 0;
    public static readonly T_VK = 1;
    public static readonly T_TELEGRAM = 2;
    public static readonly T_MARUSIA = 3;

    /**
     * Идентификатор/токен картинки.
     * @var string|null imageToken Идентификатор/токен картинки.
     */
    public imageToken: string;
    /**
     * Расположение картинки (url/директория).
     * @var string|null path Расположение картинки (url/директория).
     */
    public path: string;
    /**
     * Тип приложения, для которого загружена картинка.
     * @var string|int type Тип приложения, для которого загружена картинка.
     */
    public type: number;
    /**
     * Описание картинки (Не обязательное поле).
     * @var string|null caption Описание картинки (Не обязательное поле).
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
     * Получить идентификатор/токен изображения.
     *
     * @return string|null
     * @api
     */
    public getToken(): string {
        switch (this.type) {
            case ImageTokens.T_ALISA:
                if (this.whereOne(`\`path\`=\"${this.path}\" AND \`type\`=${ImageTokens.T_ALISA}`)) {
                    return this.imageToken;
                } else {
                    const yImage = new YandexImageRequest(mmApp.params.yandex_token || null, mmApp.params.app_id || null);
                    let res: IYandexRequestDownloadImage = null;
                    if (Text.isSayText(['http\:\/\/', 'https\:\/\/'], this.path)) {
                        res = yImage.downloadImageUrl(this.path);
                    } else {
                        res = yImage.downloadImageFile(this.path);
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
                if (this.whereOne(`\`path\`=\"${this.path}\" AND \`type\`=${ImageTokens.T_VK}`)) {
                    return this.imageToken;
                } else {
                    const vkApi = new VkRequest();
                    const uploadServerResponse = vkApi.photosGetMessagesUploadServer(mmApp.params.user_id);
                    if (uploadServerResponse) {
                        const uploadResponse = vkApi.upload(uploadServerResponse.upload_url, this.path);
                        if (uploadResponse) {
                            const photo = vkApi.photosSaveMessagesPhoto(uploadResponse.photo, uploadResponse.server, uploadResponse.hash);
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
                if (this.whereOne(`\`path\`=\"${this.path}\" AND \`type\`=${ImageTokens.T_TELEGRAM}`)) {
                    telegramApi.sendPhoto(mmApp.params.user_id, this.imageToken, this.caption);
                    return this.imageToken;
                } else {
                    const photo = telegramApi.sendPhoto(mmApp.params.user_id, this.path, this.caption);
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
