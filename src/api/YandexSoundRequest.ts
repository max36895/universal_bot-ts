import { YandexRequest } from './YandexRequest';
import { mmApp } from '../mmApp';
import { Request } from './request/Request';
import {
    IYandexCheckOutPlace,
    IYandexRemoveRequest,
    IYandexRequestDownloadSound,
    IYandexRequestDownloadSoundRequest,
    IYandexRequestDownloadSoundsRequest,
    IYandexSoundsCheckOutPlaceRequest,
} from './interfaces';

/**
 * Класс отвечающий за загрузку аудиофайлов в навык Алисы
 * @see (https://yandex.ru/dev/dialogs/alice/doc/resource-sounds-upload-docpage/) Смотри тут
 *
 * @class YandexSoundRequest
 */
export class YandexSoundRequest extends YandexRequest {
    /**
     * Адрес, на который будет отправляться запрос.
     */
    private readonly STANDARD_URL = 'https://dialogs.yandex.net/api/v1/';
    /**
     * Идентификатор навыка, необходимый для корректного сохранения аудиофайлов (Обязательный параметр).
     * @see YandexRequest Смотри тут
     */
    public skillId: string | null;

    /**
     * YandexSoundRequest constructor.
     *
     * @param {string} oauth Авторизационный токен для загрузки аудиофайлов.
     * @param {string} skillId Идентификатор навыка.
     * @see (https://tech.yandex.ru/dialogs/alice/doc/resource-upload-docpage/) - Документация.
     * @see (https://oauth.yandex.ru/verification_code) - Получение токена.
     */
    constructor(oauth: string | null = null, skillId: string | null = null) {
        super(oauth);
        this.skillId = skillId || mmApp.params.app_id || null;
        this._request.url = this.STANDARD_URL;
    }

    /**
     * Получение адреса для загрузки аудиофайлов.
     *
     * @return string
     */
    private _getSoundsUrl(): string {
        return `${this.STANDARD_URL}skills/${this.skillId}/sounds`;
    }

    /**
     * Проверить занятое место.
     *
     * Для каждого аккаунта на Яндексе действует лимит на загрузку аудиофайлов — вы можете хранить на Диалогах не больше 1 ГБ файлов. Обратите внимание, лимит учитывает размер сжатых аудиофайлов, а не размер оригиналов. Диалоги конвертируют загруженные аудиофайлы в формат OPUS и обрезают их до 120 секунд — размер этих файлов и будет учитываться в лимите.
     *
     * @return Promise<IYandexCheckOutPlace>
     * [
     * - int total: Все доступное место.
     * - int used: Занятое место.
     * ]
     */
    public async checkOutPlace(): Promise<IYandexCheckOutPlace | null> {
        this._request.url = this.STANDARD_URL + 'status';
        const query = await this.call<IYandexSoundsCheckOutPlaceRequest>();
        if (query && typeof query.sounds.quota !== 'undefined') {
            return query.sounds.quota;
        }
        this._log('YandexSoundRequest.checkOutPlace() Error: Не удалось проверить занятое место!');

        return null;
    }

    /**
     * Загрузить аудиофайл.
     *
     * @param {string} soundDir Расположение аудиофайла на сервере.
     *
     * @return Promise<IYandexRequestDownloadSound>
     * [
     *  - string id: Идентификатор аудиофайла.
     *  - string skillId: Идентификатор навыка.
     *  - int|null size: Размер файла.
     *  - string originalName: Название загружаемого файла.
     *  - string createdAt: Дата создания файла.
     *  - bool isProcessed: Флаг готовности файла.
     *  - error: Текст ошибки.
     * ]
     */
    public async downloadSoundFile(soundDir: string): Promise<IYandexRequestDownloadSound | null> {
        if (this.skillId) {
            this._request.url = this._getSoundsUrl();
            this._request.header = Request.HEADER_FORM_DATA;
            this._request.attach = soundDir;
            const query = await this.call<IYandexRequestDownloadSoundRequest>();
            if (query && query.sound.id !== 'undefined') {
                return query.sound;
            } else {
                this._log(
                    'YandexSoundRequest.downloadSoundFile() Error: Не удалось загрузить изображение по пути: ' +
                        soundDir,
                );
            }
        } else {
            this._log('YandexSoundRequest.downloadSoundFile() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Просмотр всех загруженных аудиофайлов.
     *
     * @return Promise<IYandexRequestDownloadSound[]>
     * [
     *  [
     *      - string id: Идентификатор аудиофайла.
     *      - string skillId: Идентификатор навыка.
     *      - int|null size: Размер файла.
     *      - string originalName: Название загружаемого файла.
     *      - string createdAt: Дата создания файла.
     *      - bool isProcessed: Флаг готовности файла.
     *      - error: Текст ошибки.
     *  ]
     * ]
     */
    public async getLoadedSounds(): Promise<IYandexRequestDownloadSound[] | null> {
        if (this.skillId) {
            this._request.url = this._getSoundsUrl();
            const query = await this.call<IYandexRequestDownloadSoundsRequest>();
            return query?.sounds || null;
        } else {
            this._log('YandexSoundRequest.getLoadedSounds() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Удаление выбранного аудиофайла.
     * В случае успеха вернет 'ok'.
     *
     * @param {string} soundId Идентификатор аудиофайла, который необходимо удалить.
     *
     * @return Promise<string>
     */
    public async deleteSound(soundId: string): Promise<string | null> {
        if (this.skillId) {
            if (soundId) {
                this._request.url = `${this._getSoundsUrl()}/${soundId}`;
                this._request.customRequest = 'DELETE';
                const query = await this.call<IYandexRemoveRequest>();
                if (query && typeof query.result !== 'undefined') {
                    return query.result;
                } else {
                    this._log(
                        'YandexSoundRequest.deleteSound() Error: Не удалось удалить картинку!',
                    );
                }
            } else {
                this._log('YandexSoundRequest.deleteSound() Error: Не выбрано изображение!');
            }
        } else {
            this._log('YandexSoundRequest.deleteSound() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Удаление всех аудиофайла.
     * Если при удалении произошел сбой, то аудиофайл останется.
     * Чтобы точно удалить все аудиофайлы лучше использовать грубое удаление.
     *
     * @return Promise<boolean>
     */
    public async deleteSounds(): Promise<boolean> {
        if (this.skillId) {
            const sounds = await this.getLoadedSounds();
            if (sounds) {
                sounds.forEach((sound) => {
                    this.deleteSound(sound.id);
                });
                return true;
            } else {
                this._log(
                    'YandexSoundRequest.deleteSounds() Error: Не удалось получить загруженные звуки!',
                );
            }
        } else {
            this._log('YandexSoundRequest.deleteSounds() Error: Не выбран навык!');
        }
        return false;
    }
}
