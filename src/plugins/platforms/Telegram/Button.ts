/**
 * Построение кнопок Telegram: inline-клавиатуры до 40 кнопок, callback_data 1–64 байта, style (Bot API 9.4+).
 */
import { IButtonType, AppContext } from '../../../index';

import {
    ITelegramKeyboard,
    ITelegramInlineKeyboard,
    ITelegramReplyButton,
} from './interfaces/ITelegramPlatform';
import { getCorrectButtons, serializePlatformPayload } from '../Base/utils';
import { TG_CALLBACK_DATA_MAX_LENGTH } from './constants';

/**
 * Добавляет url-кнопку в inline-набор.
 *
 * URL-кнопка не использует callback_data, поэтому лимит 64 байта к ней
 * неприменим: проверка payload до ветки url отбрасывала валидную url-кнопку,
 * у которой просто задан крупный payload для других платформ.
 *
 * @param button Универсальная кнопка umbot (нужна только для options.style)
 * @param title Проверенный (непустой) текст кнопки
 * @param url Ссылка кнопки
 * @param inlines Накопитель inline-кнопок
 */
function pushUrlButton(
    button: IButtonType,
    title: string,
    url: string,
    inlines: ITelegramInlineKeyboard[],
): void {
    // url и callback_data взаимоисключающие в Telegram API
    const urlButton: ITelegramInlineKeyboard = {
        text: title,
        url,
    };
    // Стиль кнопки (Bot API 9.4+), константы TG_STYLE_*.
    if (button.options?.style) {
        urlButton.style = String(button.options.style);
    }
    inlines.push(urlButton);
}

/**
 * Добавляет callback-кнопку (payload) в inline-набор с проверкой лимита
 * callback_data 1–64 байта (Telegram Bot API).
 *
 * @param button Универсальная кнопка umbot (нужна только для options)
 * @param title Проверенный (непустой) текст кнопки
 * @param payload Payload кнопки для сериализации в callback_data
 * @param inlines Накопитель inline-кнопок
 * @param appContext Контекст приложения для логирования ошибок валидации
 */
function pushCallbackButton(
    button: IButtonType,
    title: string,
    payload: object | string,
    inlines: ITelegramInlineKeyboard[],
    appContext?: AppContext,
): void {
    const callbackData = serializePlatformPayload(payload, 'Telegram', appContext);
    // Невалидный payload не сериализуется — кнопка пропускается целиком.
    if (callbackData === null) {
        return;
    }
    if (typeof callbackData === 'string') {
        const byteLength = Buffer.byteLength(callbackData, 'utf8');
        if (byteLength > TG_CALLBACK_DATA_MAX_LENGTH) {
            appContext?.logWarn(
                `[Telegram] callback_data превышает лимит ${TG_CALLBACK_DATA_MAX_LENGTH} байт (${byteLength} байт). Кнопка будет пропущена без изменения данных.`,
            );
            return;
        }
    }
    const inline: ITelegramInlineKeyboard = {
        text: title,
        callback_data: callbackData,
    };
    if (button.options?.style) {
        inline.style = String(button.options.style);
    }
    inlines.push(inline);
}

/**
 * Добавляет обычную reply-кнопку (текст, запрос контакта/локации, стиль).
 *
 * @param button Универсальная кнопка umbot (нужна только для options)
 * @param title Проверенный (непустой) текст кнопки
 * @param reply Накопитель reply-кнопок
 */
function pushReplyButton(button: IButtonType, title: string, reply: ITelegramReplyButton[]): void {
    const replyBtn: ITelegramReplyButton = { text: title };
    if (button.options?.request_contact) {
        replyBtn.request_contact = true;
    }
    if (button.options?.request_location) {
        replyBtn.request_location = true;
    }
    if (button.options?.style) {
        replyBtn.style = String(button.options.style);
    }
    reply.push(replyBtn);
}

/**
 * Классифицирует одну кнопку по типу (url → inline с callback_data → reply)
 * и добавляет её в соответствующий набор; невалидные кнопки пропускает с warn.
 *
 * @param button Универсальная кнопка umbot
 * @param inlines Накопитель inline-кнопок
 * @param reply Накопитель reply-кнопок
 * @param appContext Контекст приложения для логирования ошибок валидации
 */
function pushButton(
    button: IButtonType,
    inlines: ITelegramInlineKeyboard[],
    reply: ITelegramReplyButton[],
    appContext?: AppContext,
): void {
    // Guard один раз сужает title/url/payload до непустых значений; хелперы
    // получают уже проверенные аргументы и не дублируют проверки. trim здесь —
    // только проверка, в кнопку title уходит как есть (как и до рефакторинга).
    if (!button.title?.trim()) {
        appContext?.logWarn('[Telegram] Кнопка с пустым text пропущена.');
        return;
    }
    if (button.url) {
        pushUrlButton(button, button.title, button.url, inlines);
    } else if (button.payload) {
        pushCallbackButton(button, button.title, button.payload, inlines, appContext);
    } else {
        pushReplyButton(button, button.title, reply);
    }
}

/**
 * Получение кнопок в формате Telegram
 * @param buttons Кнопки, которые необходимо отобразить
 * @param appContext Контекст приложения (опционально, для логирования ошибок валидации)
 * @returns Клавиатура (reply или inline) либо `null`, если валидных кнопок нет
 */
export function buttonProcessing(
    buttons: IButtonType[],
    appContext?: AppContext,
): ITelegramKeyboard | null {
    const object: ITelegramKeyboard = {};
    const inlines: ITelegramInlineKeyboard[] = [];
    const reply: ITelegramReplyButton[] = [];

    getCorrectButtons(buttons, 40, appContext).forEach((button) => {
        pushButton(button, inlines, reply, appContext);
    });
    const rCount = reply.length;
    const rInline = inlines.length;
    if (rCount || rInline) {
        if (rInline) {
            if (rCount) {
                // Telegram не умеет совмещать inline_keyboard и обычную keyboard в одном
                // сообщении: приходится выбирать одну. Раньше reply-кнопки просто исчезали,
                // и разработчик видел на Telegram не тот набор кнопок, что на VK/MAX/Viber.
                appContext?.logWarn(
                    `[Telegram] В ответе одновременно заданы inline-кнопки (${rInline}) и обычные (${rCount}). ` +
                        'Telegram принимает только один тип клавиатуры в сообщении — отправлены будут inline-кнопки, ' +
                        'обычные будут пропущены. Задайте payload/url всем кнопкам либо ни одной.',
                );
            }
            object.inline_keyboard = inlines.map((btn) => [btn]);
        } else if (rCount) {
            object.keyboard = reply.map((btn) => [btn]);
            object.resize_keyboard = true;
        }
    } else {
        // Невалидные кнопки не должны снимать уже показанную пользователю клавиатуру.
        return null;
    }
    return object;
}
