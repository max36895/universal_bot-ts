import { Text, Button } from '../../../index';
import { IAlisaButton, IAlisaButtonCard } from './interfaces/IAlisaPlatform';

/**
 * Создание кнопки в формате Алисы
 */
function _getButton(button: Button, isCard: boolean): IAlisaButtonCard | IAlisaButton | null {
    const title = Text.resize(button.title || '', 64);
    if (title) {
        let object: IAlisaButtonCard | IAlisaButton;
        if (isCard) {
            object = <IAlisaButtonCard>{
                text: title,
            };
        } else {
            object = <IAlisaButton>{
                title,
                hide: button.hide,
            };
        }
        if (button.payload) {
            object.payload = button.payload;
        }
        if (button.url) {
            object.url = Text.resize(button.url, 1024);
        }
        return object;
    }
    return null;
}

/**
 * Получение кнопок в формате Алисы
 * @param buttons Кнопки, которые необходимо отобразить
 * @param isCard флаг принадлежности кнопок к карточке
 */
export function buttonProcessing(
    buttons: Button[],
    isCard: boolean = false,
): IAlisaButton[] | IAlisaButtonCard | null {
    const objects: IAlisaButton[] = [];
    if (isCard) {
        if (buttons.length) {
            return _getButton(buttons[0], isCard);
        }
    } else {
        buttons.forEach((button) => {
            const object: IAlisaButton | null = _getButton(button, isCard);
            if (object) {
                objects.push(object);
            }
        });
    }
    return objects;
}
