import { BotController, IUserData } from './BotController';
import { WELCOME_INTENT_NAME, HELP_INTENT_NAME } from '../core';
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
 * если вся обработка команд или шагов осуществляется через bot.addCommand или bot.assStep.
 *
 * Контроллер из коробки обрабатывает стандартные команды (приветствие и помощь), а также сценарий, когда ни одна из команд не была найдена.
 * Обработка базовых механик происходит только в том случае, если не была обработана ни одна команда или шаг.
 */
export class BaseBotController<
    TUserData extends IUserData = IUserData,
> extends BotController<TUserData> {
    /**
     * Обработка команд, добавленных через slots
     */
    public action(intentName: string | null, isCommand?: boolean, isStep?: boolean): void {
        if (isCommand || isStep) {
            i18n(this);
            return;
        }
        switch (intentName) {
            case WELCOME_INTENT_NAME:
                this.text = Text.getText(this.appContext?.platformParams.welcome_text || '');
                break;
            case HELP_INTENT_NAME:
                this.text = Text.getText(this.appContext?.platformParams.help_text || '');
                break;
            default:
                this.text = Text.getText(this.appContext?.platformParams.empty_text || '');
                break;
        }
        i18n(this);
    }
}
