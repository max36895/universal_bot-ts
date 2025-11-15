import { VkRequest } from './VkRequest';
import {
    IMarusiaApiAudioUpdateLink,
    IMarusiaApiCreateAudio,
    IMarusiaApiPictureUpdateLink,
    IMarusiaApiRemove,
    IMarusiaApiSavePicture,
} from './interfaces';
import { AppContext } from '../core/AppContext';

/**
 * Класс для взаимодействия с API голосового помощника Маруся
 * Расширяет функционал VkRequest для работы со специфичными методами Маруси
 * @see (https://dev.vk.ru/ru/marusia/api) Смотри тут
 *
 * @example
 * ```typescript
 * import { MarusiaRequest } from './api/MarusiaRequest';
 *
 * // Создание экземпляра
 * const marusia = new MarusiaRequest();
 * marusia.initToken('your-marusia-token');
 *
 * // Загрузка изображения
 * async function uploadImage(imagePath: string) {
 *   // Получаем URL для загрузки
 *   const uploadLink = await marusia.marusiaGetPictureUploadLink();
 *   if (uploadLink) {
 *     // Загружаем изображение
 *     const upload = await marusia.upload(uploadLink.upload_url, imagePath);
 *     if (upload) {
 *       // Сохраняем изображение в библиотеке
 *       const picture = await marusia.marusiaSavePicture(
 *         upload.photo,
 *         upload.server,
 *         upload.hash
 *       );
 *       return picture;
 *     }
 *   }
 *   return null;
 * }
 *
 * // Загрузка аудио
 * async function uploadAudio(audioPath: string) {
 *   // Получаем URL для загрузки
 *   const uploadLink = await marusia.marusiaGetAudioUploadLink();
 *   if (uploadLink) {
 *     // Загружаем аудиофайл
 *     const upload = await marusia.upload(uploadLink.upload_url, audioPath);
 *     if (upload) {
 *       // Сохраняем аудио в библиотеке
 *       const audio = await marusia.marusiaCreateAudio(upload);
 *       return audio;
 *     }
 *   }
 *   return null;
 * }
 * ```
 */
export class MarusiaRequest extends VkRequest {
    /**
     * Создает экземпляр класса для работы с API Маруси
     */
    public constructor(appContext: AppContext) {
        super(appContext);
        if (appContext.platformParams.marusia_token) {
            this.initToken(appContext.platformParams.marusia_token);
        }
    }

    /**
     * Запрашивает URL для загрузки изображения на сервера Маруси
     *
     * @remarks
     * Поддерживаемые форматы изображений:
     * - JPEG, JPG, PNG
     * - Максимальный размер: 5MB
     * - Рекомендуемое разрешение: 800x800 пикселей
     *
     * @example
     * ```typescript
     * // Получение URL для загрузки
     * const uploadLink = await marusia.marusiaGetPictureUploadLink();
     * if (uploadLink) {
     *   // Загрузка изображения
     *   const upload = await marusia.upload(uploadLink.upload_url, 'image.jpg');
     *   if (upload) {
     *     console.log('Изображение загружено:', upload);
     *   }
     * }
     * ```
     *
     * @returns {Promise<IMarusiaApiPictureUpdateLink | null>} Данные для загрузки изображения или null при ошибке
     */
    public async marusiaGetPictureUploadLink(): Promise<IMarusiaApiPictureUpdateLink | null> {
        return await this.call<IMarusiaApiPictureUpdateLink>('marusia.getPictureUploadLink');
    }

    /**
     * Сохраняет загруженное изображение в библиотеке Маруси
     * @param photo Идентификатор загруженного изображения
     * @param server Идентификатор сервера загрузки
     * @param hash Хэш-сумма для проверки изображения
     *
     * @remarks
     * После успешного сохранения изображение становится доступным в библиотеке навыка
     * и может быть использовано в карточках и других элементах интерфейса.
     *
     * @example
     * ```typescript
     * // Полный процесс загрузки и сохранения изображения
     * const uploadLink = await marusia.marusiaGetPictureUploadLink();
     * if (uploadLink) {
     *   const upload = await marusia.upload(uploadLink.upload_url, 'image.jpg');
     *   if (upload) {
     *     const picture = await marusia.marusiaSavePicture(
     *       upload.photo,
     *       upload.server,
     *       upload.hash
     *     );
     *     if (picture) {
     *       console.log('ID изображения:', picture.id);
     *     }
     *   }
     * }
     * ```
     *
     * @returns {Promise<IMarusiaApiSavePicture | null>} Результат сохранения или null при ошибке
     */
    public async marusiaSavePicture(
        photo: string,
        server: string,
        hash: string,
    ): Promise<IMarusiaApiSavePicture | null> {
        this._request.post = {
            photo,
            server,
            hash,
        };
        return await this.call<IMarusiaApiSavePicture>('marusia.savePicture');
    }

