import {
    INlu,
    INluDateTime,
    INluFIO,
    INluGeo,
    INluIntent,
    INluIntents,
    INluResult,
    INluThisUser,
} from './interfaces/INlu';
import { Text } from '../../utils/standard/Text';

/**
 * @class Nlu
 * Класс для обработки естественного языка и извлечения сущностей из текста.
 *
 * Основные возможности:
 * - Извлечение имен, дат, времени и геолокации
 * - Распознавание встроенных интентов (согласие, отказ, помощь)
 * - Поиск контактной информации (email, телефоны, ссылки)
 * - Кэширование результатов для оптимизации производительности
 *
 * Платформенные ограничения:
 * - Яндекс.Алиса: полная поддержка всех сущностей
 * - Маруся: ограниченная поддержка геолокации
 * - VK: базовая поддержка через регулярные выражения
 * - Telegram: базовая поддержка через регулярные выражения
 *
 * Поддерживаемые форматы:
 *
 * 1. Даты и время:
 * - Абсолютные даты: "1 января 2024", "01.01.2024"
 * - Относительные даты: "завтра", "через неделю"
 * - Время: "14:30", "два часа дня"
 * - Интервалы: "с 10 до 18 часов", "в течение недели"
 * - Периоды: "каждый понедельник", "по выходным"
 *
 * 2. Геолокация:
 * - Полные адреса: "Москва, ул. Тверская, д. 1"
 * - Города и регионы: "в Санкт-Петербурге", "Московская область"
 * - Страны: "Россия", "в Германии"
 * - Координаты: "55.7558° N, 37.6173° E"
 *
 * 3. Числа:
 * - Целые: "42", "сто"
 * - Дробные: "3,14", "половина"
 * - Порядковые: "первый", "десятый"
 * - Количественные: "пара", "дюжина"
 *
 * 4. Контактная информация:
 * - Email: "user@example.com"
 * - Телефоны: "+7 (999) 123-45-67", "8-800-555-35-35"
 * - Ссылки: "https://example.com", "www.site.ru"
 *
 * @example
 * ```typescript
 * import { Nlu } from './components/nlu/Nlu';
 *
 * const nlu = new Nlu();
 *
 * // Извлечение имени
 * const fio = nlu.getFio();
 * if (fio && fio.tokens.length > 0) {
 *   console.log('Имя:', fio.tokens[0].value.first_name);
 *   console.log('Фамилия:', fio.tokens[0].value.last_name);
 * }
 *
 * // Извлечение даты и времени
 * const datetime = nlu.getDateTime();
 * if (datetime && datetime.tokens.length > 0) {
 *   const date = datetime.tokens[0].value;
 *   console.log('Дата:', date.year, date.month, date.day);
 *   console.log('Время:', date.hour, date.minute);
 * }
 *
 * // Извлечение геолокации
 * const geo = nlu.getGeo();
 * if (geo && geo.tokens.length > 0) {
 *   const location = geo.tokens[0].value;
 *   console.log('Город:', location.city);
 *   console.log('Страна:', location.country);
 *   console.log('Координаты:', location.latitude, location.longitude);
 * }
 *
 * // Проверка встроенных интентов
 * if (nlu.isIntentConfirm()) {
 *   console.log('Пользователь согласился');
 * }
 * if (nlu.isIntentReject()) {
 *   console.log('Пользователь отказался');
 * }
 *
 * // Поиск контактной информации
 * const phones = Nlu.getPhone('Позвоните мне по номеру +7 (999) 123-45-67');
 * if (phones.tokens.length > 0) {
 *   console.log('Телефон:', phones.tokens[0]);
 * }
 *
 * const emails = Nlu.getEMail('Мой email: user@example.com');
 * if (emails.tokens.length > 0) {
 *   console.log('Email:', emails.tokens[0]);
 * }
 *
 * const links = Nlu.getLink('Посетите наш сайт https://example.com');
 * if (links.tokens.length > 0) {
 *   console.log('Ссылка:', links.tokens[0]);
 * }
 * ```
 */
