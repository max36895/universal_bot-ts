import { YandexRequest } from './YandexRequest';
import { mmApp } from '../mmApp';

/**
 * Класс отвечающий за преобразование текста в аудио файл.
 * Преобразование осуществляется через сервис Yandex SpeechKit.
 * @see (https://cloud.yandex.ru/docs/speechkit/tts/request) Смотри тут
 *
 * @example
 * ```typescript
 * import { YandexSpeechKit } from './api/YandexSpeechKit';
 *
 * // Создание экземпляра с токеном
 * const speechKit = new YandexSpeechKit('your-oauth-token');
 *
 * // Настройка параметров синтеза
 * speechKit.lang = YandexSpeechKit.L_RU;     // Русский язык
 * speechKit.voice = YandexSpeechKit.V_JANE;  // Голос Jane
 * speechKit.emotion = YandexSpeechKit.E_GOOD; // Доброжелательная интонация
 * speechKit.speed = 1.2;                     // Скорость речи
 * speechKit.format = YandexSpeechKit.F_OGGOPUS; // Формат OGG/OPUS
 *
 * try {
 *   // Пример с омографами и паузами
 *   const text = 'Я гот+ов - начать работу';
 *   const audio = await speechKit.getTts(text);
 *
 *   // Сохранение или воспроизведение аудио
 *   // audio содержит бинарные данные в выбранном формате
 * } catch (error) {
 *   console.error('Ошибка синтеза речи:', error);
 * }
 * ```
 */
export class YandexSpeechKit extends YandexRequest {
    /**
     * Адрес, на который будет отправляться запрос
     */
    public static readonly TTS_API_URL =
        'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';

    /**
     * Положительная интонация
     */
    public static readonly E_GOOD = 'good';
    /**
     * Отрицательная интонация
     */
    public static readonly E_EVIL = 'evil';
    /**
     * Нейтральная интонация
     */
    public static readonly E_NEUTRAL = 'neutral';

    /**
     * Голос для синтеза речи Оксана (ru)
     */
    public static readonly V_OKSANA = 'oksana';
    /**
     * Голос для синтеза речи Джейн (ru)
     */
    public static readonly V_JANE = 'jane';
    /**
     * Голос для синтеза речи Омазж (ru)
     */
    public static readonly V_OMAZH = 'omazh';
    /**
     * Голос для синтеза речи Захар (ru)
     */
    public static readonly V_ZAHAR = 'zahar';
    /**
     * Голос для синтеза речи Ермил (ru)
     */
    public static readonly V_ERMIL = 'ermil';
    /**
     * Голос для синтеза речи Сильвер (tr)
     */
    public static readonly V_SILAERKAN = 'silaerkan';
    /**
     * Голос для синтеза речи Эркан (tr)
     */
    public static readonly V_ERKANYAVAS = 'erkanyavas';
    /**
     * Голос для синтеза речи Элис (en)
     */
    public static readonly V_ALYSS = 'alyss';
    /**
     * Голос для синтеза речи Ник (en)
     */
    public static readonly V_NICK = 'nick';
    /**
     * Голос для синтеза речи Алена (ru)
     */
    public static readonly V_ALENA = 'alena';
    /**
     * Голос для синтеза речи Филипп (ru)
     */
    public static readonly V_FILIPP = 'filipp';

    /**
     * Русский язык
     */
    public static readonly L_RU = 'ru-RU';
    /**
     * Английский язык
     */
    public static readonly L_EN = 'en_EN';
    /**
     * Турецкий язык
     */
    public static readonly L_TR = 'tr-TR';

    /**
     * Формат файла lpcm
     * @see format
     */
    public static readonly F_LPCM = 'lpcm';
    /**
     * Формат файла oggopus
     * @see format
     */
    public static readonly F_OGGOPUS = 'oggopus';

    /**
     * Текст для озвучивания в кодировке UTF-8
     * Можно использовать только одно из полей text и ssml
     * Для передачи слов-омографов используйте + перед ударной гласной
     * Например: гот+ов или def+ect
     * Для паузы между словами используйте -
     * Максимальная длина: 5000 символов
     */
    public text: string | undefined;

    /**
     * Язык синтеза речи
     * ru-RU (по умолчанию) - русский
     * en-US - английский
     * tr-TR - турецкий
     */
    public lang: string;

    /**
     * Голос для синтеза речи
     * По умолчанию: oksana
     * @see V_OKSANA, V_JANE, V_OMAZH и другие константы
     */
    public voice: string;

    /**
     * Эмоциональная окраска голоса
     * Поддерживается только для ru-RU и голосов jane/omazh
     * good - доброжелательный
     * evil - злой
     * neutral (по умолчанию) - нейтральный
     */
    public emotion: string;

