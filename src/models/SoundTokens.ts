import { Model } from './db/Model';
import { mmApp } from '../mmApp';
import { IModelRules } from './interface';
import {
    IYandexRequestDownloadSound,
    MarusiaRequest,
    TelegramRequest,
    VkRequest,
    YandexSoundRequest,
} from '../api';
import { Text } from '../utils/standard/Text';

/**
 * Интерфейс для внутреннего состояния модели звуковых файлов.
 * Определяет структуру данных для хранения информации о звуковых файлах в базе данных.
 */
export interface ISoundModelState {
    /**
     * Идентификатор звукового файла.
     * Уникальный идентификатор, используемый для ссылки на звуковой файл в API различных платформ.
     * @example "doc123456789" для VK, "file_id_123456" для Telegram
     */
    soundToken: string;
    /**
     * Путь к файлу.
     * Может быть URL-адресом звукового файла или путем к локальному файлу.
     * @example "/path/to/audio.mp3" или "https://example.com/audio.mp3"
     */
    path: string;
    /**
     * Тип платформы.
     * Определяет, для какой платформы предназначен звуковой файл.
     * @see SoundTokens.T_ALISA
     * @see SoundTokens.T_VK
     * @see SoundTokens.T_TELEGRAM
     * @see SoundTokens.T_MARUSIA
     */
    type: string;
}

/**
 * Модель для управления звуковыми файлами в различных платформах.
 * Предоставляет единый интерфейс для работы со звуковыми файлами в Яндекс.Алисе, ВКонтакте, Telegram и Марусе.
 *
 * @class SoundTokens
 * @extends Model<ISoundModelState>
 *
 * @example
 * // Создание и загрузка звукового файла для Telegram
 * const sound = new SoundTokens();
 * sound.path = '/path/to/audio.mp3';
 * sound.type = SoundTokens.T_TELEGRAM;
 * const token = await sound.getToken();
 * if (token) {
 *     console.log('Звуковой файл успешно загружен, токен:', token);
 * }
 */
export class SoundTokens extends Model<ISoundModelState> {
    /**
     * Название таблицы для хранения данных о звуковых файлах.
     * @private
     */
    private readonly TABLE_NAME = 'SoundTokens';

    /**
     * Константы для определения типа платформы.
     * Используются для указания, для какой платформы предназначен звуковой файл.
     */
    /** Тип платформы: Яндекс.Алиса */
    public static readonly T_ALISA = 0;
    /** Тип платформы: ВКонтакте */
    public static readonly T_VK = 1;
    /** Тип платформы: Telegram */
    public static readonly T_TELEGRAM = 2;
    /** Тип платформы: Маруся */
    public static readonly T_MARUSIA = 3;

    /**
     * Идентификатор/токен звукового файла.
     * Уникальный идентификатор, используемый для ссылки на звуковой файл в API платформы.
     */
    public soundToken: string | null;

    /**
     * Расположение звукового файла (url/директория).
     * Может быть URL-адресом звукового файла или путем к локальному файлу.
     */
    public path: string | null;

    /**
     * Тип приложения, для которого загружен звуковой файл.
     * Определяется одной из констант T_ALISA, T_VK, T_TELEGRAM или T_MARUSIA.
     */
    public type: number;

    /**
     * Флаг, указывающий, что передается содержимое файла.
     * Если true, то path содержит содержимое файла, а не путь к нему.
     * @defaultValue false
     */
    public isAttachContent: boolean;

    /**
     * Конструктор класса SoundTokens.
     * Инициализирует все поля значениями по умолчанию.
     */
    public constructor() {
        super();
        this.soundToken = null;
        this.path = null;
        this.type = SoundTokens.T_ALISA;
        this.isAttachContent = false;
    }

    /**
     * Возвращает название таблицы/файла с данными.
     *
     * @return {string} Название таблицы для хранения данных о звуковых файлах
     */
    public tableName(): string {
        return this.TABLE_NAME;
    }

    /**
     * Определяет правила валидации для полей модели.
     *
     * @return {IModelRules[]} Массив правил валидации
     */
    public rules(): IModelRules[] {
        return [
            {
                name: ['soundToken', 'path'],
                type: 'string',
                max: 150,
            },
            {
                name: ['type'],
                type: 'integer',
            },
        ];
    }

