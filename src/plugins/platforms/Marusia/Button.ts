import { Text, IButtonType } from '../../../index';
import { IMarusiaButtonCard, IMarusiaButton } from './interfaces/IMarusiaPlatform';

/**
 * Создание кнопки в формате Маруси
 */
function _getButton(
    button: IButtonType,
    isCard: boolean,
): IMarusiaButtonCard | IMarusiaButton | null {
    const title = Text.resize(button.title || '', 64);
    if (title) {
        let object: IMarusiaButtonCard | IMarusiaButton;
        if (isCard) {
            object = <IMarusiaButtonCard>{
                text: title,
            };
        } else {
            object = <IMarusiaButton>{
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
 * Получение кнопок в формате Маруси
 * @param buttons Кнопки, которые необходимо отобразить
 * @param isCard флаг принадлежности кнопок к карточке
 */
export function buttonProcessing(
    buttons: IButtonType[],
    isCard: boolean = false,
): IMarusiaButton[] | IMarusiaButtonCard | null {
    const objects: IMarusiaButton[] = [];
    if (isCard) {
        if (buttons.length) {
            return _getButton(buttons[0], isCard);
        }
    } else {
        buttons.forEach((button) => {
            const object: IMarusiaButton | null = _getButton(button, isCard);
            if (object) {
                objects.push(object);
            }
        });
    }
    return objects;
}
