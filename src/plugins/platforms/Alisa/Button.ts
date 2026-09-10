import { Text, IButtonType, AppContext } from '../../../index';
import { IAlisaButton, IAlisaButtonCard } from './interfaces/IAlisaPlatform';
import { getCorrectButtons, serializePlatformPayload } from '../Base/utils';

/**
 * Создание кнопки в формате Алисы
 * @param button Универсальная кнопка umbot
 * @param isCard Флаг принадлежности кнопки к карточке (формат IAlisaButtonCard)
 * @param appContext Контекст приложения для логирования ошибок валидации
 * @returns Кнопка в формате Алисы либо `null`, если кнопка не прошла валидацию (пустой title, payload длиннее 4096 байт, URL длиннее 1024 байт)
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
            const urlBytes = Buffer.byteLength(button.url, 'utf8');
            if (urlBytes > 1024) {
                appContext?.logWarn(
                    `[Alisa] URL кнопки превышает 1024 байта (${urlBytes} байт). Кнопка будет пропущена без изменения ссылки.`,
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
 * @returns Для карточки — первая кнопка (IAlisaButtonCard), для обычного ответа — массив кнопок IAlisaButton
 */
export function buttonProcessing(
    buttons: IButtonType[],
    isCard: boolean = false,
    appContext?: AppContext<unknown, string>,
): IAlisaButton[] | IAlisaButtonCard | null {
    const objects: IAlisaButton[] = [];
    if (isCard) {
        if (buttons.length) {
            const firstButton = buttons[0];
            if (firstButton) {
                return _getButton(firstButton, isCard, appContext);
            }
        }
    } else {
        getCorrectButtons(buttons, 10, appContext).forEach((button) => {
            const object: IAlisaButton | null = _getButton(button, isCard, appContext);
            if (object) {
                objects.push(object);
            }
        });
    }
    return objects;
}
