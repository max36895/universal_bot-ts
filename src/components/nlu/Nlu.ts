import {
    INlu,
    INluDateTime,
    INluFIO,
    INluGeo,
    INluIntent,
    INluIntents,
    INluResult,
    INluThisUser
} from "./interfaces/INlu";
import {Text} from "../standard/Text";

/**
 * Класс отвечающий за обработку естественной речи. Осуществляет поиск различных сущностей в тексте.
 * @class Nlu
 */
export class Nlu {
    /**
     * Массив с обработанным nlu.
     */
    private _nlu: INlu;
    /**
     * @const T_FIO В запросе пользователя присутствует имя.
     */
    public static readonly T_FIO = 'YANDEX.FIO';
    /**
     * @const  T_GEO В запросе пользователя присутствуют координаты(Адрес, город и тд).
     */
    public static readonly T_GEO = 'YANDEX.GEO';
    /**
     * @const T_DATETIME В запросе пользователя присутствует дата.
     */
    public static readonly T_DATETIME = 'YANDEX.DATETIME';
    /**
     * @const T_NUMBER В запросе пользователя есть числа.
     */
    public static readonly T_NUMBER = 'YANDEX.NUMBER';

    /**
     * ========== Встроенные интенты =========================
     * Если в навыке есть хотя бы один интент, Яндекс.Диалоги дополнительно отправляют интенты, универсальные для большинства навыков
     */
    /**
     * @const T_INTENT_CONFIRM: Согласие.
     */
    public static readonly T_INTENT_CONFIRM = 'YANDEX.CONFIRM';
    /**
     * @const T_INTENT_REJECT: Отказ.
     */
    public static readonly T_INTENT_REJECT = 'YANDEX.REJECT';
    /**
     * @const T_INTENT_HELP: Запрос подсказки.
     */
    public static readonly T_INTENT_HELP = 'YANDEX.HELP';
    /**
     * @const T_INTENT_REPEAT: Просьба повторить последний ответ навыка.
     */
    public static readonly T_INTENT_REPEAT = 'YANDEX.REPEAT';

    // =======================================================

    /**
     * Nlu constructor.
     */
    public constructor() {
        this._nlu = {};
    }

    /**
     * Приводит nlu в пригодный для работы вид.
     * @param {Object} nlu
     * @return INlu
     */
    protected _serializeNlu(nlu: any): INlu {
        // todo добавить обработку
        return <INlu>nlu;
    }

    /**
     * Устанавливает данные
     *
     * @param {Object} nlu Значение для nlu. В случае с Алисой передается в запросе. Для других типов инициируется самостоятельно.
     * @api
     */
    public setNlu(nlu: any): void {
        this._nlu = this._serializeNlu(nlu);
    }

    /**
     * Получение обработанного nlu для определенного типа.
     *
     * @param {string} type Тип данных.
     * @return any|null
     * @api
     */
    private _getData<T = object>(type: string): T[] | null {
        let data: (object | number)[] | null = null;
        if (this._nlu.entities) {
            this._nlu.entities.forEach((entity) => {
                if ((typeof entity.type !== "undefined") && entity.type === type) {
                    if (data === null) {
                        data = [];
                    }
                    data.push(entity.value);
                }
            });
        }
        return data;
    }

    /**
     * Получение имени текущего пользователя.
     *
     * @return INluThisUser|null
     * [
     *  [
     *      - string username: Логин пользователя.
     *      - string first_name: Имя пользователя.
     *      - string last_name: Фамилия пользователя.
     *  ]
     * ]
     * @api
     */
    public getUserName(): INluThisUser | null {
        return this._nlu.thisUser || null;
    }

    /**
     * Получение ФИО.
     *
     * 'status' == true, если значение найдено. Иначе значений найти не удалось.
     * 'result' представляет из себя массив типа
     * [
     *  {
     *      "first_name" : Имя
     *      "patronymic_name" : Отчество
     *      "last_name" : Фамилия
     *  }
     * ]
     *
     * @return INluResult<INluFIO[]>
     * @api
     */
    public getFio(): INluResult<INluFIO[]> {
        const fio = this._getData<INluFIO>(Nlu.T_FIO);
        const status = !!fio;
        return {
            status,
            result: fio
        };
    }

    /**
     * Получение местоположение.
     *
     * 'status' == true, если значение найдено. Иначе значений найти не удалось.
     * 'result' представляет из себя массив типа
     * [
     *  [
     *      "country" : Страна
     *      "city" : Город
     *      "street" : Улица
     *      "house_number" : Номер дома
     *      "airport" : Название аэропорта
     *  ]
     * ]
     *
     * @return INluResult<INluGeo[]>
     * @api
     */
    public getGeo(): INluResult<INluGeo[]> {
        const geo = this._getData<INluGeo>(Nlu.T_GEO);
        const status = !!geo;
        return {
            status,
            result: geo
        };
    }

