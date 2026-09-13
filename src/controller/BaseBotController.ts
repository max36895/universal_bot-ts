import { BotController, IPlatformData, IUserData } from './BotController';
import { Text } from '../utils';

function i18n(controller: BaseBotController): void {
    if (controller.text && controller.appContext.plugins['i18n']) {
        controller.text =
            typeof controller.appContext.plugins['i18n'] === 'function'
                ? controller.appContext.plugins['i18n'](controller.text)
                : controller.appContext.plugins['i18n'].getData(controller.text);
    }
}

/**
 * Контроллер для обработки запросов приложения по умолчанию.
 * Используется в качестве контроллера по умолчанию, и позволяет не создавать свой контроллер,
 * если вся обработка команд или шагов осуществляется через bot.addCommand или bot.addStep.
 *
 * Стандартные команды (приветствие и помощь) обрабатываются конвейером BotController
 * (тексты welcome_text/help_text и интенты welcome/help), а не этим action().
 * Обработка в action происходит только в том случае, если не была обработана
 * ни одна команда или шаг.
 */
export class BaseBotController<
    TUserData extends IUserData = IUserData,
    TPlatformState extends IPlatformData = IPlatformData,
> extends BotController<TUserData, TPlatformState> {
    /**
     * Обработка запроса по умолчанию.
     * Вызывается фреймворком последним, после поиска команд и шагов.
     * Если команда или шаг уже обработали запрос (isCommand/isStep = true), метод просто применяет i18n и выходит.
     * Если ничего не подошло — устанавливает текст из platformParams.empty_text (только если text пуст,
     * `if (!this.text)`), затем применяет i18n.
     *
     * @param intentName - Имя сработавшего интента/команды/шага. null если ничего не найдено.
     * @param isCommand - true если запрос обработан командой из addCommand
     * @param isStep - true если запрос обработан шагом из addStep
     */
    public action(intentName: string | null, isCommand?: boolean, isStep?: boolean): void {
        if (isCommand || isStep) {
            i18n(this);
            return;
        }
        if (!this.text) {
            this.text = Text.getText(this.appContext?.platformParams.empty_text || '');
        }
        i18n(this);
    }
}
