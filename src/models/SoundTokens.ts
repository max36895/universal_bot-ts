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
 * Интерфейс для внутреннего состояния модели.
 */
export interface ISoundModelState {
    /**
     * Идентификатор звукового файла
     */
    soundToken: string;
    /**
     * Путь к файлу
     */
    path: string;
    /**
     * Тип платформы
     */
    type: string;
}

/**
 * Модель для взаимодействия со всеми звуками.
 * @class
 */
export class SoundTokens extends Model<ISoundModelState> {
    private readonly TABLE_NAME = 'SoundTokens';

    /**
     * Тип платформы: Яндекс.Алиса
     */
    public static readonly T_ALISA = 0;

    /**
     * Тип платформы: ВКонтакте
     */
    public static readonly T_VK = 1;

    /**
     * Тип платформы: Telegram
     */
    public static readonly T_TELEGRAM = 2;

    /**
     * Тип платформы: Маруся
     */
    public static readonly T_MARUSIA = 3;

    /**
     * Идентификатор/токен мелодии.
     */
    public soundToken: string | null;
    /**
     * Расположение звукового файла(url|/директория).
     */
    public path: string | null;
    /**
     * Тип приложения, для которого загружена мелодия.
     */
    public type: number;
    /**
     * True если передается содержимое файла. По умолчанию: false.
     * @defaultValue false
     */
    public isAttachContent: boolean;

    /**
     * SoundTokens constructor.
     */
    public constructor() {
        super();
        this.soundToken = null;
        this.path = null;
        this.type = SoundTokens.T_ALISA;
        this.isAttachContent = false;
    }

    /**
     * Название таблицы/файла с данными.
     * @returns {string} Название таблицы
     */
    public tableName(): string {
        return this.TABLE_NAME;
    }

    /**
     * Основные правила для полей.
     * @returns {IModelRules[]} Массив правил валидации для полей модели
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
     * Название атрибутов таблицы.
     * @returns {ISoundModelState} Объект с метками атрибутов
     */
    public attributeLabels(): ISoundModelState {
        return {
            soundToken: 'ID',
            path: 'Sound path',
            type: 'Type',
        };
    }

    /**
     * Получение идентификатора/токена мелодии.
     *
     * @return {Promise<string|null>}
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
