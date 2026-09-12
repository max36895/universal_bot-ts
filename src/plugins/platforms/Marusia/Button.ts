/**
 * Построение кнопок Маруси: лимит 10 кнопок, title до 64 символов, payload до 4096 байт.
 */
import { Text, IButtonType, AppContext } from '../../../index';
import { IMarusiaButtonCard, IMarusiaButton } from './interfaces/IMarusiaPlatform';
import { getCorrectButtons, serializePlatformPayload } from '../Base/utils';

/**
 * Максимальный размер payload в байтах для кнопок Marusia API.
 * Совпадает с лимитом Alisa API — 4096 байт.
 */
const MARUSIA_PAYLOAD_MAX_BYTES = 4096;

/**
 * Приводит payload кнопки к JSON-объекту, как требует протокол: у Алисы и
 * Маруси payload — «произвольный JSON-объект». Строковый payload (типичный
 * для Telegram/VK: `addBtn('Купить', null, 'buy')`) оборачивается в
 * `{command: 'buy'}` — при нажатии адаптер превращает его обратно в команду
 * `buy`, поэтому addAction/addCommand работают одинаково на всех платформах.
 *
 * @param payload Payload универсальной кнопки
 * @returns Payload-объект для ответа платформе
 */
function toPayloadObject(payload: unknown): Record<string, unknown> {
    if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
        return payload as Record<string, unknown>;
    }
    return { command: typeof payload === 'string' ? payload : JSON.stringify(payload) };
}

/**
 * Создание кнопки в формате Маруси
 * @param button Универсальная кнопка umbot
 * @param isCard Флаг принадлежности кнопки к карточке (формат IMarusiaButtonCard)
 * @param appContext Контекст приложения для логирования ошибок валидации
 * @returns Кнопка в формате Маруси либо `null`, если кнопка не прошла валидацию (пустой title, payload длиннее 4096 байт, URL длиннее 1024 байт)
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
            // Поля hide в протоколе кнопок Маруси нет (только title/url/payload).
            object = <IMarusiaButton>{
                title,
            };
        }
        if (button.payload) {
            const payloadObject = toPayloadObject(button.payload);
            const payloadStr = serializePlatformPayload(payloadObject, 'Marusia', appContext);
            if (payloadStr === null) {
                return null;
            }
            if (Buffer.byteLength(payloadStr, 'utf8') <= MARUSIA_PAYLOAD_MAX_BYTES) {
                object.payload = payloadObject;
            } else {
                appContext?.logWarn(
                    `[Marusia] Payload кнопки превышает ${MARUSIA_PAYLOAD_MAX_BYTES} байт (${Buffer.byteLength(payloadStr, 'utf8')} байт). Кнопка будет пропущена без изменения payload.`,
                );
                return null;
            }
        }
        if (button.url) {
            const urlBytes = Buffer.byteLength(button.url, 'utf8');
            if (urlBytes > 1024) {
                appContext?.logWarn(
                    `[Marusia] URL кнопки превышает 1024 байта (${urlBytes} байт). Кнопка будет пропущена без изменения ссылки.`,
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
 * Получение кнопок в формате Маруси
 * @param buttons Кнопки, которые необходимо отобразить
 * @param isCard флаг принадлежности кнопок к карточке
 * @param appContext Контекст приложения (опционально, для логирования ошибок валидации)
 * @returns Для карточки — первая кнопка (IMarusiaButtonCard), для обычного ответа — массив кнопок IMarusiaButton
 */
export function buttonProcessing(
    buttons: IButtonType[],
    isCard: boolean = false,
    appContext?: AppContext,
): IMarusiaButton[] | IMarusiaButtonCard | null {
    const objects: IMarusiaButton[] = [];
    if (isCard) {
        if (buttons.length) {
            const firstButton = buttons[0];
            if (firstButton) {
                return _getButton(firstButton, isCard, appContext);
            }
        }
    } else {
        getCorrectButtons(buttons, 10, appContext).forEach((button) => {
            const object: IMarusiaButton | null = _getButton(button, isCard, appContext);
            if (object) {
                objects.push(object);
            }
        });
    }
    return objects;
}
