import { Button } from '../../../index';

import { IMaxButtonObject, IMaxButton } from './interfaces/IMaxPlatform';

/**
 * Получение кнопок в формате Max
 * @param buttons Кнопки, которые необходимо отобразить
 */
export function buttonProcessing(buttons: Button[]): IMaxButtonObject {
    const finalButtons: IMaxButton[] = [];
    buttons.forEach((button) => {
        let object: IMaxButton = {
            type: 'message',
            text: button.title as string,
        };
        if (button.url) {
            object.type = 'link';
            object.url = button.url;
        }
        if (button.payload) {
            if (typeof button.payload === 'string') {
                object.payload = button.payload;
            } else {
                object.payload = JSON.stringify(button.payload);
            }
        }

        object = { ...object, ...button.options };
        finalButtons.push(object);
    });

    return {
        buttons: finalButtons,
    };
}
