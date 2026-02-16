import { IModelRules } from './interface';

import { Model } from './db/Model';
import { AppContext } from '../core';

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
     * Константы для определения типа платформы.
     * Используются для указания, для какой платформы предназначен звуковой файл.
     */

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
     */
    public platform: string;

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
                name: ['platform'],
                type: 'string',
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
            platform: 'Platform name',
        };
    }
}
