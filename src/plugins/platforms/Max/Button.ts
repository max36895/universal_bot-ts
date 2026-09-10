import { AppContext, IButtonType } from '../../../index';

import { IMaxButtonObject, IMaxButton } from './interfaces/IMaxPlatform';
import { getCorrectButtons, serializePlatformPayload } from '../Base/utils';

/**
 * Получение кнопок в формате Max
 * @param buttons Кнопки, которые необходимо отобразить
 * @param appContext Контекст приложения (для логирования ошибок валидации)
 * @returns Объект inline-клавиатуры MAX (всегда непустая структура; невалидные кнопки пропускаются)
 */
export function buttonProcessing(
    buttons: IButtonType[],
    appContext?: AppContext,
): IMaxButtonObject {
    const finalButtons: IMaxButton[][] = [];
    if (buttons.length > 30) {
        appContext?.logWarn(
            '[MAX] клавиатура превышает лимит 30 рядов. Лишние кнопки не будут отправлены.',
        );
    }
    getCorrectButtons(buttons, 30, appContext).forEach((button) => {
        // text — обязательное поле кнопки MAX. Без проверки в запрос уходило
        // {"type":"message","text":null}, и API отклонял всё сообщение целиком.
        const title = button.title;
        if (!title) {
            appContext?.logWarn(
                '[MAX] У кнопки не задан текст — она будет пропущена, т.к. MAX не принимает кнопку без text.',
            );
            return;
        }
        const object: IMaxButton = {
            type: 'message',
            text: title,
        };
        if (button.url) {
            if (button.url.length > 2048) {
                appContext?.logWarn(
                    '[MAX] URL кнопки превышает лимит 2048 символов. Кнопка будет пропущена без изменения ссылки.',
                );
                return;
            }
            object.type = 'link';
            object.url = button.url;
        }
        if (button.payload) {
            const payload = serializePlatformPayload(button.payload, 'MAX', appContext);
            if (payload === null) {
                return;
            }
            if (!button.url) {
                object.type = 'callback';
            }
            object.payload = payload;
        }
        // Не переносим универсальные/чужие опции платформ в тело MAX: API
        // принимает только документированные поля кнопки и отклоняет неизвестные.
        // Опциональная цепочка — на случай кнопок, собранных вне компонента Buttons.
        const options = button.options ?? {};
        if (options.request_contact === true) {
            object.type = 'request_contact';
            delete object.payload;
            delete object.url;
        } else if (options.request_location === true) {
            object.type = 'request_geo_location';
            delete object.payload;
            delete object.url;
        }
        if (
            options.intent === 'default' ||
            options.intent === 'positive' ||
            options.intent === 'negative'
        ) {
            object.intent = options.intent;
        }
        if (typeof options.quick === 'boolean') {
            object.quick = options.quick;
        }
        if (typeof options.web_app === 'string') {
            object.type = 'open_app';
            object.web_app = options.web_app;
            delete object.payload;
            delete object.url;
        }
        if (typeof options.contact_id === 'number') {
            object.contact_id = options.contact_id;
        }
        // Универсальный API не задаёт раскладку, поэтому каждая кнопка получает
        // отдельную строку — это всегда валидная форма MAX API.
        finalButtons.push([object]);
    });

    return {
        buttons: finalButtons,
    };
}
