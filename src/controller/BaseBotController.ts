import { BotController, IUserData } from './BotController';
import { WELCOME_INTENT_NAME, HELP_INTENT_NAME } from '../core';
import { Text } from '../utils';

/**
 * Бот контроллер по умолчанию.
 * Стоит использовать в случаях, когда все команды добавляются через `addCommand`
 */
export class BaseBotController<
    TUserData extends IUserData = IUserData,
> extends BotController<TUserData> {
    /**
     * Обработка команд
     * @param intentName
     * @param isCommand
     */
    public action(intentName: string | null, isCommand?: boolean): void {
        if (isCommand) {
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
    }
}
