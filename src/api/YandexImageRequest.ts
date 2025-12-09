import { YandexRequest } from './YandexRequest';
import { Request } from './request/Request';
import {
    IYandexCheckOutPlace,
    IYandexImagesCheckOutPlaceRequest,
    IYandexRemoveRequest,
    IYandexRequestDownloadImage,
    IYandexRequestDownloadImageRequest,
    IYandexRequestDownloadImagesRequest,
} from './interfaces';
import { AppContext } from '../core/AppContext';

/**
 * Адрес, на который будет отправляться запрос
 *
 */
const STANDARD_URL: string = 'https://dialogs.yandex.net/api/v1/';

/**
 * Класс отвечающий за загрузку изображений в навык Алисы.
 * @see (https://yandex.ru/dev/dialogs/alice/doc/resource-upload-docpage/) Смотри тут
 *
 * @class YandexImageRequest
 */
export class YandexImageRequest extends YandexRequest {
    /**
     * Идентификатор навыка, необходимый для корректного сохранения изображения
     * @see YandexRequest Базовый класс для работы с API Яндекса
     */
    public skillId: string | null;

    /**
     * Создает экземпляр класса для работы с изображениями в навыке Алисы
     * @param oauth Авторизационный токен для загрузки изображений
     * @param skillId Идентификатор навыка
     * @param appContext Контекст приложения
     * @see https://tech.yandex.ru/dialogs/alice/doc/resource-upload-docpage/ Документация по загрузке ресурсов
     * @see https://oauth.yandex.ru/verification_code Получение OAuth-токена
     */
    constructor(
        oauth: string | null = null,
        skillId: string | null = null,
        appContext: AppContext,
    ) {
        super(oauth, appContext);
        this.skillId = skillId || appContext.platformParams.app_id || null;
        this._request.url = STANDARD_URL;
    }

    /**
     * Получение адреса для загрузки изображения.
     *
     * @return string
     */
    #getImagesUrl(): string {
        return STANDARD_URL + `skills/${this.skillId}/images`;
    }

    /**
     * Проверка занятого места в хранилище изображений
     * @returns {Promise<IYandexCheckOutPlace | null>} Информация о занятом месте:
     * - total: общий доступный объем хранилища
     * - used: использованный объем хранилища
     */
    public async checkOutPlace(): Promise<IYandexCheckOutPlace | null> {
        this._request.url = STANDARD_URL + 'status';
        const query = await this.call<IYandexImagesCheckOutPlaceRequest>();
        if (query && typeof query.images.quota !== 'undefined') {
            return query.images.quota;
        }
        this._log('YandexImageRequest.checkOutPlace() Error: Не удалось проверить занятое место!');
        return null;
    }

    /**
     * Загрузка изображения из интернета по URL
     * @param imageUrl URL-адрес изображения в интернете
     * @returns {Promise<IYandexRequestDownloadImage | null>} Информация о загруженном изображении:
     * - id: уникальный идентификатор изображения
     * - origUrl: оригинальный URL изображения
     * - size: размер изображения в байтах
     * - createdAt: дата и время загрузки
     */
    public async downloadImageUrl(imageUrl: string): Promise<IYandexRequestDownloadImage | null> {
        if (this.skillId) {
            this._request.url = this.#getImagesUrl();
            this._request.header = Request.HEADER_AP_JSON;
            this._request.post = { url: imageUrl };
            const query = await this.call<IYandexRequestDownloadImageRequest>();
            if (query && typeof query.image?.id !== 'undefined') {
                return query.image;
            } else {
                this._log(
                    'YandexImageRequest.downloadImageUrl() Error: Не удалось загрузить изображение с сайта!',
                );
            }
        } else {
            this._log('YandexImageRequest.downloadImageUrl() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Загрузка изображения из локального файла
     * @param imageDir Путь к файлу изображения на сервере
     * @returns {Promise<IYandexRequestDownloadImage | null>} Информация о загруженном изображении:
     * - id: уникальный идентификатор изображения
     * - origUrl: оригинальный URL изображения
     * - size: размер изображения в байтах
     * - createdAt: дата и время загрузки
     */
    public async downloadImageFile(imageDir: string): Promise<IYandexRequestDownloadImage | null> {
        if (this.skillId) {
            this._request.url = this.#getImagesUrl();
            this._request.header = Request.HEADER_FORM_DATA;
            this._request.attach = imageDir;
            const query = await this.call<IYandexRequestDownloadImageRequest>();
            if (query && typeof query.image.id !== 'undefined') {
                return query.image;
            } else {
                this._log(
                    'YandexImageRequest.downloadImageFile() Error: Не удалось загрузить изображение по пути: ' +
                        imageDir,
                );
            }
        } else {
            this._log('YandexImageRequest.downloadImageFile() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Получение списка всех загруженных изображений
     * @returns {Promise<IYandexRequestDownloadImage[] | null>} Массив с информацией о загруженных изображениях
     */
    public async getLoadedImages(): Promise<IYandexRequestDownloadImage[] | null> {
        if (this.skillId) {
            this._request.url = this.#getImagesUrl();
            const query = await this.call<IYandexRequestDownloadImagesRequest>();
            return query?.images || null;
        } else {
            this._log('YandexImageRequest.getLoadedImages() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Удаление конкретного изображения по его идентификатору
     * @param imageId Идентификатор изображения для удаления
     * @returns {Promise<string | null>} 'ok' при успешном удалении, null при ошибке
     */
    public async deleteImage(imageId: string): Promise<string | null> {
        if (this.skillId) {
            if (imageId) {
                this._request.url = `${this.#getImagesUrl()}/${imageId}`;
                this._request.customRequest = 'DELETE';
                const query = await this.call<IYandexRemoveRequest>();
                this._request.customRequest = null;
                if (query && typeof query.result !== 'undefined') {
                    return query.result;
                } else {
                    this._log(
                        'YandexImageRequest.deleteImage() Error: Не удалось удалить картинку!',
                    );
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
     * Удаление всех загруженных изображений
     * @returns {Promise<boolean>} true если все изображения успешно удалены, false при ошибке
     * @remarks Если при удалении произойдет ошибка, некоторые изображения могут остаться в хранилище
     */
    public async deleteImages(): Promise<boolean> {
        if (this.skillId) {
            const images = await this.getLoadedImages();
            if (images) {
                const results = await Promise.allSettled(
                    images.map(async (image) => {
                        try {
                            await this.deleteImage(image.id);
                            // Добавить задержку между запросами
                            await new Promise((resolve) => setTimeout(resolve, 200));
                            return true;
                        } catch (e) {
                            this._log(`Ошибка при удалении изображения ${image.id}: ${e}`);
                            return false;
                        }
                    }),
                );
                // Если хотя бы одно изображение не удалено — вернуть false
                return results.every((r) => r.status === 'fulfilled' && r.value);
            } else {
                this._log(
                    'YandexImageRequest.deleteImages() Error: Не удалось получить загруженные звуки!',
                );
            }
        } else {
            this._log('YandexImageRequest.deleteImages() Error: Не выбран навык!');
        }
        return false;
    }
}
