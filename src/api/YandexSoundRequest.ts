import { YandexRequest } from './YandexRequest';
import { Request } from './request/Request';
import {
    IYandexCheckOutPlace,
    IYandexRemoveRequest,
    IYandexRequestDownloadSound,
    IYandexRequestDownloadSoundRequest,
    IYandexRequestDownloadSoundsRequest,
    IYandexSoundsCheckOutPlaceRequest,
} from './interfaces';
import { AppContext } from '../core/AppContext';

/**
 * Адрес, на который будет отправляться запрос
 */
const STANDARD_URL = 'https://dialogs.yandex.net/api/v1/';

/**
 * Класс, отвечающий за загрузку аудиофайлов в навык Алисы
 * @see https://yandex.ru/dev/dialogs/alice/doc/resource-sounds-upload-docpage/ Документация API Яндекс.Диалогов
 *
 * @class YandexSoundRequest
 */
export class YandexSoundRequest extends YandexRequest {
    /**
     * Идентификатор навыка, необходимый для корректного сохранения аудиофайлов
     * @see YandexRequest Базовый класс для работы с API Яндекса
     */
    public skillId: string | null;

    /**
     * Создает экземпляр класса для работы с аудиофайлами в навыке Алисы
     * @param oauth Авторизационный токен для загрузки аудиофайлов
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
     * Получение адреса для загрузки аудиофайлов.
     *
     * @return string
     */
    #getSoundsUrl(): string {
        return `${STANDARD_URL}skills/${this.skillId}/sounds`;
    }

    /**
     * Проверка занятого места в хранилище аудиофайлов
     * @returns {Promise<IYandexCheckOutPlace | null>} Информация о занятом месте:
     * - total: общий доступный объем хранилища
     * - used: использованный объем хранилища
     * @remarks Для каждого аккаунта действует лимит в 1 ГБ. Учитывается размер сжатых файлов в формате OPUS
     */
    public async checkOutPlace(): Promise<IYandexCheckOutPlace | null> {
        this._request.url = STANDARD_URL + 'status';
        const query = await this.call<IYandexSoundsCheckOutPlaceRequest>();
        if (query && typeof query.sounds.quota !== 'undefined') {
            return query.sounds.quota;
        }
        this._log('YandexSoundRequest.checkOutPlace() Error: Не удалось проверить занятое место!');

        return null;
    }

    /**
     * Загрузка аудиофайла с сервера
     * @param soundDir Путь к аудиофайлу на сервере
     * @returns {Promise<IYandexRequestDownloadSound | null>} Информация о загруженном аудиофайле:
     * - id: уникальный идентификатор файла
     * - skillId: идентификатор навыка
     * - size: размер файла в байтах
     * - originalName: оригинальное имя файла
     * - createdAt: дата и время загрузки
     * - isProcessed: статус обработки файла
     * - error: сообщение об ошибке (если есть)
     */
    public async downloadSoundFile(soundDir: string): Promise<IYandexRequestDownloadSound | null> {
        if (this.skillId) {
            this._request.url = this.#getSoundsUrl();
            this._request.header = Request.HEADER_FORM_DATA;
            this._request.attach = soundDir;
            const query = await this.call<IYandexRequestDownloadSoundRequest>();
            if (query && typeof query.sound?.id !== 'undefined') {
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
     * Получение списка всех загруженных аудиофайлов
     * @returns {Promise<IYandexRequestDownloadSound[] | null>} Массив с информацией о загруженных аудиофайлах
     */
    public async getLoadedSounds(): Promise<IYandexRequestDownloadSound[] | null> {
        if (this.skillId) {
            this._request.url = this.#getSoundsUrl();
            const query = await this.call<IYandexRequestDownloadSoundsRequest>();
            return query?.sounds || null;
        } else {
            this._log('YandexSoundRequest.getLoadedSounds() Error: Не выбран навык!');
        }
        return null;
    }

    /**
     * Удаление конкретного аудиофайла по его идентификатору
     * @param soundId Идентификатор аудиофайла для удаления
     * @returns {Promise<string | null>} 'ok' при успешном удалении, null при ошибке
     */
    public async deleteSound(soundId: string): Promise<string | null> {
        if (this.skillId) {
            if (soundId) {
                this._request.url = `${this.#getSoundsUrl()}/${soundId}`;
                this._request.customRequest = 'DELETE';
                const query = await this.call<IYandexRemoveRequest>();
                this._request.customRequest = null;
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
     * Удаление всех загруженных аудиофайлов
     * @returns {Promise<boolean>} true если все файлы успешно удалены, false при ошибке
     * @remarks Если при удалении произойдет ошибка, некоторые файлы могут остаться в хранилище
     */
    public async deleteSounds(): Promise<boolean> {
        if (this.skillId) {
            const sounds = await this.getLoadedSounds();
            if (sounds) {
                const results = await Promise.allSettled(
                    sounds.map(async (image) => {
                        try {
                            await this.deleteSound(image.id);
                            // Добавить задержку между запросами
                            await new Promise((resolve) => setTimeout(resolve, 200));
                            return true;
                        } catch (e) {
                            this._log(`Ошибка при удалении звука ${image.id}: ${e}`);
                            return false;
                        }
                    }),
                );
                // Если хотя бы одно изображение не удалено — вернуть false
                return results.every((r) => r.status === 'fulfilled' && r.value);
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
