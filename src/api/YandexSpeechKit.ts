import { YandexRequest } from './YandexRequest';
import { mmApp } from '../mmApp';

/**
 * Класс отвечающий за преобразование текста в аудио файл.
 * Преобразование осуществляется через сервис Yandex SpeechKit.
 *
 * @class YandexSpeechKit
 */
export class YandexSpeechKit extends YandexRequest {
    /**
     * Адрес, на который будет отправляться запрос
     */
    public static readonly TTS_API_URL =
        'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';

    /**
     * Положительная интонация.
     */
    public static readonly E_GOOD = 'good';
    /**
     * Отрицательная интонация.
     */
    public static readonly E_EVIL = 'evil';
    /**
     * Нейтральная интонация.
     */
    public static readonly E_NEUTRAL = 'neutral';

    /**
     * Голос для синтеза речи Оксана(ru)
     */
    public static readonly V_OKSANA = 'oksana'; //ru
    /**
     * Голос для синтеза речи Джейн(ru)
     */
    public static readonly V_JANE = 'jane'; //ru
    /**
     * Голос для синтеза речи Омазж(ru)
     */
    public static readonly V_OMAZH = 'omazh'; //ru
    /**
     * Голос для синтеза речи Захар(ru)
     */
    public static readonly V_ZAHAR = 'zahar'; //ru
    /**
     * Голос для синтеза речи Ермил(ru)
     */
    public static readonly V_ERMIL = 'ermil'; //ru
    /**
     * Голос для синтеза речи Сильвер(tr)
     */
    public static readonly V_SILAERKAN = 'silaerkan'; //tr
    /**
     * Голос для синтеза речи Эркан(tr)
     */
    public static readonly V_ERKANYAVAS = 'erkanyavas'; //tr
    /**
     * Голос для синтеза речи Элис(en)
     */
    public static readonly V_ALYSS = 'alyss'; //en
    /**
     * Голос для синтеза речи Ник(en)
     */
    public static readonly V_NICK = 'nick'; //en
    /**
     * Голос для синтеза речи Алена(ru)
     */
    public static readonly V_ALENA = 'alena'; //ru
    /**
     * Голос для синтеза речи Филипп(ru)
     */
    public static readonly V_FILIPP = 'filipp'; //ru

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
     * Формат файла lpcm.
     * @see format
     */
    public static readonly F_LPCM = 'lpcm';
    /**
     * Формат файла oggopus.
     * @see format
     */
    public static readonly F_OGGOPUS = 'oggopus';

    /**
     * Текст, который нужно озвучить, в кодировке UTF-8.
     * Можно использовать только одно из полей text и ssml.
     * Для передачи слов-омографов используйте + перед ударной гласной. Например, гот+ов или def+ect.
     * Чтобы отметить паузу между словами, используйте -.
     * Ограничение на длину строки: 5000 символов.
     */
    public text: string | undefined;
    /**
     * Язык.
     * Допустимые значения:
     * ru-RU (по умолчанию) — русский язык;
     * en-US — английский язык;
     * tr-TR — турецкий язык.
     * @defaultValue ru-RU
     */
    public lang: string;
    /**
     * Желаемый голос для синтеза речи из списка. Значение параметра по умолчанию: oksana.
     * @defaultValue oksana
     */
    public voice: string;
    /**
     * Эмоциональная окраска голоса. Поддерживается только при выборе русского языка (ru-RU) и голосов jane или omazh.
     * Допустимые значения:
     * good — доброжелательный;
     * evil — злой;
     * neutral (по умолчанию) — нейтральный.
     * @defaultValue neutral
     */
    public emotion: string;
    /**
     * Скорость (темп) синтезированной речи. Для премиум-голосов временно не поддерживается.
     * Скорость речи задается дробным числом в диапазоне от 0.1 до 3.0. Где:
     * 3.0 — самый быстрый темп;
     * 1.0 (по умолчанию) — средняя скорость человеческой речи;
     * 0.1 — самый медленный темп.
     * @defaultValue 1.0
     */
    public speed: number;
    /**
     * Формат синтезируемого аудио.
     * Допустимые значения:
     * lpcm — аудиофайл синтезируется в формате LPCM без WAV-заголовка. Характеристики аудио:
     * Дискретизация — 8, 16 или 48 кГц в зависимости от значения параметра sampleRateHertz.
     * Разрядность квантования — 16 бит.
     * Порядок байтов — обратный (little-endian).
     * Аудио-данные хранятся как знаковые числа (signed integer).
     * oggopus (по умолчанию) — данные в аудиофайле кодируются с помощью аудиокодека OPUS и упаковываются в контейнер OGG (OggOpus).
     * @defaultValue oggopus
     */
    public format: string;
    /**
     * Частота дискретизации синтезируемого аудио.
     * Применяется, если значение format равно lpcm. Допустимые значения:
     * 48000 (по умолчанию) — частота дискретизации 48 кГц;
     * 16000 — частота дискретизации 16 кГц;
     * 8000 — частота дискретизации 8 кГц.
     * @defaultValue 48000
     */
    public sampleRateHertz: number | undefined;
    /**
     * Идентификатор каталога, к которому у вас есть доступ. Требуется для авторизации с пользовательским аккаунтом (см. ресурс UserAccount). Не используйте это поле, если вы делаете запрос от имени сервисного аккаунта.
     * Максимальная длина строки в символах — 50.
     */
    public folderId: number | null;

    /**
     * YandexSpeechKit constructor.
     * @param {string} oauth Авторизационный токен для успешного получения tts.
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
     * Инициализация параметров для отправки запроса.
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
     * Получение голосового текста.
     * Если синтез прошел успешно, в ответе будет бинарное содержимое аудиофайла.
     * Формат выходных данных зависит от значения параметра format.
     *
     * @param {string} text Текст для преобразования
     * @return Promise<any>
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
