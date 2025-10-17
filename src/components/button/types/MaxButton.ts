import { TemplateButtonTypes } from './TemplateButtonTypes';

/**
 * Интерфейс, описывающий кнопку в Max App.
 * Определяет тип, текст, полезную нагрузку и другие параметры кнопки.
 */
export interface IMaxButton {
    /**
     * Тип кнопки.
     * - 'message': Отправляет текстовое сообщение.
     * - 'link': Открывает указанный URL.
     * - 'callback': Отправляет payload на сервер.
     * - 'request_geo_location': Запрашивает геолокацию у пользователя.
     * - 'request_contact': Запрашивает контактные данные у пользователя.
     * - 'open_app': Открывает другое приложение Max App.
     */
    type: 'message' | 'link' | 'callback' | 'request_geo_location' | 'request_contact' | 'open_app';

    /**
     * Текст, отображаемый на кнопке.
     */
    text: string;

    /**
     * Полезная нагрузка, отправляемая с кнопкой (например, при нажатии типа 'callback').
     */
    payload?: string;

    /**
     * Интент кнопки, влияющий на её визуальное оформление (например, цвет).
     */
    intent?: 'default' | 'positive' | 'negative';

    /**
     * URL, открываемый при нажатии кнопки типа 'link'.
     */
    url?: string;

    /**
     * Флаг, указывающий, является ли кнопка "быстрой".
     * Быстрые кнопки могут исчезать после нажатия.
     */
    quick?: boolean;

    /**
     * URL веб-приложения, открываемого при нажатии кнопки типа 'open_app'.
     */
    web_app?: string;

    /**
     * ID контакта, используемый при нажатии кнопки типа 'request_contact'.
     */
    contact_id?: number;
}

/**
 * Интерфейс, описывающий объект, содержащий массив кнопок Max App.
 * Используется для передачи коллекции кнопок в API.
 */
export interface IMaxButtonObject {
    /**
     * Массив кнопок Max App.
     */
    buttons: IMaxButton[];
}

/**
 * @class MaxButton
 * Класс для работы с кнопками в Max
 *
 * @extends {TemplateButtonTypes}
 */
export class MaxButton extends TemplateButtonTypes {
    /**
     * Получение кнопок в формате Max
     *
     * @returns {IMaxButtonObject} - Объект с кнопками в формате Max
     *
     */
    public getButtons(): IMaxButtonObject {
        const buttons: IMaxButton[] = [];
        this.buttons.forEach((button) => {
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
            buttons.push(object);
        });

        return {
            buttons: buttons,
        };
    }
}
