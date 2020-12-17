import {YandexRequest} from "./YandexRequest";
import {mmApp} from "../core/mmApp";
import {Request} from "./request/Request";
import {IYandexCheckOutPlace, IYandexRequestDownloadImage} from "./interfaces/IYandexApi";

/**
 * Загрузка изображения в навык.
 * @see (https://yandex.ru/dev/dialogs/alice/doc/resource-upload-docpage/) Смотри тут
 *
 * Class YandexImageRequest
 * @class bot\api
 */
export class YandexImageRequest extends YandexRequest {
    /**
     * @const string Адрес, на который будет отправляться запрос
     */
    private readonly STANDARD_URL: string = 'https://dialogs.yandex.net/api/v1/';
    /**
     * Идентификатор навыка, необходим для корректного сохранения изображения(Обязательный параметр)
     * @see YandexRequest Смотри тут
     */
    public skillId: string;

    /**
     * YandexImageRequest constructor.
     *
     * @param {string} oauth Авторизационный токен для загрузки изображений.
     * @param {string} skillId Идентификатор навыка.
     * @see (https://tech.yandex.ru/dialogs/alice/doc/resource-upload-docpage/) - Документация.
     * @see (https://oauth.yandex.ru/verification_code) - Получение токена.
     */
    constructor(oauth: string = null, skillId: string = null) {
        super(oauth);
        this.skillId = skillId || (mmApp.params.app_id || null);
        this._request.url = this.STANDARD_URL;
    }

    /**
     * Получить адрес для загрузки изображения.
     *
     * @return string
     */
    private _getImagesUrl(): string {
        return this.STANDARD_URL + `skills/${this.skillId}/images`;
    }

    /**
     * Проверка занятого места.
     *
     * Возвращает массив
     * - total - Все доступное место.
     * - used - Занятое место.
     *
     * @return IYandexCheckOutPlace|null
     * [
     *  - int total: Все доступное место.
     *  - int used: Занятое место.
     * ]
     * @api
     */
    public checkOutPlace(): IYandexCheckOutPlace {
        this._request.url = this.STANDARD_URL + 'status';
        const query = this.call();
        if (typeof query.images.quota !== 'undefined') {
            return query.images.quota;
        }
        this._log('YandexImageRequest::checkOutPlace() Error: Не удалось проверить занятое место!');
        return null;
    }

    /**
     * Загрузка изображения из интернета.
     *
     * Возвращает массив
     * - id - Идентификатор изображения.
     * - origUrl - Адрес изображения.
     *
     * @param {string} imageUrl Адрес картинки из интернета.
     * @return IYandexRequestDownloadImage|null
     * [
     *  - string id: Идентификатор изображения.
     *  - string origUrl: Адрес изображения.
     *  - int size: Размер изображения.
     *  - int createdAt: Дата загрузки.
     * ]
     * @api
     */
    public downloadImageUrl(imageUrl: string): IYandexRequestDownloadImage {
        if (this.skillId) {
            this._request.url = this._getImagesUrl();
            this._request.header = Request.HEADER_AP_JSON;
            this._request.post = {url: imageUrl};
            const query = this.call();
            if (typeof query.image.id !== 'undefined') {
                return query.image;
            } else {
                this._log('YandexImageRequest::downloadImageUrl() Error: Не удалось загрузить изображение с сайта!');
            }
        } else {
            this._log('YandexImageRequest::downloadImageUrl() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Загрузка изображения из файла.
     *
     * Возвращает массив
     * - id - Идентификатор изображения.
     * - origUrl - Адрес изображения.
     *
     * @param {string} imageDir Адрес картинки из интернета.
     * @return IYandexRequestDownloadImage|null
     * [
     *  - string id: Идентификатор изображения.
     *  - string origUrl: Адрес изображения.
     *  - int size: Размер изображения.
     *  - int createdAt: Дата загрузки.
     * ]
     * @api
     */
    public downloadImageFile(imageDir: string): IYandexRequestDownloadImage {
        if (this.skillId) {
            this._request.url = this._getImagesUrl();
            this._request.header = Request.HEADER_FORM_DATA;
            this._request.attach = imageDir;
            const query = this.call();
            if (typeof query.image.id !== 'undefined') {
                return query.image;
            } else {
                this._log('YandexImageRequest::downloadImageFile() Error: Не удалось загрузить изображение по пути: ' + imageDir);
            }
        } else {
            this._log('YandexImageRequest::downloadImageFile() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Просмотр всех загруженных изображений.
     *
     * @return IYandexRequestDownloadImage[]|null
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
    public getLoadedImages(): IYandexRequestDownloadImage[] {
        if (this.skillId) {
            this._request.url = this._getImagesUrl();
            const query = this.call();
            return query.images || null;
        } else {
            this._log('YandexImageRequest::getLoadedImages() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Удаление выбранной картинки.
     * В случае успеха вернет 'ok'.
     *
     * @param {string} imageId Идентификатор картинки, которую необходимо удалить.
     * @return string|null
     * @api
     */
    public deleteImage(imageId: string): string {
        if (this.skillId) {
            if (imageId) {
                this._request.url = `${this._getImagesUrl()}/${imageId}`;
                this._request.customRequest = 'DELETE';
                const query = this.call();
                if (typeof query.result !== 'undefined') {
                    return query.result;
                } else {
                    this._log('YandexImageRequest::deleteImage() Error: Не удалось удалить картинку!');
                }
            } else {
                this._log('YandexImageRequest::deleteImage() Error: Не выбрано изображение!');
            }
        } else {
            this._log('YandexImageRequest::deleteImage() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Удаление всех картинок.
     * Если при удалении произошел сбой, то картинка останется.
     * Чтобы точно удалить все картинки лучше использовать грубое удаление.
     *
     * @return boolean
     * @api
     */
    public deleteImages(): boolean {
        if (this.skillId) {
            const images = this.getLoadedImages();
            if (images) {
                images.forEach((image) => {
                    this.deleteImage(image.id);
                    // todo added timeout
                });
            } else {
                this._log('YandexImageRequest::deleteImages() Error: Не удалось получить загруженные звуки!');
            }
        } else {
            this._log('YandexImageRequest::deleteImages() Error: Не выбран навык!');
        }
        return false;
    }
}
