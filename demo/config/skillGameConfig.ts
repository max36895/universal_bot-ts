/**
 * Универсальное приложение по созданию навыков и ботов.
 * @version 1.0
 * @author Maxim-M maximco36895@yandex.ru
 */
import {IAppConfig} from "../../src/MM/bot/core/mmApp";

export default function (): IAppConfig {
    return {
        json: __dirname + '/../json',
        error_log: __dirname + '/../errors',
        isLocalStorage: true
    };
}