    /**
     * Получение даты и времени.
     *
     * 'status' == true, если значение найдено. Иначе значений найти не удалось.
     * 'result' представляет из себя массив типа
     * [
     *  [
     *      "year" : Точный год
     *      "year_is_relative" : Признак того, что в поле year указано относительное количество лет;
     *      "month" : Месяц
     *      "month_is_relative" : Признак того, что в поле month указано относительное количество месяцев
     *      "day" : День
     *      "day_is_relative" : Признак того, что в поле day указано относительное количество дней
     *      "hour" : Час
     *      "hour_is_relative" : Признак того, что в поле hour указано относительное количество часов
     *      "minute" : Минута
     *      "minute_is_relative" : Признак того, что в поле minute указано относительное количество минут.
     *  ]
     * ]
     *
     * @return INluResult<INluDateTime[]>
     * @api
     */
    public getDateTime(): INluResult<INluDateTime[]> {
        const dateTime = this._getData<INluDateTime>(Nlu.T_DATETIME);
        const status = !!dateTime;
        return {
            status,
            result: dateTime
        };
    }

    /**
     * Получение числа.
     *
     * 'status' == true, если значение найдено. Иначе значений найти не удалось.
     * 'result' представляет из себя массив типа
     * [
     *  Число
     * ]
     *
     * @return INluResult<number>
     * @api
     */
    public getNumber(): INluResult<number[]> {
        const number = this._getData<number>(Nlu.T_NUMBER);
        const status = !!number;
        return {
            status,
            result: number
        };
    }

    /**
     * Вернет true, если пользователь даёт согласие.
     *
     * @param {string} userCommand Фраза пользователя. Если нет совпадения по интенту, то поиск согласия идет по тексту.
     * @return boolean
     * @api
     */
    public isIntentConfirm(userCommand: string = ''): boolean {
        const result: boolean = (this.getIntent(Nlu.T_INTENT_CONFIRM) !== null);
        if (!result && userCommand) {
            return Text.isSayTrue(userCommand);
        }
        return result;
    }

    /**
     * Вернет true, если пользователь не даёт согласие.
     *
     * @param {string} userCommand Фраза пользователя. Если нет совпадения по интенту, то поиск несогласия идет по тексту.
     * @return boolean
     * @api
     */
    public isIntentReject(userCommand: string = ''): boolean {
        const result: boolean = (this.getIntent(Nlu.T_INTENT_REJECT) !== null);
        if (!result && userCommand) {
            return Text.isSayFalse(userCommand);
        }
        return result;
    }

    /**
     * Вернет true, если пользователь просит помощи.
     *
     * @return boolean
     * @api
     */
    public isIntentHelp(): boolean {
        return (this.getIntent(Nlu.T_INTENT_HELP) !== null);
    }

    /**
     * Вернет true, если пользователь просит повторить последний ответ навыка.
     *
     * @return boolean
     * @api
     */
    public isIntentRepeat(): boolean {
        return (this.getIntent(Nlu.T_INTENT_REPEAT) !== null);
    }

    /**
     * Получение всех intents, как правило получены от Алисы. Все интенты сгенерированы в консоли разработчика.
     *
     * @return any|null
     * @api
     */
    public getIntents(): INluIntents | null {
        return this._nlu.intents || null;
    }

    /**
     * Получение пользовательских интентов. (Актуально для Алисы).
     * В случае успеха вернет объект типа:
     * {['slots':array]}
     * Slots зависит от переменных внутри slots в консоли разработчика(https://dialogs.yandex.ru/developer/skills/<skill_id>/draft/settings/intents)
     * И включает себя:
     *  - type: Тип (YANDEX.STRING)
     *  - value: Значение
     *
     * @param {string} intentName Название intent`а
     * @return INluIntent|null
     * @api
     */
    public getIntent(intentName: string): INluIntent | null {
        const intents: INluIntents | null = this.getIntents();
        if (intents) {
            return intents[intentName] || null;
        }
        return null;
    }

    /**
     * Получение всех ссылок в тексте.
     *
     * @param {string} query Пользовательский запрос.
     * @return INluResult<string[]>
     * @api
     */
    public static getLink(query: string): INluResult<string[]> {
        const link = query.match(/((http|s:\/\/)[^( |\n)]+)/umig);
        if (link) {
            return {
                status: true,
                result: link
            };
        }
        return {
            status: false,
            result: null
        };
    }

    /**
     * Получение всех номеров телефона в тексте.
     *
     * @param {string} query Пользовательский запрос.
     * @return INluResult<string[]>
     * @api
     */
    public static getPhone(query: string): INluResult<string[]> {
        const phone = query.match(/([\d\-() ]{4,}\d)|((?:\+|\d)[\d\-() ]{9,}\d)/umig);
        if (phone) {
            return {
                status: true,
                result: phone
            }
        }
        return {
            status: false,
            result: null
        };
    }

    /**
     * Получение всех e-mail в тексте.
     *
     * @param {string} query Пользовательский запрос.
     * @return INluResult<string[]>
     * @api
     */
    public static getEMail(query: string): INluResult<string[]> {
        // можно использовать регулярку (\b\S+@\S+\.\S{2,6}\b), но она работает медленнее
        const mail = query.match(/(\b[a-zA-Z]+@[a-zA-Z]+.[a-zA-Z]{2,6}\b)/umig);
        if (mail) {
            return {
                status: true,
                result: mail
            };
        }
        return {
            status: false,
            result: null
        };
    }
}
