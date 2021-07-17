import {mmApp} from "../core/mmApp";
import {VkRequest} from "./VkRequest";
import {
    IMarusiaApiAudioUpdateLink,
    IMarusiaApiCreateAudio,
    IMarusiaApiPictureUpdateLink,
    IMarusiaApiSavePicture
} from "./interfaces/IMarusiaApi";

/**
 * Класс отвечающий за отправку запросов на сервер Маруси.
 *
 * Документация по api.
 * @see (https://vk.com/dev/marusia_skill_docs10) Смотри тут
 *
 * Class MarusiaRequest
 */
export class MarusiaRequest extends VkRequest {

    /**
     * MarusiaRequest constructor.
     */
    public constructor() {
        super();
        if (mmApp.params.marusia_token) {
            this.initToken(mmApp.params.marusia_token);
        }
    }

    /**
     * Получение данные по загрузке изображения на сервер маруси.
     *
     * @return Promise<IMarusiaApiPictureUpdateLink>
     * [
     *  - 'picture_upload_link' => string Адрес сервера для загрузки изображения
     * ]
     * @api
     */
    public async marusiaGetPictureUploadLink(): Promise<IMarusiaApiPictureUpdateLink> {
        return await this.call('marusia.getPictureUploadLink');
    }

    /**
     * Сохранение картинки на сервер Маруси.
     *
     * @param photo Фотография.
     * @param server Сервер.
     * @param hash Хэш.
     * @return Promise<IMarusiaApiSavePicture>
     * [
     *  - 'app_id' => int Идентификатор приложения
     *  - 'photo_id' => int Идентификатор изображения
     * ]
     * @see upload() Смотри тут
     * @api
     */
    public async marusiaSavePicture(photo: string, server: string, hash: string): Promise<IMarusiaApiSavePicture> {
        this._request.post = {
            photo,
            server,
            hash
        };
        return await this.call('marusia.savePicture');
    }

    /**
     * Получение всех загруженных изображений
     * @return Promise<any>
     */
    public async marusiaGetPictures(): Promise<any> {
        return await this.call('marusia.getPictures');
    }

    /**
     * Получение данные по загрузке изображения на сервер маруси.
     *
     * @return Promise<IMarusiaApiAudioUpdateLink>
     * [
     *  - 'audio_upload_link' => string Адрес сервера для загрузки аудио
     * ]
     * @api
     */
    public async marusiaGetAudioUploadLink(): Promise<IMarusiaApiAudioUpdateLink> {
        return await this.call('marusia.getAudioUploadLink');
    }

    /**
     * Сохранение аудиио на сервер Маруси.
     *
     * @param audio_meta анные полученные после загрузки аудио.
     * @return Promise<any>
     * [
     *  - 'id' => int Идентификатор аудио
     *  - 'title' => string Название аудио
     * ]
     * @see upload() Смотри тут
     * @api
     * @throws Exception
     */
    public async marusiaCreateAudio(audio_meta: object): Promise<IMarusiaApiCreateAudio> {
        this._request.post = {
            audio_meta
        };
        return await this.call('marusia.createAudio');
    }


    /**
     * Сохранение логов.
     *
     * @param {string} error Текст ошибки.
     */
    protected _log(error: string): void {
        error = `\n(${Date}): Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`;
        mmApp.saveLog('MarusiaApi.log', error);
    }
}
