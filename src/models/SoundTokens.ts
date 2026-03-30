import { IModelRules } from './interface';

import { IModelState, Model } from './db/Model';
import { AppContext } from '../core';
import { TKey } from './db';

const RULES: IModelRules[] = [
    {
        name: ['soundToken', 'path'],
        type: 'string',
        max: 150,
    },
    {
        name: ['platform'],
        type: 'string',
    },
];

const ATTRS_LABEL = {
    soundToken: 'ID',
    path: 'Sound path',
    platform: 'Platform name',
};

/**
 * Интерфейс для внутреннего состояния модели звуковых файлов.
 * Определяет структуру данных для хранения информации о звуковых файлах в базе данных.
 */
export interface ISoundModelState extends IModelState {
    /**
     * Идентификатор звукового файла.
     * Уникальный идентификатор, используемый для ссылки на звуковой файл в API различных платформ.
     * @example "doc123456789" для VK, "file_id_123456" для Telegram
     */
    soundToken: string | null;
    /**
     * Путь к файлу.
     * Может быть URL-адресом звукового файла или путем к локальному файлу.
     * @example "/path/to/audio.mp3" или "https://example.com/audio.mp3"
     */
    path: string | null;
    /**
     * Тип платформы.
     * Определяет, для какой платформы предназначен звуковой файл.
     */
    platform: string;
}

/**
 * Модель для управления звуковыми файлами в различных платформах.
 * Предоставляет единый интерфейс для работы со звуковыми файлами в Алисе, ВКонтакте, Telegram, Марусе и тд.
 *
 * @class SoundTokens
 * @extends Model<ISoundModelState>
 *
 * @example
 * // Создание и загрузка звукового файла для Telegram
 * const sound = new SoundTokens(appContext);
 * sound.path = '/path/to/audio.mp3';
 * sound.platform = T_TELEGRAM;
 * const token = await sound.selectOne();
 * if (token) {
 *     console.log('Токен для звукового файла успешно получен, токен:', token);
 * } else {
 *     || Загрузка аудиофайла
 * }
 */
export class SoundTokens extends Model<ISoundModelState> {
    /**
     * Название таблицы для хранения данных о звуковых файлах.
     */
    private readonly TABLE_NAME = 'SoundTokens';

    /**
     * Флаг, указывающий, что передается содержимое файла.
     * Если true, то path содержит содержимое файла, а не путь к нему.
     * @defaultValue false
     */
    public isAttachContent: boolean;

    /**
     * Конструктор класса SoundTokens.
     * Предоставляет унифицированный интерфейс для хранения данных о загруженных аудиофайлах.
     */
    public constructor(appContext: AppContext) {
        super(appContext);
        this.soundToken = null;
        this.path = null;
        this.platform = 'unknown';
        this.isAttachContent = false;
    }

    protected getId(): TKey {
        return 'soundToken';
    }

    /**
     * Идентификатор звукового файла.
     * Уникальный идентификатор, используемый для ссылки на звуковой файл в API различных платформ.
     * @example "doc123456789" для VK, "file_id_123456" для Telegram
     */
    get soundToken(): string {
        return this.state.soundToken as string;
    }

    /**
     * Устанавливает идентификатор звукового файла.
     * @param soundToken
     */
    set soundToken(soundToken: string | null) {
        this.state.soundToken = soundToken;
    }

    /**
     * Путь к файлу.
     * Может быть URL-адресом звукового файла или путем к локальному файлу.
     * @example "/path/to/audio.mp3" или "https://example.com/audio.mp3"
     */
    get path(): string {
        return this.state.path as string;
    }

    /**
     * Устанавливает путь к файлу.
     * @param path
     */
    set path(path: string | null) {
        this.state.path = path;
    }

    /**
     * Тип платформы.
     * Определяет, для какой платформы предназначен звуковой файл.
     */
    get platform(): string {
        return this.state.platform as string;
    }

    /**
     * Устанавливает тип платформы.
     * @param platform
     */
    set platform(platform: string) {
        this.state.platform = platform;
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
        return RULES;
    }

    /**
     * Возвращает метки атрибутов таблицы.
     * Используется для отображения понятных названий полей.
     *
     * @return {ISoundModelState} Объект с метками атрибутов
     */
    public attributeLabels(): ISoundModelState {
        return ATTRS_LABEL;
    }
}
