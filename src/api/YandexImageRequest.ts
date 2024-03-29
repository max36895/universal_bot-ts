import {YandexRequest} from './YandexRequest';
import {mmApp} from '../mmApp';
import {Request} from './request/Request';
import {
    IYandexCheckOutPlace,
    IYandexImagesCheckOutPlaceRequest,
    IYandexRemoveRequest,
    IYandexRequestDownloadImage,
    IYandexRequestDownloadImageRequest,
    IYandexRequestDownloadImagesRequest
} from './interfaces';

/**
 * Класс отвечающий за загрузку изображений в навык Алисы.
 * @see (https://yandex.ru/dev/dialogs/alice/doc/resource-upload-docpage/) Смотри тут
 *
 * @class YandexImageRequest
 */
export class YandexImageRequest extends YandexRequest {
    /**
     * @const string Адрес, на который будет отправляться запрос
     */
    private readonly STANDARD_URL: string = 'https://dialogs.yandex.net/api/v1/';
    /**
     * Идентификатор навыка, необходимый для корректного сохранения изображения (Обязательный параметр)
     * @see YandexRequest Смотри тут
     */
    public skillId: string | null;

    /**
     * YandexImageRequest constructor.
     *
     * @param {string} oauth Авторизационный токен для загрузки изображений.
     * @param {string} skillId Идентификатор навыка.
     * @see (https://tech.yandex.ru/dialogs/alice/doc/resource-upload-docpage/) - Документация.
     * @see (https://oauth.yandex.ru/verification_code) - Получение токена.
     */
    constructor(oauth: string | null = null, skillId: string | null = null) {
        super(oauth);
        this.skillId = skillId || (mmApp.params.app_id || null);
        this._request.url = this.STANDARD_URL;
    }

    /**
     * Получение адреса для загрузки изображения.
     *
     * @return string
     */
    private _getImagesUrl(): string {
        return this.STANDARD_URL + `skills/${this.skillId}/images`;
    }

    /**
     * Проверка занятого места.
     *
     * @return Promise<IYandexCheckOutPlace>
     * [
     *  - int total: Все доступное место.
     *  - int used: Занятое место.
     * ]
     * @api
     */
    public async checkOutPlace(): Promise<IYandexCheckOutPlace | null> {
        this._request.url = this.STANDARD_URL + 'status';
        const query = await this.call<IYandexImagesCheckOutPlaceRequest>();
        if (query && typeof query.images.quota !== 'undefined') {
            return query.images.quota;
        }
        this._log('YandexImageRequest.checkOutPlace() Error: Не удалось проверить занятое место!');
        return null;
    }

    /**
     * Загрузка изображения из интернета.
     *
     * @param {string} imageUrl Адрес изображения из интернета.
     * @return Promise<IYandexRequestDownloadImage>
     * [
     *  - string id: Идентификатор изображения.
     *  - string origUrl: Адрес изображения.
     *  - int size: Размер изображения.
     *  - int createdAt: Дата загрузки.
     * ]
     * @api
     */
    public async downloadImageUrl(imageUrl: string): Promise<IYandexRequestDownloadImage | null> {
        if (this.skillId) {
            this._request.url = this._getImagesUrl();
            this._request.header = Request.HEADER_AP_JSON;
            this._request.post = {url: imageUrl};
            const query = await this.call<IYandexRequestDownloadImageRequest>();
            if (query && typeof query.image.id !== 'undefined') {
                return query.image;
            } else {
                this._log('YandexImageRequest.downloadImageUrl() Error: Не удалось загрузить изображение с сайта!');
            }
        } else {
            this._log('YandexImageRequest.downloadImageUrl() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Загрузка изображения из файла.
     *
     * @param {string} imageDir Путь к картинке, расположенной на сервере.
     * @return Promise<IYandexRequestDownloadImage>
     * [
     *  - string id: Идентификатор изображения.
     *  - string origUrl: Адрес изображения.
     *  - int size: Размер изображения.
     *  - int createdAt: Дата загрузки.
     * ]
     * @api
     */
    public async downloadImageFile(imageDir: string): Promise<IYandexRequestDownloadImage | null> {
        if (this.skillId) {
            this._request.url = this._getImagesUrl();
            this._request.header = Request.HEADER_FORM_DATA;
            this._request.attach = imageDir;
            const query = await this.call<IYandexRequestDownloadImageRequest>();
            if (query && typeof query.image.id !== 'undefined') {
                return query.image;
            } else {
                this._log('YandexImageRequest.downloadImageFile() Error: Не удалось загрузить изображение по пути: ' + imageDir);
            }
        } else {
            this._log('YandexImageRequest.downloadImageFile() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Просмотр всех загруженных изображений.
     *
     * @return Promise<IYandexRequestDownloadImage[]>
     * [
     *  [
     *      - string id: Идентификатор изображения.
     *      - string origUrl: Адрес изображения.
     *      - int size: Размер изображения.
     *      - int createdAt: Дата загрузки.
     *  ]
     * ]
     * @api
     */
    public async getLoadedImages(): Promise<IYandexRequestDownloadImage[] | null> {
        if (this.skillId) {
            this._request.url = this._getImagesUrl();
            const query = await this.call<IYandexRequestDownloadImagesRequest>();
            return query?.images || null;
        } else {
            this._log('YandexImageRequest.getLoadedImages() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Удаление выбранного изображения.
     * В случае успеха вернет 'ok'.
     *
     * @param {string} imageId Идентификатор изображения, которое необходимо удалить.
     * @return Promise<string>
     * @api
     */
    public async deleteImage(imageId: string): Promise<string | null> {
        if (this.skillId) {
            if (imageId) {
                this._request.url = `${this._getImagesUrl()}/${imageId}`;
                this._request.customRequest = 'DELETE';
                const query = await this.call<IYandexRemoveRequest>();
                if (query && typeof query.result !== 'undefined') {
                    return query.result;
                } else {
                    this._log('YandexImageRequest.deleteImage() Error: Не удалось удалить картинку!');
                }
            } else {
                this._log('YandexImageRequest.deleteImage() Error: Не выбрано изображение!');
            }
        } else {
            this._log('YandexImageRequest.deleteImage() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Удаление всех изображений.
     * Если при удалении произошел сбой, то изображение останется.
     * Чтобы точно удалить все изображения лучше использовать грубое удаление.
     *
     * @return boolean
     * @api
     */
    public async deleteImages(): Promise<boolean> {
        if (this.skillId) {
            const images = await this.getLoadedImages();
            if (images) {
                images.forEach((image) => {
                    this.deleteImage(image.id);
                    // todo added timeout
                });
                return true;
            } else {
                this._log('YandexImageRequest.deleteImages() Error: Не удалось получить загруженные звуки!');
            }
        } else {
            this._log('YandexImageRequest.deleteImages() Error: Не выбран навык!');
        }
        return false;
    }
}