    /**
     * Скорость синтеза речи
     * От 0.1 до 3.0
     * 3.0 - самый быстрый
     * 1.0 (по умолчанию) - средняя скорость
     * 0.1 - самый медленный
     * Не поддерживается для премиум-голосов
     */
    public speed: number;

    /**
     * Формат синтезируемого аудио
     * lpcm - без WAV-заголовка
     * oggopus (по умолчанию) - OGG контейнер с OPUS кодеком
     */
    public format: string;

    /**
     * Частота дискретизации для формата lpcm
     * Поддерживаемые значения:
     * - 48000 (по умолчанию) - 48 кГц, высокое качество
     * - 16000 - 16 кГц, среднее качество
     * - 8000 - 8 кГц, низкое качество, подходит для телефонии
     *
     * @remarks
     * Параметр используется только при format = YandexSpeechKit.F_LPCM
     * Для format = YandexSpeechKit.F_OGGOPUS игнорируется
     */
    public sampleRateHertz: number | undefined;

    /**
     * Идентификатор каталога для авторизации
     * Требуется только для пользовательского аккаунта
     * Максимум 50 символов
     */
    public folderId: number | null;

    /**
     * Создает экземпляр YandexSpeechKit
     * @param oauth Авторизационный токен для синтеза речи
     */
    public constructor(oauth: string | null = null) {
        super(oauth);
        this.lang = YandexSpeechKit.L_RU;
        this.emotion = YandexSpeechKit.E_NEUTRAL;
        this.speed = 1.0;
        this.format = YandexSpeechKit.F_OGGOPUS;
        this.folderId = null;
        this.voice = 'oksana';
        if (oauth === null) {
            this.setOAuth(mmApp.params.yandex_speech_kit_token || null);
        }
    }

    /**
     * Инициализация параметров для отправки запроса
     * @private
     */
    protected _initPost(): void {
        this._request.post = {
            text: this.text,
            lang: this.lang,
            voice: this.voice,
            format: this.format,
        };
        if (
            [
                YandexSpeechKit.V_SILAERKAN,
                YandexSpeechKit.V_ERKANYAVAS,
                YandexSpeechKit.V_ALYSS,
                YandexSpeechKit.V_NICK,
            ].indexOf(this.voice) === -1
        ) {
            this._request.post.emotion = this.emotion;
        }
        if (this.voice !== YandexSpeechKit.V_ALENA && this.voice !== YandexSpeechKit.V_FILIPP) {
            if (this.speed < 0.1 || this.speed > 3.0) {
                this.speed = 1.0;
            }
            this._request.post.speed = this.speed;
        }
        if (this.format === YandexSpeechKit.F_LPCM && this.sampleRateHertz) {
            this._request.post.sampleRateHertz = this.sampleRateHertz;
        }
        if (this.folderId) {
            this._request.post.folderId = this.folderId;
        }
    }

    /**
     * Получение голосового текста
     * @param text Текст для преобразования в речь
     * @returns Бинарные данные аудиофайла
     *
     * @remarks
     * Поддерживаемые форматы:
     * - F_LPCM: RAW PCM без WAV-заголовка
     * - F_OGGOPUS: OGG контейнер с OPUS кодеком (рекомендуется)
     *
     * Особенности текста:
     * - Для омографов используйте + перед ударной гласной: гот+ов, з+амок
     * - Для паузы между словами используйте -: слово - слово
     * - Максимальная длина текста: 5000 символов
     *
     * Ограничения:
     * - Эмоции (emotion) поддерживаются только для ru-RU и голосов jane/omazh
     * - Скорость (speed) не поддерживается для премиум-голосов (alena, filipp)
     *
     * @example
     * ```typescript
     * // Пример с LPCM форматом
     * speechKit.format = YandexSpeechKit.F_LPCM;
     * speechKit.sampleRateHertz = 16000;
     * const pcmAudio = await speechKit.getTts('Текст для синтеза');
     *
     * // Пример с OGG/OPUS
     * speechKit.format = YandexSpeechKit.F_OGGOPUS;
     * const oggAudio = await speechKit.getTts('Текст для синтеза');
     * ```
     *
     * @see (https://cloud.yandex.ru/docs/speechkit/tts/request) Смотри тут
     */
    public getTts(text: string | null = null): Promise<any> {
        if (text) {
            this.text = text;
        }
        this._request.url = YandexSpeechKit.TTS_API_URL;
        this._request.isConvertJson = false;
        this._initPost();
        return this.call<any>();
    }
}
