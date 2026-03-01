import { ICardInfo, Text, BotController } from '../../../../../src';
import { buttonProcessing, IButton } from './UserButton';

/**
 * Интерфейс для карточки
 */
export interface ICard {
    /**
     * Отображаемые изображения
     */
    images: string[];
    /**
     * Кнопка, которая отобразится под изображением
     */
    button?: IButton;
    /**
     * Заголовок для изображения. Максимум 128 символов
     */
    caption?: string;
}

/**
 * Получение карточки в нужном формате
 * @param cardInfo Информация о карточке
 * @param controller Контроллер приложение. Стоит использовать когда необходима работа с бд или дополнительным контекстом
 * @returns
 */
export function cardProcessing(cardInfo: ICardInfo, controller: BotController): ICard | null {
    if (cardInfo.showOne) {
        if (cardInfo.images[0].imageDir) {
            return {
                images: [cardInfo.images[0].imageDir],
                caption: Text.resize(cardInfo.images[0].title, 128),
                button: cardInfo.images[0].button.getButtons(buttonProcessing)?.[0],
            };
        }
        return null;
    }
    const result: ICard = {
        images: [],
    };
    cardInfo.images.forEach((image) => {
        if (cardInfo.images[0].imageDir) {
            result.images.push(cardInfo.images[0].imageDir);
        }
    });
    if (result.images.length) {
        result.button = cardInfo.buttons.getButtons(buttonProcessing)?.[0];
        if (cardInfo.title) {
            result.caption = Text.resize(cardInfo.title, 128);
        }
        return result;
    }
    return null;
}