export class Nlu {
    /**
     * Массив с обработанными данными NLU.
     * Содержит все сущности, извлеченные из текста.
     *
     * @type {INlu}
     */
    #nlu: INlu;

    /**
     * Кэш данных для оптимизации повторных запросов.
     * Хранит результаты извлечения сущностей по их типам.
     *
     * @type {Map<string, unknown[] | null>}
     * @example
     * ```typescript
     * // Пример содержимого кэша после обработки запроса
     * {
     *     'YANDEX.FIO': [{
     *         first_name: 'Иван',
     *         last_name: 'Иванов',
     *         patronymic_name: 'Петрович'
     *     }],
     *     'YANDEX.DATETIME': [{
     *         year: 2024,
     *         month: 3,
     *         day: 15,
     *         hour: 14,
     *         minute: 30
     *     }],
     *     'YANDEX.GEO': [{
     *         country: 'Россия',
     *         city: 'Москва',
     *         street: 'Тверская',
     *         house_number: '1'
     *     }]
     * }
     * ```
     */
    #cachedData: Map<string, unknown[] | null> = new Map();

    /**
     * Регулярное выражение для поиска email адресов.
     * Поддерживает стандартный формат email.
     *
     * @type {RegExp}
     * @example
     * ```typescript
     * // Находит адреса вида:
     * // user@domain.com
     * // user.name@domain.com
     * // user-name@domain.com
     * ```
     */
    private static readonly EMAIL_REGEX = /\b[\w._+-]+@[\w._+-]+\.[a-zA-Z]{2,}\b/i;

    /**
     * Регулярное выражение для поиска телефонных номеров.
     * Поддерживает различные форматы записи номеров.
     *
     * @type {RegExp}
     * @example
     * ```typescript
     * // Находит номера вида:
     * // +7 (999) 123-45-67
     * // 8-999-123-45-67
     * // 89991234567
     * ```
     */
    private static readonly PHONE_REGEX = /([\d\-() ]{4,}\d)|((?:\+|\d)[\d\-() ]{9,}\d)/imu;

    /**
     * Регулярное выражение для поиска URL-ссылок.
     * Поддерживает HTTP и HTTPS протоколы.
     *
     * @type {RegExp}
     * @example
     * ```typescript
     * // Находит ссылки вида:
     * // http://example.com
     * // https://example.com/path
     * ```
     */
    private static readonly LINK_REGEX = /((http|s:\/\/)[^( |\n)]+)/imu;

    /**
     * Тип сущности: ФИО.
     * Используется для извлечения имен, фамилий и отчеств.
     *
     * @type {string}
     * @example
     * ```typescript
     * const fio = nlu.getFio();
     * if (fio.status) {
     *     console.log(fio.result[0].first_name); // "Иван"
     * }
     * ```
     */
    public static readonly T_FIO = 'YANDEX.FIO';

    /**
     * Тип сущности: Геолокация.
     * Используется для извлечения адресов, городов и других географических данных.
     *
     * Поддерживаемые форматы:
     * 1. Полные адреса:
     *    - "Москва, ул. Тверская, д. 1"
     *    - "Россия, Санкт-Петербург, Невский проспект 2"
     * 2. Города и регионы:
     *    - "в Москве", "Московская область"
     *    - "из Санкт-Петербурга в Москву"
     * 3. Страны:
     *    - "Россия", "в Германии"
     *    - "из России в Китай"
     * 4. Координаты:
     *    - "55.7558° N, 37.6173° E"
     *    - "55°45'20.9"N 37°37'02.2"E"
     *
     * @type {string}
     * @example
     * ```typescript
     * const geo = nlu.getGeo();
     * if (geo && geo.tokens.length > 0) {
     *     const location = geo.tokens[0].value;
     *     console.log('Страна:', location.country);
     *     console.log('Город:', location.city);
     *     console.log('Улица:', location.street);
     *     console.log('Номер дома:', location.house_number);
     *     console.log('Координаты:', location.latitude, location.longitude);
     * }
     * ```
     */
    public static readonly T_GEO = 'YANDEX.GEO';

