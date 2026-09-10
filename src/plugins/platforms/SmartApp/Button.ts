import { AppContext, Text, IButtonType } from '../../../index';

import {
    ISberSmartAppSuggestionButton,
    ISberSmartAppCardAction,
} from './interfaces/ISmartAppPlatform';
import { getCorrectButtons, serializePlatformPayload } from '../Base/utils';

/**
 * Приводит универсальный payload к обязательной структуре server_action.
 * SmartApp API принимает в payload только объект, поэтому строковые данные
 * сохраняются в поле value без потери информации.
 */
function getServerAction(
    payload: unknown,
    appContext?: AppContext,
): NonNullable<ISberSmartAppSuggestionButton['actions']>[0] | null {
    if (serializePlatformPayload(payload, 'SmartApp', appContext) === null) {
        return null;
    }
    const payloadObject =
        typeof payload === 'object' && payload !== null && !Array.isArray(payload)
            ? (payload as Record<string, unknown>)
            : null;
    if (typeof payloadObject?.action_id === 'string') {
        return {
            type: 'server_action',
            message_name: 'SERVER_ACTION',
            server_action: {
                action_id: payloadObject.action_id,
                payload:
                    typeof payloadObject.payload === 'object' &&
                    payloadObject.payload !== null &&
                    !Array.isArray(payloadObject.payload)
                        ? (payloadObject.payload as Record<string, unknown>)
                        : {},
            },
        };
    }

    return {
        type: 'server_action',
        message_name: 'SERVER_ACTION',
        server_action: {
            action_id: 'umbot_action',
            payload: payloadObject ?? { value: payload },
        },
    };
}

/**
 * Получение кнопок в формате SmartApp
 * @param buttons Кнопки, которые необходимо отобразить
 * @param isCard флаг принадлежности кнопок к карточке
 * @param appContext Контекст приложения (для логирования ошибок валидации)
 * @returns Для карточки — действие ISberSmartAppCardAction, для обычного ответа — массив кнопок suggestions; `null`, если кнопка не прошла валидацию
 */
export function buttonProcessing(
    buttons: IButtonType[],
    isCard: boolean = false,
    appContext?: AppContext,
): ISberSmartAppSuggestionButton[] | ISberSmartAppCardAction | null {
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
        return null;
    } else {
        getCorrectButtons(buttons, 8, appContext).forEach((button) => {
            const title = Text.resize(button.title || '', 64);
            if (title) {
                const object: ISberSmartAppSuggestionButton = {
                    title,
                };
                if (button.payload) {
                    const action = getServerAction(button.payload, appContext);
                    if (!action) {
                        return;
                    }
                    object.actions = [action];
                } else {
                    object.actions = [{ text: title, type: 'text' }];
                }
                objects.push(object);
            }
        });
    }
    return objects;
}