    /**
     * Удаляет загруженное изображение в библиотеке Маруси
     * @param id Идентификатор загруженного изображения
     *
     * @returns {Promise<IMarusiaApiRemove | null>} Результат удаления или null при ошибке
     */
    public async marusiaDeletePicture(id: string): Promise<IMarusiaApiRemove | null> {
        this._request.post = {
            id,
        };
        return await this.call<IMarusiaApiRemove>('marusia.deletePicture');
    }

    /**
     * Получает список всех изображений из библиотеки навыка
     *
     * @remarks
     * Метод возвращает информацию о всех изображениях, загруженных в навык:
     * - id: уникальный идентификатор изображения
     * - url: URL для доступа к изображению
     * - preview_url: URL превью изображения
     * - created: дата создания (Unix timestamp)
     *
     * @example
     * ```typescript
     * // Получение списка изображений
     * const pictures = await marusia.marusiaGetPictures();
     * if (pictures) {
     *   pictures.items.forEach(picture => {
     *     console.log('ID:', picture.id);
     *     console.log('URL:', picture.url);
     *     console.log('Превью:', picture.preview_url);
     *   });
     * }
     * ```
     *
     * @returns {Promise<any>} Список изображений или null при ошибке
     */
    public async marusiaGetPictures(): Promise<any> {
        return await this.call('marusia.getPictures');
    }

    /**
     * Запрашивает URL для загрузки аудиофайла на сервера Маруси
     *
     * @remarks
     * Поддерживаемые форматы аудио:
     * - MP3
     * - Максимальный размер: 10MB
     * - Максимальная длительность: 5 минут
     * - Рекомендуемый битрейт: 128 kbps
     *
     * @example
     * ```typescript
     * // Получение URL для загрузки
     * const uploadLink = await marusia.marusiaGetAudioUploadLink();
     * if (uploadLink) {
     *   // Загрузка аудио
     *   const upload = await marusia.upload(uploadLink.upload_url, 'audio.mp3');
     *   if (upload) {
     *     console.log('Аудио загружено:', upload);
     *   }
     * }
     * ```
     *
     * @returns {Promise<IMarusiaApiAudioUpdateLink | null>} Данные для загрузки аудио или null при ошибке
     */
    public async marusiaGetAudioUploadLink(): Promise<IMarusiaApiAudioUpdateLink | null> {
        return await this.call<IMarusiaApiAudioUpdateLink>('marusia.getAudioUploadLink');
    }

    /**
     * Сохраняет загруженный аудиофайл в библиотеке Маруси
     * @param audio_meta Метаданные аудиофайла после загрузки
     *
     * @remarks
     * После успешного сохранения аудиофайл становится доступным в библиотеке навыка
     * и может быть использован в голосовых ответах.
     *
     * @example
     * ```typescript
     * // Полный процесс загрузки и сохранения аудио
     * const uploadLink = await marusia.marusiaGetAudioUploadLink();
     * if (uploadLink) {
     *   const upload = await marusia.upload(uploadLink.upload_url, 'audio.mp3');
     *   if (upload) {
     *     const audio = await marusia.marusiaCreateAudio(upload);
     *     if (audio) {
     *       console.log('ID аудио:', audio.id);
     *       console.log('URL аудио:', audio.url);
     *     }
     *   }
     * }
     * ```
     *
     * @returns {Promise<IMarusiaApiCreateAudio | null>} Результат сохранения или null при ошибке
     */
    public async marusiaCreateAudio(audio_meta: object): Promise<IMarusiaApiCreateAudio | null> {
        this._request.post = {
            audio_meta,
        };
        return await this.call<IMarusiaApiCreateAudio>('marusia.createAudio');
    }

    /**
     * Удаляет загруженный аудиофайл в библиотеке Маруси
     * @param id Идентификатор загруженного аудиофайла
     *
     * @returns {Promise<IMarusiaApiRemove | null>} Результат удаления или null при ошибке
     */
    public async marusiaDeleteAudio(id: string): Promise<IMarusiaApiRemove | null> {
        this._request.post = {
            id,
        };
        return await this.call<IMarusiaApiRemove>('marusia.deleteAudio');
    }

    /**
     * Записывает информацию об ошибках в лог-файл
     * @param error Текст ошибки для логирования
     * @private
     */
    protected _log(error: string): void {
        this._appContext.logError(
            `MarusiaApi: (${new Date()}): Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`,
        );
    }
}