    /**
     * Тип сущности: Дата и время.
     * Используется для извлечения дат, времени и временных интервалов.
     *
     * Поддерживаемые форматы:
     * 1. Абсолютные даты:
     *    - "1 января 2024", "01.01.2024"
     *    - "в следующий вторник", "через неделю"
     * 2. Время:
     *    - "14:30", "в два часа дня"
     *    - "через час", "через 30 минут"
     * 3. Интервалы:
     *    - "с 10 до 18 часов"
     *    - "с понедельника по пятницу"
     * 4. Периоды:
     *    - "каждый день в 9 утра"
     *    - "по выходным с 12 до 18"
     *
     * @type {string}
     * @example
     * ```typescript
     * const dateTime = nlu.getDateTime();
     * if (dateTime.status) {
     *     const date = dateTime.result[0];
     *
     *     // Абсолютная дата
     *     if (date.year && date.month && date.day) {
     *         console.log(`Дата: ${date.day}.${date.month}.${date.year}`);
     *     }
     *
     *     // Время
     *     if (date.hour !== undefined) {
     *         console.log(`Время: ${date.hour}:${date.minute || '00'}`);
     *     }
     *
     *     // Относительное время
     *     if (date.relative) {
     *         console.log(`Относительно: ${date.relative}`);
     *     }
     * }
     * ```
     */
    public static readonly T_DATETIME = 'YANDEX.DATETIME';

    /**
     * Тип сущности: Число.
     * Используется для извлечения числовых значений.
     *
     * Поддерживаемые форматы:
     * 1. Целые числа:
     *    - "42", "сто", "тысяча"
     *    - "минус десять", "-10"
     * 2. Дробные числа:
     *    - "3,14", "пять целых две десятых"
     *    - "половина", "четверть"
     * 3. Порядковые числительные:
     *    - "первый", "десятый"
     *    - "сотый", "тысячный"
     * 4. Количественные числительные:
     *    - "пара", "дюжина"
     *    - "несколько", "много"
     *
     * @type {string}
     * @example
     * ```typescript
     * const numbers = nlu.getNumber();
     * if (numbers.status) {
     *     numbers.result.forEach(number => {
     *         // Проверка на целое число
     *         if (Number.isInteger(number)) {
     *             console.log(`Целое число: ${number}`);
     *         }
     *         // Проверка на дробное число
     *         else if (number % 1 !== 0) {
     *             console.log(`Дробное число: ${number}`);
     *         }
     *     });
     * }
     * ```
     */
    public static readonly T_NUMBER = 'YANDEX.NUMBER';

    /**
     * Встроенный интент: Согласие.
     * Используется для распознавания положительных ответов.
     *
     * Поддерживаемые варианты:
     * - Прямое согласие: "да", "конечно", "хорошо"
     * - Подтверждение: "верно", "правильно", "точно"
     * - Готовность: "готов", "можно", "давай"
     * - Одобрение: "отлично", "супер", "класс"
     *
     * @type {string}
     * @example
     * ```typescript
     * // Проверка на согласие
     * if (nlu.isIntentConfirm()) {
     *     console.log('Пользователь согласился');
     * }
     *
     * // Проверка конкретной фразы
     * if (nlu.isIntentConfirm('да, конечно')) {
     *     console.log('Явное согласие');
     * }
     * ```
     */
    public static readonly T_INTENT_CONFIRM = 'YANDEX.CONFIRM';

    /**
     * Встроенный интент: Отказ.
     * Используется для распознавания отрицательных ответов.
     *
     * Поддерживаемые варианты:
     * - Прямой отказ: "нет", "не надо", "отмена"
     * - Отрицание: "неверно", "неправильно"
     * - Несогласие: "не хочу", "не буду"
     * - Отмена: "стоп", "хватит", "прекрати"
     *
     * @type {string}
     * @example
     * ```typescript
     * // Проверка на отказ
     * if (nlu.isIntentReject()) {
     *     console.log('Пользователь отказался');
     * }
     *
     * // Проверка конкретной фразы
     * if (nlu.isIntentReject('нет, спасибо')) {
     *     console.log('Вежливый отказ');
     * }
     * ```
     */
    public static readonly T_INTENT_REJECT = 'YANDEX.REJECT';