    /**
     * Возвращает метки атрибутов таблицы.
     * Используется для отображения понятных названий полей.
     *
     * @return {ISoundModelState} Объект с метками атрибутов
     */
    public attributeLabels(): ISoundModelState {
        return {
            soundToken: 'ID',
            path: 'Sound path',
            type: 'Type',
        };
    }

    /**
     * Получает или создает токен звукового файла для указанной платформы.
     * Метод автоматически определяет тип платформы и использует соответствующий API
     * для загрузки и получения токена звукового файла.
     *
     * @return {Promise<string>} Токен звукового файла или null в случае ошибки
     *
     * @example
     * // Загрузка звукового файла для VK
     * const sound = new SoundTokens();
     * sound.path = '/path/to/voice.mp3';
     * sound.type = SoundTokens.T_VK;
     * const token = await sound.getToken();
     * if (token) {
     *     console.log('Звуковой файл успешно загружен, токен:', token);
     * }
     */
    public async getToken(): Promise<string | null> {
        const where = {
            path: this.path,
            type: this.type,
        };
        switch (this.type) {
            case SoundTokens.T_ALISA:
                if (await this.whereOne(where)) {
                    return this.soundToken;
                } else {
                    const yImage = new YandexSoundRequest(
                        mmApp.params.yandex_token || null,
                        mmApp.params.app_id || null,
                    );
                    let res: IYandexRequestDownloadSound | null = null;
                    if (this.path) {
                        if (Text.isUrl(this.path)) {
                            mmApp.saveLog(
                                'SoundTokens.log',
                                'SoundTokens:getToken() - Нельзя отправить звук в навык для Алисы через url!',
                            );
                            return null;
                        } else {
                            res = await yImage.downloadSoundFile(this.path);
                        }
                    }
                    if (res) {
                        this.soundToken = res.id;
                        if (await this.save(true)) {
                            return this.soundToken;
                        }
                    }
                }
                break;

            case SoundTokens.T_VK:
                if (await this.whereOne(where)) {
                    return this.soundToken;
                } else if (this.path) {
                    const vkApi = new VkRequest();
                    const uploadServerResponse = await vkApi.docsGetMessagesUploadServer(
                        mmApp.params.user_id as string,
                        'audio_message',
                    );
                    if (uploadServerResponse) {
                        const uploadResponse = await vkApi.upload(
                            uploadServerResponse.upload_url,
                            this.path,
                        );
                        if (uploadResponse) {
                            const doc = await vkApi.docsSave(uploadResponse.file, 'Voice message');
                            if (doc) {
                                this.soundToken = `doc${doc.owner_id}_${doc.id}`;
                                if (await this.save(true)) {
                                    return this.soundToken;
                                }
                            }
                        }
                    }
                }
                break;

            case SoundTokens.T_TELEGRAM: {
                const telegramApi = new TelegramRequest();
                if (await this.whereOne(where)) {
                    await telegramApi.sendAudio(
                        mmApp.params.user_id as string,
                        this.soundToken as string,
                    );
                    return this.soundToken;
                } else if (this.path) {
                    const sound = await telegramApi.sendAudio(
                        mmApp.params.user_id as string,
                        this.path,
                    );
                    if (sound && sound.ok && sound.result.audio) {
                        if (typeof sound.result.audio.file_id !== 'undefined') {
                            this.soundToken = sound.result.audio.file_id;
                            if (await this.save(true)) {
                                return this.soundToken;
                            }
                        }
                    }
                }
                break;
            }

            case SoundTokens.T_MARUSIA:
                if (await this.whereOne(where)) {
                    return this.soundToken;
                } else if (this.path) {
                    const marusiaApi = new MarusiaRequest();
                    const uploadServerResponse = await marusiaApi.marusiaGetAudioUploadLink();
                    if (uploadServerResponse) {
                        const uploadResponse = await marusiaApi.upload(
                            uploadServerResponse.audio_upload_link,
                            this.path,
                        );
                        if (uploadResponse) {
                            const doc = await marusiaApi.marusiaCreateAudio(uploadResponse);
                            if (doc) {
                                this.soundToken = doc.id;
                                if (await this.save(true)) {
                                    return this.soundToken;
                                }
                            }
                        }
                    }
                }
                return null;
        }
        return null;
    }
}
