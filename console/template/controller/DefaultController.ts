/**
 * Created by u_bot
 * Date: {{date}}
 * Time: {{time}}
 */
import {BotController} from "ubot";

export class __className__Controller extends BotController {
    /**
     * Обработка пользовательских команд.
     *
     * Если intentName === null, значит не удалось найти обрабатываемых команд в тексте.
     * В таком случе стоит смотреть либо на предыдущую команду пользователя(которая сохранена в бд).
     * Либо вернуть текст помощи.
     *
     * @param {string} intentName Название действия.
     */
    public action(intentName: string): void {
        // TODO: Implement action() method.
    }
}