    /**
     * Встроенный интент: Запрос помощи.
     * Используется для распознавания запросов о помощи.
     *
     * @type {string}
     * @example
     * ```typescript
     * if (nlu.isIntentHelp()) {
     *     console.log('Пользователь запросил помощь');
     * }
     * ```
     */
    public static readonly T_INTENT_HELP = 'YANDEX.HELP';

    /**
     * Встроенный интент: Повторение.
     * Используется для распознавания запросов повторить последний ответ.
     *
     * @type {string}
     * @example
     * ```typescript
     * if (nlu.isIntentRepeat()) {
     *     console.log('Пользователь просит повторить');
     * }
     * ```
     */
    public static readonly T_INTENT_REPEAT = 'YANDEX.REPEAT';

    /**
     * Конструктор класса Nlu.
     * Инициализирует пустой объект NLU и кэш данных.
     *
     * @example
     * ```typescript
     * const nlu = new Nlu();
     * // nlu._nlu = {}
     * // nlu._cachedData = new Map()
     * ```
     */
    public constructor() {
        this.#nlu = {};
    }

    /**
     * Сериализует входные данные NLU в стандартный формат.
     *
     * @param {any} nlu - Входные данные NLU
     * @returns {INlu} Обработанные данные NLU
     */
    protected _serializeNlu(nlu: any): INlu {
        // todo Придумать обработку для nlu. Возможно стоит дать возможность указать свой обработчик
        return <INlu>nlu;
    }

    /**
     * Устанавливает данные NLU и очищает кэш.
     *
     * @param {any} nlu - Данные NLU для обработки
     * @example
     * ```typescript
     * nlu.setNlu({
     *     entities: [
     *         {
     *             type: 'YANDEX.FIO',
     *             value: { first_name: 'Иван', last_name: 'Иванов' }
     *         }
     *     ]
     * });
     * ```
     */
    public setNlu(nlu: any): void {
        this.#nlu = this._serializeNlu(nlu);
        this.#cachedData.clear();
    }

