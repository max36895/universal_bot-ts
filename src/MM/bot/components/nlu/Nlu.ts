/**
 * Класс для обработки естественной речи. Осуществляет поиск различных сущностей в тексте.
 * Class Nlu
 * @package bot\components\nlu
 */
import {INlu, INluIntent, INluResult, INluThisUser} from "./interfaces/INlu";
import {Text} from "../standard/Text";

export class Nlu {
    /**
     * Массив с обработанными данными.
     * @var nlu Массив с обработанными данными.
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
     * Инициализация массива с nlu.
     *
     * @param nlu Значение для nlu. В случае с Алисой передается в запросе. Для других типов инициируется самостоятельно.
     * @api
     */
    public setNlu(nlu: INlu): void {
        this._nlu = nlu;
    }

    /**
     * Получить обработанный nlu для определенного типа.
     *
     * @param type Тип данных.
     * @return any|null
     * @api
     */
    private _getData(type: string): any {
        let data: object[] = null;
        this._nlu.entities.forEach((entity) => {
            if ((typeof entity.type !== "undefined") && entity.type == type) {
                if (data === null) {
                    data = [];
                }
                data.push(entity.value);
            }
        });
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
    public getUserName(): INluThisUser {
        return this._nlu.thisUser || null;
    }

    /**
     * Получение ФИО из текста, как правило его сгенерировал Яндекс.
     *
     * Возвращается массив типа:
     * ['status':bool, 'result':array]
     *
     * 'status' == true, если значение найдено. Иначе значений найти не удалось.
     * 'result' представляет из себя массив типа
     * [
     *  [
     *      "first_name" : Имя
     *      "patronymic_name" : Отчество
     *      "last_name" : Фамилия
     *  ]
     * ]
     *
     * @return INluResult
     * [
     *  - bool status
     *  - array result
     *      [
     *          - string first_name
     *          - string patronymic_name
     *          - string last_name
     *      ]
     * ]
     * @api
     */
    public getFio(): INluResult {
        let status: boolean = false;
        const fio: object = this._getData(Nlu.T_FIO);
        if (fio) {
            status = true;
        }
        return {
            status,
            result: fio
        };
    }

    /**
     * Получение местоположение из текста, как правило его сгенерировал Яндекс.
     *
     * Возвращается массив типа:
     * ['status':bool, 'result':array]
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
     * @return INluResult
     * [
     *  - bool status
     *  - array result
     *      [
     *          - string country
     *          - string city
     *          - string street
     *          - int house_number
     *          - string airport
     *      ]
     * ]
     * @api
     */
    public getGeo(): INluResult {
        let status: boolean = false;
        const geo: object = this._getData(Nlu.T_GEO);
        if (geo) {
            status = true;
        }
        return {
            status,
            result: geo
        };
    }

    /**
     * Получение даты и времени из текста, как правило его сгенерировал Яндекс.
     *
     * Возвращается массив типа:
     * ['status':bool, 'result':array]
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
     * @return INluResult
     * [
     *  - bool status
     *  - array result
     *      [
     *          - int year
     *          - bool year_is_relative
     *          - int month
     *          - bool month_is_relative
     *          - int day
     *          - bool day_is_relative
     *          - int hour
     *          - bool hour_is_relative
     *          - int minute
     *          - bool minute_is_relative
     *      ]
     * ]
     * @api
     */
    public getDateTime(): INluResult {
        let status: boolean = false;
        const dataTime: object = this._getData(Nlu.T_DATETIME);
        if (dataTime) {
            status = true;
        }
        return {
            status,
            result: dataTime
        };
    }

    /**
     * Получение числа в текста, как правило его сгенерировал Яндекс.
     *
     * Возвращается массив типа:
     * ['status':bool,'result':array]
     *
     * 'status' == true, если значение найдено. Иначе значений найти не удалось.
     * 'result' представляет из себя массив типа
     * [
     *  [
     *      "integer" : Целое число
     *      "float" : Десятичная дробь
     *  ]
     * ]
     *
     * @return INluResult
     * [
     *  - bool status
     *  - array result
     *      [
     *          - int integer
     *          or
     *          - float float
     *      ]
     * ]
     * @api
     */
    public getNumber(): INluResult {
        let status: boolean = false;
        const number: object = this._getData(Nlu.T_NUMBER);
        if (number) {
            status = true;
        }
        return {
            status,
            result: number
        };
    }

    /**
     * Вернет true, если пользователь согласен.
     *
     * @param userCommand Фраза пользователя. Если нет совпадения по интенту, то поиск согласия идет по тексту.
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
     * Вернет true, если пользователь не согласен.
     *
     * @param userCommand Фраза пользователя. Если нет совпадения по интенту, то поиск не согласия идет по тексту.
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
    public getIntents(): any {
        return this._nlu.intents || null;
    }

    /**
     * Получение пользовательских интентов. (Актуально для Алисы).
     * В случае успеха вернет массив типа:
     * [['slots':array]]
     * Slots зависит от переменных внутри slots в консоли разработчика(https://dialogs.yandex.ru/developer/skills/<skill_id>/draft/settings/intents)
     * И включает себя:
     *  - type: Тип (YANDEX.STRING)
     *  - value: Значение
     *
     * @param intentName Название intent`а
     * @return INluIntent|null
     * [
     *  - array slots
     *  [
     *      - string type
     *      - array value
     *  ]
     * ]
     * @api
     */
    public getIntent(intentName: string): INluIntent {
        const intents: object = this.getIntents();
        if (intents) {
            return intents[intentName] || null;
        }
        return null;
    }

    /**
     * Получение всех ссылок в тексте.
     * Возвращает массив типа:
     * ['status' : bool, 'result' : array]
     *
     * @param query Пользовательский запрос.
     * @return INluResult
     * [
     *  - bool status
     *  - array result
     * ]
     * @api
     */
    public static getLink(query: string): INluResult {
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
     * Возвращает массив типа:
     * ['status' : bool, 'result' : array]
     *
     * @param query Пользовательский запрос.
     * @return INluResult
     * [
     *  - bool status
     *  - array result
     * ]
     * @api
     */
    public static getPhone(query: string): INluResult {
        const phone = query.match(/([\d\-\(\) ]{4,}\d)|((?:\+|\d)[\d\-\(\) ]{9,}\d)/umig);
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
     * Получение всех e-mails в тексте.
     * Возвращает массив типа:
     * ['status' : bool, 'result' : array]
     *
     * @param query Пользовательский запрос.
     * @return INluResult
     * [
     *  - bool status
     *  - array result
     * ]
     * @api
     */
    public static getEMail(query: string): INluResult {
        const mail = query.match(/([^@^\s]+@[^\.^\s]+\.\S+)/umig);
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
