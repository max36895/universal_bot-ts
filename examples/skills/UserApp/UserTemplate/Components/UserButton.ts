import { Text, Button } from '../../../../../src';

/**
 * Свой формат для кнопок
 */
export interface IButton {
    /**
     * Текст кнопки. Максимум 64 символа
     */
    text: string;
    /**
     * Ссылка, по которой будет осуществлен переход при нажатии
     */
    url?: string;
    /**
     * Тип кнопки
     */
    type: 'button' | 'link';
}
/**
 * Получение кнопок в нужном формате
 * @param buttons Информация о кнопках
 */
export function buttonProcessing(buttons: Button[]): IButton[] | null {
    const objects: IButton[] = [];

    buttons.forEach((button) => {
        if (button.title) {
            const object: IButton = {
                text: Text.resize(button.title, 64),
                type: button.hide ? 'button' : 'link',
            };
            if (button.url) {
                object.url = button.url;
            }
            objects.push(object);
        }
    });

    return objects;
}
