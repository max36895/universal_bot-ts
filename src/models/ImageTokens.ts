import { IModelRules } from './interface';

import { IModelState, Model } from './db/Model';
import { AppContext } from '../core';
import { TKey } from './db';

const RULES: IModelRules[] = [
    {
        name: ['imageToken', 'path'],
        type: 'string',
        max: 150,
    },
    {
        name: ['platform'],
        type: 'string',
    },
];

const ATTRS_LABEL = {
    imageToken: 'ID',
    path: 'Image path',
    platform: 'Platform name',
};

/**
 * Интерфейс для внутреннего состояния модели изображений.
 * Определяет структуру данных для хранения информации об изображениях в базе данных.
 */
export interface IImageModelState extends IModelState {
    /**
     * Идентификатор/токен изображения.
     * Уникальный идентификатор, используемый для ссылки на изображение в API различных платформ.
     * @example "photo123456789" для Telegram, "123456789" для VK
     */
    imageToken: string | null;
    /**
     * Расположение изображения (url/директория).
     * Может быть URL-адресом изображения или путем к локальному файлу.
     */
    path: string | null;
    /**
     * Тип платформы.
     * Определяет, для какой платформы предназначено изображение.
     */
    platform: string;
}

/**
 * Модель для управления изображениями в различных платформах.
 * Предоставляет единый интерфейс для работы с изображениями в Алисе, ВКонтакте, Telegram, Марусе и тд.
 *
 * @extends Model<IImageModelState>
 *
 * @example
 * // Создание и загрузка изображения для Telegram
 * const image = new ImageTokens();
 * sound.path = '/path/to/image.png';
 * sound.platform = T_TELEGRAM;
 * const token = await image.selectOne();
 * if (token) {
 *     console.log('Токен для изображения успешно получен, токен:', token);
 * } else {
 *     || Загрузка изображения
 * }
 */
export class ImageTokens extends Model<IImageModelState> {
    /**
     * Название таблицы для хранения данных об изображениях.
     */
    private readonly TABLE_NAME = 'ImageTokens';

    /**
     * Описание изображения (Не обязательное поле).
     * Используется как подпись к изображению в некоторых платформах.
     */
    public caption: string | null;

    /**
     * Конструктор класса ImageTokens.
     * Предоставляет унифицированный интерфейс для хранения данных о загруженных изображений.
     */
    public constructor(appContext: AppContext) {
        super(appContext);
        this.imageToken = null;
        this.path = null;
        this.platform = 'unknown';
        this.caption = null;
    }

    protected getId(): TKey {
        return 'imageToken';
    }

    /**
     * Идентификатор/токен изображения.
     * Уникальный идентификатор, используемый для ссылки на изображение в API платформы.
     */
    get imageToken(): string {
        return this.state.imageToken as string;
    }

    /**
     * Устанавливает идентификатор/токен изображения.
     * @param imageToken
     */
    set imageToken(imageToken: string | null) {
        this.state.imageToken = imageToken;
    }

    /**
     * Расположение изображения (url/директория).
     * Может быть URL-адресом изображения или путем к локальному файлу.
     */
    get path(): string {
        return this.state.path as string;
    }

    /**
     * Устанавливает расположение изображения (url/директория).
     * @param path
     */
    set path(path: string | null) {
        this.state.path = path;
    }

    /**
     * Тип приложения, для которого загружена картинка.
     */
    get platform(): string {
        return this.state.platform as string;
    }

    /**
     * Устанавливает тип приложения, для которого загружена картинка.
     * @param platform
     */
    set platform(platform: string) {
        this.state.platform = platform;
    }

    /**
     * Возвращает название таблицы/файла с данными.
     *
     * @return {string} Название таблицы для хранения данных об изображениях
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
     * @return {IImageModelState} Объект с метками атрибутов
     */
    public attributeLabels(): IImageModelState {
        return ATTRS_LABEL;
    }
}
