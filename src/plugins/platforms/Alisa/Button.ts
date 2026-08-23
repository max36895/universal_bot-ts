import { Text, IButtonType, AppContext } from '../../../index';
import { IAlisaButton, IAlisaButtonCard } from './interfaces/IAlisaPlatform';
import { getCorrectButtons, serializePlatformPayload } from '../Base/utils';

/**
 * Создание кнопки в формате Алисы
 */
function _getButton(
    button: IButtonType,
    isCard: boolean,
    appContext?: AppContext<unknown, string>,
): IAlisaButtonCard | IAlisaButton | null {
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
            const payloadStr = serializePlatformPayload(button.payload, 'Alisa', appContext);
            if (payloadStr === null) {
                return null;
            }
            if (Buffer.byteLength(payloadStr, 'utf8') <= 4096) {
                object.payload = button.payload;
            } else {
                appContext?.logWarn(
                    `[Alisa] Payload кнопки превышает 4096 байт (${Buffer.byteLength(payloadStr, 'utf8')} байт). Кнопка будет пропущена без изменения payload.`,
                );
                return null;
            }
        }
        if (button.url) {
            if (button.url.length > 1024) {
                appContext?.logWarn(
                    '[Alisa] URL кнопки превышает 1024 символа. Кнопка будет пропущена без изменения ссылки.',
                );
                return null;
            }
            object.url = button.url;
        }
        return object;
    }
    return null;
}

/**
 * Получение кнопок в формате Алисы
 * @param buttons Кнопки, которые необходимо отобразить
 * @param isCard флаг принадлежности кнопок к карточке
 * @param appContext Контекст приложения, нужен для логирования ошибки
 */
export function buttonProcessing(
    buttons: IButtonType[],
    isCard: boolean = false,
    appContext?: AppContext<unknown, string>,
): IAlisaButton[] | IAlisaButtonCard | null {
    const objects: IAlisaButton[] = [];
    if (isCard) {
        if (buttons.length) {
            return _getButton(buttons[0], isCard, appContext);
        }
    } else {
        getCorrectButtons(buttons).forEach((button) => {
            const object: IAlisaButton | null = _getButton(button, isCard, appContext);
            if (object) {
                objects.push(object);
            }
        });
    }
    return objects;
}
