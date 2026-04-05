import { Text, IButtonType } from '../../../index';

import {
    ISberSmartAppSuggestionButton,
    ISberSmartAppCardAction,
} from './interfaces/ISmartAppPlatform';
import { getCorrectButtons } from '../Base/utils';

/**
 * Получение кнопок в формате SmartApp
 * @param buttons Кнопки, которые необходимо отобразить
 * @param isCard флаг принадлежности кнопок к карточке
 */
export function buttonProcessing(
    buttons: IButtonType[],
    isCard: boolean = false,
): ISberSmartAppSuggestionButton[] | ISberSmartAppCardAction {
    const objects: ISberSmartAppSuggestionButton[] = [];
    if (isCard) {
        const button = buttons[0];
        if (button) {
            if (button.url) {
                return {
                    deep_link: button.url,
                    type: 'deep_link',
                };
            } else {
                const text = Text.resize(button.title || '', 64);
                if (text) {
                    return {
                        text,
                        type: 'text',
                    };
                }
            }
        }
    } else {
        getCorrectButtons(buttons, 8).forEach((button) => {
            const title = Text.resize(button.title || '', 64);
            if (title) {
                const object: ISberSmartAppSuggestionButton = {
                    title,
                };
                if (button.payload) {
                    object.action = {
                        server_action: button.payload,
                        type: 'server_action',
                    };
                } else {
                    object.action = {
                        text: title,
                        type: 'text',
                    };
                }
                objects.push(object);
            }
        });
    }
    return objects;
}
