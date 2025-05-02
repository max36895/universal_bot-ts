import { mmApp } from '../mmApp';
import { VkRequest } from './VkRequest';
import {
    IMarusiaApiAudioUpdateLink,
    IMarusiaApiCreateAudio,
    IMarusiaApiPictureUpdateLink,
    IMarusiaApiSavePicture,
} from './interfaces';

/**
 * Класс для взаимодействия с API голосового помощника Маруся.
 * Расширяет функционал VkRequest для работы со специфичными методами Маруси.
 * 
 * Официальная документация по API:
 * @see https://vk.com/dev/marusia_skill_docs10
 * 
 * @class MarusiaRequest
 * @extends VkRequest
 */
export class MarusiaRequest extends VkRequest {
    /**
     * Создает экземпляр класса MarusiaRequest. 
     */
    public constructor() {
        super();
        if (mmApp.params.marusia_token) {
            this.initToken(mmApp.params.marusia_token);
        }
    }

    /**
     * Запрашивает URL для загрузки изображения на сервера Маруси.
     * 
     * @returns {Promise<IMarusiaApiPictureUpdateLink | null>} Объект с данными для загрузки изображения
     *         или null в случае ошибки
     */
    public async marusiaGetPictureUploadLink(): Promise<IMarusiaApiPictureUpdateLink | null> {
        return await this.call<IMarusiaApiPictureUpdateLink>('marusia.getPictureUploadLink');
    }

    /**
     * Сохраняет загруженное изображение в библиотеке Маруси.
     * 
     * @param {string} photo - Идентификатор загруженного изображения
     * @param {string} server - Идентификатор сервера, на который было загружено изображение
     * @param {string} hash - Хэш-сумма загруженного изображения для верификации
     * @returns {Promise<IMarusiaApiSavePicture | null>} Результат сохранения изображения
     *         или null в случае ошибки
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
     * Получает список всех изображений, доступных в библиотеке навыка.
     * 
     * @returns {Promise<any>} Список изображений или null в случае ошибки
     */
    public async marusiaGetPictures(): Promise<any> {
        return await this.call('marusia.getPictures');
    }

    /**
     * Запрашивает URL для загрузки аудиофайла на сервера Маруси.
     * 
     * @returns {Promise<IMarusiaApiAudioUpdateLink | null>} Объект с данными для загрузки аудио
     *         или null в случае ошибки
     */
    public async marusiaGetAudioUploadLink(): Promise<IMarusiaApiAudioUpdateLink | null> {
        return await this.call<IMarusiaApiAudioUpdateLink>('marusia.getAudioUploadLink');
    }

    /**
     * Сохраняет загруженный аудиофайл в библиотеке Маруси.
     * 
     * @param {Object} audio_meta - Метаданные загруженного аудиофайла, полученные после загрузки
     * @returns {Promise<IMarusiaApiCreateAudio | null>} Результат сохранения аудиофайла
     *         или null в случае ошибки
     */
    public async marusiaCreateAudio(audio_meta: object): Promise<IMarusiaApiCreateAudio | null> {
        this._request.post = {
            audio_meta,
        };
        return await this.call<IMarusiaApiCreateAudio>('marusia.createAudio');
    }

    /**
     * Записывает информацию об ошибках в лог-файл MarusiaApi.log.
     * 
     * @param {string} error - Текст ошибки для логирования
     * @protected
     */
    protected _log(error: string): void {
        error = `\n(${Date}): Произошла ошибка при отправке запроса по адресу: ${this._request.url}\nОшибка:\n${error}\n${this._error}\n`;
        mmApp.saveLog('MarusiaApi.log', error);
    }
}
