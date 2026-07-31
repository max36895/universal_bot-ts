import { Text, IButtonType, AppContext } from '../../../index';
import { IMarusiaButtonCard, IMarusiaButton } from './interfaces/IMarusiaPlatform';
import { getCorrectButtons } from '../Base/utils';

/**
 * Максимальный размер payload в байтах для кнопок Marusia API.
 * Совпадает с лимитом Alisa API — 4096 байт.
 */
const MARUSIA_PAYLOAD_MAX_BYTES = 4096;

/**
 * Создание кнопки в формате Маруси
 */
function _getButton(
    button: IButtonType,
    isCard: boolean,
    appContext?: AppContext,
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
            const payloadStr =
                typeof button.payload === 'string'
                    ? button.payload
                    : JSON.stringify(button.payload);
            if (Buffer.byteLength(payloadStr, 'utf8') < MARUSIA_PAYLOAD_MAX_BYTES) {
                object.payload = button.payload;
            } else {
                appContext?.logWarn(
                    `[Marusia] Payload кнопки превышает ${MARUSIA_PAYLOAD_MAX_BYTES} байт (${Buffer.byteLength(payloadStr, 'utf8')} байт). Он будет проигнорирован.`,
                );
            }
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
 * @param appContext Контекст приложения (опционально, для логирования ошибок валидации)
 */
export function buttonProcessing(
    buttons: IButtonType[],
    isCard: boolean = false,
    appContext?: AppContext,
): IMarusiaButton[] | IMarusiaButtonCard | null {
    const objects: IMarusiaButton[] = [];
    if (isCard) {
        if (buttons.length) {
            return _getButton(buttons[0], isCard, appContext);
        }
    } else {
        getCorrectButtons(buttons).forEach((button) => {
            const object: IMarusiaButton | null = _getButton(button, isCard, appContext);
            if (object) {
                objects.push(object);
            }
        });
    }
    return objects;
}