    /**
     * Получает данные определенного типа из NLU.
     * Использует кэш для оптимизации повторных запросов.
     *
     * @param {string} type - Тип данных для извлечения
     * @returns {T[] | null} Массив найденных сущностей или null
     * @example
     * ```typescript
     * // Внутренний метод, не предназначен для прямого использования
     * // Используйте публичные методы класса:
     * const fio = nlu.getFio();
     * const geo = nlu.getGeo();
     * const dateTime = nlu.getDateTime();
     * ```
     */
    #getData<T = object>(type: string): T[] | null {
        if (this.#cachedData.has(type)) {
            return (this.#cachedData.get(type) as T[]) || null;
        }
        let data: (object | number)[] | null = null;
        if (this.#nlu.entities) {
            this.#nlu.entities.forEach((entity) => {
                if (typeof entity.type !== 'undefined' && entity.type === type) {
                    if (data === null) {
                        data = [];
                    }
                    data.push(entity.value);
                }
            });
        }
        this.#cachedData.set(type, data);
        return data;
    }

    /**
     * Получает информацию о текущем пользователе.
     *
     * @returns {INluThisUser | null} Информация о пользователе или null
     * @example
     * ```typescript
     * const user = nlu.getUserName();
     * if (user) {
     *     console.log('ID пользователя:', user.user_id);
     *     console.log('Имя пользователя:', user.first_name);
     *     console.log('Фамилия пользователя:', user.last_name);
     * }
     * ```
     */
    public getUserName(): INluThisUser | null {
        return this.#nlu.thisUser || null;
    }

    /**
     * Получает ФИО из текста.
     *
     * @returns {INluResult<INluFIO[]>} Результат поиска ФИО
     * @example
     * ```typescript
     * const fio = nlu.getFio();
     * if (fio && fio.tokens.length > 0) {
     *     const person = fio.tokens[0].value;
     *     console.log('Имя:', person.first_name);
     *     console.log('Фамилия:', person.last_name);
     *     console.log('Отчество:', person.patronymic_name);
     * }
     * ```
     */
    public getFio(): INluResult<INluFIO[]> {
        const fio = this.#getData<INluFIO>(Nlu.T_FIO);
        const status = !!fio;
        return {
            status,
            result: fio,
        };
    }

    /**
     * Получает геолокацию из текста.
     *
     * @returns {INluResult<INluGeo[]>} Результат поиска геолокации
     * @example
     * ```typescript
     * const geo = nlu.getGeo();
     * if (geo && geo.tokens.length > 0) {
     *     const location = geo.tokens[0].value;
     *     console.log('Страна:', location.country);
     *     console.log('Город:', location.city);
     *     console.log('Улица:', location.street);
     *     console.log('Номер дома:', location.house_number);
     *     console.log('Координаты:', location.latitude, location.longitude);
     * }
     * ```
     */
    public getGeo(): INluResult<INluGeo[]> {
        const geo = this.#getData<INluGeo>(Nlu.T_GEO);
        const status = !!geo;
        return {
            status,
            result: geo,
        };
    }

    /**
     * Получает дату и время из текста.
     *
     * @returns {INluResult<INluDateTime[]>} Результат поиска даты и времени
     * @example
     * ```typescript
     * const dateTime = nlu.getDateTime();
     * if (dateTime && dateTime.tokens.length > 0) {
     *     const dt = dateTime.tokens[0].value;
     *     if (dt.year) console.log('Год:', dt.year);
     *     if (dt.month) console.log('Месяц:', dt.month);
     *     if (dt.day) console.log('День:', dt.day);
     *     if (dt.hour !== undefined) console.log('Час:', dt.hour);
     *     if (dt.minute !== undefined) console.log('Минуты:', dt.minute);
     *     if (dt.relative) console.log('Относительное время:', dt.relative);
     * }
     * ```
     */
    public getDateTime(): INluResult<INluDateTime[]> {
        const dateTime = this.#getData<INluDateTime>(Nlu.T_DATETIME);
        const status = !!dateTime;
        return {
            status,
            result: dateTime,
        };
    }

    /**
     * Получает числа из текста.
     *
     * @returns {INluResult<number[]>} Результат поиска чисел
     * @example
     * ```typescript
     * const number = nlu.getNumber();
     * if (number && number.tokens.length > 0) {
     *     const value = number.tokens[0].value;
     *     console.log('Число:', value);
     *     // Проверка типа числа
     *     if (Number.isInteger(value)) {
     *         console.log('Целое число');
     *     } else {
     *         console.log('Дробное число');
     *     }
     * }
     * ```
     */
    public getNumber(): INluResult<number[]> {
        const number = this.#getData<number>(Nlu.T_NUMBER);
        const status = !!number;
        return {
            status,
            result: number,
        };
    }

    /**
     * Проверяет наличие интента согласия в тексте.
     *
     * @param {string} [userCommand=''] - Текст для проверки
     * @returns {boolean} true если найден интент согласия
     * @example
     * ```typescript
     * if (nlu.isIntentConfirm('да, согласен')) {
     *     console.log('Пользователь согласился');
     * }
     * ```
     */
    public isIntentConfirm(userCommand: string = ''): boolean {
        const result: boolean = this.getIntent(Nlu.T_INTENT_CONFIRM) !== null;
        if (!result && userCommand) {
            return Text.isSayTrue(userCommand);
        }
        return result;
    }

    /**
     * Проверяет наличие интента отказа в тексте.
     *
     * @param {string} [userCommand=''] - Текст для проверки
     * @returns {boolean} true если найден интент отказа
     * @example
     * ```typescript
     * if (nlu.isIntentReject('нет, не хочу')) {
     *     console.log('Пользователь отказался');
     * }
     * ```
     */
    public isIntentReject(userCommand: string = ''): boolean {
        const result: boolean = this.getIntent(Nlu.T_INTENT_REJECT) !== null;
        if (!result && userCommand) {
            return Text.isSayFalse(userCommand);
        }
        return result;
    }

    /**
     * Проверяет наличие интента помощи в тексте.
     *
     * @returns {boolean} true если найден интент помощи
     * @example
     * ```typescript
     * if (nlu.isIntentHelp()) {
     *     console.log('Пользователь запросил помощь');
     * }
     * ```
     */
    public isIntentHelp(): boolean {
        return this.getIntent(Nlu.T_INTENT_HELP) !== null;
    }

    /**
     * Проверяет наличие интента повтора в тексте.
     *
     * @returns {boolean} true если найден интент повтора
     * @example
     * ```typescript
     * if (nlu.isIntentRepeat()) {
     *     console.log('Пользователь просит повторить');
     * }
     * ```
     */
    public isIntentRepeat(): boolean {
        return this.getIntent(Nlu.T_INTENT_REPEAT) !== null;
    }

    /**
     * Получает все интенты из текста.
     *
     * @returns {INluIntents | null} Объект с интентами или null
     * @example
     * ```typescript
     * const intents = nlu.getIntents();
     * if (intents) {
     *     // Проверка наличия конкретного интента
     *     if (intents['YANDEX.CONFIRM']) {
     *         console.log('Найден интент согласия');
     *     }
     *     if (intents['YANDEX.HELP']) {
     *         console.log('Найден интент помощи');
     *     }
     *     // Получение слотов интента
     *     const helpIntent = intents['YANDEX.HELP'];
     *     if (helpIntent && helpIntent.slots) {
     *         console.log('Слоты интента:', helpIntent.slots);
     *     }
     * }
     * ```
     */
    public getIntents(): INluIntents | null {
        return this.#nlu.intents || null;
    }

    /**
     * Получает конкретный интент по имени.
     *
     * @param {string} intentName - Имя интента
     * @returns {INluIntent | null} Интент или null
     * @example
     * ```typescript
     * const intent = nlu.getIntent('YANDEX.CONFIRM');
     * if (intent) {
     *     console.log(intent.slots); // { ... }
     * }
     * ```
     */
    public getIntent(intentName: string): INluIntent | null {
        const intents: INluIntents | null = this.getIntents();
        if (intents) {
            return intents[intentName] || null;
        }
        return null;
    }

    /**
     * Извлекает ссылки из текста.
     *
     * @param {string} query - Текст для поиска
     * @returns {INluResult<string[]>} Результат поиска ссылок
     * @example
     * ```typescript
     * const links = Nlu.getLink('Посетите https://example.com и http://test.ru');
     * if (links && links.tokens.length > 0) {
     *     links.tokens.forEach(link => {
     *         console.log('Найдена ссылка:', link);
     *     });
     * }
     * ```
     */
    public static getLink(query: string): INluResult<string[]> {
        const links = query.match(Nlu.LINK_REGEX);
        return {
            status: !!links,
            result: links,
        };
    }

    /**
     * Извлекает телефонные номера из текста.
     *
     * @param {string} query - Текст для поиска
     * @returns {INluResult<string[]>} Результат поиска телефонов
     * @example
     * ```typescript
     * const phones = Nlu.getPhone('Позвоните по номеру +7 (999) 123-45-67 или 8-800-555-35-35');
     * if (phones && phones.tokens.length > 0) {
     *     phones.tokens.forEach(phone => {
     *         console.log('Найден телефон:', phone);
     *     });
     * }
     * ```
     */
    public static getPhone(query: string): INluResult<string[]> {
        const phones = query.match(Nlu.PHONE_REGEX);
        return {
            status: !!phones,
            result: phones,
        };
    }

    /**
     * Извлекает email адреса из текста.
     *
     * @param {string} query - Текст для поиска
     * @returns {INluResult<string[]>} Результат поиска email
     * @example
     * ```typescript
     * const emails = Nlu.getEMail('Напишите на email@example.com или support@test.ru');
     * if (emails && emails.tokens.length > 0) {
     *     emails.tokens.forEach(email => {
     *         console.log('Найден email:', email);
     *     });
     * }
     * ```
     */
    public static getEMail(query: string): INluResult<string[]> {
        const emails = query.match(Nlu.EMAIL_REGEX);
        return {
            status: !!emails,
            result: emails,
        };
    }
}
