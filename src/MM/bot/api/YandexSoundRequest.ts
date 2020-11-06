/**
 * Загрузка звуков для навыка.
 * @see (https://yandex.ru/dev/dialogs/alice/doc/resource-sounds-upload-docpage/) Смотри тут
 *
 * Class YandexSoundRequest
 * @package bot\api
 */
import {YandexRequest} from "./YandexRequest";
import {mmApp} from "../core/mmApp";
import {Request} from "./request/Request";
import {IYandexCheckOutPlace, IYandexRequestDownloadSound} from "./interfaces/IYandexApi";

export class YandexSoundRequest extends YandexRequest {
    /**
     * @const string Адрес, на который будет отправляться запрос.
     */
    private readonly STANDARD_URL = 'https://dialogs.yandex.net/api/v1/';
    /**
     * Идентификатор навыка, необходим для корректного сохранения изображения(Обязательный параметр).
     * @var skillId Идентификатор навыка, необходим для корректного сохранения изображения(Обязательный параметр).
     * @see YandexRequest Смотри тут
     */
    public skillId: string;

    /**
     * YandexSoundRequest constructor.
     *
     * @param oauth Авторизационный токен для загрузки изображений.
     * @param skillId Идентификатор навыка.
     * @see (https://tech.yandex.ru/dialogs/alice/doc/resource-upload-docpage/) - Документацияю.
     * @see (https://oauth.yandex.ru/verification_code) - Получение токена.
     */
    constructor(oauth: string = null, skillId: string = null) {
        super(oauth);
        this.skillId = skillId || (mmApp.params.app_id || null);
        this._request.url = this.STANDARD_URL;
    }

    /**
     * Получить адрес для загрузки звуков.
     *
     * @return string
     * @api
     */
    private _getSoundsUrl(): string {
        return `${this.STANDARD_URL}skills/${this.skillId}/sounds`;
    }

    /**
     * Проверить занятое место.
     *
     * Для каждого аккаунта на Яндексе действует лимит на загрузку аудиофайлов — вы можете хранить на Диалогах не больше 1 ГБ файлов. Обратите внимание, лимит учитывает размер сжатых аудиофайлов, а не размер оригиналов. Диалоги конвертируют загруженные аудиофайлы в формат OPUS и обрезают их до 120 секунд — размер этих файлов и будет учитываться в лимите.
     *
     * Вернет массив
     * - total - Все доступное место.
     * - used - Занятое место.
     *
     * @return IYandexCheckOutPlace|null
     * [
     * - int total: Все доступное место.
     * - int used: Занятое место.
     * ]
     * @api
     */
    public checkOutPlace(): IYandexCheckOutPlace {
        this._request.url = this.STANDARD_URL + 'status';
        const query = this.call();
        if (typeof query.sounds.quota !== 'undefined') {
            return query.sounds.quota;
        }
        this._log('YandexSoundRequest::checkOutPlace() Error: Не удалось проверить занятое место!');

        return null;
    }

    /**
     * Загрузить аудиофайл.
     *
     * @param soundDir Расположение картинки на сервере.
     *
     * @return IYandexRequestDownloadSound|null
     * [
     *  - string id: Идентификатор аудиофайла.
     *  - string skillId: Идентификатор навыка.
     *  - int|null size: Размер файла.
     *  - string originalName: Название загружаемого файла.
     *  - string createdAt: Дата создания файла.
     *  - bool isProcessed: Флаг готовности файла.
     *  - error: Текст ошибки.
     * ]
     * @api
     */
    public downloadSoundFile(soundDir: string): IYandexRequestDownloadSound {
        if (this.skillId) {
            this._request.url = this._getSoundsUrl();
            this._request.header = Request.HEADER_FORM_DATA;
            this._request.attach = soundDir;
            const query = this.call();
            if (typeof query.sound.id !== 'undefined') {
                return query.sound;
            } else {
                this._log('YandexSoundRequest::downloadSoundFile() Error: Не удалось загрузить изображение по пути: ' + soundDir);
            }
        } else {
            this._log('YandexSoundRequest::downloadSoundFile() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Просмотр всех загруженных изображений.
     *
     * @return IYandexRequestDownloadSound[]|null
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
     * @api
     */
    public getLoadedSounds(): IYandexRequestDownloadSound[] {
        if (this.skillId) {
            this._request.url = this._getSoundsUrl();
            const query = this.call();
            return query.sounds || null;
        } else {
            this._log('YandexSoundRequest::getLoadedSounds() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Удаление выбранного звука.
     * В случае успеха вернет 'ok'.
     *
     * @param soundId Идентификатор звука, который необходимо удалить.
     *
     * @return string
     * @api
     */
    public deleteSound(soundId: string): string {
        if (this.skillId) {
            if (soundId) {
                this._request.url = `${this._getSoundsUrl()}/${soundId}`;
                this._request.customRequest = 'DELETE';
                const query = this.call();
                if (typeof query.result !== 'undefined') {
                    return query.result;
                } else {
                    this._log('YandexSoundRequest::deleteSound() Error: Не удалось удалить картинку!');
                }
            } else {
                this._log('YandexSoundRequest::deleteSound() Error: Не выбрано изображение!');
            }
        } else {
            this._log('YandexSoundRequest::deleteSound() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Удаление всех звуков.
     * Если при удалении произошел сбой, то картинка останется.
     * Чтобы точно удалить все картинки лучше использовать грубое удаление.
     *
     * @return boolean
     * @api
     */
    public deleteSounds(): boolean {
        if (this.skillId) {
            const sounds = this.getLoadedSounds();
            if (sounds) {
                sounds.forEach((sound) => {
                    this.deleteSound(sound.id);
                });
            } else {
                this._log('YandexSoundRequest::deleteSounds() Error: Не удалось получить загруженные звуки!');
            }
        } else {
            this._log('YandexSoundRequest::deleteSounds() Error: Не выбран навык!');
        }
        return false;
    }
}
